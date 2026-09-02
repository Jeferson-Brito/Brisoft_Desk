<template>
  <div class="queue-column">
    <!-- Header da Fila -->
    <div class="queue-header-row">
      <div class="queue-header-left">
        <span class="queue-title-bold">Fila de Atendimento</span>
      </div>
      <div class="queue-header-right">
        <!-- Botão Filtros -->
        <button
          type="button"
          class="queue-filter-btn"
          :class="{ active: showFilterPopover || hasActiveFilters }"
          title="Filtros e ordenação"
          @click="showFilterPopover = !showFilterPopover"
        >
          <i class="fa-solid fa-sliders"></i>
          <span v-if="hasActiveFilters" class="filter-dot"></span>
        </button>

        <!-- Botão Nova Conversa -->
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

    <!-- Painel de Filtros Popover -->
    <Transition name="filter-slide">
      <div v-if="showFilterPopover" class="queue-filter-panel">
        <!-- Ordenação -->
        <div class="filter-group">
          <label class="filter-label">Ordenar por</label>
          <select v-model="sortBy" class="filter-select">
            <option value="recent">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
          </select>
        </div>

        <!-- Filtro de Departamento (Apenas Admin ou Supervisor) -->
        <div v-if="canFilterDepartment" class="filter-group">
          <label class="filter-label">Departamento</label>
          <select v-model="selectedDepartment" class="filter-select">
            <option value="">Todos os Departamentos</option>
            <option v-for="d in allowedDepartments" :key="d.id" :value="d.name">
              {{ d.name }}
            </option>
          </select>
        </div>

        <!-- Checkboxes de Filtro -->
        <div class="filter-checkboxes-wrap">
          <label class="filter-checkbox-label">
            <input v-model="onlyUnread" type="checkbox" />
            <span>Apenas não lidos</span>
          </label>

          <label class="filter-checkbox-label">
            <input v-model="unreadFirst" type="checkbox" />
            <span>Não lidos primeiro</span>
          </label>

          <label class="filter-checkbox-label">
            <input v-model="onlyMine" type="checkbox" />
            <span>Apenas meus atendimentos</span>
          </label>
        </div>

        <div class="filter-panel-footer">
          <button v-if="hasActiveFilters" type="button" class="filter-reset-btn" @click="resetFilters">
            <i class="fa-solid fa-xmark"></i> Limpar filtros
          </button>
          <button type="button" class="filter-close-btn" @click="showFilterPopover = false">
            Concluído
          </button>
        </div>
      </div>
    </Transition>

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
        :class="{ active: currentTab === 'grupos' }"
        @click="currentTab = 'grupos'"
      >
        <span>Grupos</span>
        <span class="queue-tab-count">{{ groupCount }}</span>
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

    <!-- Chips de Filtros Ativos -->
    <div v-if="hasActiveFilters" class="queue-active-chip-bar">
      <span v-if="selectedDepartment" class="active-filter-chip">
        Setor: <strong>{{ selectedDepartment }}</strong>
        <i class="fa-solid fa-xmark" @click="selectedDepartment = ''"></i>
      </span>
      <span v-if="onlyUnread" class="active-filter-chip">
        Não lidos
        <i class="fa-solid fa-xmark" @click="onlyUnread = false"></i>
      </span>
      <span v-if="onlyMine" class="active-filter-chip">
        Apenas Meus
        <i class="fa-solid fa-xmark" @click="onlyMine = false"></i>
      </span>
      <span v-if="sortBy === 'oldest'" class="active-filter-chip">
        Mais antigos
        <i class="fa-solid fa-xmark" @click="sortBy = 'recent'"></i>
      </span>
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
        <span>{{ currentTab === 'grupos' ? 'Nenhum grupo disponível' : `Nenhum atendimento em ${currentTab === 'aguardando' ? 'espera' : 'atendimento'}` }}</span>
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
import { ref, computed, onMounted } from 'vue'
import { useTicketStore } from '@/stores/tickets.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useAuthStore } from '@/stores/auth.store'
import QueueItem from '@/components/atendimentos/QueueItem.vue'
import NewConversationModal from '@/components/atendimentos/NewConversationModal.vue'

const emit = defineEmits(['ticket-selected'])

const ticketStore = useTicketStore()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()

const currentTab = ref('aguardando')
const searchTerm = ref('')
const sortBy = ref('recent')
const selectedDepartment = ref('')
const onlyUnread = ref(false)
const unreadFirst = ref(false)
const onlyMine = ref(false)
const showFilterPopover = ref(false)
const showNewConversation = ref(false)

onMounted(() => {
  if (settingsStore.departments.length === 0) {
    settingsStore.fetchDepartments()
  }
})

const canFilterDepartment = computed(() => {
  return authStore.isAdmin || authStore.isSupervisor
})

const allowedDepartments = computed(() => {
  if (authStore.isAdmin) return settingsStore.departments
  if (authStore.isSupervisor) {
    const supervisorDepts = (authStore.departmentIds || []).map(String)
    return settingsStore.departments.filter(d => supervisorDepts.includes(String(d.id)))
  }
  return []
})

const hasActiveFilters = computed(() => {
  return Boolean(
    selectedDepartment.value ||
    onlyUnread.value ||
    unreadFirst.value ||
    onlyMine.value ||
    sortBy.value !== 'recent'
  )
})

const waitingCount = computed(() => {
  return (ticketStore.waitingTickets || []).filter(t => {
    if (selectedDepartment.value && (t.department || t.deptInitial) !== selectedDepartment.value) return false
    if (onlyUnread.value && (t.unreadCount || 0) === 0) return false
    if (onlyMine.value) {
      const myId = authStore.user?.id
      if (t.agent_id !== myId && t.user_id !== myId) return false
    }
    return true
  }).length
})

const inProgressCount = computed(() => {
  return (ticketStore.inProgressTickets || []).filter(t => {
    if (selectedDepartment.value && (t.department || t.deptInitial) !== selectedDepartment.value) return false
    if (onlyUnread.value && (t.unreadCount || 0) === 0) return false
    if (onlyMine.value) {
      const myId = authStore.user?.id
      if (t.agent_id !== myId && t.user_id !== myId) return false
    }
    return true
  }).length
})

const groupCount = computed(() => {
  return (ticketStore.groupTickets || []).filter(t => {
    if (selectedDepartment.value && (t.department || t.deptInitial) !== selectedDepartment.value) return false
    if (onlyUnread.value && (t.unreadCount || t.unread_count || 0) === 0) return false
    return true
  }).length
})

function onTicketClick(ticketId) {
  emit('ticket-selected', ticketId)
}

function resetFilters() {
  selectedDepartment.value = ''
  onlyUnread.value = false
  unreadFirst.value = false
  onlyMine.value = false
  sortBy.value = 'recent'
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
    list = list.filter(t => t.status === 'grupo')
  }

  if (selectedDepartment.value) {
    list = list.filter(t => (t.department || t.deptInitial) === selectedDepartment.value)
  }

  if (onlyUnread.value) {
    list = list.filter(t => (t.unreadCount || t.unread_count || 0) > 0)
  }

  if (onlyMine.value && currentTab.value !== 'grupos') {
    const myId = authStore.user?.id
    list = list.filter(t => t.agent_id === myId || t.user_id === myId)
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

  // Ordenação
  list = [...list].sort((a, b) => {
    if (unreadFirst.value) {
      const unreadA = (a.unreadCount || a.unread_count || 0) > 0 ? 1 : 0
      const unreadB = (b.unreadCount || b.unread_count || 0) > 0 ? 1 : 0
      if (unreadA !== unreadB) return unreadB - unreadA
    }

    const timeA = parseTicketTime(a)
    const timeB = parseTicketTime(b)

    if (sortBy.value === 'oldest') {
      return timeA - timeB
    }
    return timeB - timeA
  })

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
  position: relative;
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

.queue-title-bold {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #0f172a;
}

.queue-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.queue-filter-btn,
.queue-new-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  position: relative;
  transition: transform 0.16s ease, color 0.16s ease, border-color 0.16s ease, background-color 0.16s ease;
}

.queue-filter-btn:hover,
.queue-new-btn:hover {
  color: #1f62d0;
  border-color: #bfdbfe;
  background: #eff6ff;
  transform: translateY(-1px);
}

.queue-filter-btn.active {
  color: #1f62d0;
  border-color: #1f62d0;
  background: #eff6ff;
}

.filter-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #1f62d0;
}

/* Painel de Filtros */
.queue-filter-panel {
  padding: 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: slideDown 0.15s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-label {
  font-size: 11px;
  font-weight: 500;
  color: #475569;
}

.filter-select {
  width: 100%;
  padding: 5px 8px;
  border-radius: 5px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  font-size: 12px;
  color: #0f172a;
  outline: none;
}

.filter-select:focus {
  border-color: #1f62d0;
}

.filter-checkboxes-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: #334155;
  cursor: pointer;
}

.filter-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
}

.filter-reset-btn {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.filter-close-btn {
  background: #1f62d0;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  margin-left: auto;
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
  padding: 7px 5px;
  border-radius: 6px;
  border: none;
  background: #f8fafc;
  color: #64748b;
  font-size: 11px;
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
  font-weight: 600;
}

.queue-tab-count {
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  font-weight: 600;
}

.queue-tab-btn.active .queue-tab-count {
  background: #dbeafe;
  color: #1f62d0;
}

.badge-alert {
  background: #fee2e2 !important;
  color: #ef4444 !important;
}

/* Chip Bar */
.queue-active-chip-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 10px 0;
}

.active-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  font-size: 11px;
  color: #1f62d0;
}

.active-filter-chip i {
  cursor: pointer;
  font-size: 10px;
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
  background: #f8fafc;
  border: 1px solid #e2e8f0;
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
  padding: 2px 0 12px;
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
