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

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET é obrigatório e deve ter pelo menos 32 caracteres. Configure server/.env.');
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

// Configuração do CORS e Socket.io
const allowedOrigins = (process.env.ALLOWED_ORIGINS || `http://localhost:${process.env.PORT || 3000}`)
  .split(',').map(origin => origin.trim()).filter(Boolean);
const corsOptions = { origin: allowedOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE'] };

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

app.use(cors(corsOptions));
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

app.get('/api/health', (req, res) => res.json({ app: 'Brisoft Desk', status: 'online' }));

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
  if (socket.user.department_id) socket.join(`department:${socket.user.department_id}`);
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
