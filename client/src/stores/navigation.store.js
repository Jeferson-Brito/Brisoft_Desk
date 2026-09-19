import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNavigationStore = defineStore('navigation', () => {
  // ─── Atendimentos ─────────────────────────────────────────────────────────
  const atendimentosTab = ref('aguardando') // 'todos' | 'aguardando' | 'em_atendimento' | 'grupos' | 'meus'
  const atendimentosDept = ref('')
  const atendimentosAction = ref(null) // 'new_conversation' | 'refresh'

  // ─── Histórico ────────────────────────────────────────────────────────────
  const historicoTab = ref('todos') // 'todos' | 'meus' | 'avaliados'
  const historicoDept = ref('')
  const historicoAction = ref(null) // 'export_csv' | 'clear_filters'

  // ─── Clientes / Contatos ──────────────────────────────────────────────────
  const clientesTab = ref('customers') // 'customers' | 'employees' | 'todos'
  const clientesAction = ref(null) // 'new_contact' | 'import' | 'template'

  // ─── Mensagens Rápidas ────────────────────────────────────────────────────
  const mensagensTab = ref('todas') // 'todas' | 'gerais' | 'minhas'
  const mensagensDept = ref('')
  const mensagensAction = ref(null) // 'new_message'

  // ─── Desempenho ───────────────────────────────────────────────────────────
  const desempenhoTab = ref('visao_geral') // 'visao_geral' | 'atendentes' | 'avaliacoes' | 'sla'
  const desempenhoAction = ref(null)

  // ─── Configurações ────────────────────────────────────────────────────────
  const configuracoesTab = ref('conexoes') // 'conexoes' | 'geral' | 'departamentos' | 'usuarios' | 'ia'

  // ─── Dashboard ────────────────────────────────────────────────────────────
  const dashboardTab = ref('visao_geral') // 'visao_geral' | 'tempo_real' | 'metricas' | 'online'

  function triggerAtendimentosAction(action) {
    atendimentosAction.value = action
    setTimeout(() => { atendimentosAction.value = null }, 300)
  }

  function triggerClientesAction(action) {
    clientesAction.value = action
    setTimeout(() => { clientesAction.value = null }, 300)
  }

  function triggerHistoricoAction(action) {
    historicoAction.value = action
    setTimeout(() => { historicoAction.value = null }, 300)
  }

  function triggerMensagensAction(action) {
    mensagensAction.value = action
    setTimeout(() => { mensagensAction.value = null }, 300)
  }

  return {
    atendimentosTab,
    atendimentosDept,
    atendimentosAction,
    triggerAtendimentosAction,

    historicoTab,
    historicoDept,
    historicoAction,
    triggerHistoricoAction,

    clientesTab,
    clientesAction,
    triggerClientesAction,

    mensagensTab,
    mensagensDept,
    mensagensAction,
    triggerMensagensAction,

    desempenhoTab,
    desempenhoAction,

    configuracoesTab,

    dashboardTab
  }
})
