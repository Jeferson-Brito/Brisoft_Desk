// ==========================================================================
// BRISOFT DESK - DEPARTMENT CONTROLLER
// ==========================================================================

const { supabase } = require('../config/supabase');
const ticketService = require('../services/ticket.service');
const { isSupervisor, departmentIds } = require('../services/access-control.service');

function findLinkedWhatsAppAccounts(settingsValue, departmentId, departmentName = '') {
  if (!Array.isArray(settingsValue)) return [];
  const normalizedName = String(departmentName || '').trim().toLocaleLowerCase('pt-BR');
  return settingsValue.filter(account => {
    if (account?.routing_mode !== 'department') return false;
    if (String(account.department_id || '') === String(departmentId || '')) return true;
    return Boolean(normalizedName) && String(account.department_name || '').trim().toLocaleLowerCase('pt-BR') === normalizedName;
  });
}

class DepartmentController {
  
  // Listar todos os departamentos
  async listDepartments(req, res) {
    const defaultDepts = [
      { id: '1', name: 'B3 Eletrônica', color: '#2563eb', sla_target_minutes: 15 },
      { id: '2', name: 'Comercial', color: '#10b981', sla_target_minutes: 15 },
      { id: '3', name: 'Comercial eletrônica', color: '#06b6d4', sla_target_minutes: 15 },
      { id: '4', name: 'Financeiro', color: '#f59e0b', sla_target_minutes: 15 },
      { id: '5', name: 'Operacional', color: '#8b5cf6', sla_target_minutes: 15 },
      { id: '6', name: 'Recursos Humanos', color: '#ec4899', sla_target_minutes: 15 },
      { id: '7', name: 'Suporte Técnico', color: '#ea580c', sla_target_minutes: 15 },
      { id: '8', name: 'Suprimentos', color: '#64748b', sla_target_minutes: 15 }
    ];
    try {
      const { data, error } = await supabase.from('departments').select('*').order('name', { ascending: true });
      if (!error && data && data.length > 0) {
        const visible = isSupervisor(req.user) ? data.filter(item => departmentIds(req.user).includes(String(item.id))) : data;
        return res.json({ success: true, departments: visible });
      }
      const visibleDefaults = isSupervisor(req.user) ? defaultDepts.filter(item => departmentIds(req.user).includes(String(item.id))) : defaultDepts;
      return res.json({ success: true, departments: visibleDefaults });
    } catch (error) {
      console.warn('Aviso ao listar departamentos do Supabase, usando defaults:', error.message);
      return res.json({ success: true, departments: defaultDepts });
    }
  }

  // Criar ou atualizar departamento
  async saveDepartment(req, res) {
    try {
      const { id, name, color, sla_target_minutes } = req.body;
      
      if (!name) {
        return res.status(400).json({ success: false, error: 'Nome do departamento é obrigatório' });
      }

      let payload = {
        name,
        color: color || '#2563eb',
        sla_target_minutes: sla_target_minutes ? parseInt(sla_target_minutes, 10) : 15
      };

      let result;
      if (id) {
        // Atualiza
        result = await supabase.from('departments').update(payload).eq('id', id).select().single();
      } else {
        // Cria
        result = await supabase.from('departments').insert(payload).select().single();
      }

      if (result.error) throw result.error;

      ticketService.invalidateDepartmentCache();

      res.json({ success: true, department: result.data });
    } catch (error) {
      console.error('Erro ao salvar departamento:', error);
      res.status(500).json({ success: false, error: 'Erro ao salvar departamento' });
    }
  }

  // Excluir departamento
  async deleteDepartment(req, res) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ success: false, error: 'ID é obrigatório' });

      const { data: department, error: departmentError } = await supabase
        .from('departments')
        .select('id, name')
        .eq('id', id)
        .maybeSingle();
      if (departmentError) throw departmentError;
      if (!department) return res.status(404).json({ success: false, error: 'Departamento não encontrado' });

      const { data: accountsSetting, error: settingsError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'whatsapp_accounts')
        .maybeSingle();
      if (settingsError) throw settingsError;

      const linkedAccounts = findLinkedWhatsAppAccounts(accountsSetting?.value, id, department.name);
      if (linkedAccounts.length > 0) {
        const accountNames = linkedAccounts.map(account => account.name || account.phone || 'WhatsApp').join(', ');
        return res.status(409).json({
          success: false,
          error: `Este departamento está vinculado ao WhatsApp: ${accountNames}. Altere o roteamento da conta antes de excluir.`
        });
      }

      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) throw error;

      ticketService.invalidateDepartmentCache();

      res.json({ success: true, message: 'Departamento excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir departamento:', error);
      res.status(500).json({ success: false, error: 'Erro ao excluir departamento' });
    }
  }
}

const departmentController = new DepartmentController();
departmentController._test = { findLinkedWhatsAppAccounts };

module.exports = departmentController;
