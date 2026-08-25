# 💬 Brisoft Desk - Central de Atendimento

Sistema web modular para a **Central de Atendimento Multicanal Brisoft Desk**, desenvolvido com arquitetura profissional em **HTML5, Vanilla CSS modular e JavaScript Vanilla modular**.

---

## 📁 Estrutura de Arquivos e Pastas

```
CombateService/
├── assets/
│   └── logo.png                       # Brasão oficial do Grupo Combate
│
├── css/
│   ├── main.css                       # Ponto de entrada CSS (Master Stylesheet)
│   ├── base/
│   │   ├── variables.css              # Tokens de design: cores, sombras, fontes, raios
│   │   └── reset.css                  # Reset CSS global e custom scrollbar
│   ├── layout/
│   │   ├── sidebar.css                # Menu lateral expansível/recolhível
│   │   ├── topbar.css                 # Cabeçalho superior, status e notificações
│   │   └── container.css              # Layouts principais e roteamento de views
│   ├── components/
│   │   ├── buttons.css                # Botões primários, secundários, ícones e switches
│   │   ├── badges.css                 # Badges de departamentos, status e canais
│   │   ├── cards.css                  # KPI cards, cartões de notas e métricas
│   │   ├── modals.css                 # Janelas modais e notificações toast
│   │   └── tables.css                 # Tabelas de dados, paginação e gavetas laterais
│   └── views/
│       ├── dashboard.css              # Gráficos, rankings e feeds do Dashboard
│       ├── atendimentos.css           # Fila de atendimento, chat e notas
│       ├── historico.css              # Linha do tempo, anexos e pesquisa de satisfação
│       ├── clientes.css               # Gaveta lateral e indicadores de clientes
│       ├── kanban.css                 # Quadro Kanban, colunas e atendentes online
│       ├── mensagens_rapidas.css      # Editor lateral e tabela de respostas
│       ├── relatorios.css             # Gráficos multi-linhas e métricas
│       ├── avaliacoes.css             # Distribuição de estrelas e sentimentos
│       └── configuracoes.css          # Formulários em 3 colunas
│
├── js/
│   ├── data/
│   │   └── mock-data.js               # Base de dados centralizada do sistema
│   ├── core/
│   │   ├── router.js                  # Roteador SPA (switchView e metadados)
│   │   └── utils.js                   # Utilitários de Toasts, Modais e Status
│   ├── components/
│   │   └── sidebar.js                 # Lógica de recolhimento da barra lateral
│   ├── views/
│   │   ├── dashboard.view.js          # Controller do Dashboard
│   │   ├── atendimentos.view.js       # Controller de Chat em Tempo Real e Fila
│   │   ├── historico.view.js          # Controller do Histórico e Timeline
│   │   ├── clientes.view.js           # Controller da Gestão de Clientes
│   │   ├── contatos.view.js           # Controller da Agenda de Contatos
│   │   ├── kanban.view.js             # Controller do Board Kanban
│   │   ├── mensagens_rapidas.view.js  # Controller de Mensagens Rápidas
│   │   ├── relatorios.view.js         # Controller de Relatórios
│   │   ├── avaliacoes.view.js         # Controller de Avaliações e Satisfação
│   │   └── configuracoes.view.js      # Controller de Configurações do Sistema
│   └── app.js                         # Ponto de entrada (Bootstrap do app)
│
├── index.html                         # Estrutura HTML semântica da aplicação
└── README.md                          # Documentação técnica do projeto
```

---

## 🚀 Como Executar a Aplicação

### 1. Iniciar o Servidor Backend (Node.js + WhatsApp + WebSockets)
Basta dar um duplo clique no arquivo [`start-server.bat`](file:///c:/Users/jefersonbrito/Documents/Grupo%20Combate/CombateService/start-server.bat) ou executar no terminal:
```bash
cd server
node src/server.js
```
O servidor inicializará na porta `3000` (`http://localhost:3000`).

### 2. Abrir o Frontend
Basta abrir o arquivo [`index.html`](file:///c:/Users/jefersonbrito/Documents/Grupo%20Combate/CombateService/index.html) diretamente no seu navegador.
* No canto superior direito, clique no botão **"Conectar WhatsApp"**.
* O QR Code gerado pelo servidor será exibido instantaneamente na tela.
* Escaneie com seu celular (WhatsApp > Aparelhos conectados > Conectar um aparelho).
* Assim que conectado, qualquer mensagem enviada para o seu WhatsApp cairá **em tempo real** na fila de atendimento!

---

## 🗄️ Integração com o Supabase (Banco de Dados PostgreSQL)
1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e crie um novo projeto.
2. Acesse o **SQL Editor** no painel do Supabase.
3. Copie e cole todo o conteúdo do arquivo [`server/supabase_schema.sql`](file:///c:/Users/jefersonbrito/Documents/Grupo%20Combate/CombateService/server/supabase_schema.sql) e clique em **Run**.
4. No arquivo `server/.env`, preencha sua `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
