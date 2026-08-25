// ==========================================================================
// BRISOFT DESK - WHATSAPP QR-CODE CONNECTOR (BAILEYS MULTI-DEVICE)
// ==========================================================================

const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const pino = require('pino');
const ticketService = require('./ticket.service');

// Mapa local: LID → número de telefone real
// Populado pelo evento 'contacts.upsert' / 'contacts.update'
const lidToPhoneMap = new Map();

/**
 * Tenta resolver o JID real (telefone) a partir de um JID @lid
 * usando o mapa de contatos populado pelo Baileys.
 * Se não conseguir resolver, retorna o JID original.
 */
function resolveJid(jid, sock) {
  if (!jid) return jid;
  if (!jid.includes('@lid')) return jid;

  // Verifica no mapa de contatos (lid → phone)
  const resolved = lidToPhoneMap.get(jid);
  if (resolved) {
    console.log(`🔍 LID resolvido: ${jid} → ${resolved}`);
    return resolved;
  }

  // Tenta resolver via store de contatos do Baileys
  if (sock?.store?.contacts) {
    const contact = sock.store.contacts[jid];
    if (contact?.id && !contact.id.includes('@lid')) {
      lidToPhoneMap.set(jid, contact.id);
      return contact.id;
    }
  }

  console.warn(`⚠️ Não foi possível resolver LID ${jid}. Usando JID original.`);
  return jid;
}

/**
 * Extrai o número de telefone display de um JID
 * JID @lid → tenta resolver; @s.whatsapp.net → extrai número
 */
function getPhoneFromJid(jid) {
  if (!jid) return '';
  if (jid.includes('@s.whatsapp.net')) {
    return jid.replace('@s.whatsapp.net', '');
  }
  // Tenta no mapa
  const resolved = lidToPhoneMap.get(jid);
  if (resolved && resolved.includes('@s.whatsapp.net')) {
    return resolved.replace('@s.whatsapp.net', '');
  }
  // Retorna o ID bruto (LID) como fallback
  return jid.replace('@lid', '').replace('@s.whatsapp.net', '');
}

class WhatsAppService {
  constructor() {
    this.sock = null;
    this.qrCodeBase64 = null;
    this.connectionStatus = 'disconnected';
    this.io = null;
    this.isInitializing = false;
    this.reconnectTimeout = null;
  }

  setIO(ioInstance) {
    this.io = ioInstance;
  }

  async initialize() {
    if (this.isInitializing) {
      console.log('⏳ Conexão já em andamento, aguardando...');
      return;
    }
    this.isInitializing = true;

    console.log('🔄 Inicializando sessão WhatsApp...');
    const authDir = path.join(__dirname, '../../session_auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    try {
      const {
        default: makeWASocket,
        useMultiFileAuthState,
        DisconnectReason
      } = await import('@whiskeysockets/baileys');

      const { state, saveCreds } = await useMultiFileAuthState(authDir);

      if (this.sock) {
        try {
          this.sock.ev.removeAllListeners();
          this.sock.end();
        } catch (e) {}
      }

      this.sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Brisoft Desk', 'Chrome', '1.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false
      });

      this.sock.ev.on('creds.update', saveCreds);

      // Popula o mapa LID → telefone a partir dos contatos
      this.sock.ev.on('contacts.upsert', (contacts) => {
        for (const contact of contacts) {
          if (contact.id && contact.lid && contact.id.includes('@s.whatsapp.net')) {
            lidToPhoneMap.set(contact.lid, contact.id);
            console.log(`📇 Contato mapeado: ${contact.lid} → ${contact.id}`);
          }
        }
      });

      this.sock.ev.on('contacts.update', (updates) => {
        for (const update of updates) {
          if (update.id && update.lid && update.id.includes('@s.whatsapp.net')) {
            lidToPhoneMap.set(update.lid, update.id);
          }
        }
      });

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log('📲 QR Code gerado! Pronto para escanear.');
          this.qrCodeBase64 = await QRCode.toDataURL(qr);
          this.connectionStatus = 'scan_qr';
          if (this.io) {
            this.io.emit('whatsapp_qr', { qrCode: this.qrCodeBase64 });
            this.io.emit('whatsapp_status', { status: 'scan_qr' });
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error)?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
          const shouldReconnect = !isLoggedOut;

          console.log(`⚠️ Conexão fechada (Código: ${statusCode}). Reconectando: ${shouldReconnect}`);
          this.connectionStatus = 'disconnected';
          this.isInitializing = false;

          if (this.io) {
            this.io.emit('whatsapp_status', { status: 'disconnected' });
          }

          if (isLoggedOut) {
            console.log('🔄 Sessão limpa pelo dispositivo. Preparando novo QR Code...');
            try { fs.rmSync(authDir, { recursive: true, force: true }); } catch (e) {}
            if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => this.initialize(), 2000);
          } else if (shouldReconnect) {
            if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => this.initialize(), 5000);
          }
        } else if (connection === 'open') {
          console.log('✅ WhatsApp conectado com sucesso à Brisoft Desk!');
          this.connectionStatus = 'connected';
          this.qrCodeBase64 = null;
          this.isInitializing = false;
          if (this.io) {
            this.io.emit('whatsapp_status', { status: 'connected' });
          }
        }
      });

      // Ouvinte de mensagens recebidas
      this.sock.ev.on('messages.upsert', async (m) => {
        if (m.type === 'notify') {
          for (const msg of m.messages) {
            if (!msg.key.fromMe && msg.message) {
              const rawJid = msg.key.remoteJid;
              if (!rawJid ||
                  rawJid.includes('@g.us') ||
                  rawJid.includes('@newsletter') ||
                  rawJid.includes('status@broadcast')) continue;

              // Tenta resolver o JID real (LID → telefone)
              const resolvedJid = resolveJid(rawJid, this.sock);
              const phone = getPhoneFromJid(resolvedJid);

              const text = msg.message.conversation ||
                           msg.message.extendedTextMessage?.text ||
                           msg.message.imageMessage?.caption ||
                           msg.message.videoMessage?.caption ||
                           '[Mídia/Arquivo]';

              const senderName = msg.pushName || `Cliente ${phone.slice(-4)}`;

              console.log(`📩 Mensagem de ${senderName} | JID: ${rawJid} → ${resolvedJid} | Tel: ${phone}`);

              await ticketService.processIncomingMessage({
                from: resolvedJid,
                rawJid: rawJid,
                phone: phone,
                senderName,
                text,
                timestamp: msg.messageTimestamp,
                messageId: msg.key.id
              }, this.io, this);
            }
          }
        }
      });

    } catch (err) {
      console.error('Erro ao inicializar Baileys WhatsApp:', err);
      this.connectionStatus = 'disconnected';
    }
  }

  async sendMessage(target, text) {
    if (!this.sock || this.connectionStatus !== 'connected') {
      console.warn('⚠️ WhatsApp não está conectado. Mensagem não enviada.');
      return false;
    }

    try {
      let jid = target;

      // Se não tem @, é número de telefone puro → adiciona @s.whatsapp.net
      if (!jid.includes('@')) {
        const clean = target.replace(/\D/g, '');
        jid = `${clean}@s.whatsapp.net`;
      }

      // Se for @lid, tenta resolver para @s.whatsapp.net primeiro
      if (jid.includes('@lid')) {
        const resolved = resolveJid(jid, this.sock);
        if (resolved && !resolved.includes('@lid')) {
          console.log(`🔄 LID resolvido para envio: ${jid} → ${resolved}`);
          jid = resolved;
        }
      }

      console.log(`🚀 Enviando para ${jid}: "${text}"`);
      await this.sock.sendMessage(jid, { text });
      console.log(`✅ Mensagem entregue para ${jid}`);
      return true;
    } catch (err) {
      console.error(`❌ Erro ao enviar para ${target}:`, err.message || err);

      // Fallback: se @lid falhar, tenta @s.whatsapp.net
      if (target.includes('@lid')) {
        try {
          const numericPart = target.replace('@lid', '').replace(/\D/g, '');
          const fallbackJid = `${numericPart}@s.whatsapp.net`;
          console.log(`🔄 Fallback: enviando para ${fallbackJid}...`);
          await this.sock.sendMessage(fallbackJid, { text });
          console.log(`✅ Fallback funcionou: ${fallbackJid}`);
          return true;
        } catch (fallbackErr) {
          console.error(`❌ Fallback falhou:`, fallbackErr.message);
        }
      }
      return false;
    }
  }

  getStatus() {
    return {
      status: this.connectionStatus,
      qrCode: this.qrCodeBase64
    };
  }

  async disconnect() {
    if (this.sock) {
      await this.sock.logout();
      this.connectionStatus = 'disconnected';
      this.qrCodeBase64 = null;
      if (this.io) this.io.emit('whatsapp_status', { status: 'disconnected' });
    }
  }
}

module.exports = new WhatsAppService();
