const internalChatService = require('../services/internal-chat.service');

class InternalChatController {
  async listConversations(req, res) {
    try {
      const conversations = await internalChatService.listConversations(req.user);
      return res.json({ success: true, conversations });
    } catch (error) {
      console.error('Erro ao listar conversas internas:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async listTeamMembers(req, res) {
    try {
      const members = await internalChatService.listTeamMembers(req.user);
      return res.json({ success: true, members });
    } catch (error) {
      console.error('Erro ao listar membros da equipe:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async getMessages(req, res) {
    try {
      const { id } = req.params;
      const messages = await internalChatService.getMessages(id);
      return res.json({ success: true, messages });
    } catch (error) {
      console.error('Erro ao obter mensagens internas:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async sendMessage(req, res) {
    try {
      const { id } = req.params;
      const { text, media_url, media_type, file_name, reply_to_id } = req.body;
      const message = await internalChatService.sendMessage(req.user, id, {
        text,
        media_url,
        media_type,
        file_name,
        reply_to_id
      });
      return res.json({ success: true, message });
    } catch (error) {
      console.error('Erro ao enviar mensagem interna:', error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  async startDirectChat(req, res) {
    try {
      const { targetUserId } = req.params;
      const conversation = await internalChatService.getOrCreateDirectChat(req.user, targetUserId);
      return res.json({ success: true, conversation });
    } catch (error) {
      console.error('Erro ao iniciar chat direto:', error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      await internalChatService.markAsRead(req.user, id);
      return res.json({ success: true });
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new InternalChatController();
