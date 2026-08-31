<template>
  <div class="queue-column">
    <!-- Header da Fila estilo Image 2 -->
    <div class="queue-header-row">
      <div class="queue-header-left">
        <i class="fa-solid fa-bars queue-menu-icon"></i>
        <span class="queue-title-bold">{{ queueTitle }}</span>
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

    <!-- Dropdown / Sub-header bar: Open Count & Sort -->
    <div class="queue-subheader-row">
      <div class="queue-filter-dropdown-btn">
        <span>{{ activeTabLabel }} {{ filteredTickets.length }}</span>
        <i class="fa-solid fa-chevron-down"></i>
      </div>
      <div class="queue-sort-dropdown-btn" @click="toggleSort">
        <span>{{ sortBy === 'recent' ? 'Mais recentes' : 'Mais antigos' }}</span>
        <i class="fa-solid fa-chevron-down"></i>
      </div>
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
        <span>Nenhum atendimento encontrado</span>
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

const props = defineProps({
  filterCategory: {
    type: String,
    default: 'all'
  }
})

const emit = defineEmits(['ticket-selected'])

const ticketStore = useTicketStore()
const searchTerm = ref('')
const sortBy = ref('recent')
const showNewConversation = ref(false)

const queueTitle = computed(() => {
  if (props.filterCategory === 'mine') return 'Meus Atendimentos'
  if (props.filterCategory === 'waiting') return 'Aguardando Fila'
  if (props.filterCategory.startsWith('dept:')) {
    return props.filterCategory.slice(5)
  }
  return 'Fila de Atendimento'
})

const activeTabLabel = computed(() => 'Abertos')

function toggleSort() {
  sortBy.value = sortBy.value === 'recent' ? 'oldest' : 'recent'
}

function onTicketClick(ticketId) {
  emit('ticket-selected', ticketId)
}

const filteredTickets = computed(() => {
  let list = (ticketStore.visibleTickets || []).filter(t => t.status !== 'finalizado')

  if (props.filterCategory === 'waiting') {
    list = list.filter(t => t.status === 'aguardando' || !t.assumed)
  } else if (props.filterCategory === 'mine') {
    list = list.filter(t => t.assumed || t.status === 'em_atendimento')
  } else if (props.filterCategory.startsWith('dept:')) {
    const dept = props.filterCategory.slice(5)
    list = list.filter(t => (t.department || t.deptInitial) === dept)
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
  width: 310px;
  min-width: 310px;
  max-width: 310px;
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

.queue-subheader-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px 6px;
  font-size: 11.5px;
  color: #64748b;
  font-weight: 600;
}

.queue-filter-dropdown-btn,
.queue-sort-dropdown-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.queue-filter-dropdown-btn:hover,
.queue-sort-dropdown-btn:hover {
  color: #0f172a;
}

.queue-filter-dropdown-btn i,
.queue-sort-dropdown-btn i {
  font-size: 9px;
}

.queue-search-container {
  padding: 4px 10px 8px;
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
