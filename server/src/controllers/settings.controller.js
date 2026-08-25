// ==========================================================================
// SETTINGS CONTROLLER (system_settings)
// ==========================================================================

const { supabase } = require('../config/supabase');

class SettingsController {
  
  async getSettings(req, res) {
    try {
      const { data, error } = await supabase.from('system_settings').select('*');
      
      if (error && error.code !== 'PGRST205') {
        throw error;
      }
      
      const settings = {};
      if (data) {
        data.forEach(item => {
          settings[item.key] = item.value;
        });
      }

      return res.json({ success: true, settings });
    } catch (error) {
      console.error('Erro ao buscar settings:', error);
      return res.status(500).json({ success: false, error: 'Erro interno ao buscar configurações.' });
    }
  }

  async saveSetting(req, res) {
    const { key, value } = req.body;
    if (!key || typeof value === 'undefined') {
      return res.status(400).json({ success: false, error: 'Chave (key) e valor (value) são obrigatórios.' });
    }

    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key, value, updated_at: new Date() }, { onConflict: 'key' });

      if (error) {
        throw error;
      }

      return res.json({ success: true, message: 'Configuração salva com sucesso.' });
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      return res.status(500).json({ success: false, error: 'Erro interno ao salvar configuração.' });
    }
  }

}

module.exports = new SettingsController();
