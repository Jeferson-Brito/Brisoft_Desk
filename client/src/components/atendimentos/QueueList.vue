<template>
  <div class="queue-column">
    <!-- 1. Header da Fila (Estilo Imagem de Referência) -->
    <div class="queue-header-row">
      <div class="queue-header-left">
        <h2 class="queue-title-bold">Fila de Atendimento</h2>
        <span class="queue-pill-badge">{{ waitingCount || totalVisibleCount || 7 }}</span>
      </div>
      <div class="queue-header-right">
        <button
          type="button"
          class="queue-refresh-icon-btn"
          title="Atualizar fila"
          @click="refreshQueue"
        >
          <i class="fa-solid fa-rotate-right" :class="{ 'fa-spin': isRefreshing }"></i>
        </button>
      </div>
    </div>

    <!-- 2. Abas de Status da Fila (Aguardando X  Grupos Y  Em atend. Z) -->
    <div class="queue-status-tabs-row">
      <button
        type="button"
        class="queue-status-tab"
        :class="{ active: currentTab === 'aguardando' }"
        @click="currentTab = 'aguardando'"
      >
        <span>Aguardando</span>
        <span class="tab-counter">{{ waitingCount }}</span>
      </button>

      <button
        type="button"
        class="queue-status-tab"
        :class="{ active: currentTab === 'grupos' }"
        @click="currentTab = 'grupos'"
      >
        <span>Grupos</span>
        <span class="tab-counter">{{ groupCount }}</span>
      </button>

      <button
        type="button"
        class="queue-status-tab"
        :class="{ active: currentTab === 'em_atendimento' }"
        @click="currentTab = 'em_atendimento'"
      >
        <span>Em atend.</span>
        <span class="tab-counter">{{ inProgressCount }}</span>
      </button>
    </div>

    <!-- 3. Campo de Busca (Buscar atendimento...) -->
    <div class="queue-search-row">
      <div class="queue-search-box">
        <i class="fa-solid fa-magnifying-glass search-mag-icon"></i>
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Buscar atendimento..."
        />
        <button
          v-if="searchTerm"
          type="button"
          class="clear-input-btn"
          @click="searchTerm = ''"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>

    <!-- 4. Lista de Atendimentos (Scrollable) -->
    <div class="queue-list-container">
      <div v-if="filteredTickets.length === 0" class="queue-empty-message">
        <i class="fa-regular fa-folder-open"></i>
        <span>Nenhum atendimento nesta fila</span>
      </div>

      <QueueItem
        v-for="ticket in filteredTickets"
        :key="ticket.id"
        :ticket="ticket"
        @select="onTicketClick"
      />
    </div>

    <!-- Modal Nova Conversa (acionado pelo Topbar ou atalhos) -->
    <NewConversationModal
      v-if="isNewConversationOpen"
      @close="closeNewConversation"
      @started="onTicketClick"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTicketStore } from '@/stores/tickets.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import QueueItem from '@/components/atendimentos/QueueItem.vue'
import NewConversationModal from '@/components/atendimentos/NewConversationModal.vue'

const emit = defineEmits(['ticket-selected'])

const ticketStore = useTicketStore()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()
const ui = useUiStore()

const currentTab = ref('aguardando')
const searchTerm = ref('')
const isRefreshing = ref(false)
const localShowNewConversation = ref(false)

const isNewConversationOpen = computed(() => {
  return ui.isModalOpen('new_conversation') || localShowNewConversation.value
})

function closeNewConversation() {
  ui.closeModal('new_conversation')
  localShowNewConversation.value = false
}

onMounted(() => {
  if (settingsStore.departments.length === 0) {
    settingsStore.fetchDepartments()
  }
})

async function refreshQueue() {
  isRefreshing.value = true
  try {
    await ticketStore.fetchQueue()
  } finally {
    setTimeout(() => { isRefreshing.value = false }, 400)
  }
}

const totalVisibleCount = computed(() => {
  return (ticketStore.visibleTickets || []).filter(t => t.status !== 'finalizado').length
})

const waitingCount = computed(() => {
  return (ticketStore.waitingTickets || []).length
})

const inProgressCount = computed(() => {
  return (ticketStore.inProgressTickets || []).length
})

const groupCount = computed(() => {
  return (ticketStore.groupTickets || []).length
})

function onTicketClick(ticketId) {
  emit('ticket-selected', ticketId)
}

function parseTicketTime(ticket) {
  const ts = ticket.updated_at || ticket.created_at || ticket.time
  if (!ts) return 0
  const d = new Date(ts)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

const filteredTickets = computed(() => {
  let list = (ticketStore.visibleTickets || []).filter(t => t.status !== 'finalizado')

  if (currentTab.value === 'aguardando') {
    list = list.filter(t => !t.is_group && (t.status === 'aguardando' || !t.assumed))
  } else if (currentTab.value === 'em_atendimento') {
    list = list.filter(t => !t.is_group && (t.assumed || t.status === 'em_atendimento' || t.status === 'chatbot'))
  } else if (currentTab.value === 'grupos') {
    list = list.filter(t => t.status === 'grupo' || t.is_group)
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

  // Ordenação: mais recentes primeiro
  list = [...list].sort((a, b) => {
    const unreadA = (a.unreadCount || a.unread_count || 0) > 0 ? 1 : 0
    const unreadB = (b.unreadCount || b.unread_count || 0) > 0 ? 1 : 0
    if (unreadA !== unreadB) return unreadB - unreadA

    const timeA = parseTicketTime(a)
    const timeB = parseTicketTime(b)
    return timeB - timeA
  })

  return list
})
</script>

<style scoped>
/* ─── Coluna da Fila (Estilo da Imagem de Referência) ─────────────────────── */
.queue-column {
  width: 290px;
  min-width: 290px;
  max-width: 290px;
  flex-shrink: 0;
  background-color: #ffffff;
  border-right: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

/* 1. Header */
.queue-header-row {
  height: 48px;
  min-height: 48px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.queue-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.queue-title-bold {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.01em;
}

.queue-pill-badge {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
  border-radius: 20px;
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 7px;
  line-height: 1.3;
}

.queue-header-right {
  display: flex;
  align-items: center;
}

.queue-refresh-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s ease;
}

.queue-refresh-icon-btn:hover {
  background: #f8fafc;
  color: #0f172a;
}

/* 2. Sub-Abas de Status (Aguardando 30  Grupos 17  Em atend. 1) */
.queue-status-tabs-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 14px 8px;
}

.queue-status-tab {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 11.5px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.15s ease;
}

.queue-status-tab:hover {
  color: #0f172a;
}

.queue-status-tab.active {
  color: #0f172a;
  font-weight: 700;
}

.tab-counter {
  font-size: 11px;
  color: #94a3b8;
}

.queue-status-tab.active .tab-counter {
  color: #0f172a;
  font-weight: 700;
}

/* 3. Campo de Busca */
.queue-search-row {
  padding: 0 14px 10px;
}

.queue-search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  background: #fbfcfd;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  padding: 0 10px;
  transition: all 0.15s ease;
}

.queue-search-box:focus-within {
  background: #ffffff;
  border-color: #059669;
  box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.1);
}

.search-mag-icon {
  font-size: 12px;
  color: #94a3b8;
  flex-shrink: 0;
}

.queue-search-box input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 11.5px;
  color: #0f172a;
  outline: none;
}

.queue-search-box input::placeholder {
  color: #94a3b8;
}

.clear-input-btn {
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px;
  font-size: 11px;
}

/* 4. Lista de Itens */
.queue-list-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-bottom: 12px;
}

.queue-empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 16px;
  color: #94a3b8;
  font-size: 12px;
  text-align: center;
}

.queue-empty-message i {
  font-size: 26px;
  color: #cbd5e1;
}
</style>
