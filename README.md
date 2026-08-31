# Brisoft Desk

Central de atendimento via WhatsApp com interface Vue 3, API Node.js/Express, atualização em tempo real por Socket.IO e persistência no Supabase.

## Requisitos

- Node.js 20 ou superior
- Projeto Supabase
- WhatsApp disponível para vinculação por QR Code

## Configuração

1. Copie `server/.env.example` para `server/.env`.
2. Preencha as credenciais do Supabase.
3. Defina um `JWT_SECRET` longo e exclusivo.
4. Defina `BOOTSTRAP_ADMIN_PASSWORD` apenas para o primeiro acesso.
5. Em uma instalação nova, execute `server/supabase_schema.sql` no SQL Editor do Supabase.
6. Em uma instalação já existente, execute `server/migrate_current.sql`.

Após criar um administrador definitivo, remova `BOOTSTRAP_ADMIN_PASSWORD` do ambiente e reinicie o servidor.

## Execução no Windows

Dê dois cliques em `start-server.bat`. O script instala as dependências ausentes, compila a interface e inicia o servidor em `http://localhost:3000`.

Para desenvolvimento, use dois terminais:

```powershell
cd client
npm install
npm run dev
```

```powershell
cd server
npm install
npm run dev
```

## Publicação no Render

O projeto inclui um Blueprint `render.yaml` e armazenamento privado de mídias e sessões do WhatsApp no Supabase. Siga o roteiro completo em `PRODUCAO_RENDER_SUPABASE.md`.

## Validação

```powershell
cd server
npm test
```

```powershell
cd client
npm run build
```

## Estrutura

- `client/`: aplicação Vue 3 e arquivos estáticos.
- `server/src/`: API, autenticação, integração com WhatsApp e Socket.IO.
- `server/supabase_schema.sql`: esquema para instalações novas.
- `server/migrate_current.sql`: atualização idempotente para bancos existentes.
- `server/public/media/`: anexos recebidos em runtime; não devem ser versionados.

## Segurança operacional

- Somente administradores podem conectar o WhatsApp ou visualizar o QR Code.
- Chamados e eventos em tempo real são limitados ao administrador, setor responsável ou atendente atribuído.
- Anexos exigem autenticação e permissão sobre o chamado.
- Alterar senha, função, setor ou status de um usuário encerra a sessão em tempo real desse usuário.
- Não versione `server/.env`, sessões do WhatsApp nem arquivos recebidos.

## Capacidade e concorrência

- Clientes diferentes são processados em paralelo; as mensagens de um mesmo número permanecem na ordem em que chegaram.
- `WHATSAPP_MESSAGE_CONCURRENCY` controla quantos clientes são processados simultaneamente (padrão: 10).
- `WHATSAPP_MAX_PENDING_MESSAGES` limita a fila em memória para proteger o servidor durante picos (padrão: 10.000).
- Mensagens do WhatsApp são deduplicadas em memória e, após executar `server/migrate_current.sql`, também no Supabase.
- `WHATSAPP_MAX_MEDIA_MB` limita o tamanho de cada anexo (padrão: 25 MB).
- Mídias locais expiram após `WHATSAPP_MEDIA_RETENTION_DAYS` dias (padrão: 30); use `0` para desativar a limpeza.

A fila atual é adequada a uma única instância do servidor. Ela não é persistente: uma reinicialização descarta apenas tarefas que ainda não começaram. Para executar várias instâncias ou buscar escala horizontal, será necessário substituir a fila em memória por uma fila externa durável e armazenar as mídias em storage de objetos.
