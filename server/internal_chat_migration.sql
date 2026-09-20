-- ==========================================================================
-- BRISOFT DESK - INTERNAL CHAT MIGRATION
-- Chat Interno da Empresa (Independente do WhatsApp)
-- ==========================================================================

-- 1. Tabela de Conversas Internas
CREATE TABLE IF NOT EXISTS internal_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL DEFAULT 'direct', -- 'direct', 'department', 'general'
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(100),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    last_message_text TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Participantes de Conversas Internas
CREATE TABLE IF NOT EXISTS internal_conversation_participants (
    conversation_id UUID NOT NULL REFERENCES internal_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (conversation_id, user_id)
);

-- 3. Mensagens do Chat Interno
CREATE TABLE IF NOT EXISTS internal_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES internal_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    media_url TEXT,
    media_type VARCHAR(50),
    file_name TEXT,
    reply_to_id UUID REFERENCES internal_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_internal_messages_conv_date 
    ON internal_messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_internal_participants_user 
    ON internal_conversation_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_internal_conv_type 
    ON internal_conversations(type, department_id);

-- Criação do Canal Geral padrão se não existir
INSERT INTO internal_conversations (id, type, name, last_message_text)
SELECT '00000000-0000-0000-0000-000000000001', 'general', '📢 Geral da Empresa', 'Canal oficial para recados e comunicados de toda a equipe'
WHERE NOT EXISTS (
    SELECT 1 FROM internal_conversations WHERE type = 'general'
);
