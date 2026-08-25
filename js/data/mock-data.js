// ==========================================================================
// GRUPO COMBATE - CENTRAL DE ATENDIMENTO
// Centralized Data Store (Inicialmente vazio, será populado via Supabase/API)
// ==========================================================================

const MOCK_DATA = {
  currentUser: {
    name: "Jeferson Brito",
    role: "Administrador",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    status: "online"
  },

  atendimentos: [],

  dashboard: {
    kpis: {
      total: { val: "0", growth: "0%", vs: "vs semana anterior" },
      concluidos: { val: "0", growth: "0%", vs: "vs semana anterior" },
      em_atendimento: { val: "0", growth: "0%", vs: "vs semana anterior" },
      aguardando: { val: "0", growth: "0%", vs: "vs semana anterior" },
      sla: { val: "100%", growth: "0%", vs: "vs semana anterior" },
      tempo_resposta: { val: "00:00", growth: "00:00", vs: "vs semana anterior" }
    },
    liveActivity: [],
    slaPorDept: [],
    rankingAtendentes: []
  },

  historico: [],
  clientes: [],
  kanban: [],
  mensagensRapidas: [],
  contatos: [],
  avaliacoes: []
};
