// Script para migrar o banco Supabase com as novas colunas de autenticação
// Execute: node server/migrate_auth.js

require('dotenv').config({ path: './server/.env' });
const { supabase, isSupabaseConfigured } = require('./server/src/config/supabase');

async function migrate() {
  if (!isSupabaseConfigured()) {
    console.log('⚠️ Supabase não configurado. Nada a migrar.');
    return;
  }

  console.log('🔄 Executando migração de autenticação...');

  const migrations = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN DEFAULT false",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30)",
  ];

  for (const sql of migrations) {
    const { error } = await supabase.rpc('exec_sql', { sql }).catch(() => ({ error: null }));
    // Algumas versões do Supabase não permitem rpc exec_sql
    // Use o SQL Editor do painel Supabase para executar o schema atualizado
    console.log('SQL:', sql.substring(0, 60) + '...');
  }

  console.log('');
  console.log('✅ Se as colunas não foram criadas automaticamente, execute no SQL Editor do Supabase:');
  console.log('');
  console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;');
  console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;');
  console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN DEFAULT false;');
  console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);');
}

migrate();
