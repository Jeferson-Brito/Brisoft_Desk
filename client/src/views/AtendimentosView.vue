<template>
  <div class="atendimentos-view-layout">
    <div
      class="atendimentos-main-grid"
      :class="{
        'details-open': isDetailsOpen && !!ticketStore.activeTicket,
        'mobile-chat-active': mobilePanel === 'chat'
      }"
    >
      <!-- Coluna 1: Fila de Atendimentos (Aguardando / Em atendimento) -->
      <QueueList
        @ticket-selected="onTicketSelected"
      />

      <!-- Coluna 2: Chat em Tempo Real -->
      <ChatPanel
        :ticket="ticketStore.activeTicket"
        :is-details-open="isDetailsOpen && !!ticketStore.activeTicket"
        @toggle-details="isDetailsOpen = !isDetailsOpen"
        @go-back="mobilePanel = 'queue'"
      />

      <!-- Coluna 3: Detalhes do Atendimento & Contato -->
      <ContactDrawer
        v-if="isDetailsOpen && ticketStore.activeTicket"
        :ticket="ticketStore.activeTicket"
        @close="isDetailsOpen = false"
      />
    </div>

    <!-- Indicadores mensais do atendente (Bottom Metrics KPI Bar) -->
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
        <div class="kpi-mini-icon" style="background:#ecfdf5;color:#059669;">
          <i class="fa-solid fa-chart-pie"></i>
        </div>
        <div class="kpi-mini-info">
          <span class="kpi-mini-label">TMA no mês</span>
          <span class="kpi-mini-value">{{ performance.metrics.tma || '00:00:00' }}</span>
        </div>
      </div>

      <div class="kpi-mini-card">
        <div class="kpi-mini-icon" style="background:#f3e8ff;color:#7e22ce;">
          <i class="fa-solid fa-gauge-high"></i>
        </div>
        <div class="kpi-mini-info">
          <span class="kpi-mini-label">SLA no mês</span>
          <span class="kpi-mini-value">{{ performance.metrics.slaPercent || 0 }}%</span>
        </div>
      </div>

      <div class="kpi-mini-card">
        <div class="kpi-mini-icon" style="background:#fffbeb;color:#d97706;">
          <i class="fa-regular fa-star"></i>
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

    <button v-else class="metrics-toggle metrics-toggle-collapsed" type="button" title="Mostrar indicadores" @click="toggleMetrics">
      <i class="fa-solid fa-chart-line"></i>
      <span>Mostrar indicadores</span>
      <i class="fa-solid fa-chevron-up"></i>
    </button>

    <!-- Modal Nova Conversa -->
    <NewConversationModal
      v-if="showNewConversation"
      @close="showNewConversation = false"
    />

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
import NewConversationModal from '@/components/atendimentos/NewConversationModal.vue'

const ticketStore = useTicketStore()
const ui          = useUiStore()
const auth        = useAuthStore()

const isDetailsOpen = ref(false)
const showNewConversation = ref(false)
const mobilePanel = ref('queue')
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

const ratingLabel = computed(() => performance.value.metrics?.ratingAverage == null
  ? '—'
  : `${Number(performance.value.metrics.ratingAverage).toFixed(1)} ★`)

function toggleMetrics() {
  metricsExpanded.value = !metricsExpanded.value
  localStorage.setItem('attendance_metrics_expanded', String(metricsExpanded.value))
}

function onTicketSelected() {
  mobilePanel.value = 'chat'
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
  } finally {
    liveSyncRunning = false
  }
}

watch(() => ticketStore.activeTicket, (ticket) => {
  if (!ticket) mobilePanel.value = 'queue'
})

onMounted(async () => {
  await Promise.all([ticketStore.fetchQueue(), fetchPerformance()])
  refreshTimer = setInterval(syncLiveData, 10000)
  document.addEventListener('visibilitychange', syncLiveData)
})

onBeforeUnmount(() => {
  clearInterval(refreshTimer)
  clearTimeout(queueRefreshTimer)
  document.removeEventListener('visibilitychange', syncLiveData)
})
</script>

<style scoped>
.atendimentos-view-layout {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background-color: #ffffff;
}

.atendimentos-main-grid {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.bottom-metrics-bar {
  min-height: 52px;
  height: 52px;
  padding: 6px 16px;
  gap: 16px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
  z-index: 30;
}

.metrics-period-label {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  padding-right: 12px;
  border-right: 1px solid #e2e8f0;
}
.metrics-period-label span {
  font-size: 11px;
  font-weight: 700;
  color: #1e293b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.metrics-period-label small {
  font-size: 10.5px;
  color: #64748b;
  text-transform: capitalize;
}

.metrics-toggle {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #64748b;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-left: auto;
  transition: all 0.15s ease;
}
.metrics-toggle:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.metrics-toggle-collapsed {
  position: absolute;
  bottom: 8px;
  right: 16px;
  z-index: 50;
  width: auto;
  height: 28px;
  padding: 0 10px;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.metrics-toggle-collapsed:hover {
  background: #f8fafc;
  color: #1f62d0;
}

@media (max-width: 768px) {
  .atendimentos-main-grid {
    position: relative;
  }
  .atendimentos-main-grid.mobile-chat-active .queue-column {
    display: none;
  }
  .atendimentos-main-grid:not(.mobile-chat-active) .chat-column {
    display: none;
  }
  .bottom-metrics-bar {
    overflow-x: auto;
  }
}
</style>
