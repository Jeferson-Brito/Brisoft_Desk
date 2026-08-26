const whatsappService = require('../services/whatsapp.service');

class WhatsAppController {
  getStatus(req, res) {
    const status = req.user?.role === 'Administrador' ? whatsappService.getStatus() : whatsappService.getPublicStatus();
    return res.json({ success: true, ...status });
  }

  listAccounts(req, res) {
    return res.json({ success: true, accounts: whatsappService.getAccounts(true) });
  }

  async createAccount(req, res) {
    try {
      const account = await whatsappService.createAccount(req.body?.name);
      return res.status(201).json({ success: true, account });
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  async connectAccount(req, res) {
    try {
      const account = await whatsappService.initialize(req.params.id);
      return res.json({ success: true, account });
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  async disconnectAccount(req, res) {
    try {
      await whatsappService.disconnect(req.params.id);
      return res.json({ success: true, message: 'Conta desconectada. Agora é possível vincular outro número.' });
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  async removeAccount(req, res) {
    try {
      await whatsappService.removeAccount(req.params.id);
      return res.json({ success: true, message: 'Conta removida com sucesso.' });
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }
}

module.exports = new WhatsAppController();
