// ==========================================================================
// BRISOFT DESK - API ROUTES
// ==========================================================================

const express = require('express');
const path = require('path');
const router = express.Router();

const ticketController = require('../controllers/ticket.controller');
const ticketService = require('../services/ticket.service');
const whatsappController = require('../controllers/whatsapp.controller');
const departmentController = require('../controllers/department.controller');
const settingsController = require('../controllers/settings.controller');
const authController = require('../controllers/auth.controller');
const usersController = require('../controllers/users.controller');
const systemController = require('../controllers/system.controller');
const contactsController = require('../controllers/contacts.controller');
const { requireAuth, requireAdmin, loginRateLimit } = require('../middleware/auth.middleware');

// ==========================================================================
// ROTAS PÚBLICAS (sem autenticação)
// ==========================================================================
router.post('/auth/login', loginRateLimit, (req, res) => authController.login(req, res));
router.post('/auth/logout', (req, res) => authController.logout(req, res));

// ==========================================================================
// ROTAS PROTEGIDAS (requerem JWT válido)
// ==========================================================================
router.get('/auth/me', requireAuth, (req, res) => authController.me(req, res));
router.get('/media/:filename', requireAuth, async (req, res) => {
  const filename = path.basename(req.params.filename || '');
  if (!filename || filename !== req.params.filename || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return res.status(400).json({ success: false, error: 'Arquivo inválido.' });
  }
  if (!(await ticketService.canAccessMedia(filename, req.user))) {
    return res.status(404).json({ success: false, error: 'Mídia não encontrada.' });
  }
  return res.sendFile(path.join(__dirname, '../../public/media', filename), (error) => {
    if (error && !res.headersSent) res.status(error.statusCode || 404).json({ success: false, error: 'Mídia não encontrada.' });
  });
});

// Rotas de Usuários (apenas administradores)
router.get('/users', requireAuth, requireAdmin, (req, res) => usersController.listUsers(req, res));
router.post('/users', requireAuth, requireAdmin, (req, res) => usersController.createUser(req, res));
router.put('/users/:id', requireAuth, requireAdmin, (req, res) => usersController.updateUser(req, res));
router.delete('/users/:id', requireAuth, requireAdmin, (req, res) => usersController.deleteUser(req, res));

// Rotas de Tickets / Atendimentos
router.get('/tickets', requireAuth, (req, res) => ticketController.listTickets(req, res));
router.get('/tickets/history', requireAuth, (req, res) => ticketController.listHistory(req, res));
router.get('/tickets/:id', requireAuth, (req, res) => ticketController.getTicket(req, res));
router.put('/tickets/:id/contact', requireAuth, (req, res) => ticketController.updateContact(req, res));
router.post('/tickets/send-message', requireAuth, (req, res) => ticketController.sendMessage(req, res));
router.post('/tickets/assume', requireAuth, (req, res) => ticketController.assumeTicket(req, res));
router.post('/tickets/transfer', requireAuth, (req, res) => ticketController.transferTicket(req, res));
router.post('/tickets/close', requireAuth, (req, res) => ticketController.closeTicket(req, res));
router.post('/tickets/read', requireAuth, (req, res) => ticketController.markAsRead(req, res));
router.get('/dashboard/kpis', requireAuth, (req, res) => ticketController.getKpis(req, res));

// Rotas de Departamentos
router.get('/departments', requireAuth, (req, res) => departmentController.listDepartments(req, res));
router.post('/departments', requireAuth, requireAdmin, (req, res) => departmentController.saveDepartment(req, res));
router.delete('/departments/:id', requireAuth, requireAdmin, (req, res) => departmentController.deleteDepartment(req, res));

// Rotas de Configurações (Settings)
router.get('/settings', requireAuth, (req, res) => settingsController.getSettings(req, res));
router.post('/settings', requireAuth, requireAdmin, (req, res) => settingsController.saveSetting(req, res));

// Diagnóstico do servidor (apenas administradores)
router.get('/system/status', requireAuth, requireAdmin, (req, res) => systemController.getStatus(req, res));
router.get('/system/logs', requireAuth, requireAdmin, (req, res) => systemController.getLogs(req, res));
router.delete('/system/logs', requireAuth, requireAdmin, (req, res) => systemController.clearLogs(req, res));

// Rotas de Contatos (Clientes)
router.get('/contacts', requireAuth, (req, res) => contactsController.listContacts(req, res));
router.post('/contacts', requireAuth, (req, res) => contactsController.createContact(req, res));
router.put('/contacts/:id', requireAuth, (req, res) => contactsController.updateContact(req, res));
router.delete('/contacts/:id', requireAuth, requireAdmin, (req, res) => contactsController.deleteContact(req, res));

// Rotas do WhatsApp
router.get('/whatsapp/status', requireAuth, (req, res) => whatsappController.getStatus(req, res));
router.get('/whatsapp/accounts', requireAuth, requireAdmin, (req, res) => whatsappController.listAccounts(req, res));
router.post('/whatsapp/accounts', requireAuth, requireAdmin, (req, res) => whatsappController.createAccount(req, res));
router.post('/whatsapp/accounts/:id/connect', requireAuth, requireAdmin, (req, res) => whatsappController.connectAccount(req, res));
router.post('/whatsapp/accounts/:id/disconnect', requireAuth, requireAdmin, (req, res) => whatsappController.disconnectAccount(req, res));
router.delete('/whatsapp/accounts/:id', requireAuth, requireAdmin, (req, res) => whatsappController.removeAccount(req, res));

module.exports = router;
