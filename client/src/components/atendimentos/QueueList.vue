<template>
  <div class="queue-column">
    <!-- Header da Fila -->
    <div class="queue-header-row">
      <div class="queue-header-left">
        <i class="fa-solid fa-bars queue-menu-icon"></i>
        <span class="queue-title-bold">Fila de Atendimento</span>
      </div>
      <div class="queue-header-right">
        <button
          type="button"
          class="queue-new-btn"
          title="Nova Conversa"
          @click="showNewConversation = true"
        >
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>
    </div>

    <!-- Abas da Fila: Aguardando vs Em atendimento -->
    <div class="queue-tabs-row">
      <button
        type="button"
        class="queue-tab-btn"
        :class="{ active: currentTab === 'aguardando' }"
        @click="currentTab = 'aguardando'"
      >
        <span>Aguardando</span>
        <span
          class="queue-tab-count"
          :class="{ 'badge-alert': waitingCount > 0 }"
        >
          {{ waitingCount }}
        </span>
      </button>

      <button
        type="button"
        class="queue-tab-btn"
        :class="{ active: currentTab === 'em_atendimento' }"
        @click="currentTab = 'em_atendimento'"
      >
        <span>Em atendimento</span>
        <span class="queue-tab-count">
          {{ inProgressCount }}
        </span>
      </button>
    </div>

    <!-- Barra de Busca compacta -->
    <div class="queue-search-container">
      <div class="search-input-box">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Buscar atendimento..."
        />
        <button
          v-if="searchTerm"
          type="button"
          class="clear-btn"
          @click="searchTerm = ''"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>

    <!-- Lista de Tickets -->
    <div class="queue-cards-stream" id="queueListContainer">
      <div v-if="ticketStore.loading && filteredTickets.length === 0" class="queue-loading">
        <i class="fa-solid fa-circle-notch fa-spin"></i>
      </div>

      <div v-else-if="filteredTickets.length === 0" class="queue-empty-msg">
        <i class="fa-regular fa-comments"></i>
        <span>Nenhum atendimento em {{ currentTab === 'aguardando' ? 'espera' : 'atendimento' }}</span>
      </div>

      <div v-else class="queue-cards-wrapper">
        <QueueItem
          v-for="t in filteredTickets"
          :key="t.id"
          :ticket="t"
          @select="onTicketClick(t.id)"
        />
      </div>
    </div>

    <!-- Modal Nova Conversa -->
    <NewConversationModal
      v-if="showNewConversation"
      @close="showNewConversation = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTicketStore } from '@/stores/tickets.store'
import QueueItem from '@/components/atendimentos/QueueItem.vue'
import NewConversationModal from '@/components/atendimentos/NewConversationModal.vue'

const emit = defineEmits(['ticket-selected'])

const ticketStore = useTicketStore()
const currentTab = ref('aguardando')
const searchTerm = ref('')
const showNewConversation = ref(false)

const waitingCount = computed(() => (ticketStore.waitingTickets || []).length)
const inProgressCount = computed(() => (ticketStore.inProgressTickets || []).length)

function onTicketClick(ticketId) {
  emit('ticket-selected', ticketId)
}

const filteredTickets = computed(() => {
  let list = (ticketStore.visibleTickets || []).filter(t => t.status !== 'finalizado')

  if (currentTab.value === 'aguardando') {
    list = list.filter(t => t.status === 'aguardando' || !t.assumed)
  } else if (currentTab.value === 'em_atendimento') {
    list = list.filter(t => t.assumed || t.status === 'em_atendimento' || t.status === 'chatbot')
  }

  if (searchTerm.value.trim()) {
    const term = searchTerm.value.trim().toLowerCase()
    list = list.filter(t => {
      const name = (t.clientName || t.client_name || '').toLowerCase()
      const phone = (t.phone || '').toLowerCase()
      const prev = (t.preview || '').toLowerCase()
      return name.includes(term) || phone.includes(term) || prev.includes(term)
    })
  }

  return list
})
</script>

<style scoped>
.queue-column {
  width: 320px;
  min-width: 320px;
  max-width: 320px;
  flex-shrink: 0;
  background-color: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
}

.queue-header-row {
  height: 48px;
  min-height: 48px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e7eb;
}

.queue-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.queue-menu-icon {
  font-size: 13px;
  color: #64748b;
}

.queue-title-bold {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.queue-new-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.queue-new-btn:hover {
  color: #1f62d0;
  border-color: #bfdbfe;
  background: #eff6ff;
}

/* Abas Aguardando vs Em atendimento */
.queue-tabs-row {
  display: flex;
  padding: 8px 10px 4px;
  gap: 6px;
  border-bottom: 1px solid #f1f5f9;
}

.queue-tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 6px;
  border: none;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.queue-tab-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.queue-tab-btn.active {
  background: #eff6ff;
  color: #1f62d0;
  font-weight: 700;
}

.queue-tab-count {
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  font-weight: 700;
}

.queue-tab-btn.active .queue-tab-count {
  background: #dbeafe;
  color: #1f62d0;
}

.badge-alert {
  background: #fee2e2 !important;
  color: #ef4444 !important;
}

.queue-search-container {
  padding: 8px 10px;
}

.search-input-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input-box i {
  position: absolute;
  left: 9px;
  color: #94a3b8;
  font-size: 11px;
}

.search-input-box input {
  width: 100%;
  height: 30px;
  padding: 0 26px 0 28px;
  background: #f1f5f9;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 12px;
  color: #0f172a;
  outline: none;
  transition: all 0.15s ease;
}

.search-input-box input:focus {
  background: #ffffff;
  border-color: #1f62d0;
}

.clear-btn {
  position: absolute;
  right: 6px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

.queue-cards-stream {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 12px;
}

.queue-cards-wrapper {
  display: flex;
  flex-direction: column;
}

.queue-loading,
.queue-empty-msg {
  padding: 36px 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.queue-empty-msg i {
  font-size: 24px;
}
</style>
