const fs = require('fs');
const path = require('path');
const { supabase, isSupabaseConfigured } = require('../config/supabase');

const MEDIA_BUCKET = process.env.SUPABASE_MEDIA_BUCKET || 'chat-media';
const SESSION_BUCKET = process.env.SUPABASE_SESSION_BUCKET || 'whatsapp-sessions';

function storageEnabled() {
  return isSupabaseConfigured() && process.env.CLOUD_STORAGE_ENABLED !== 'false';
}

async function uploadMedia(filename, buffer, contentType = 'application/octet-stream') {
  if (!storageEnabled()) return false;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(filename, buffer, { contentType, upsert: true, cacheControl: '86400' });
  if (error) throw error;
  return true;
}

async function downloadMedia(filename) {
  if (!storageEnabled()) return null;
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).download(filename);
  if (error || !data) return null;
  return { buffer: Buffer.from(await data.arrayBuffer()), contentType: data.type || 'application/octet-stream' };
}

async function restoreSession(accountId, targetDir) {
  if (!storageEnabled()) return 0;
  const prefix = String(accountId);
  const { data, error } = await supabase.storage.from(SESSION_BUCKET).list(prefix, { limit: 1000 });
  if (error) {
    if (/not found|bucket/i.test(error.message || '')) return 0;
    throw error;
  }
  await fs.promises.mkdir(targetDir, { recursive: true });
  let restored = 0;
  for (const item of data || []) {
    if (!item.name || !item.id) continue;
    const { data: file, error: fileError } = await supabase.storage.from(SESSION_BUCKET).download(`${prefix}/${item.name}`);
    if (fileError || !file) continue;
    await fs.promises.writeFile(path.join(targetDir, path.basename(item.name)), Buffer.from(await file.arrayBuffer()));
    restored += 1;
  }
  return restored;
}

async function backupSession(accountId, sourceDir) {
  if (!storageEnabled() || !fs.existsSync(sourceDir)) return 0;
  const entries = await fs.promises.readdir(sourceDir, { withFileTypes: true });
  const snapshots = [];
  for (const entry of entries) {
    if (!entry.isFile() || !/\.json$/i.test(entry.name)) continue;
    try {
      snapshots.push({ name: entry.name, buffer: await fs.promises.readFile(path.join(sourceDir, entry.name)) });
    } catch (error) {
      // As pre-keys do Signal são descartadas logo após o uso. Isso é normal e
      // não deve cancelar o backup completo da sessão.
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  let uploaded = 0;
  for (const snapshot of snapshots) {
    const { error } = await supabase.storage.from(SESSION_BUCKET).upload(`${accountId}/${snapshot.name}`, snapshot.buffer, {
      contentType: 'application/json', upsert: true, cacheControl: '0'
    });
    if (error) throw error;
    uploaded += 1;
  }

  // Remove da nuvem apenas chaves temporárias que já não existem localmente.
  // Sem isso, uma restauração futura pode ressuscitar pre-keys expiradas.
  const currentEntries = await fs.promises.readdir(sourceDir, { withFileTypes: true });
  const currentNames = new Set(currentEntries.filter(entry => entry.isFile() && /\.json$/i.test(entry.name)).map(entry => entry.name));
  const { data: remoteEntries, error: listError } = await supabase.storage.from(SESSION_BUCKET).list(String(accountId), { limit: 1000 });
  if (listError) throw listError;
  const stalePaths = (remoteEntries || [])
    .filter(entry => entry.name && /\.json$/i.test(entry.name) && !currentNames.has(entry.name))
    .map(entry => `${accountId}/${entry.name}`);
  if (stalePaths.length) {
    const { error: removeError } = await supabase.storage.from(SESSION_BUCKET).remove(stalePaths);
    if (removeError) throw removeError;
  }
  return uploaded;
}

async function deleteSession(accountId) {
  if (!storageEnabled()) return false;
  const { data, error } = await supabase.storage.from(SESSION_BUCKET).list(String(accountId), { limit: 1000 });
  if (error) return false;
  const paths = (data || []).filter(item => item.name).map(item => `${accountId}/${item.name}`);
  if (!paths.length) return true;
  const { error: removeError } = await supabase.storage.from(SESSION_BUCKET).remove(paths);
  if (removeError) throw removeError;
  return true;
}

async function cleanupMediaOlderThan(cutoffTimestamp) {
  if (!storageEnabled()) return 0;
  let removed = 0;
  for (;;) {
    const { data, error } = await supabase.storage.from(MEDIA_BUCKET).list('', { limit: 1000, offset: 0, sortBy: { column: 'created_at', order: 'asc' } });
    if (error) throw error;
    const expired = (data || []).filter(item => item.name && new Date(item.created_at || item.updated_at || 0).getTime() < cutoffTimestamp).map(item => item.name);
    if (expired.length) {
      const { error: removeError } = await supabase.storage.from(MEDIA_BUCKET).remove(expired);
      if (removeError) throw removeError;
      removed += expired.length;
    }
    if (!expired.length || !data || data.length < 1000) break;
  }
  return removed;
}

module.exports = { MEDIA_BUCKET, SESSION_BUCKET, storageEnabled, uploadMedia, downloadMedia, restoreSession, backupSession, deleteSession, cleanupMediaOlderThan };
