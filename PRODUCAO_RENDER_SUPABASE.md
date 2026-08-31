# Publicação do Brisoft Desk — Render + Supabase

Este roteiro publica frontend, API, Socket.IO e integração WhatsApp em um único Web Service do Render. O banco, as mídias e as cópias das sessões do WhatsApp ficam no Supabase.

## 1. Antes de publicar

1. Envie o projeto atualizado para um repositório privado no GitHub.
2. Confirme que nenhum arquivo `.env`, pasta `session_auth` ou mídia foi enviado ao Git.
3. No Supabase, abra **SQL Editor** e execute todo o arquivo `server/migrate_current.sql`.
4. Verifique em **Storage** se foram criados dois buckets privados:
   - `chat-media`: imagens, áudios, vídeos e documentos dos atendimentos;
   - `whatsapp-sessions`: cópias privadas das credenciais de conexão do Baileys.
5. Em **Project Settings > API**, copie:
   - Project URL;
   - chave `service_role` (Secret). Nunca coloque essa chave no frontend ou no GitHub.

O SQL também cria o vínculo entre supervisores e múltiplos departamentos, índices, tabelas de indicadores e ativa RLS nas tabelas protegidas.

## 2. Criar o serviço no Render

O repositório contém `render.yaml`. No Render:

1. Clique em **New > Blueprint**.
2. Conecte o repositório privado.
3. Selecione o arquivo `render.yaml` e crie o serviço gratuito `brisoft-desk`.
4. Preencha as variáveis marcadas como secretas:

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | Project URL do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | chave secreta `service_role` |
| `ALLOWED_ORIGINS` | URL final do Render, por exemplo `https://brisoft-desk.onrender.com` |
| `BOOTSTRAP_ADMIN_EMAIL` | e-mail usado somente para o primeiro administrador |
| `BOOTSTRAP_ADMIN_PASSWORD` | senha temporária forte, com pelo menos 12 caracteres |

O Render gera `JWT_SECRET` automaticamente pelo Blueprint. Não defina `SUPABASE_ANON_KEY`, pois o navegador não acessa o banco diretamente.

5. Aguarde o build. Ele instala backend e frontend, compila o Vue e inicia o Express.
6. Abra `https://SEU-SERVICO.onrender.com/api/health`. Deve retornar `status: online`.

## 3. Primeiro acesso

1. Entre com o administrador temporário.
2. Crie imediatamente um administrador definitivo em **Configurações > Usuários & Acesso**.
3. Teste o login do administrador definitivo.
4. Remova `BOOTSTRAP_ADMIN_PASSWORD` das variáveis do Render e faça um novo deploy.
5. Conecte cada WhatsApp em **Configurações > Conexões**.
6. Envie uma mensagem, uma imagem, um áudio, um vídeo e um PDF de teste.
7. Reinicie manualmente o serviço no Render e confirme que as contas do WhatsApp foram restauradas sem um novo QR Code e que as mídias antigas continuam abrindo.

## 4. Supervisores

- Somente o administrador cria um Supervisor e escolhe um ou mais departamentos.
- O Supervisor acessa a equipe, atendimentos, filas, conversas, dashboard, desempenho e Painel TV somente dos setores atribuídos.
- O Supervisor pode alterar atendentes desses setores, mas não pode criar administradores, mudar conexões, bot ou departamentos.
- Mensagens rápidas exibem autor e data. O Supervisor pode criar mensagens e alterar ou excluir apenas as próprias; o administrador gerencia todas.

## 5. Mídias

- Toda mídia recebida ou enviada é gravada no bucket privado `chat-media`.
- A API verifica o JWT e a permissão sobre o atendimento antes de entregar o arquivo.
- Ao assumir um atendimento, as mídias do histórico são pré-carregadas no cache protegido do navegador, com até três downloads simultâneos.
- Por segurança do navegador, salvar silenciosamente arquivos na pasta do Windows não é permitido. Para manter um arquivo permanentemente fora do cache, o atendente deve usar o botão de download.
- O limite configurado é 25 MB por mídia. O plano gratuito do Supabase inclui armazenamento limitado; acompanhe o consumo no painel.

## 6. Serviço gratuito e disponibilidade

- No UptimeRobot, crie um monitor **HTTP(s)** para `https://SEU-SERVICO.onrender.com/api/health`, com intervalo de 5 minutos.
- O endpoint consulta minimamente o Supabase e devolve HTTP 503 quando o banco estiver indisponível; assim, o UptimeRobot monitora as duas camadas.
- A chamada periódica mantém atividade, porém não impede reinícios, manutenções ou novos deploys do Render.
- O sistema salva mídias e sessões no Supabase justamente para sobreviver ao disco temporário do Render.
- Use apenas uma instância do backend enquanto a fila de mensagens estiver em memória.
- O plano gratuito é adequado para homologação e início controlado, mas não oferece as garantias de disponibilidade e backup esperadas de uma operação empresarial crítica.

## 7. Verificação de segurança depois da publicação

No PowerShell, dentro da pasta `server`, execute:

```powershell
$env:TARGET_URL="https://SEU-SERVICO.onrender.com"
npm run security:test
```

O teste confirma cabeçalhos defensivos, bloqueio de APIs sem autenticação, CORS e proteção contra travessia de diretórios. Depois disso, faça testes manuais com contas de Administrador, Supervisor e Analista para confirmar que nenhum perfil visualiza outro departamento.

## 8. Checklist de liberação

- [ ] Migração executada sem erros no Supabase.
- [ ] Buckets privados criados.
- [ ] RLS habilitada.
- [ ] Variáveis secretas configuradas somente no Render.
- [ ] Administrador temporário removido.
- [ ] WhatsApp restaurado após reinício.
- [ ] Mídias antigas restauradas após reinício.
- [ ] Supervisor bloqueado fora dos departamentos atribuídos.
- [ ] Analista bloqueado fora do próprio departamento.
- [ ] Teste `security:test` aprovado na URL pública.
- [ ] Backup manual do banco realizado antes da entrada em produção.
