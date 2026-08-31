// ==========================================================================
// BRISOFT DESK - AUTH CONTROLLER
// Login, logout e sessão de usuários
//
// SEGURANÇA: O administrador temporário existe APENAS em memória (runtime).
// Suas credenciais não são gravadas em arquivo, banco de dados ou código-fonte.
// O hash bcrypt é gerado dinamicamente no startup do processo Node.js.
// ==========================================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase, isSupabaseConfigured } = require('../config/supabase');
const { enrichUserAccess } = require('../services/access-control.service');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = '8h';

// ==========================================================================
// ADMIN TEMPORÁRIO EM MEMÓRIA (runtime only — sem rastro em disco)
// ==========================================================================
// O hash é gerado a partir da senha de bootstrap definida no ambiente.
// É mantido apenas enquanto o processo vive.
// Assim que você criar seu admin definitivo e excluir este, ele desaparece.
let _tempAdminHash = null;
const TEMP_ADMIN_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@combate.com.br';
const TEMP_ADMIN_ID = '__temp_admin__';

// Inicializa o hash do admin temporário de forma assíncrona no startup
async function initTempAdmin() {
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!password) {
    console.warn('⚠️ Admin temporário desativado. Defina BOOTSTRAP_ADMIN_PASSWORD apenas no primeiro acesso.');
    return;
  }
  _tempAdminHash = await bcrypt.hash(password, 12);
  console.log('🔑 Admin temporário de bootstrap habilitado em memória.');
}

// Retorna o admin temporário se as credenciais baterem (nunca persiste em disco)
async function checkTempAdmin(email, password) {
  if (!_tempAdminHash) return null;
  if (email.toLowerCase() !== TEMP_ADMIN_EMAIL) return null;
  const match = await bcrypt.compare(password, _tempAdminHash);
  if (!match) return null;
  return {
    id: TEMP_ADMIN_ID,
    name: 'Admin Temporário',
    email: TEMP_ADMIN_EMAIL,
    role: 'Administrador',
    is_temporary: true,
    avatar_url: null,
    department_id: null,
  };
}

// Chamado quando o admin temporário é excluído — apaga o hash da memória
function destroyTempAdmin() {
  _tempAdminHash = null;
  console.log('🗑️ Admin temporário destruído. Acesso com credenciais de bootstrap desabilitado.');
}

function isTempAdminActive() {
  return !!_tempAdminHash;
}

// ==========================================================================
// CONTROLLER
// ==========================================================================

class AuthController {

  /**
   * POST /api/auth/login
   * Body: { email, password }
   */
  async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'E-mail e senha são obrigatórios.' });
    }

    try {
      // 1. Verificar admin temporário primeiro (em memória)
      const tempAdmin = await checkTempAdmin(email, password);
      if (tempAdmin) {
        const token = jwt.sign(
          { id: tempAdmin.id, email: tempAdmin.email, name: tempAdmin.name, role: tempAdmin.role, is_temporary: true },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES }
        );
        const { clearLoginAttempts } = require('../middleware/auth.middleware');
        clearLoginAttempts(req);
        return res.json({ success: true, token, user: tempAdmin });
      }

      // 2. Verificar usuários do banco de dados
      if (!isSupabaseConfigured()) {
        return res.status(401).json({ success: false, error: 'Credenciais inválidas.' });
      }

      const { data: users, error } = await supabase
        .from('users')
        .select('id, name, email, role, department_id, avatar_url, password_hash, is_active, is_temporary, departments!users_department_id_fkey(id, name, color)')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .limit(1);

      if (error) throw error;
      if (!users || users.length === 0) {
        return res.status(401).json({ success: false, error: 'Credenciais inválidas.' });
      }

      const user = users[0];

      if (!user.password_hash) {
        return res.status(401).json({ success: false, error: 'Credenciais inválidas.' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ success: false, error: 'Credenciais inválidas.' });
      }

      const department_name = user.departments ? user.departments.name : null;
      const department_color = user.departments ? user.departments.color : null;

      const userWithAccess = await enrichUserAccess({ ...user, department_name, department_color });
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role, is_temporary: !!user.is_temporary, department_id: user.department_id, department_name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
      );

      // Retorna os dados do usuário sem o hash da senha
      const { password_hash, ...userPublic } = user;
      Object.assign(userPublic, userWithAccess, { department_name, department_color });
      const { clearLoginAttempts } = require('../middleware/auth.middleware');
      clearLoginAttempts(req);
      return res.json({ success: true, token, user: userPublic });

    } catch (err) {
      console.error('Erro no login:', err);
      return res.status(500).json({ success: false, error: 'Erro interno ao processar login.' });
    }
  }

  /**
   * GET /api/auth/me
   * Retorna dados do usuário logado (a partir do JWT)
   */
  async me(req, res) {
    // req.user é injetado pelo middleware requireAuth
    const { id, is_temporary } = req.user;

    if (is_temporary || id === TEMP_ADMIN_ID) {
      return res.json({
        success: true,
        user: {
          id: TEMP_ADMIN_ID,
          name: 'Admin Temporário',
          email: TEMP_ADMIN_EMAIL,
          role: 'Administrador',
          is_temporary: true,
          avatar_url: null,
          department_id: null,
          department_name: null,
        }
      });
    }

    try {
      if (!isSupabaseConfigured()) return res.status(503).json({ success: false, error: 'Banco de dados indisponível.' });

      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, department_id, avatar_url, status, is_active, is_temporary, phone, departments!users_department_id_fkey(id, name, color)')
        .eq('id', id)
        .single();

      if (error || !data || data.is_active === false) return res.status(401).json({ success: false, error: 'Usuário inativo ou inexistente.' });
      if (data && data.departments) {
        data.department_name = data.departments.name;
        data.department_color = data.departments.color;
      }
      return res.json({ success: true, user: await enrichUserAccess(data) });
    } catch (err) {
      console.error('Erro ao buscar usuário:', err.message);
      return res.status(401).json({ success: false, error: 'Não foi possível validar a sessão.' });
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req, res) {
    // JWT é stateless — o cliente apenas descarta o token
    return res.json({ success: true, message: 'Logout realizado com sucesso.' });
  }
}

module.exports = new AuthController();
module.exports.initTempAdmin = initTempAdmin;
module.exports.destroyTempAdmin = destroyTempAdmin;
module.exports.TEMP_ADMIN_ID = TEMP_ADMIN_ID;
module.exports.TEMP_ADMIN_EMAIL = TEMP_ADMIN_EMAIL;
module.exports.isTempAdminActive = isTempAdminActive;
