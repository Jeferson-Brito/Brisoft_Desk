// ==========================================================================
// BRISOFT DESK - USERS CONTROLLER
// CRUD completo de usuários do sistema
// ==========================================================================

const bcrypt = require('bcryptjs');
const { supabase, isSupabaseConfigured } = require('../config/supabase');
const { destroyTempAdmin, TEMP_ADMIN_ID } = require('./auth.controller');
const { isAdmin, isSupervisor, departmentIds, replaceSupervisorDepartments } = require('../services/access-control.service');

// Usuários em memória (fallback quando Supabase não está configurado)
let _memoryUsers = [];

class UsersController {

  /**
   * GET /api/users
   * Lista todos os usuários (apenas admin)
   */
  async listUsers(req, res) {
    try {
      if (isSupabaseConfigured()) {
        let query = supabase
          .from('users')
          .select('id, name, email, role, department_id, avatar_url, status, is_active, is_temporary, phone, created_at, departments(id, name, color)')
          .order('created_at', { ascending: true });
        if (isSupervisor(req.user)) {
          const allowed = departmentIds(req.user);
          query = allowed.length ? query.eq('role', 'Analista').in('department_id', allowed) : query.is('id', null);
        }
        const { data, error } = await query;

        if (error) throw error;
        const { data: assignments, error: assignmentError } = isAdmin(req.user)
          ? await supabase.from('supervisor_departments').select('user_id, department_id, departments(id, name, color)')
          : { data: [], error: null };
        if (assignmentError && !/supervisor_departments|schema cache|does not exist/i.test(assignmentError.message || '')) throw assignmentError;
        const users = (data || []).map(u => ({
          ...u,
          department_name: u.departments ? u.departments.name : null,
          department_color: u.departments ? u.departments.color : null,
          department_ids: u.role === 'Supervisor'
            ? [...new Set([u.department_id, ...(assignments || []).filter(item => String(item.user_id) === String(u.id)).map(item => item.department_id)].filter(Boolean))]
            : [u.department_id].filter(Boolean),
          supervised_departments: u.role === 'Supervisor'
            ? (assignments || []).filter(item => String(item.user_id) === String(u.id)).map(item => item.departments).filter(Boolean)
            : []
        }));
        return res.json({ success: true, users });
      }

      // Fallback memória
      return res.json({ success: true, users: _memoryUsers.map(u => { const { password_hash, ...pub } = u; return pub; }) });

    } catch (err) {
      console.error('Erro ao listar usuários:', err);
      return res.status(500).json({ success: false, error: 'Erro interno ao listar usuários.' });
    }
  }

  /**
   * POST /api/users
   * Cria um novo usuário (apenas admin)
   * Body: { name, email, password, role, department_id, phone, avatar_url }
   */
  async createUser(req, res) {
    const { name, email, password, role, department_id, department_ids, phone, avatar_url } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Nome, e-mail e senha são obrigatórios.' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ success: false, error: 'A senha deve ter pelo menos 8 caracteres.' });
    }

    const validRoles = ['Administrador', 'Supervisor', 'Analista'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Perfil inválido. Use: Administrador, Supervisor ou Analista.' });
    }

    try {
      const passwordHash = await bcrypt.hash(password, 12);

      if (isSupabaseConfigured()) {
        // Verificar se e-mail já existe
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('email', email.toLowerCase())
          .limit(1);

        if (existing && existing.length > 0) {
          return res.status(400).json({ success: false, error: 'Este e-mail já está em uso.' });
        }

        const { data, error } = await supabase
          .from('users')
          .insert({
            name,
            email: email.toLowerCase(),
            password_hash: passwordHash,
            role: role || 'Analista',
            department_id: department_id || null,
            phone: phone || null,
            avatar_url: avatar_url || null,
            is_active: true,
            is_temporary: false,
            status: 'online',
          })
          .select('id, name, email, role, department_id, avatar_url, status, is_active, phone, created_at')
          .single();

        if (error) throw error;
        if ((role || 'Analista') === 'Supervisor') {
          await replaceSupervisorDepartments(data.id, department_ids?.length ? department_ids : [department_id].filter(Boolean));
          data.department_ids = department_ids?.length ? department_ids : [department_id].filter(Boolean);
        }
        return res.json({ success: true, user: data, message: 'Usuário criado com sucesso.' });
      }

      // Fallback memória
      const existing = _memoryUsers.find(u => u.email === email.toLowerCase());
      if (existing) {
        return res.status(400).json({ success: false, error: 'Este e-mail já está em uso.' });
      }

      const newUser = {
        id: `mem_${Date.now()}`,
        name,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role: role || 'Analista',
        department_id: department_id || null,
        phone: phone || null,
        avatar_url: avatar_url || null,
        is_active: true,
        is_temporary: false,
        status: 'online',
        created_at: new Date().toISOString(),
      };
      _memoryUsers.push(newUser);
      const { password_hash, ...pub } = newUser;
      return res.json({ success: true, user: pub, message: 'Usuário criado com sucesso.' });

    } catch (err) {
      console.error('Erro ao criar usuário:', err);
      return res.status(500).json({ success: false, error: 'Erro interno ao criar usuário.' });
    }
  }

  /**
   * PUT /api/users/:id
   * Atualiza dados de um usuário (apenas admin)
   * Body: { name, role, department_id, phone, avatar_url, is_active, password? }
   */
  async updateUser(req, res) {
    const { id } = req.params;
    const { name, email, role, department_id, department_ids, phone, avatar_url, is_active, password } = req.body;

    // Impedir edição do admin temporário em memória
    if (id === TEMP_ADMIN_ID) {
      return res.status(400).json({ success: false, error: 'O administrador temporário não pode ser editado. Crie seu perfil definitivo e exclua este.' });
    }

    const validRoles = ['Administrador', 'Supervisor', 'Analista'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Perfil inválido.' });
    }
    if (password && (typeof password !== 'string' || password.length < 8)) {
      return res.status(400).json({ success: false, error: 'A senha deve ter pelo menos 8 caracteres.' });
    }

    try {
      if (isSupervisor(req.user)) {
        const allowed = departmentIds(req.user);
        const { data: target, error: targetError } = await supabase.from('users').select('id, role, department_id').eq('id', id).maybeSingle();
        if (targetError) throw targetError;
        if (!target || target.role !== 'Analista' || !allowed.includes(String(target.department_id || ''))) {
          return res.status(403).json({ success: false, error: 'Você só pode alterar atendentes dos departamentos sob sua supervisão.' });
        }
        if (department_id !== undefined && !allowed.includes(String(department_id || ''))) {
          return res.status(403).json({ success: false, error: 'Departamento fora do seu escopo de supervisão.' });
        }
        if (role && role !== 'Analista') return res.status(403).json({ success: false, error: 'Supervisores não podem alterar perfis de acesso.' });
      }
      const updatePayload = {};
      if (name !== undefined) updatePayload.name = name;
      if (email !== undefined) updatePayload.email = String(email).trim().toLowerCase();
      if (role !== undefined && isAdmin(req.user)) updatePayload.role = role;
      if (department_id !== undefined) updatePayload.department_id = department_id;
      if (phone !== undefined) updatePayload.phone = phone;
      if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url;
      if (is_active !== undefined) updatePayload.is_active = is_active;
      if (password) {
        updatePayload.password_hash = await bcrypt.hash(password, 12);
      }

      if (isSupabaseConfigured()) {
        // Garantir que não fique sem admins ativos se estiver rebaixando o último
        if (role && role !== 'Administrador') {
          const { data: admins } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'Administrador')
            .eq('is_active', true)
            .neq('id', id);

          if (!admins || admins.length === 0) {
            return res.status(400).json({ success: false, error: 'Não é possível rebaixar o último administrador ativo.' });
          }
        }

        const { data, error } = await supabase
          .from('users')
          .update(updatePayload)
          .eq('id', id)
          .select('id, name, email, role, department_id, avatar_url, status, is_active, phone')
          .single();

        if (error) throw error;
        if (isAdmin(req.user)) {
          if (role === 'Supervisor') await replaceSupervisorDepartments(id, department_ids?.length ? department_ids : [department_id].filter(Boolean));
          else if (role && role !== 'Supervisor') await replaceSupervisorDepartments(id, []);
        }
        if (is_active === false || password || role || department_id !== undefined) {
          req.app.get('io')?.in(`user:${id}`).disconnectSockets(true);
        }
        return res.json({ success: true, user: data, message: 'Usuário atualizado com sucesso.' });
      }

      // Fallback memória
      const idx = _memoryUsers.findIndex(u => u.id === id);
      if (idx === -1) return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
      _memoryUsers[idx] = { ..._memoryUsers[idx], ...updatePayload };
      const { password_hash, ...pub } = _memoryUsers[idx];
      return res.json({ success: true, user: pub, message: 'Usuário atualizado com sucesso.' });

    } catch (err) {
      console.error('Erro ao atualizar usuário:', err);
      return res.status(500).json({ success: false, error: 'Erro interno ao atualizar usuário.' });
    }
  }

  /**
   * DELETE /api/users/:id
   * Exclui um usuário (apenas admin)
   * Regra: não pode excluir se for o último admin ativo
   */
  async deleteUser(req, res) {
    const { id } = req.params;

    // Excluir admin temporário (apenas destrói o hash em memória)
    if (id === TEMP_ADMIN_ID) {
      // Verificar se há pelo menos 1 admin real ativo antes de destruir
      if (isSupabaseConfigured()) {
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'Administrador')
          .eq('is_active', true);

        if (!admins || admins.length === 0) {
          return res.status(400).json({ success: false, error: 'Crie um administrador definitivo antes de excluir o administrador temporário.' });
        }
      } else {
        const realAdmins = _memoryUsers.filter(u => u.role === 'Administrador' && u.is_active !== false);
        if (realAdmins.length === 0) {
          return res.status(400).json({ success: false, error: 'Crie um administrador definitivo antes de excluir o administrador temporário.' });
        }
      }

      destroyTempAdmin();
      req.app.get('io')?.in(`user:${TEMP_ADMIN_ID}`).disconnectSockets(true);
      return res.json({ success: true, message: 'Administrador temporário excluído com sucesso.' });
    }

    try {
      if (isSupabaseConfigured()) {
        // Verificar se é o último admin ativo
        const { data: user } = await supabase
          .from('users')
          .select('role, is_active')
          .eq('id', id)
          .single();

        if (user && user.role === 'Administrador') {
          const { data: admins } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'Administrador')
            .eq('is_active', true)
            .neq('id', id);

          if (!admins || admins.length === 0) {
            return res.status(400).json({ success: false, error: 'Não é possível excluir o último administrador ativo.' });
          }
        }

        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        req.app.get('io')?.in(`user:${id}`).disconnectSockets(true);
        return res.json({ success: true, message: 'Usuário excluído com sucesso.' });
      }

      // Fallback memória
      const idx = _memoryUsers.findIndex(u => u.id === id);
      if (idx === -1) return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });

      const user = _memoryUsers[idx];
      if (user.role === 'Administrador') {
        const realAdmins = _memoryUsers.filter(u => u.role === 'Administrador' && u.id !== id && u.is_active !== false);
        if (realAdmins.length === 0) {
          return res.status(400).json({ success: false, error: 'Não é possível excluir o último administrador ativo.' });
        }
      }

      _memoryUsers.splice(idx, 1);
      return res.json({ success: true, message: 'Usuário excluído com sucesso.' });

    } catch (err) {
      console.error('Erro ao excluir usuário:', err);
      return res.status(500).json({ success: false, error: 'Erro interno ao excluir usuário.' });
    }
  }
}

module.exports = new UsersController();
