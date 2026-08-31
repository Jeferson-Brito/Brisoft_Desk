<template>
  <div class="atendimentos-view-layout">
    <div
      class="atendimentos-main-grid"
      :class="{
        'details-open': isDetailsOpen && !!ticketStore.activeTicket,
        'mobile-chat-active': mobilePanel === 'chat'
      }"
    >
      <!-- Coluna 1: Fila de Atendimentos -->
      <QueueList @ticket-selected="onTicketSelected" />

      <!-- Coluna 2: Chat em Tempo Real -->
      <ChatPanel
        :ticket="ticketStore.activeTicket"
        :is-details-open="isDetailsOpen && !!ticketStore.activeTicket"
        @toggle-details="isDetailsOpen = !isDetailsOpen"
        @go-back="mobilePanel = 'queue'"
      />

      <!-- Coluna 3: Detalhes do Contato -->
      <ContactDrawer
        v-if="isDetailsOpen && ticketStore.activeTicket"
        :ticket="ticketStore.activeTicket"
      />
    </div>

    <!-- Indicadores mensais do atendente -->
    <div v-if="metricsExpanded" class="bottom-metrics-bar">
      <div class="metrics-period-label">
        <span>Indicadores</span>
        <small>{{ currentMonthLabel }}</small>
      </div>
      <div class="kpi-mini-card">
        <div class="kpi-mini-icon" style="background:#ecfdf5;color:#10b981;">
          <i class="fa-regular fa-comment-dots"></i>
        </div>
        <div class="kpi-mini-info">
          <span class="kpi-mini-label">Chats do setor hoje</span>
          <span class="kpi-mini-value">{{ performance.today.departmentReceived }}</span>
        </div>
      </div>

      <div class="kpi-mini-card">
        <div class="kpi-mini-icon" style="background:#eff6ff;color:#2563eb;">
          <i class="fa-regular fa-clock"></i>
        </div>
        <div class="kpi-mini-info">
          <span class="kpi-mini-label">Meus atendimentos hoje</span>
          <span class="kpi-mini-value">{{ performance.today.agentCompleted }}</span>
        </div>
      </div>

      <div class="kpi-mini-card">
        <div class="kpi-mini-icon" style="background:#fff7ed;color:#f97316;">
          <i class="fa-solid fa-chart-pie"></i>
        </div>
        <div class="kpi-mini-info">
          <span class="kpi-mini-label">TMA no mês</span>
          <span class="kpi-mini-value">{{ performance.metrics.tma }}</span>
        </div>
      </div>

      <div class="kpi-mini-card">
        <div class="kpi-mini-icon" style="background:#f3e8ff;color:#7e22ce;">
          <i class="fa-solid fa-gauge-high"></i>
        </div>
        <div class="kpi-mini-info">
          <span class="kpi-mini-label">SLA no mês</span>
          <span class="kpi-mini-value">{{ performance.metrics.slaPercent }}%</span>
        </div>
      </div>

      <div class="kpi-mini-card">
        <div class="kpi-mini-icon" style="background:#fef9c3;color:#ca8a04;">
          <i class="fa-solid fa-star"></i>
        </div>
        <div class="kpi-mini-info">
          <span class="kpi-mini-label">Média de avaliação</span>
          <span class="kpi-mini-value">{{ ratingLabel }}</span>
        </div>
      </div>
      <button class="metrics-toggle" type="button" title="Recolher indicadores" @click="toggleMetrics">
        <i class="fa-solid fa-chevron-down"></i>
      </button>
    </div>
    <button v-else class="metrics-toggle metrics-toggle-collapsed" type="button" @click="toggleMetrics">
      <i class="fa-solid fa-chart-line"></i>
      <span>Mostrar indicadores</span>
      <i class="fa-solid fa-chevron-up"></i>
    </button>

    <!-- Modal de Encerramento -->
    <ModalEncerrar
      v-if="ui.isModalOpen('encerrar')"
      :ticket="ticketStore.activeTicket"
      @close="ui.closeModal('encerrar')"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useTicketStore } from '@/stores/tickets.store'
import { useUiStore }     from '@/stores/ui.store'
import { useAuthStore }   from '@/stores/auth.store'
import { ticketsApi }     from '@/api/tickets.api'
import QueueList          from '@/components/atendimentos/QueueList.vue'
import ChatPanel          from '@/components/atendimentos/ChatPanel.vue'
import ContactDrawer      from '@/components/atendimentos/ContactDrawer.vue'
import ModalEncerrar      from '@/components/modals/ModalEncerrar.vue'

const ticketStore = useTicketStore()
const ui          = useUiStore()
const auth        = useAuthStore()

const isDetailsOpen  = ref(false)
// 'queue' | 'chat' — controla qual painel é visível em mobile
const mobilePanel    = ref('queue')
const metricsExpanded = ref(localStorage.getItem('attendance_metrics_expanded') !== 'false')
const performance = ref({
  today:   { departmentReceived: 0, agentCompleted: 0 },
  metrics: { tma: '00:00:00', slaPercent: 0, ratingAverage: null }
})
let refreshTimer      = null
let queueRefreshTimer = null
let liveSyncRunning   = false

const currentMonthLabel = computed(() => new Intl.DateTimeFormat('pt-BR', {
  month: 'long', year: 'numeric'
}).format(new Date()))

const ratingLabel = computed(() => performance.value.metrics.ratingAverage == null
  ? '—'
  : `${Number(performance.value.metrics.ratingAverage).toFixed(1)} ★`)

// Quando usuário seleciona ticket via QueueList em mobile, muda para painel de chat
function onTicketSelected() {
  mobilePanel.value = 'chat'
}

function toggleMetrics() {
  metricsExpanded.value = !metricsExpanded.value
  localStorage.setItem('attendance_metrics_expanded', String(metricsExpanded.value))
}

async function fetchPerformance() {
  try {
    const { data } = await ticketsApi.performance(auth.isAdmin && auth.user?.id ? { agentId: auth.user.id } : {})
    if (data.success && data.performance) performance.value = data.performance
  } catch (_) {}
}

watch(() => ticketStore.queue.map(ticket => `${ticket.id}:${ticket.status}:${ticket.updated_at || ''}`).join('|'), () => {
  clearTimeout(queueRefreshTimer)
  queueRefreshTimer = setTimeout(fetchPerformance, 700)
})

watch(() => ticketStore.kpiRevision, () => {
  clearTimeout(queueRefreshTimer)
  queueRefreshTimer = setTimeout(fetchPerformance, 250)
})

async function syncLiveData() {
  if (liveSyncRunning || document.visibilityState !== 'visible') return
  liveSyncRunning = true
  try {
    await Promise.all([ticketStore.fetchQueue({ silent: true }), fetchPerformance()])
  } catch (_) {
    // Mantém os dados atuais e tenta novamente no próximo ciclo ou reconexão.
  } finally {
    liveSyncRunning = false
  }
}

// Volta para fila quando ticket ativo é limpo
watch(() => ticketStore.activeTicket, (ticket) => {
  if (!ticket) mobilePanel.value = 'queue'
})

onMounted(async () => {
  await Promise.all([ticketStore.fetchQueue(), fetchPerformance()])
  // O socket atualiza imediatamente; esta sincronização periódica recupera
  // qualquer evento perdido durante oscilações de rede ou suspensão da aba.
  refreshTimer = setInterval(syncLiveData, 10000)
  document.addEventListener('visibilitychange', syncLiveData)
})

onBeforeUnmount(() => {
  clearInterval(refreshTimer)
  clearTimeout(queueRefreshTimer)
  document.removeEventListener('visibilitychange', syncLiveData)
})
</script>
