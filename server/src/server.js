// ==========================================================================
// BRISOFT DESK - MAIN SERVER ENTRYPOINT
// Express + Socket.io + WhatsApp Web Service
// ==========================================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();
const { installConsoleCapture } = require('./services/log.service');
installConsoleCapture();

const apiRoutes = require('./routes/api');
const whatsappService = require('./services/whatsapp.service');
const internalChatService = require('./services/internal-chat.service');
const ticketService = require('./services/ticket.service');
const { initTempAdmin } = require('./controllers/auth.controller');
const { resolveAuthenticatedUser } = require('./middleware/auth.middleware');
const { supabase, isSupabaseConfigured } = require('./config/supabase');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET é obrigatório e deve ter pelo menos 32 caracteres. Configure server/.env.');
}
if (process.env.NODE_ENV === 'production') {
  for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[key]) throw new Error(`${key} é obrigatório em produção.`);
  }
}

process.on('uncaughtException', (err) => {
  console.error('❌ Erro fatal do servidor:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ Promise rejeitada sem tratamento:', reason);
  process.exit(1);
});

const path = require('path');

const app = express();
const server = http.createServer(app);
app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// Configuração do CORS e Socket.io
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`)
  .split(',').map(origin => origin.trim()).filter(Boolean);
const corsOptions = { origin: allowedOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE'] };

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

app.use(cors(corsOptions));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=(), microphone=(self)');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com https://cdn.jsdelivr.net data:; img-src 'self' data: blob: https:; media-src 'self' blob:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

const apiRateLimits = new Map();
const RATE_WINDOW_MS = 5 * 60 * 1000; // janela de 5 minutos
const RATE_LIMIT = 900;               // máximo de requisições por janela

// Limpeza proativa a cada 60s — impede crescimento ilimitado do mapa
// mesmo em cenários de muitos IPs distintos (ataque distribuído)
const rateLimitCleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of apiRateLimits) {
    if (now - entry.startedAt >= RATE_WINDOW_MS) apiRateLimits.delete(key);
  }
}, 60 * 1000);
rateLimitCleanup.unref?.(); // não impede o processo de encerrar

app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  const now = Date.now();
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const bearer = String(req.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  const identity = bearer ? crypto.createHash('sha256').update(bearer).digest('hex').slice(0, 16) : 'anonymous';
  const key = `${ip}:${identity}`;
  const current = apiRateLimits.get(key);
  const entry = !current || now - current.startedAt >= RATE_WINDOW_MS ? { startedAt: now, count: 0 } : current;
  entry.count += 1;
  apiRateLimits.set(key, entry);
  res.setHeader('RateLimit-Limit', String(RATE_LIMIT));
  res.setHeader('RateLimit-Remaining', String(Math.max(0, RATE_LIMIT - entry.count)));
  if (entry.count > RATE_LIMIT) return res.status(429).json({ success: false, error: 'Muitas requisições. Aguarde alguns minutos.' });
  return next();
});
app.use(express.json({ limit: '1mb' }));
// Cria pasta para armazenar mídias do WhatsApp se não existir
const fs = require('fs');
const mediaStoragePath = path.join(__dirname, '../public/media');
if (!fs.existsSync(mediaStoragePath)) {
  fs.mkdirSync(mediaStoragePath, { recursive: true });
}

// Serve o frontend Vue 3 (build de produção)
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// Guarda instância do Socket.io no app Express
app.set('io', io);
whatsappService.setIO(io);
internalChatService.setIO(io);

// Rotas da API
app.use('/api', apiRoutes);

app.get('/api/health', async (req, res) => {
  let database = 'not_configured';
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('system_settings').select('key', { head: true, count: 'exact' }).limit(1);
    database = error ? 'degraded' : 'online';
  }
  return res.status(database === 'degraded' ? 503 : 200).json({ app: 'Brisoft Desk', status: database === 'degraded' ? 'degraded' : 'online', database });
});

// SPA Fallback para Vue Router (HTML5 History Mode)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/media') || req.path.startsWith('/socket.io')) {
    return next();
  }
  return res.sendFile(path.join(clientDistPath, 'index.html'));
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Não autenticado'));
  resolveAuthenticatedUser(token)
    .then((user) => {
      socket.user = user;
      const decoded = jwt.decode(token);
      if (decoded?.exp) {
        const remainingMs = Math.max(0, decoded.exp * 1000 - Date.now());
        socket.authExpiryTimer = setTimeout(() => {
          socket.emit('session_expired');
          socket.disconnect(true);
        }, remainingMs);
      }
      next();
    })
    .catch(() => next(new Error('Sessão inválida ou expirada')));
});

let lastSeenMap = {};

async function initLastSeen() {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'user_last_seen')
        .maybeSingle();
      if (data?.value && typeof data.value === 'object') {
        lastSeenMap = { ...data.value };
      }

      // Preenche com últimas mensagens para usuários que ainda não tenham registro
      const { data: recentMsgs } = await supabase
        .from('internal_messages')
        .select('sender_id, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (recentMsgs && Array.isArray(recentMsgs)) {
        for (const m of recentMsgs) {
          if (m.sender_id && !lastSeenMap[m.sender_id]) {
            lastSeenMap[m.sender_id] = m.created_at;
          }
        }
      }
    } catch (_) {}
  }
  internalChatService.setLastSeenMap(lastSeenMap);
}

let saveLastSeenTimeout = null;
function persistLastSeen() {
  internalChatService.setLastSeenMap(lastSeenMap);
  if (saveLastSeenTimeout) clearTimeout(saveLastSeenTimeout);
  saveLastSeenTimeout = setTimeout(async () => {
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('system_settings')
          .upsert({
            key: 'user_last_seen',
            value: lastSeenMap,
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });
      } catch (_) {}
    }
  }, 2000);
  saveLastSeenTimeout.unref?.();
}

// Socket.io Connection Handler
async function broadcastOnlineUsers() {
  try {
    const sockets = await io.fetchSockets();
    const userMap = new Map();
    const realUserIds = [];

    for (const s of sockets) {
      if (s.user?.id) {
        userMap.set(s.user.id, {
          id: s.user.id,
          name: s.user.name,
          role: s.user.role,
          avatar_url: s.user.avatar_url || null
        });
        if (s.user.id !== '__temp_admin__') {
          realUserIds.push(s.user.id);
        }
      }
    }

    if (realUserIds.length > 0 && isSupabaseConfigured()) {
      try {
        const { data: dbUsers, error } = await supabase
          .from('users')
          .select('id, name, role, avatar_url')
          .in('id', realUserIds);

        if (!error && Array.isArray(dbUsers)) {
          for (const u of dbUsers) {
            const entry = userMap.get(u.id);
            if (entry) {
              if (u.name) entry.name = u.name;
              if (u.role) entry.role = u.role;
              if (u.avatar_url) entry.avatar_url = u.avatar_url;
            }
          }
        }
      } catch (_) {}
    }

    const users = Array.from(userMap.values());
    io.emit('online_users', {
      count: users.length,
      users,
      last_seen: lastSeenMap
    });
  } catch (_) {}
}

global.broadcastOnlineUsers = broadcastOnlineUsers;

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado via WebSocket: ${socket.id}`);

  socket.join(`user:${socket.user.id}`);
  socket.join('company:general');
  const socketDepartments = [...new Set([...(socket.user.department_ids || []), socket.user.department_id].filter(Boolean))];
  socketDepartments.forEach(departmentId => socket.join(`department:${departmentId}`));
  if (socket.user.role === 'Administrador') socket.join('admins');

  // Indicador de digitação no chat interno
  socket.on('internal_typing', (data) => {
    if (!data?.conversationId) return;
    socket.broadcast.emit('internal_user_typing', {
      conversationId: data.conversationId,
      userId: socket.user.id,
      userName: socket.user.name,
      isTyping: Boolean(data.isTyping)
    });
  });

  // Envia status atual do WhatsApp assim que o cliente conecta
  socket.emit('whatsapp_status', whatsappService.getStatusForUser(socket.user));

  // Transmite lista e total de usuários online
  broadcastOnlineUsers();

  socket.on('disconnect', () => {
    if (socket.authExpiryTimer) clearTimeout(socket.authExpiryTimer);
    console.log(`❌ Cliente desconectado: ${socket.id}`);
    const userId = socket.user?.id;
    setTimeout(async () => {
      if (userId && userId !== '__temp_admin__') {
        const sockets = await io.fetchSockets();
        const stillConnected = sockets.some(s => s.user?.id === userId);
        if (!stillConnected) {
          lastSeenMap[userId] = new Date().toISOString();
          persistLastSeen();
        }
      }
      broadcastOnlineUsers();
    }, 500);
  });
});

// Inicialização do Servidor
const PORT = process.env.PORT || 3000;
let businessHoursTimer = null;
let disconnectCleanupTimer = null;
async function startServer() {
  await initTempAdmin();
  await initLastSeen();
  server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 BRISOFT DESK SERVER RODANDO NA PORTA ${PORT}`);
  console.log(`🌐 API Endpoint: http://localhost:${PORT}`);
  console.log('====================================================');

  // Inicia conexão do WhatsApp automaticamente se configurado
  if (process.env.WHATSAPP_AUTO_RECONNECT !== 'false') {
    whatsappService.initializeAll();
  }
  const releaseReserved = () => ticketService.releaseScheduledTickets(io, whatsappService)
    .then(count => { if (count) console.log(`🕒 ${count} atendimento(s) liberado(s) no início do expediente.`); })
    .catch(error => console.warn(`Falha na liberação de atendimentos reservados: ${error.message}`));
  releaseReserved();
  businessHoursTimer = setInterval(releaseReserved, 30 * 1000);
  businessHoursTimer.unref?.();

  // Limpeza periódica de atendimentos expirados por desconexão do WhatsApp
  const cleanupDisconnected = () => ticketService.cleanupExpiredDisconnectedTickets(io, whatsappService)
    .catch(err => console.warn(`Falha na limpeza periódica de atendimentos expirados: ${err.message}`));
  cleanupDisconnected();
  disconnectCleanupTimer = setInterval(cleanupDisconnected, 60 * 1000);
  disconnectCleanupTimer.unref?.();
  });
}

startServer().catch((error) => {
  console.error('❌ Falha ao iniciar servidor:', error);
  process.exit(1);
});

async function gracefulShutdown(signal) {
  console.log(`Encerramento solicitado (${signal}). Salvando sessões...`);
  let backupTimeout;
  if (businessHoursTimer) clearInterval(businessHoursTimer);
  if (disconnectCleanupTimer) clearInterval(disconnectCleanupTimer);
  try {
    await whatsappService.closeAllSockets(signal);
  } catch (err) {
    console.warn('Erro ao fechar sockets no shutdown:', err.message);
  }
  await Promise.race([
    whatsappService.backupAllSessions(),
    new Promise(resolve => {
      backupTimeout = setTimeout(() => {
        console.warn('Tempo limite do backup final atingido; continuando o encerramento.');
        resolve();
      }, 7000);
    })
  ]).catch(error => console.warn(`Backup final incompleto: ${error.message}`));
  clearTimeout(backupTimeout);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGINT', () => gracefulShutdown('SIGINT'));
