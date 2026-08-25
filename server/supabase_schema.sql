-- ==========================================================================
-- BRISOFT DESK - SUPABASE POSTGRESQL DATABASE SCHEMA
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==========================================================================

-- 1. Habilitar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Departamentos
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(20) DEFAULT '#2563eb',
    sla_target_minutes INT DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir departamentos padrão
INSERT INTO departments (name, color, sla_target_minutes) VALUES
    ('Comercial', '#7c3aed', 15),
    ('Financeiro', '#2563eb', 10),
    ('Operacional', '#059669', 30),
    ('Suporte Técnico', '#ea580c', 20),
    ('Recursos Humanos', '#dc2626', 60)
ON CONFLICT (name) DO NOTHING;

-- 3. Tabela de Clientes (Empresas)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(30),
    phone VARCHAR(30),
    email VARCHAR(150),
    segment VARCHAR(50) DEFAULT 'Corporativo',
    status VARCHAR(20) DEFAULT 'Ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Contatos (Pessoas vinculadas aos clientes)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(150),
    role VARCHAR(100),
    channel VARCHAR(30) DEFAULT 'WhatsApp',
    avatar_color VARCHAR(20) DEFAULT '#6366f1',
    status VARCHAR(20) DEFAULT 'Ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Usuários / Atendentes
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(150) UNIQUE,
    role VARCHAR(50) DEFAULT 'Atendente',
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    avatar_url TEXT,
    status VARCHAR(20) DEFAULT 'online',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir usuário administrador padrão
INSERT INTO users (name, email, role, status) VALUES
    ('Jeferson Brito', 'jeferson@brisoft.com.br', 'Administrador', 'online'),
    ('Carlos Silva', 'carlos@brisoft.com.br', 'Atendente', 'online'),
    ('Ana Beatriz', 'ana@brisoft.com.br', 'Atendente', 'online')
ON CONFLICT (email) DO NOTHING;

-- 6. Tabela de Atendimentos / Chamados (Tickets)
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protocol VARCHAR(50) NOT NULL UNIQUE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Atendente responsável
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'aguardando', -- 'aguardando', 'em_atendimento', 'em_espera', 'finalizado'
    priority VARCHAR(20) DEFAULT 'normal', -- 'baixa', 'normal', 'alta', 'urgente'
    subject VARCHAR(255),
    preview_message TEXT,
    channel VARCHAR(30) DEFAULT 'whatsapp',
    
    -- Métricas de SLA
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    first_response_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    sla_minutes_target INT DEFAULT 15,
    sla_met BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela de Mensagens da Conversa
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    sender_type VARCHAR(20) NOT NULL, -- 'client', 'agent', 'system', 'internal_note'
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    text TEXT,
    media_url TEXT,
    media_type VARCHAR(50),
    read BOOLEAN DEFAULT false,
    remote_message_id VARCHAR(100), -- ID do WhatsApp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabela de Notas Internas de Contato
CREATE TABLE IF NOT EXISTS contact_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabela de Avaliações de Satisfação (CSAT / NPS)
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    score INT NOT NULL CHECK (score >= 1 AND score <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Tabela de Mensagens Rápidas
CREATE TABLE IF NOT EXISTS quick_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) DEFAULT 'Geral',
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    uses_count INT DEFAULT 0,
    is_favorite BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir mensagens rápidas padrão
INSERT INTO quick_messages (title, category, content, is_favorite, is_active) VALUES
    ('Saudação inicial', 'Saudação', 'Olá! 👋 Bem-vindo à Brisoft Desk! Como podemos te ajudar hoje?', true, true),
    ('Solicitação de dados', 'Documentação', 'Para prosseguirmos com seu atendimento, por favor confirme: 1. Nome completo 2. CPF/CNPJ 3. Número de contrato.', true, true),
    ('Encerramento com satisfação', 'Encerramento', 'Agradecemos o contato! Ficamos felizes em atendê-lo. Por favor, avalie nosso atendimento. Tenha um ótimo dia!', true, true);

-- Habilitar Realtime para as tabelas principais
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE ratings;

-- ============================================================================
-- Atualizações Recentes (Rodar estas caso já tenha o banco criado)
-- ============================================================================
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS awaiting_rating BOOLEAN DEFAULT false;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assumed_at TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS unread_count INT DEFAULT 0;
