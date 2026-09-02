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
        :performance="performance"
        :is-details-open="isDetailsOpen && !!ticketStore.activeTicket"
        @toggle-details="isDetailsOpen = !isDetailsOpen"
        @go-back="mobilePanel = 'queue'"
      />

      <!-- Coluna 3: Detalhes do Atendimento & Contato -->
      <ContactDrawer
        v-if="isDetailsOpen && ticketStore.activeTicket && !ticketStore.activeTicket.is_group"
        :ticket="ticketStore.activeTicket"
        @close="isDetailsOpen = false"
      />
    </div>

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
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
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

const performance = ref({
  today:   { departmentReceived: 0, agentCompleted: 0 },
  metrics: { tma: '00:00:00', slaPercent: 0, ratingAverage: null }
})
let refreshTimer      = null
let queueRefreshTimer = null
let liveSyncRunning   = false
let performanceRequestId = 0

function onTicketSelected() {
  mobilePanel.value = 'chat'
}

function minimizeActiveChat(event) {
  if (event.key !== 'Escape' || !ticketStore.activeTicket) return
  if (document.querySelector('.modal-overlay.active')) return
  ticketStore.minimizeActiveTicket()
  isDetailsOpen.value = false
  mobilePanel.value = 'queue'
}

async function fetchPerformance() {
  const requestId = ++performanceRequestId
  try {
    // Analistas e administradores que também atendem veem seus próprios
    // números. Supervisores mantêm a visão consolidada dos setores vinculados.
    const params = auth.user?.id && !auth.isSupervisor ? { agentId: auth.user.id } : {}
    if (!auth.isAdmin && auth.departmentId) {
      params.departmentId = auth.departmentId
    }
    const { data } = await ticketsApi.performance(params)
    if (requestId === performanceRequestId && data.success && data.performance) performance.value = data.performance
  } catch (_) {}
}

watch(() => ticketStore.queue.filter(ticket => !ticket.is_group).map(ticket => `${ticket.id}:${ticket.status}:${ticket.updated_at || ''}`).join('|'), () => {
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
  refreshTimer = setInterval(syncLiveData, 5000)
  document.addEventListener('visibilitychange', syncLiveData)
  document.addEventListener('keydown', minimizeActiveChat)
})

onBeforeUnmount(() => {
  clearInterval(refreshTimer)
  clearTimeout(queueRefreshTimer)
  document.removeEventListener('visibilitychange', syncLiveData)
  document.removeEventListener('keydown', minimizeActiveChat)
})
</script>

<style scoped>
.atendimentos-view-layout {
  position: relative;
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background-color: #ffffff;
}

.atendimentos-main-grid {
  display: flex;
  flex: 1;
  height: 100vh;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
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
}
</style>
