// ==========================================================================
// BRISOFT DESK - AUTH MIDDLEWARE
// Verifica JWT e permissões de administrador
// ==========================================================================

const jwt = require('jsonwebtoken');
const { supabase, isSupabaseConfigured } = require('../config/supabase');
const { enrichUserAccess, isAdmin, isSupervisor } = require('../services/access-control.service');
const JWT_SECRET = process.env.JWT_SECRET;

const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const AUTH_USER_CACHE_MS = 30 * 1000;
const authenticatedUsers = new Map();

async function resolveAuthenticatedUser(token) {
  const payload = jwt.verify(token, JWT_SECRET);

  if (payload.is_temporary || payload.id === '__temp_admin__') {
    const { isTempAdminActive } = require('../controllers/auth.controller');
    if (!isTempAdminActive()) throw new Error('Administrador temporário desativado');
    return payload;
  }

  if (!isSupabaseConfigured()) return payload;

  const cacheKey = `${payload.id}:${payload.iat || 0}`;
  const cached = authenticatedUsers.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return { ...payload, ...cached.user };

  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, role, department_id, is_active, is_temporary, departments(name)')
    .eq('id', payload.id)
    .single();

  if (error || !user || user.is_active === false) throw new Error('Usuário inativo ou inexistente');
  const resolvedUser = {
    ...payload,
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department_id: user.department_id,
    department_name: user.departments?.name || null,
    is_temporary: !!user.is_temporary
  };
  const userWithAccess = await enrichUserAccess(resolvedUser);
  authenticatedUsers.set(cacheKey, { user: userWithAccess, expiresAt: Date.now() + AUTH_USER_CACHE_MS });
  if (authenticatedUsers.size > 1000) {
    for (const [key, entry] of authenticatedUsers) {
      if (entry.expiresAt <= Date.now()) authenticatedUsers.delete(key);
    }
  }
  return userWithAccess;
}

/**
 * Middleware que exige um JWT válido no header Authorization.
 * Injeta req.user com os dados do token.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, error: 'Não autenticado. Faça login para continuar.' });
  }

  try {
    req.user = await resolveAuthenticatedUser(token);
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

function loginRateLimit(req, res, next) {
  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const previous = loginAttempts.get(key);
  const entry = !previous || now - previous.startedAt >= LOGIN_WINDOW_MS
    ? { startedAt: now, count: 0 }
    : previous;

  entry.count += 1;
  loginAttempts.set(key, entry);
  if (entry.count > LOGIN_MAX_ATTEMPTS) {
    return res.status(429).json({ success: false, error: 'Muitas tentativas de login. Aguarde alguns minutos.' });
  }
  return next();
}

function clearLoginAttempts(req) {
  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  loginAttempts.delete(key);
}

/**
 * Middleware que exige role 'Administrador'.
 * Deve ser usado APÓS requireAuth.
 */
function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ success: false, error: 'Acesso restrito a administradores.' });
  }
  next();
}

function requireSupervisorOrAdmin(req, res, next) {
  if (!isAdmin(req.user) && !isSupervisor(req.user)) {
    return res.status(403).json({ success: false, error: 'Acesso restrito a supervisores e administradores.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireSupervisorOrAdmin, resolveAuthenticatedUser, loginRateLimit, clearLoginAttempts };
