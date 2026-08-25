// ==========================================================================
// BRISOFT DESK - TICKET CONTROLLER
// ==========================================================================

const ticketService = require('../services/ticket.service');
const whatsappService = require('../services/whatsapp.service');

class TicketController {
  async listTickets(req, res) {
    try {
      const tickets = await ticketService.getTickets();
      return res.json({ success: true, tickets });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async sendMessage(req, res) {
    try {
      const { ticketId, text, agentName } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, error: 'text é obrigatório' });
      }

      console.log(`📩 Requisição POST /api/tickets/send-message recebida: Ticket ${ticketId}, Texto: "${text}"`);

      const result = await ticketService.sendAgentMessage(
        ticketId,
        text,
        agentName || 'Atendente',
        req.app.get('io'),
        whatsappService
      );

      return res.json({ success: true, result });
    } catch (err) {
      console.error('❌ Erro no controller sendMessage:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async assumeTicket(req, res) {
    try {
      const { ticketId, agentName } = req.body;
      console.log(`👤 Atendimento assumido via API: Ticket ${ticketId} por ${agentName}`);
      const result = await ticketService.assumeTicket(ticketId, agentName || 'Atendente', req.app.get('io'));
      return res.json({ success: true, result });
    } catch (err) {
      console.error('❌ Erro no controller assumeTicket:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async closeTicket(req, res) {
    try {
      const { ticketId, agentName } = req.body;
      console.log(`Encerrando atendimento: Ticket ${ticketId} por ${agentName}`);
      const result = await ticketService.closeTicket(
        ticketId,
        agentName || 'Atendente',
        req.app.get('io'),
        whatsappService
      );
      return res.json({ success: true, result });
    } catch (err) {
      console.error('❌ Erro no controller closeTicket:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async markAsRead(req, res) {
    try {
      const { ticketId } = req.body;
      const result = await ticketService.markAsRead(ticketId, req.app.get('io'));
      return res.json({ success: true, result });
    } catch (err) {
      console.error('❌ Erro no controller markAsRead:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async listHistory(req, res) {
    try {
      const history = await ticketService.getHistory();
      return res.json({ success: true, history });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async getKpis(req, res) {
    try {
      const kpis = await ticketService.getKpis();
      return res.json({ success: true, kpis });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new TicketController();
