// ==========================================================================
// BRISOFT DESK - DEPARTMENT CONTROLLER
// ==========================================================================

const { supabase } = require('../config/supabase');

class DepartmentController {
  
  // Listar todos os departamentos
  async listDepartments(req, res) {
    try {
      const { data, error } = await supabase.from('departments').select('*').order('name', { ascending: true });
      if (error) throw error;
      res.json({ success: true, departments: data });
    } catch (error) {
      console.error('Erro ao listar departamentos:', error);
      res.status(500).json({ success: false, error: 'Erro ao buscar departamentos' });
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

      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) throw error;

      res.json({ success: true, message: 'Departamento excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir departamento:', error);
      res.status(500).json({ success: false, error: 'Erro ao excluir departamento' });
    }
  }
}

module.exports = new DepartmentController();
