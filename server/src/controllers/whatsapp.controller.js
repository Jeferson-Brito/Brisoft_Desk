const whatsappService = require('../services/whatsapp.service');

class WhatsAppController {
  getUserDepartmentIds(user) {
    if (!user) return [];
    const ids = [
      ...(Array.isArray(user.department_ids) ? user.department_ids : []),
      user.department_id
    ].filter(Boolean).map(String);
    return [...new Set(ids)];
  }

  isUserAuthorizedForAccount(user, account) {
    if (!user || !account) return false;
    if (user.role === 'Administrador') return true;
    const userDepts = this.getUserDepartmentIds(user);
    if (!userDepts.length) return false;
    const accountDept = account.departmentId ? String(account.departmentId) : null;
    const fallbackDept = account.fallbackDepartmentId ? String(account.fallbackDepartmentId) : null;
    return Boolean((accountDept && userDepts.includes(accountDept)) || (fallbackDept && userDepts.includes(fallbackDept)));
  }

  getStatus(req, res) {
    const status = req.user ? whatsappService.getStatusForUser(req.user) : whatsappService.getPublicStatus();
    return res.json({ success: true, ...status });
  }

  listAccounts(req, res) {
    const allAccounts = whatsappService.getAccounts(true);
    if (req.user?.role === 'Administrador') {
      return res.json({ success: true, accounts: allAccounts });
    }
    const filtered = allAccounts.filter(account => this.isUserAuthorizedForAccount(req.user, account));
    return res.json({ success: true, accounts: filtered });
  }

  async createAccount(req, res) {
    try {
      const account = await whatsappService.createAccount(req.body?.name, req.body || {});
      return res.status(201).json({ success: true, account });
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  async connectAccount(req, res) {
    try {
      const allAccounts = whatsappService.getAccounts(true);
      const targetAccount = allAccounts.find(a => String(a.id) === String(req.params.id));
      if (!targetAccount) {
        return res.status(404).json({ success: false, error: 'Conta de WhatsApp não encontrada.' });
      }
      if (!this.isUserAuthorizedForAccount(req.user, targetAccount)) {
        return res.status(403).json({ success: false, error: 'Você não tem permissão para gerenciar a conexão deste WhatsApp.' });
      }
      const account = await whatsappService.initialize(req.params.id);
      return res.json({ success: true, account });
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateAccount(req, res) {
    try {
      const account = await whatsappService.updateAccountRouting(req.params.id, req.body);
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
