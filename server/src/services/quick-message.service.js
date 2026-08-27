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
    is_active: value.is_active !== false
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

async function create(input) {
  const item = normalizeMessage(input);
  if (!item.title || !item.content) throw new Error('Título e mensagem são obrigatórios.');
  const messages = await loadAll();
  messages.push(item);
  await saveAll(messages);
  return item;
}

async function update(id, input) {
  const messages = await loadAll();
  const index = messages.findIndex(item => item.id === id);
  if (index < 0) throw new Error('Mensagem rápida não encontrada.');
  const item = normalizeMessage({ ...messages[index], ...input, id });
  if (!item.title || !item.content) throw new Error('Título e mensagem são obrigatórios.');
  messages[index] = item;
  await saveAll(messages);
  return item;
}

async function remove(id) {
  const messages = await loadAll();
  const filtered = messages.filter(item => item.id !== id);
  if (filtered.length === messages.length) throw new Error('Mensagem rápida não encontrada.');
  await saveAll(filtered);
}

module.exports = { list, create, update, remove, normalizeMessage, DEFAULT_MESSAGES };
