// Gerenciador multi-conta do WhatsApp (Baileys Multi-Device)
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const pino = require('pino');
const ticketService = require('./ticket.service');
const { supabase, isSupabaseConfigured } = require('../config/supabase');

const SESSION_ROOT = path.join(__dirname, '../../session_auth');
const ACCOUNTS_ROOT = path.join(SESSION_ROOT, 'accounts');
const SETTINGS_KEY = 'whatsapp_accounts';

function safeAccountId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

function getPhoneFromJid(jid, lidMap) {
  if (!jid) return '';
  const resolved = lidMap.get(jid) || jid;
  return resolved.replace('@lid', '').replace('@s.whatsapp.net', '').replace(/:\d+$/, '');
}

function resolveJid(jid, state) {
  if (!jid?.includes('@lid')) return jid;
  return state.lidMap.get(jid) || jid;
}

class WhatsAppService {
  constructor() {
    this.accounts = new Map();
    this.io = null;
    this.loaded = false;
  }

  setIO(ioInstance) {
    this.io = ioInstance;
  }

  async initializeAll() {
    if (this.loaded) return;
    this.loaded = true;
    fs.mkdirSync(ACCOUNTS_ROOT, { recursive: true });
    this.migrateLegacySession();

    let configs = await this.loadConfigs();
    const defaultSession = path.join(ACCOUNTS_ROOT, 'default', 'creds.json');
    if (configs.length === 0 && fs.existsSync(defaultSession)) {
      configs = [{ id: 'default', name: 'WhatsApp Principal', active: true, created_at: new Date().toISOString() }];
      await this.saveConfigs(configs);
    }

    for (const config of configs) this.ensureAccount(config);
    for (const account of this.accounts.values()) {
      if (account.active !== false) this.initialize(account.id).catch(error => console.error(`[WhatsApp:${account.name}]`, error.message));
    }
  }

  migrateLegacySession() {
    const legacyCreds = path.join(SESSION_ROOT, 'creds.json');
    if (!fs.existsSync(legacyCreds)) return;
    const target = path.join(ACCOUNTS_ROOT, 'default');
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(SESSION_ROOT, { withFileTypes: true })) {
      if (entry.name === 'accounts') continue;
      fs.renameSync(path.join(SESSION_ROOT, entry.name), path.join(target, entry.name));
    }
    console.log('✅ Sessão WhatsApp existente migrada para a conta principal.');
  }

  async loadConfigs() {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase.from('system_settings').select('value').eq('key', SETTINGS_KEY).maybeSingle();
    if (error) {
      console.warn('Não foi possível carregar as contas do WhatsApp:', error.message);
      return [];
    }
    return Array.isArray(data?.value) ? data.value : [];
  }

  async saveConfigs(configs = null) {
    if (!isSupabaseConfigured()) return;
    const value = configs || [...this.accounts.values()].map(account => ({
      id: account.id,
      name: account.name,
      active: account.active !== false,
      phone: account.phone || null,
      display_name: account.displayName || null,
      created_at: account.createdAt,
      last_connected_at: account.lastConnectedAt || null
    }));
    const { error } = await supabase.from('system_settings').upsert({ key: SETTINGS_KEY, value, updated_at: new Date() }, { onConflict: 'key' });
    if (error) console.error('Falha ao salvar contas do WhatsApp:', error.message);
  }

  ensureAccount(config) {
    const id = safeAccountId(config.id);
    if (!id) throw new Error('Identificador de conta inválido.');
    if (!this.accounts.has(id)) {
      this.accounts.set(id, {
        id,
        name: String(config.name || 'WhatsApp').slice(0, 80),
        active: config.active !== false,
        phone: config.phone || null,
        displayName: config.display_name || null,
        createdAt: config.created_at || new Date().toISOString(),
        lastConnectedAt: config.last_connected_at || null,
        status: 'disconnected',
        qrCode: null,
        sock: null,
        initializing: false,
        reconnectTimer: null,
        manualDisconnect: false,
        lidMap: new Map()
      });
    }
    return this.accounts.get(id);
  }

  async createAccount(name) {
    const cleanName = String(name || '').trim();
    if (!cleanName) throw new Error('Informe um nome para identificar a conta.');
    if (this.accounts.size >= 20) throw new Error('Limite de 20 contas do WhatsApp atingido.');
    const account = this.ensureAccount({ id: crypto.randomUUID(), name: cleanName, active: true });
    await this.saveConfigs();
    await this.initialize(account.id);
    return this.publicAccount(account, true);
  }

  async initialize(accountId) {
    const account = this.accounts.get(safeAccountId(accountId));
    if (!account) throw new Error('Conta do WhatsApp não encontrada.');
    if (account.initializing || account.status === 'connected') return this.publicAccount(account, true);
    account.initializing = true;
    account.manualDisconnect = false;
    account.status = 'connecting';
    this.emitAccounts();

    const authDir = path.join(ACCOUNTS_ROOT, account.id);
    fs.mkdirSync(authDir, { recursive: true });

    try {
      const baileys = await import('@whiskeysockets/baileys');
      const { state, saveCreds } = await baileys.useMultiFileAuthState(authDir);
      if (account.sock) {
        try { account.sock.ev.removeAllListeners(); account.sock.end(); } catch {}
      }

      const sock = baileys.default({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Brisoft Desk', 'Chrome', '1.0.0'],
        markOnlineOnConnect: true,
        connectTimeoutMs: 30000,
        defaultQueryTimeoutMs: 30000,
        keepAliveIntervalMs: 10000,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        emitOwnEvents: false
      });
      account.sock = sock;
      sock.ev.on('creds.update', saveCreds);
      this.bindContacts(account);
      this.bindConnection(account, baileys.DisconnectReason);
      this.bindMessages(account, baileys.downloadMediaMessage);
      return this.publicAccount(account, true);
    } catch (error) {
      account.initializing = false;
      account.status = 'disconnected';
      this.emitAccounts();
      throw error;
    }
  }

  bindContacts(account) {
    const update = contacts => {
      for (const contact of contacts || []) {
        if (contact.id && contact.lid) {
          account.lidMap.set(contact.lid, contact.id);
          account.lidMap.set(contact.id, contact.lid);
        }
      }
    };
    account.sock.ev.on('contacts.upsert', update);
    account.sock.ev.on('contacts.update', update);
  }

  bindConnection(account, DisconnectReason) {
    account.sock.ev.on('connection.update', async update => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        account.qrCode = await QRCode.toDataURL(qr);
        account.status = 'scan_qr';
        account.initializing = false;
        console.log(`[WhatsApp:${account.name}] QR Code disponível.`);
        this.emitAccounts();
      }

      if (connection === 'open') {
        const user = account.sock.user || {};
        account.phone = getPhoneFromJid(user.id, account.lidMap) || account.phone;
        account.displayName = user.name || account.displayName || account.name;
        account.lastConnectedAt = new Date().toISOString();
        account.status = 'connected';
        account.qrCode = null;
        account.initializing = false;
        console.log(`[WhatsApp:${account.name}] conectado${account.phone ? ` (${account.phone})` : ''}.`);
        await this.saveConfigs();
        this.emitAccounts();
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
        account.status = 'disconnected';
        account.qrCode = null;
        account.initializing = false;
        account.sock = null;
        console.warn(`[WhatsApp:${account.name}] conexão encerrada (código ${statusCode || 'desconhecido'}).`);
        this.emitAccounts();
        if (!account.manualDisconnect && !loggedOut && account.active !== false) {
          clearTimeout(account.reconnectTimer);
          account.reconnectTimer = setTimeout(() => this.initialize(account.id).catch(() => {}), 5000);
        }
      }
    });
  }

  bindMessages(account, downloadMediaMessage) {
    account.sock.ev.on('messages.upsert', async event => {
      if (event.type !== 'notify') return;
      for (const msg of event.messages || []) {
        if (msg.key.fromMe || !msg.message) continue;
        const rawJid = msg.key.remoteJid;
        if (!rawJid || rawJid.includes('@g.us') || rawJid.includes('@newsletter') || rawJid.includes('status@broadcast')) continue;

        let resolvedJid = resolveJid(rawJid, account);
        if (resolvedJid.includes('@lid')) {
          const participant = msg.key.participant || msg.participant;
          if (participant && !participant.includes('@lid')) {
            resolvedJid = participant;
            account.lidMap.set(rawJid, participant);
          }
        }
        const phone = getPhoneFromJid(resolvedJid, account.lidMap);
        const media = await this.downloadMedia(account, msg, downloadMediaMessage);
        let text = msg.message.conversation || msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption || msg.message.videoMessage?.caption ||
          msg.message.documentMessage?.caption || media.fallbackText || '';
        if (media.url) text = `${text}||${media.url}`;
        const senderName = msg.pushName || null;
        console.log(`[WhatsApp:${account.name}] mensagem recebida de ${senderName || `Cliente ${phone.slice(-4)}`}.`);

        const scopedSender = {
          sendMessage: (target, body) => this.sendMessage(target, body, account.id),
          sendMediaMessage: (target, buffer, type, caption, fileName) => this.sendMediaMessage(target, buffer, type, caption, fileName, account.id)
        };
        await ticketService.processIncomingMessage({
          from: resolvedJid,
          rawJid,
          phone,
          senderName,
          text,
          mediaType: media.type,
          mediaUrl: media.url,
          fileName: media.fileName,
          timestamp: msg.messageTimestamp,
          messageId: msg.key.id,
          whatsappAccountId: account.id
        }, this.io, scopedSender);
      }
    });
  }

  async downloadMedia(account, msg, downloadMediaMessage) {
    let type = null;
    let fileName = null;
    let fallbackText = '';
    if (msg.message.imageMessage) { type = 'image'; fileName = `img_${Date.now()}_${msg.key.id}.jpg`; fallbackText = '📷 [Imagem]'; }
    else if (msg.message.audioMessage) { type = 'audio'; fileName = `audio_${Date.now()}_${msg.key.id}.ogg`; fallbackText = '🎙️ [Mensagem de Voz]'; }
    else if (msg.message.videoMessage) { type = 'video'; fileName = `video_${Date.now()}_${msg.key.id}.mp4`; fallbackText = '🎥 [Vídeo]'; }
    else if (msg.message.documentMessage) {
      type = 'document';
      const original = (msg.message.documentMessage.fileName || 'documento').replace(/[^a-zA-Z0-9._-]/g, '_');
      fileName = `doc_${Date.now()}_${original}`;
      fallbackText = `📄 [Documento: ${original}]`;
    } else if (msg.message.stickerMessage) { type = 'sticker'; fileName = `sticker_${Date.now()}_${msg.key.id}.webp`; fallbackText = '🖼️ [Figurinha]'; }
    if (!type) return { type: null, fileName: null, url: null, fallbackText: '' };

    try {
      const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: account.sock.updateMediaMessage });
      const mediaDir = path.join(__dirname, '../../public/media');
      fs.mkdirSync(mediaDir, { recursive: true });
      fs.writeFileSync(path.join(mediaDir, fileName), buffer);
      return { type, fileName, url: `/api/media/${fileName}`, fallbackText };
    } catch (error) {
      console.warn(`[WhatsApp:${account.name}] falha ao baixar mídia: ${error.message}`);
      return { type, fileName, url: null, fallbackText };
    }
  }

  selectAccount(accountId = null) {
    if (accountId) return this.accounts.get(accountId) || null;
    return [...this.accounts.values()].find(account => account.status === 'connected') || null;
  }

  async sendMessage(target, text, accountId = null) {
    const account = this.selectAccount(accountId);
    if (!account?.sock || account.status !== 'connected') {
      console.warn(`[WhatsApp:${accountId || 'automático'}] conta não conectada; mensagem não enviada.`);
      return false;
    }
    let jid = target;
    if (!jid.includes('@')) jid = `${target.replace(/\D/g, '')}@s.whatsapp.net`;
    jid = resolveJid(jid, account);
    try {
      await account.sock.sendMessage(jid, { text });
      console.log(`[WhatsApp:${account.name}] mensagem enviada para ${getPhoneFromJid(jid, account.lidMap)}.`);
      return true;
    } catch (error) {
      console.error(`[WhatsApp:${account.name}] falha no envio: ${error.message}`);
      return false;
    }
  }

  async sendMediaMessage(target, fileBuffer, mediaType, caption, fileName, accountId = null) {
    const account = this.selectAccount(accountId);
    if (!account?.sock || account.status !== 'connected') return false;
    let jid = target.includes('@') ? target : `${target.replace(/\D/g, '')}@s.whatsapp.net`;
    const payloads = {
      image: { image: fileBuffer, caption: caption || '' },
      audio: { audio: fileBuffer, mimetype: 'audio/mp4', ptt: true },
      video: { video: fileBuffer, caption: caption || '' },
      document: { document: fileBuffer, mimetype: 'application/octet-stream', fileName: fileName || 'documento', caption: caption || '' }
    };
    try { await account.sock.sendMessage(jid, payloads[mediaType]); return true; }
    catch (error) { console.error(`[WhatsApp:${account.name}] falha ao enviar mídia: ${error.message}`); return false; }
  }

  async disconnect(accountId) {
    const account = this.accounts.get(safeAccountId(accountId));
    if (!account) throw new Error('Conta do WhatsApp não encontrada.');
    account.manualDisconnect = true;
    clearTimeout(account.reconnectTimer);
    try { if (account.sock) await account.sock.logout(); } catch {}
    try { if (account.sock) { account.sock.ev.removeAllListeners(); account.sock.end(); } } catch {}
    account.sock = null;
    account.status = 'disconnected';
    account.qrCode = null;
    account.phone = null;
    account.displayName = null;
    fs.rmSync(path.join(ACCOUNTS_ROOT, account.id), { recursive: true, force: true });
    await this.saveConfigs();
    this.emitAccounts();
  }

  async removeAccount(accountId) {
    await this.disconnect(accountId);
    this.accounts.delete(safeAccountId(accountId));
    await this.saveConfigs();
    this.emitAccounts();
  }

  publicAccount(account, includeQr = false) {
    return {
      id: account.id,
      name: account.name,
      status: account.status,
      phone: account.phone,
      displayName: account.displayName,
      lastConnectedAt: account.lastConnectedAt,
      createdAt: account.createdAt,
      ...(includeQr ? { qrCode: account.qrCode } : {})
    };
  }

  getAccounts(includeQr = false) {
    return [...this.accounts.values()].map(account => this.publicAccount(account, includeQr));
  }

  getStatus() {
    const accounts = this.getAccounts(true);
    return { status: accounts.some(a => a.status === 'connected') ? 'connected' : accounts.some(a => a.status === 'scan_qr') ? 'scan_qr' : 'disconnected', accounts };
  }

  getPublicStatus() {
    const accounts = this.getAccounts(false);
    return { status: accounts.some(a => a.status === 'connected') ? 'connected' : 'disconnected', connectedCount: accounts.filter(a => a.status === 'connected').length };
  }

  emitAccounts() {
    if (!this.io) return;
    this.io.to('admins').emit('whatsapp_accounts_updated', { accounts: this.getAccounts(true) });
    this.io.emit('whatsapp_status', this.getPublicStatus());
  }
}

module.exports = new WhatsAppService();
