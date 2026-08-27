// ==========================================================================
// BRISOFT DESK - TICKET CONTROLLER
// ==========================================================================

const ticketService = require('../services/ticket.service');
const whatsappService = require('../services/whatsapp.service');

class TicketController {
  async listTickets(req, res) {
    try {
      const tickets = await ticketService.getTickets(req.user);
      return res.json({ success: true, tickets });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async getTicket(req, res) {
    try {
      const { id } = req.params;
      const ticket = await ticketService.getFullTicket(id, req.user);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket não encontrado' });
      return res.json({ success: true, ticket });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async sendMessage(req, res) {
    try {
      const { ticketId, text } = req.body;
      if (!ticketId || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ success: false, error: 'ticketId e text são obrigatórios' });
      }

      console.log(`📩 Requisição POST /api/tickets/send-message recebida: Ticket ${ticketId}, Texto: "${text}"`);

      const result = await ticketService.sendAgentMessage(
        ticketId,
        text.trim(),
        req.user,
        req.app.get('io'),
        whatsappService
      );

      if (!result || result.success === false) {
        return res.status(502).json({ success: false, error: result?.error || 'Falha ao enviar mensagem' });
      }
      return res.json({ success: true, result });
    } catch (err) {
      console.error('❌ Erro no controller sendMessage:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async sendMedia(req, res) {
    try {
      const ticketId = req.params.id;
      if (!ticketId || !Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ success: false, error: 'Arquivo e ticket são obrigatórios.' });
      }
      let fileName = 'arquivo';
      let caption = '';
      try { fileName = decodeURIComponent(String(req.get('x-file-name') || 'arquivo')); } catch (_) {}
      try { caption = decodeURIComponent(String(req.get('x-media-caption') || '')); } catch (_) {}
      const result = await ticketService.sendAgentMedia(ticketId, req.body, {
        fileName,
        caption,
        mimeType: req.get('x-file-type') || 'application/octet-stream',
        mediaType: req.get('x-media-type') || ''
      }, req.user, req.app.get('io'), whatsappService);
      if (!result || result.success === false) {
        return res.status(502).json({ success: false, error: result?.error || 'Falha ao enviar arquivo.' });
      }
      return res.json({ success: true, result });
    } catch (err) {
      console.error('❌ Erro no controller sendMedia:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async assumeTicket(req, res) {
    try {
      const { ticketId } = req.body;
      if (!ticketId) return res.status(400).json({ success: false, error: 'ticketId é obrigatório' });
      console.log(`👤 Atendimento assumido via API: Ticket ${ticketId} por ${req.user.name}`);
      const result = await ticketService.assumeTicket(ticketId, req.user, req.app.get('io'));
      if (!result || result.success === false) return res.status(400).json({ success: false, error: result?.error || 'Falha ao assumir atendimento' });
      return res.json({ success: true, result });
    } catch (err) {
      console.error('❌ Erro no controller assumeTicket:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async transferTicket(req, res) {
    try {
      const { ticketId, departmentId, departmentName, targetUserId, targetUserName, note } = req.body;
      if (!ticketId) return res.status(400).json({ success: false, error: 'ticketId é obrigatório' });
      if (!departmentId && !departmentName) return res.status(400).json({ success: false, error: 'Departamento de destino é obrigatório' });

      console.log(`Transferindo atendimento: Ticket ${ticketId} para ${departmentName || departmentId} por ${req.user.name}`);
      const result = await ticketService.transferTicket(
        ticketId,
        { departmentId, departmentName, targetUserId, targetUserName, note },
        req.user,
        req.app.get('io'),
        whatsappService
      );

      if (!result || result.success === false) {
        return res.status(400).json({ success: false, error: result?.error || 'Falha ao transferir atendimento' });
      }
      return res.json({ success: true, result });
    } catch (err) {
      console.error('❌ Erro no controller transferTicket:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async closeTicket(req, res) {
    try {
      const { ticketId } = req.body;
      if (!ticketId) return res.status(400).json({ success: false, error: 'ticketId é obrigatório' });
      console.log(`Encerrando atendimento: Ticket ${ticketId} por ${req.user.name}`);
      const result = await ticketService.closeTicket(
        ticketId,
        req.user,
        req.app.get('io'),
        whatsappService
      );
      if (!result || result.success === false) return res.status(400).json({ success: false, error: result?.error || 'Falha ao encerrar atendimento' });
      return res.json({ success: true, result });
    } catch (err) {
      console.error('❌ Erro no controller closeTicket:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async markAsRead(req, res) {
    try {
      const { ticketId } = req.body;
      if (!ticketId) return res.status(400).json({ success: false, error: 'ticketId é obrigatório' });
      const result = await ticketService.markAsRead(ticketId, req.user, req.app.get('io'));
      if (!result || result.success === false) return res.status(400).json({ success: false, error: result?.error || 'Falha ao marcar como lido' });
      return res.json({ success: true, result });
    } catch (err) {
      console.error('❌ Erro no controller markAsRead:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async listHistory(req, res) {
    try {
      const history = await ticketService.getHistory(req.user);
      return res.json({ success: true, history });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateContact(req, res) {
    try {
      const ticketId = req.params.id;
      const contactData = req.body;
      if (!ticketId) return res.status(400).json({ success: false, error: 'ticketId é obrigatório' });
      const result = await ticketService.updateContact(ticketId, contactData, req.user, req.app.get('io'));
      if (!result || result.success === false) {
        return res.status(400).json({ success: false, error: result?.error || 'Falha ao atualizar dados do contato' });
      }
      return res.json({ success: true, ticket: result.ticket });
    } catch (err) {
      console.error('❌ Erro no controller updateContact:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async getKpis(req, res) {
    try {
      const kpis = await ticketService.getKpis(req.user);
      return res.json({ success: true, kpis });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new TicketController();
