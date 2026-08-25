// ==========================================================================
// BRISOFT DESK - WHATSAPP CONTROLLER
// ==========================================================================

const whatsappService = require('../services/whatsapp.service');

class WhatsAppController {
  getStatus(req, res) {
    const status = whatsappService.getStatus();
    return res.json({ success: true, ...status });
  }

  async connect(req, res) {
    try {
      if (whatsappService.connectionStatus !== 'connected' && whatsappService.connectionStatus !== 'scan_qr') {
        await whatsappService.initialize();
      }
      const status = whatsappService.getStatus();
      return res.json({ success: true, ...status });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async disconnect(req, res) {
    try {
      await whatsappService.disconnect();
      return res.json({ success: true, message: 'WhatsApp desconectado com sucesso' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new WhatsAppController();
