// ==========================================================================
// BRISOFT DESK - MAIN SERVER ENTRYPOINT
// Express + Socket.io + WhatsApp Web Service
// ==========================================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/api');
const whatsappService = require('./services/whatsapp.service');

process.on('uncaughtException', (err) => {
  console.warn('⚠️ Alerta do Servidor (Uncaught Exception):', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.warn('⚠️ Alerta do Servidor (Unhandled Rejection):', reason?.message || reason);
});

const path = require('path');

const app = express();
const server = http.createServer(app);

// Configuração do CORS e Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve o frontend (index.html e assets) via HTTP
// Isso resolve o problema do file:// que quebra o WebSocket persistente
const frontendPath = path.join(__dirname, '../../');
app.use(express.static(frontendPath));

// Guarda instância do Socket.io no app Express
app.set('io', io);
whatsappService.setIO(io);

// Rotas da API
app.use('/api', apiRoutes);

// Rota raiz de status
app.get('/', (req, res) => {
  res.json({
    app: 'Brisoft Desk API & Real-time Server',
    version: '1.0.0',
    status: 'online',
    whatsapp: whatsappService.getStatus()
  });
});

// Socket.io Connection Handler
io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado via WebSocket: ${socket.id}`);

  // Envia status atual do WhatsApp assim que o cliente conecta
  socket.emit('whatsapp_status', whatsappService.getStatus());

  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
  });
});

// Inicialização do Servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 BRISOFT DESK SERVER RODANDO NA PORTA ${PORT}`);
  console.log(`🌐 API Endpoint: http://localhost:${PORT}`);
  console.log('====================================================');

  // Inicia conexão do WhatsApp automaticamente se configurado
  if (process.env.WHATSAPP_AUTO_RECONNECT !== 'false') {
    whatsappService.initialize();
  }
});
