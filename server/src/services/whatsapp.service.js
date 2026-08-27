// Gerenciador multi-conta do WhatsApp (Baileys Multi-Device)
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const pino = require('pino');
const { buildAudioPayload } = require('./media-payload.service');
const ticketService = require('./ticket.service');
const KeyedTaskQueue = require('./keyed-task-queue.service');
const { supabase, isSupabaseConfigured } = require('../config/supabase');

const SESSION_ROOT = path.join(__dirname, '../../session_auth');
const ACCOUNTS_ROOT = path.join(SESSION_ROOT, 'accounts');
const SETTINGS_KEY = 'whatsapp_accounts';
const MEDIA_DIR = path.join(__dirname, '../../public/media');
const ROUTING_MODE_GENERAL = 'general';
const ROUTING_MODE_DEPARTMENT = 'department';

function envInteger(name, fallback, minimum = 0) {
  const parsed = Number.parseInt(process.env[name], 10);
  return Number.isFinite(parsed) ? Math.max(minimum, parsed) : fallback;
}

function mediaSizeBytes(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'bigint') return Number(value);
  if (value && typeof value.toNumber === 'function') return value.toNumber();
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeAccountId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

function normalizeAccountRouting(config = {}) {
  const routingMode = config.routing_mode === ROUTING_MODE_DEPARTMENT || config.routingMode === ROUTING_MODE_DEPARTMENT
    ? ROUTING_MODE_DEPARTMENT
    : ROUTING_MODE_GENERAL;
  const departmentId = routingMode === ROUTING_MODE_DEPARTMENT
    ? String(config.department_id || config.departmentId || '').trim() || null
    : null;
  const departmentName = routingMode === ROUTING_MODE_DEPARTMENT
    ? String(config.department_name || config.departmentName || '').trim().slice(0, 120) || null
    : null;
  return { routingMode, departmentId, departmentName };
}

function loadLidMap(account) {
  try {
    const file = path.join(ACCOUNTS_ROOT, account.id, 'lid-map.json');
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const [k, v] of Object.entries(data)) {
        account.lidMap.set(k, v);
      }
    }
  } catch (_) {}

  try {
    const credsFile = path.join(ACCOUNTS_ROOT, account.id, 'creds.json');
    if (fs.existsSync(credsFile)) {
      const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
      if (creds?.me?.id && creds?.me?.lid) {
        recordLidPair(account, creds.me.id, creds.me.lid);
      }
    }
  } catch (_) {}
}

function saveLidMap(account) {
  try {
    const file = path.join(ACCOUNTS_ROOT, account.id, 'lid-map.json');
    const obj = Object.fromEntries(account.lidMap.entries());
    fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
  } catch (_) {}
}

function recordLidPair(account, phoneOrJid, lidOrJid) {
  if (!account?.lidMap || !phoneOrJid || !lidOrJid) return false;
  let phoneJid = String(phoneOrJid).trim();
  let lidJid = String(lidOrJid).trim();

  if (phoneJid.includes('@lid') && !lidJid.includes('@lid')) {
    const tmp = phoneJid;
    phoneJid = lidJid;
    lidJid = tmp;
  }

  if (!phoneJid.includes('@') && /^\d+$/.test(phoneJid)) {
    phoneJid = `${phoneJid}@s.whatsapp.net`;
  }
  if (!lidJid.includes('@') && /^\d+$/.test(lidJid)) {
    lidJid = `${lidJid}@lid`;
  }

  const cleanPhoneJid = phoneJid.replace(/:\d+@/, '@').replace(/:\d+$/, '');
  const cleanLidJid = lidJid.replace(/:\d+@/, '@').replace(/:\d+$/, '');
  const rawPhone = cleanPhoneJid.replace('@s.whatsapp.net', '');
  const rawLid = cleanLidJid.replace('@lid', '');

  if (!rawPhone || !rawLid || rawPhone === rawLid) return false;

  account.lidMap.set(lidJid, cleanPhoneJid);
  account.lidMap.set(cleanLidJid, cleanPhoneJid);
  account.lidMap.set(rawLid, cleanPhoneJid);
  account.lidMap.set(cleanPhoneJid, cleanLidJid);
  account.lidMap.set(rawPhone, cleanLidJid);
  return true;
}

function getPhoneFromJid(jid, lidMap) {
  if (!jid) return '';
  const cleanJid = jid.replace(/:\d+@/, '@').replace(/:\d+$/, '');
  const resolved = lidMap?.get(jid) || lidMap?.get(cleanJid) || cleanJid;
  return resolved.replace('@lid', '').replace('@s.whatsapp.net', '').replace(/:\d+$/, '');
}

function resolveJid(jid, state) {
  if (!jid) return '';
  const cleanJid = jid.replace(/:\d+@/, '@').replace(/:\d+$/, '');
  if (!cleanJid.includes('@lid')) return cleanJid;
  return state?.lidMap?.get(jid) || state?.lidMap?.get(cleanJid) || cleanJid;
}

function unwrapMessageContent(message) {
  let content = message || {};
  const wrapperKeys = [
    'ephemeralMessage',
    'viewOnceMessage',
    'viewOnceMessageV2',
    'viewOnceMessageV2Extension',
    'documentWithCaptionMessage',
    'editedMessage'
  ];
  for (let depth = 0; depth < 8; depth += 1) {
    const wrapper = wrapperKeys.find(key => content[key]?.message);
    if (!wrapper) break;
    content = content[wrapper].message;
  }
  return content;
}

function safeFileToken(value) {
  return String(value || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || crypto.randomUUID();
}

class WhatsAppService {
  constructor() {
    this.accounts = new Map();
    this.io = null;
    this.loaded = false;
    this.messageQueue = new KeyedTaskQueue({
      concurrency: envInteger('WHATSAPP_MESSAGE_CONCURRENCY', 10, 1),
      maxPending: envInteger('WHATSAPP_MAX_PENDING_MESSAGES', 10000, 1)
    });
    this.recentMessageIds = new Map();
    this.maxMediaBytes = envInteger('WHATSAPP_MAX_MEDIA_MB', 25, 1) * 1024 * 1024;
    this.mediaRetentionDays = envInteger('WHATSAPP_MEDIA_RETENTION_DAYS', 30, 0);
    this.mediaCleanupHours = envInteger('WHATSAPP_MEDIA_CLEANUP_HOURS', 6, 1);
    this.mediaCleanupTimer = null;
  }

  setIO(ioInstance) {
    this.io = ioInstance;
  }

  async initializeAll() {
    if (this.loaded) return;
    this.loaded = true;
    fs.mkdirSync(ACCOUNTS_ROOT, { recursive: true });
    this.startMediaCleanup();
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
      routing_mode: account.routingMode,
      department_id: account.departmentId || null,
      department_name: account.departmentName || null,
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
      const routing = normalizeAccountRouting(config);
      this.accounts.set(id, {
        id,
        name: String(config.name || 'WhatsApp').slice(0, 80),
        active: config.active !== false,
        phone: config.phone || null,
        displayName: config.display_name || null,
        routingMode: routing.routingMode,
        departmentId: routing.departmentId,
        departmentName: routing.departmentName,
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
      loadLidMap(this.accounts.get(id));
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

  async updateAccountRouting(accountId, value = {}) {
    const account = this.accounts.get(safeAccountId(accountId));
    if (!account) throw new Error('Conta do WhatsApp não encontrada.');

    const routing = normalizeAccountRouting(value);
    if (routing.routingMode === ROUTING_MODE_DEPARTMENT) {
      if (!routing.departmentId) throw new Error('Selecione o departamento vinculado a este WhatsApp.');
      let department = null;
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('departments')
            .select('id, name')
            .eq('id', routing.departmentId)
            .maybeSingle();
          if (!error && data) department = data;
        } catch (_) {}
      }
      if (!department) {
        const defaultDepts = [
          { id: '1', name: 'B3 Eletrônica' },
          { id: '2', name: 'Comercial' },
          { id: '3', name: 'Comercial eletrônica' },
          { id: '4', name: 'Financeiro' },
          { id: '5', name: 'Operacional' },
          { id: '6', name: 'Recursos Humanos' },
          { id: '7', name: 'Suporte Técnico' },
          { id: '8', name: 'Suprimentos' }
        ];
        const match = defaultDepts.find(d => String(d.id) === String(routing.departmentId) || d.name.toLowerCase() === (routing.departmentName || '').toLowerCase());
        if (match) department = match;
      }
      if (!department) throw new Error('O departamento selecionado não foi encontrado.');
      routing.departmentId = department.id;
      routing.departmentName = department.name;
    }

    account.routingMode = routing.routingMode;
    account.departmentId = routing.departmentId;
    account.departmentName = routing.departmentName;
    await this.saveConfigs();
    this.emitAccounts();
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
        syncFullHistory: true,
        emitOwnEvents: false
      });
      account.sock = sock;
      sock.ev.on('creds.update', saveCreds);
      this.bindContacts(account);
      this.bindConnection(account, baileys.DisconnectReason);
      this.bindMessages(account, baileys.downloadMediaMessage, baileys.downloadContentFromMessage);
      return this.publicAccount(account, true);
    } catch (error) {
      account.initializing = false;
      account.status = 'disconnected';
      this.emitAccounts();
      throw error;
    }
  }

  bindContacts(account) {
    const updateContacts = contacts => {
      let changed = false;
      for (const c of contacts || []) {
        if (c.lid && (c.id || c.jid || c.phoneNumber)) {
          if (recordLidPair(account, c.id || c.jid || c.phoneNumber, c.lid)) changed = true;
        }
      }
      if (changed) saveLidMap(account);
    };

    const updateChats = chats => {
      let changed = false;
      for (const ch of chats || []) {
        if (ch.lidJid && ch.id) {
          if (recordLidPair(account, ch.id, ch.lidJid)) changed = true;
        }
      }
      if (changed) saveLidMap(account);
    };

    account.sock.ev.on('contacts.upsert', updateContacts);
    account.sock.ev.on('contacts.update', updateContacts);
    account.sock.ev.on('contacts.set', data => updateContacts(data?.contacts));
    account.sock.ev.on('messaging-history.set', ({ contacts, chats }) => {
      updateContacts(contacts);
      updateChats(chats);
      this.syncLidContactsToDatabase(account).catch(() => {});
    });
    account.sock.ev.on('chats.upsert', updateChats);
    account.sock.ev.on('chats.update', updateChats);
    account.sock.ev.on('chats.set', data => updateChats(data?.chats));
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
        if (user.id && user.lid) {
          recordLidPair(account, user.id, user.lid);
          saveLidMap(account);
        }
        account.phone = getPhoneFromJid(user.id, account.lidMap) || account.phone;
        account.displayName = user.name || account.displayName || account.name;
        account.lastConnectedAt = new Date().toISOString();
        account.status = 'connected';
        account.qrCode = null;
        account.initializing = false;
        console.log(`[WhatsApp:${account.name}] conectado${account.phone ? ` (${account.phone})` : ''}.`);
        await this.saveConfigs();
        this.emitAccounts();
        this.syncLidContactsToDatabase(account).catch(() => {});
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

  async resolveLidToPhone(account, jid, msg = null) {
    if (!jid) return '';
    const cleanJid = jid.replace(/:\d+@/, '@');
    
    // Se não é @lid, extrai o telefone diretamente
    if (!cleanJid.includes('@lid')) {
      return cleanJid.replace('@s.whatsapp.net', '').replace(/:\d+$/, '');
    }

    const rawLid = cleanJid.replace('@lid', '').replace(/:\d+$/, '');
    const mapped = account.lidMap.get(jid) || account.lidMap.get(cleanJid) || account.lidMap.get(rawLid);
    if (mapped && !mapped.includes('@lid')) {
      return mapped.replace('@s.whatsapp.net', '').replace(/:\d+$/, '');
    }

    // Tenta obter do participant da mensagem
    const participant = msg?.key?.participant || msg?.participant;
    if (participant && !participant.includes('@lid')) {
      const phone = participant.replace('@s.whatsapp.net', '').replace(/:\d+$/, '');
      recordLidPair(account, participant, jid);
      saveLidMap(account);
      return phone;
    }

    // Tenta obter de campos de telefone explícitos da mensagem
    const pn = msg?.key?.participantPn || msg?.key?.senderPn || msg?.key?.remoteJidPn;
    if (pn && !String(pn).includes('@lid')) {
      const phone = String(pn).replace(/\D/g, '');
      if (phone.length >= 10 && phone.length <= 13) {
        recordLidPair(account, phone, jid);
        saveLidMap(account);
        return phone;
      }
    }

    // Tenta consulta USync no Baileys sob demanda
    if (account.sock?.executeUSyncQuery) {
      try {
        const baileys = await import('@whiskeysockets/baileys');
        const usyncQuery = new baileys.USyncQuery()
          .withContext('interactive')
          .withMode('query')
          .withUser(new baileys.USyncUser().withId(cleanJid))
          .withContactProtocol();

        const result = await account.sock.executeUSyncQuery(usyncQuery);
        if (result?.list?.length) {
          for (const item of result.list) {
            if (item?.id && !item.id.includes('@lid')) {
              const phone = item.id.replace('@s.whatsapp.net', '').replace(/:\d+$/, '');
              recordLidPair(account, item.id, jid);
              saveLidMap(account);
              return phone;
            }
          }
        }
      } catch (_) {}
    }

    return rawLid;
  }

  async syncLidContactsToDatabase(account) {
    if (!isSupabaseConfigured() || account.lidMap.size === 0) return;
    try {
      // 1. Corrige tickets que foram gravados com o LID como telefone (>= 14 dígitos)
      const { data: tickets, error: ticketError } = await supabase
        .from('tickets')
        .select('id, phone, jid, raw_jid, contact_id')
        .limit(200);

      if (!ticketError && tickets) {
        for (const t of tickets) {
          const rawPhone = String(t.phone || '').replace(/\D/g, '');
          if (rawPhone.length >= 14) {
            const mappedPhone = await this.resolveLidToPhone(account, t.raw_jid || t.jid || `${rawPhone}@lid`);
            if (mappedPhone && mappedPhone !== rawPhone && mappedPhone.length <= 13) {
              console.log(`[WhatsApp:${account.name}] Atualizando telefone do ticket ${t.id}: ${rawPhone} -> ${mappedPhone}`);
              await supabase.from('tickets').update({ phone: mappedPhone, jid: `${mappedPhone}@s.whatsapp.net` }).eq('id', t.id);
              if (t.contact_id) {
                await supabase.from('contacts').update({ phone: mappedPhone }).eq('id', t.contact_id);
              }
            }
          }
        }
      }

      // 2. Corrige contatos gravados com o LID como telefone
      const { data: contacts, error: contactError } = await supabase
        .from('contacts')
        .select('id, phone')
        .limit(200);

      if (!contactError && contacts) {
        for (const c of contacts) {
          const rawPhone = String(c.phone || '').replace(/\D/g, '');
          if (rawPhone.length >= 14) {
            const mappedPhone = await this.resolveLidToPhone(account, `${rawPhone}@lid`);
            if (mappedPhone && mappedPhone !== rawPhone && mappedPhone.length <= 13) {
              console.log(`[WhatsApp:${account.name}] Atualizando telefone do contato ${c.id}: ${rawPhone} -> ${mappedPhone}`);
              await supabase.from('contacts').update({ phone: mappedPhone }).eq('id', c.id);
            }
          }
        }
      }
    } catch (e) {
      console.warn(`[WhatsApp:${account.name}] aviso na sincronização de LIDs: ${e.message}`);
    }
  }

  bindMessages(account, downloadMediaMessage, downloadContentFromMessage) {
    account.sock.ev.on('messages.upsert', event => {
      if (event.type !== 'notify') return;
      for (const msg of event.messages || []) {
        if (msg.key.fromMe || !msg.message) continue;
        const rawJid = msg.key.remoteJid;
        if (!rawJid || rawJid.includes('@g.us') || rawJid.includes('@newsletter') || rawJid.includes('status@broadcast')) continue;
        const messageKey = `${account.id}:${msg.key.id || `${rawJid}:${msg.messageTimestamp}`}`;
        if (this.recentMessageIds.has(messageKey)) continue;
        this.rememberMessageId(messageKey);
        let orderingJid = resolveJid(rawJid, account);
        const participant = msg.key.participant || msg.participant;
        if (orderingJid.includes('@lid') && participant && !participant.includes('@lid')) orderingJid = participant;

        this.messageQueue.enqueue(`${account.id}:${orderingJid}`, () => (
          this.processIncomingMessage(account, msg, downloadMediaMessage, downloadContentFromMessage)
        )).catch(error => {
          this.recentMessageIds.delete(messageKey);
          console.error(`[WhatsApp:${account.name}] falha ao processar mensagem: ${error.message}`);
        });
      }
    });
  }

  rememberMessageId(messageKey) {
    const now = Date.now();
    this.recentMessageIds.set(messageKey, now);
    if (this.recentMessageIds.size <= 50000) return;
    const expiration = now - (24 * 60 * 60 * 1000);
    for (const [key, timestamp] of this.recentMessageIds) {
      if (timestamp < expiration || this.recentMessageIds.size > 50000) this.recentMessageIds.delete(key);
      if (this.recentMessageIds.size <= 45000) break;
    }
  }

  async processIncomingMessage(account, msg, downloadMediaMessage, downloadContentFromMessage) {
    const rawJid = msg.key.remoteJid;
    let resolvedJid = resolveJid(rawJid, account);
    const phone = await this.resolveLidToPhone(account, rawJid, msg);
    if (phone && !phone.includes('@') && phone.length <= 13) {
      resolvedJid = `${phone}@s.whatsapp.net`;
    }
    const content = unwrapMessageContent(msg.message);
    const media = await this.downloadMedia(account, msg, downloadMediaMessage, downloadContentFromMessage);
    const text = content.conversation || content.extendedTextMessage?.text ||
      content.imageMessage?.caption || content.videoMessage?.caption ||
      content.documentMessage?.caption || media.fallbackText || '';
    const senderName = msg.pushName || null;
    console.log(`[WhatsApp:${account.name}] mensagem recebida de ${senderName || `Cliente ${phone.slice(-4)}`}.`);

    const scopedSender = {
      sendMessage: (target, body) => this.sendMessage(target, body, account.id),
      sendMediaMessage: (target, buffer, type, caption, fileName) => this.sendMediaMessage(target, buffer, type, caption, fileName, account.id)
    };
    const result = await ticketService.processIncomingMessage({
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
      whatsappAccountId: account.id,
      whatsappRoutingMode: account.routingMode,
      whatsappDepartmentId: account.departmentId,
      whatsappDepartmentName: account.departmentName
    }, this.io, scopedSender);
    if (media.type && !media.url && result?.ticket?.id) {
      this.retryMissingMedia(account, msg, downloadMediaMessage, downloadContentFromMessage, result.ticket.id).catch(error => {
        console.warn(`[WhatsApp:${account.name}] mídia permaneceu indisponível após novas tentativas: ${error.message}`);
      });
    }
    return result;
  }

  async retryMissingMedia(account, msg, downloadMediaMessage, downloadContentFromMessage, ticketId) {
    for (const delay of [2000, 7000, 20000]) {
      await new Promise(resolve => setTimeout(resolve, delay));
      if (!account.sock || account.status !== 'connected') throw new Error('Conta desconectada durante a recuperação da mídia.');
      const recovered = await this.downloadMedia(account, msg, downloadMediaMessage, downloadContentFromMessage);
      if (!recovered.url) continue;
      await ticketService.attachIncomingMedia({
        ticketId,
        messageId: msg.key.id,
        whatsappAccountId: account.id,
        mediaType: recovered.type,
        mediaUrl: recovered.url,
        fileName: recovered.fileName
      }, this.io);
      console.log(`[WhatsApp:${account.name}] mídia recuperada em segundo plano (${msg.key.id}).`);
      return true;
    }
    throw new Error('O WhatsApp não disponibilizou uma nova cópia do arquivo.');
  }

  async downloadMedia(account, msg, downloadMediaMessage, downloadContentFromMessage) {
    const content = unwrapMessageContent(msg.message);
    let type = null;
    let fileName = null;
    let fallbackText = '';
    let mediaMessage = null;
    const messageToken = safeFileToken(msg.key.id);
    if (content.imageMessage) {
      type = 'image';
      mediaMessage = content.imageMessage;
      const extension = mediaMessage.mimetype === 'image/png' ? 'png' : mediaMessage.mimetype === 'image/webp' ? 'webp' : 'jpg';
      fileName = `img_${Date.now()}_${messageToken}.${extension}`;
      fallbackText = '📷 [Imagem]';
    } else if (content.audioMessage) {
      type = 'audio';
      mediaMessage = content.audioMessage;
      const extension = mediaMessage.mimetype?.includes('mpeg') ? 'mp3' : mediaMessage.mimetype?.includes('mp4') ? 'm4a' : 'ogg';
      fileName = `audio_${Date.now()}_${messageToken}.${extension}`;
      fallbackText = mediaMessage.ptt ? '🎙️ [Mensagem de Voz]' : '🎵 [Áudio]';
    } else if (content.videoMessage) {
      type = 'video';
      mediaMessage = content.videoMessage;
      fileName = `video_${Date.now()}_${messageToken}.mp4`;
      fallbackText = '🎥 [Vídeo]';
    } else if (content.documentMessage) {
      type = 'document';
      mediaMessage = content.documentMessage;
      const original = (mediaMessage.fileName || 'documento').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
      fileName = `doc_${Date.now()}_${original}`;
      fallbackText = `📄 [Documento: ${original}]`;
    } else if (content.stickerMessage) {
      type = 'sticker';
      mediaMessage = content.stickerMessage;
      fileName = `sticker_${Date.now()}_${messageToken}.webp`;
      fallbackText = '🖼️ [Figurinha]';
    }
    if (!type) return { type: null, fileName: null, url: null, fallbackText: '' };

    const declaredSize = mediaSizeBytes(mediaMessage?.fileLength);
    if (declaredSize > this.maxMediaBytes) {
      const limitMb = Math.round(this.maxMediaBytes / (1024 * 1024));
      return { type, fileName, url: null, fallbackText: `⚠️ [Mídia acima do limite de ${limitMb} MB]` };
    }

    try {
      let buffer = null;
      try {
        buffer = await downloadMediaMessage(msg, 'buffer', { proxy: false }, {
          logger: pino({ level: 'silent' }),
          reuploadRequest: account.sock.updateMediaMessage
        });
      } catch (primaryError) {
        try {
          const refreshedMessage = await account.sock.updateMediaMessage(msg);
          buffer = await downloadMediaMessage(refreshedMessage, 'buffer', { proxy: false }, {
            logger: pino({ level: 'silent' }),
            reuploadRequest: account.sock.updateMediaMessage
          });
        } catch (refreshError) {
          if (typeof downloadContentFromMessage !== 'function') throw primaryError;
          const refreshedContent = unwrapMessageContent(msg.message);
          const refreshedMedia = refreshedContent[`${type}Message`] || mediaMessage;
          const stream = await downloadContentFromMessage(refreshedMedia, type, { proxy: false });
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          buffer = Buffer.concat(chunks);
        }
      }
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error('O WhatsApp retornou um arquivo vazio.');
      if (buffer.length > this.maxMediaBytes) {
        const limitMb = Math.round(this.maxMediaBytes / (1024 * 1024));
        return { type, fileName, url: null, fallbackText: `⚠️ [Mídia acima do limite de ${limitMb} MB]` };
      }
      await fs.promises.mkdir(MEDIA_DIR, { recursive: true });
      await fs.promises.writeFile(path.join(MEDIA_DIR, fileName), buffer);
      return { type, fileName, url: `/api/media/${fileName}`, fallbackText };
    } catch (error) {
      console.warn(`[WhatsApp:${account.name}] falha ao baixar mídia: ${error.message}`);
      return { type, fileName, url: null, fallbackText };
    }
  }

  startMediaCleanup() {
    if (this.mediaCleanupTimer || this.mediaRetentionDays <= 0) return;
    this.cleanupExpiredMedia().catch(error => console.warn(`Falha na limpeza de mídias: ${error.message}`));
    this.mediaCleanupTimer = setInterval(() => {
      this.cleanupExpiredMedia().catch(error => console.warn(`Falha na limpeza de mídias: ${error.message}`));
    }, this.mediaCleanupHours * 60 * 60 * 1000);
    this.mediaCleanupTimer.unref?.();
  }

  async cleanupExpiredMedia() {
    let entries;
    try {
      entries = await fs.promises.readdir(MEDIA_DIR, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return 0;
      throw error;
    }
    const cutoff = Date.now() - (this.mediaRetentionDays * 24 * 60 * 60 * 1000);
    let removed = 0;
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const absolutePath = path.join(MEDIA_DIR, entry.name);
      const stats = await fs.promises.stat(absolutePath);
      if (stats.mtimeMs >= cutoff) continue;
      await fs.promises.unlink(absolutePath);
      removed += 1;
    }
    if (removed > 0) console.log(`🧹 ${removed} mídia(s) expirada(s) removida(s).`);
    return removed;
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

  async sendMediaMessage(target, fileBuffer, mediaType, caption, fileName, accountId = null, mimeType = null, voiceNote = false) {
    const account = this.selectAccount(accountId);
    if (!account?.sock || account.status !== 'connected') return false;
    let jid = target.includes('@') ? target : `${target.replace(/\D/g, '')}@s.whatsapp.net`;
    const payloads = {
      image: { image: fileBuffer, caption: caption || '' },
      audio: buildAudioPayload(fileBuffer, mimeType, voiceNote),
      video: { video: fileBuffer, mimetype: mimeType || 'video/mp4', caption: caption || '' },
      document: { document: fileBuffer, mimetype: mimeType || 'application/octet-stream', fileName: fileName || 'documento', caption: caption || '' }
    };
    try {
      const result = await account.sock.sendMessage(jid, payloads[mediaType]);
      if (mediaType === 'audio') {
        console.log(`[WhatsApp:${account.name}] áudio enviado (${payloads.audio.mimetype}, ptt=${payloads.audio.ptt}, id=${result?.key?.id || 'n/d'}).`);
      }
      return true;
    }
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
      routingMode: account.routingMode,
      departmentId: account.departmentId,
      departmentName: account.departmentName,
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

const whatsappService = new WhatsAppService();
whatsappService._test = { unwrapMessageContent, safeFileToken, normalizeAccountRouting };

module.exports = whatsappService;
