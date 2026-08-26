-- ==========================================================================
-- MIGRAÇÃO MÍNIMA DE AUTENTICAÇÃO - Brisoft Desk
-- Execute este script separadamente no SQL Editor do Supabase
-- Ele apenas cria/ajusta a tabela users para suportar login
-- ==========================================================================

-- 1. Habilitar extensão UUID (seguro re-executar)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Criar tabela departments se não existir (users depende dela)
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(20) DEFAULT '#2563eb',
    sla_target_minutes INT DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir departamentos padrão se não existirem
INSERT INTO departments (name, color, sla_target_minutes) VALUES
    ('Comercial', '#7c3aed', 15),
    ('Financeiro', '#2563eb', 10),
    ('Operacional', '#059669', 30),
    ('Suporte Técnico', '#ea580c', 20),
    ('Recursos Humanos', '#dc2626', 60)
ON CONFLICT (name) DO NOTHING;

-- 3. Criar tabela users com todas as colunas de autenticação
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(150) UNIQUE,
    role VARCHAR(50) DEFAULT 'Analista',
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    avatar_url TEXT,
    phone VARCHAR(30),
    password_hash TEXT,
    is_active BOOLEAN DEFAULT true,
    is_temporary BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'online',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Adicionar colunas de auth caso a tabela já exista sem elas
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);

-- Confirmar estrutura final
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
