// ==========================================================================
// BRISOFT DESK - API ROUTES
// ==========================================================================

const express = require('express');
const router = express.Router();

const ticketController = require('../controllers/ticket.controller');
const whatsappController = require('../controllers/whatsapp.controller');

const departmentController = require('../controllers/department.controller');
const settingsController = require('../controllers/settings.controller');

// Rotas de Tickets / Atendimentos
router.get('/tickets', (req, res) => ticketController.listTickets(req, res));
router.get('/tickets/history', (req, res) => ticketController.listHistory(req, res));
router.post('/tickets/send-message', (req, res) => ticketController.sendMessage(req, res));
router.post('/tickets/assume', (req, res) => ticketController.assumeTicket(req, res));
router.post('/tickets/close', (req, res) => ticketController.closeTicket(req, res));
router.post('/tickets/read', (req, res) => ticketController.markAsRead(req, res));
router.get('/dashboard/kpis', (req, res) => ticketController.getKpis(req, res));

// Rotas de Departamentos
router.get('/departments', (req, res) => departmentController.listDepartments(req, res));
router.post('/departments', (req, res) => departmentController.saveDepartment(req, res));
router.delete('/departments/:id', (req, res) => departmentController.deleteDepartment(req, res));

// Rotas de Configurações (Settings)
router.get('/settings', (req, res) => settingsController.getSettings(req, res));
router.post('/settings', (req, res) => settingsController.saveSetting(req, res));

// Rotas do WhatsApp
router.get('/whatsapp/status', (req, res) => whatsappController.getStatus(req, res));
router.post('/whatsapp/connect', (req, res) => whatsappController.connect(req, res));
router.post('/whatsapp/disconnect', (req, res) => whatsappController.disconnect(req, res));

module.exports = router;
