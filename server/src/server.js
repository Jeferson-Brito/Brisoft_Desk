// ==========================================================================
// BRISOFT DESK - MAIN SERVER ENTRYPOINT
// Express + Socket.io + WhatsApp Web Service
// ==========================================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { installConsoleCapture } = require('./services/log.service');
installConsoleCapture();

const apiRoutes = require('./routes/api');
const whatsappService = require('./services/whatsapp.service');
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
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' blob:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

const apiRateLimits = new Map();
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  const now = Date.now();
  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  const current = apiRateLimits.get(key);
  const entry = !current || now - current.startedAt >= 5 * 60 * 1000 ? { startedAt: now, count: 0 } : current;
  entry.count += 1;
  apiRateLimits.set(key, entry);
  res.setHeader('RateLimit-Limit', '600');
  res.setHeader('RateLimit-Remaining', String(Math.max(0, 600 - entry.count)));
  if (entry.count > 600) return res.status(429).json({ success: false, error: 'Muitas requisições. Aguarde alguns minutos.' });
  if (apiRateLimits.size > 5000) for (const [entryKey, value] of apiRateLimits) if (now - value.startedAt >= 5 * 60 * 1000) apiRateLimits.delete(entryKey);
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

// Socket.io Connection Handler
io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado via WebSocket: ${socket.id}`);

  socket.join(`user:${socket.user.id}`);
  const socketDepartments = [...new Set([...(socket.user.department_ids || []), socket.user.department_id].filter(Boolean))];
  socketDepartments.forEach(departmentId => socket.join(`department:${departmentId}`));
  if (socket.user.role === 'Administrador') socket.join('admins');

  // Envia status atual do WhatsApp assim que o cliente conecta
  socket.emit('whatsapp_status', socket.user.role === 'Administrador'
    ? whatsappService.getStatus()
    : whatsappService.getPublicStatus());

  socket.on('disconnect', () => {
    if (socket.authExpiryTimer) clearTimeout(socket.authExpiryTimer);
    console.log(`❌ Cliente desconectado: ${socket.id}`);
  });
});

// Inicialização do Servidor
const PORT = process.env.PORT || 3000;
async function startServer() {
  await initTempAdmin();
  server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 BRISOFT DESK SERVER RODANDO NA PORTA ${PORT}`);
  console.log(`🌐 API Endpoint: http://localhost:${PORT}`);
  console.log('====================================================');

  // Inicia conexão do WhatsApp automaticamente se configurado
  if (process.env.WHATSAPP_AUTO_RECONNECT !== 'false') {
    whatsappService.initializeAll();
  }
  });
}

startServer().catch((error) => {
  console.error('❌ Falha ao iniciar servidor:', error);
  process.exit(1);
});

async function gracefulShutdown(signal) {
  console.log(`Encerramento solicitado (${signal}). Salvando sessões...`);
  await whatsappService.backupAllSessions().catch(() => {});
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGINT', () => gracefulShutdown('SIGINT'));
