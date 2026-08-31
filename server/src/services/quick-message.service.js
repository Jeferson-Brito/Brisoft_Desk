const crypto = require('crypto');
const { supabase, isSupabaseConfigured } = require('../config/supabase');

const SETTINGS_KEY = 'quick_messages';
const DEFAULT_MESSAGES = [
  { id: 'default-greeting', title: 'Saudação', category: 'Atendimento', content: 'Olá! Como posso ajudar você hoje?', shortcut: 'saudacao', is_active: true },
  { id: 'default-wait', title: 'Aguarde um momento', category: 'Atendimento', content: 'Aguarde um momento, por favor. Estou verificando essa informação para você.', shortcut: 'aguarde', is_active: true },
  { id: 'default-closing', title: 'Encerramento', category: 'Atendimento', content: 'Posso ajudar em mais alguma coisa?', shortcut: 'encerramento', is_active: true }
];

function normalizeMessage(value = {}) {
  return {
    id: String(value.id || crypto.randomUUID()),
    title: String(value.title || '').trim().slice(0, 120),
    category: String(value.category || 'Geral').trim().slice(0, 80),
    content: String(value.content || '').trim().slice(0, 4000),
    shortcut: String(value.shortcut || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 50),
    is_active: value.is_active !== false,
    created_by_id: value.created_by_id || null,
    created_by_name: String(value.created_by_name || 'Sistema').trim().slice(0, 255),
    created_at: value.created_at || null,
    updated_by_name: value.updated_by_name ? String(value.updated_by_name).trim().slice(0, 255) : null,
    updated_at: value.updated_at || null
  };
}

async function loadAll() {
  if (!isSupabaseConfigured()) return DEFAULT_MESSAGES.map(item => ({ ...item }));
  const { data, error } = await supabase.from('system_settings').select('value').eq('key', SETTINGS_KEY).maybeSingle();
  if (error) throw error;
  if (!Array.isArray(data?.value)) return DEFAULT_MESSAGES.map(item => ({ ...item }));
  return data.value.map(normalizeMessage).filter(item => item.title && item.content);
}

async function saveAll(messages) {
  const value = messages.map(normalizeMessage).filter(item => item.title && item.content).slice(0, 500);
  const { error } = await supabase.from('system_settings').upsert({ key: SETTINGS_KEY, value, updated_at: new Date() }, { onConflict: 'key' });
  if (error) throw error;
  return value;
}

async function list(activeOnly = true) {
  const messages = await loadAll();
  return activeOnly ? messages.filter(item => item.is_active) : messages;
}

async function create(input, user) {
  const item = normalizeMessage({
    ...input,
    created_by_id: user?.id || null,
    created_by_name: user?.name || 'Sistema',
    created_at: new Date().toISOString()
  });
  if (!item.title || !item.content) throw new Error('Título e mensagem são obrigatórios.');
  const messages = await loadAll();
  messages.push(item);
  await saveAll(messages);
  return item;
}

async function update(id, input, user) {
  const messages = await loadAll();
  const index = messages.findIndex(item => item.id === id);
  if (index < 0) throw new Error('Mensagem rápida não encontrada.');
  if (user?.role === 'Supervisor' && String(messages[index].created_by_id || '') !== String(user.id || '')) {
    throw new Error('Supervisores só podem alterar mensagens criadas por eles.');
  }
  const item = normalizeMessage({ ...messages[index], ...input, id, updated_by_name: user?.name || null, updated_at: new Date().toISOString() });
  if (!item.title || !item.content) throw new Error('Título e mensagem são obrigatórios.');
  messages[index] = item;
  await saveAll(messages);
  return item;
}

async function remove(id, user) {
  const messages = await loadAll();
  const filtered = messages.filter(item => item.id !== id);
  if (filtered.length === messages.length) throw new Error('Mensagem rápida não encontrada.');
  const existing = messages.find(item => item.id === id);
  if (user?.role === 'Supervisor' && String(existing?.created_by_id || '') !== String(user.id || '')) {
    throw new Error('Supervisores só podem excluir mensagens criadas por eles.');
  }
  await saveAll(filtered);
}

module.exports = { list, create, update, remove, normalizeMessage, DEFAULT_MESSAGES };
