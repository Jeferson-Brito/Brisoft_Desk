<template>
  <div class="queue-column">
    <!-- 1. Header da Fila (Estilo Imagem 1 com botão + mantido) -->
    <div class="queue-header-row">
      <div class="queue-header-left">
        <h2 class="queue-title-bold">Fila de Atendimento</h2>
        <span class="queue-badge-new">{{ newTicketsCount }} novos</span>
      </div>
      <div class="queue-header-right">
        <!-- Botão Filtros -->
        <button
          type="button"
          class="queue-action-btn"
          :class="{ active: showFilterPopover || hasActiveFilters }"
          title="Filtros e ordenação"
          @click="showFilterPopover = !showFilterPopover"
        >
          <i class="fa-solid fa-sliders"></i>
          <span v-if="hasActiveFilters" class="filter-dot"></span>
        </button>

        <!-- Botão Novo Atendimento (+) -->
        <button
          type="button"
          class="queue-action-btn queue-plus-btn"
          title="Iniciar novo atendimento"
          @click="showNewConversation = true"
        >
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>
    </div>

    <!-- Painel Suspenso de Filtros Avançados -->
    <Transition name="filter-slide">
      <div v-if="showFilterPopover" class="queue-filter-panel">
        <div class="filter-group">
          <label class="filter-label">Ordenar por</label>
          <select v-model="sortBy" class="filter-select">
            <option value="recent">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
          </select>
        </div>

        <div v-if="canFilterDepartment" class="filter-group">
          <label class="filter-label">Departamento</label>
          <select v-model="selectedDepartment" class="filter-select">
            <option value="">Todos os Departamentos</option>
            <option v-for="d in allowedDepartments" :key="d.id" :value="d.name">
              {{ d.name }}
            </option>
          </select>
        </div>

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

    <!-- 2. Barra de Busca Arredondada (Buscar cliente, CPF ou protocolo...) -->
    <div class="queue-search-wrap">
      <div class="search-input-box">
        <i class="fa-solid fa-magnifying-glass search-icon"></i>
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Buscar cliente, CPF ou protocolo..."
        />
        <button
          v-if="searchTerm"
          type="button"
          class="clear-search-btn"
          @click="searchTerm = ''"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>

    <!-- 3. Pílulas de Filtro Horizontais (Estilo Imagem 1) -->
    <div class="queue-pills-track">
      <!-- Pílula Todos -->
      <button
        type="button"
        class="queue-pill"
        :class="{ active: currentCategory === 'todos' }"
        @click="selectCategory('todos')"
      >
        Todos ({{ totalVisibleCount }})
      </button>

      <!-- Pílulas dos Departamentos -->
      <button
        v-for="dept in allowedDepartments"
        :key="dept.id"
        type="button"
        class="queue-pill"
        :class="{ active: currentCategory === dept.name }"
        @click="selectCategory(dept.name)"
      >
        {{ dept.name }}
      </button>

      <!-- Pílula Aguardando -->
      <button
        type="button"
        class="queue-pill"
        :class="{ active: currentCategory === 'aguardando' }"
        @click="selectCategory('aguardando')"
      >
        Aguardando ({{ waitingCount }})
      </button>

      <!-- Pílula Em Atendimento -->
      <button
        type="button"
        class="queue-pill"
        :class="{ active: currentCategory === 'em_atendimento' }"
        @click="selectCategory('em_atendimento')"
      >
        Em atendimento ({{ inProgressCount }})
      </button>

      <!-- Pílula Grupos -->
      <button
        v-if="groupCount > 0"
        type="button"
        class="queue-pill"
        :class="{ active: currentCategory === 'grupos' }"
        @click="selectCategory('grupos')"
      >
        Grupos ({{ groupCount }})
      </button>
    </div>

    <!-- Divisória suave -->
    <div class="queue-header-divider"></div>

    <!-- 4. Lista de Atendimentos (Scrollable Cards) -->
    <div class="queue-list-items">
      <div v-if="filteredTickets.length === 0" class="queue-empty-state">
        <i class="fa-solid fa-inbox"></i>
        <span>Nenhum atendimento nesta fila</span>
      </div>

      <QueueItem
        v-for="ticket in filteredTickets"
        :key="ticket.id"
        :ticket="ticket"
        @select="onTicketClick"
      />
    </div>

    <!-- Modal Nova Conversa -->
    <NewConversationModal
      v-if="showNewConversation"
      @close="showNewConversation = false"
      @started="onTicketClick"
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

// Categoria selecionada nas pílulas: 'todos' | 'aguardando' | 'em_atendimento' | 'grupos' | nome_do_departamento
const currentCategory = ref('todos')
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
  return settingsStore.departments
})

const hasActiveFilters = computed(() => {
  return Boolean(
    onlyUnread.value ||
    unreadFirst.value ||
    onlyMine.value ||
    sortBy.value !== 'recent'
  )
})

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

const newTicketsCount = computed(() => {
  return waitingCount.value || totalVisibleCount.value || 0
})

function selectCategory(cat) {
  currentCategory.value = cat
  if (cat === 'todos') {
    selectedDepartment.value = ''
  } else if (cat === 'aguardando' || cat === 'em_atendimento' || cat === 'grupos') {
    selectedDepartment.value = ''
  } else {
    // É um departamento específico
    selectedDepartment.value = cat
  }
}

function onTicketClick(ticketId) {
  emit('ticket-selected', ticketId)
}

function resetFilters() {
  selectedDepartment.value = ''
  onlyUnread.value = false
  unreadFirst.value = false
  onlyMine.value = false
  sortBy.value = 'recent'
  currentCategory.value = 'todos'
}

function parseTicketTime(ticket) {
  const ts = ticket.updated_at || ticket.created_at || ticket.time
  if (!ts) return 0
  const d = new Date(ts)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

const filteredTickets = computed(() => {
  let list = (ticketStore.visibleTickets || []).filter(t => t.status !== 'finalizado')

  // Filtro pela categoria da pílula
  if (currentCategory.value === 'aguardando') {
    list = list.filter(t => !t.is_group && (t.status === 'aguardando' || !t.assumed))
  } else if (currentCategory.value === 'em_atendimento') {
    list = list.filter(t => !t.is_group && (t.assumed || t.status === 'em_atendimento' || t.status === 'chatbot'))
  } else if (currentCategory.value === 'grupos') {
    list = list.filter(t => t.status === 'grupo' || t.is_group)
  } else if (currentCategory.value !== 'todos') {
    // Departamento específico selecionado pela pílula
    list = list.filter(t => (t.department || t.deptInitial) === currentCategory.value)
  }

  // Filtro por departamento do popover (caso aplicado)
  if (selectedDepartment.value && currentCategory.value === 'todos') {
    list = list.filter(t => (t.department || t.deptInitial) === selectedDepartment.value)
  }

  if (onlyUnread.value) {
    list = list.filter(t => (t.unreadCount || t.unread_count || 0) > 0)
  }

  if (onlyMine.value && currentCategory.value !== 'grupos') {
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
/* ─── Coluna da Fila (Estilo Imagem 1) ────────────────────────────────────── */
.queue-column {
  width: 340px;
  min-width: 340px;
  max-width: 340px;
  flex-shrink: 0;
  background-color: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

/* 1. Header */
.queue-header-row {
  height: 52px;
  min-height: 52px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.queue-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.queue-title-bold {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.015em;
  color: #0f172a;
  margin: 0;
}

/* Badge X novos */
.queue-badge-new {
  font-size: 11.5px;
  font-weight: 600;
  color: #dc2626;
  background: #fee2e2;
  padding: 2.5px 9px;
  border-radius: 9999px;
  line-height: 1.3;
}

.queue-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.queue-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  position: relative;
  transition: all 0.15s ease;
}

.queue-action-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.queue-action-btn.active {
  color: #0d9488;
  background: #f0fdfa;
}

.queue-plus-btn {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #0f172a;
  font-weight: 600;
}

.queue-plus-btn:hover {
  background: #0d9488;
  border-color: #0d9488;
  color: #ffffff;
}

.filter-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #0d9488;
}

/* 2. Barra de Busca */
.queue-search-wrap {
  padding: 0 16px 10px;
}

.search-input-box {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 38px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0 12px;
  transition: all 0.15s ease;
}

.search-input-box:focus-within {
  background: #ffffff;
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.search-icon {
  font-size: 13px;
  color: #94a3b8;
  flex-shrink: 0;
}

.search-input-box input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 12.5px;
  color: #0f172a;
  outline: none;
}

.search-input-box input::placeholder {
  color: #94a3b8;
}

.clear-search-btn {
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px;
  font-size: 12px;
}

.clear-search-btn:hover {
  color: #475569;
}

/* 3. Pílulas de Filtro Horizontais (Estilo Imagem 1) */
.queue-pills-track {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px 12px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.queue-pills-track::-webkit-scrollbar {
  display: none;
}

.queue-pill {
  height: 32px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 500;
  color: #475569;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  white-space: nowrap;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
  flex-shrink: 0;
}

.queue-pill:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #0f172a;
}

/* Pílula Ativa (Verde Azulado / Teal Imagem 1) */
.queue-pill.active {
  background: #0d9488 !important;
  color: #ffffff !important;
  border-color: #0d9488 !important;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(13, 148, 136, 0.2);
}

.queue-header-divider {
  height: 1px;
  background: #f1f5f9;
  margin: 0 16px 6px;
}

/* 4. Lista de Itens */
.queue-list-items {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 4px 0 16px;
}

.queue-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 20px;
  color: #94a3b8;
  font-size: 13px;
  text-align: center;
}

.queue-empty-state i {
  font-size: 32px;
  color: #cbd5e1;
}

/* Painel Popover de Filtros */
.queue-filter-panel {
  position: absolute;
  top: 50px;
  left: 14px;
  right: 14px;
  z-index: 100;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-label {
  font-size: 11.5px;
  font-weight: 600;
  color: #475569;
}

.filter-select {
  height: 34px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0 10px;
  font-size: 12.5px;
  color: #0f172a;
  background: #f8fafc;
  outline: none;
}

.filter-checkboxes-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
}

.filter-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #334155;
  cursor: pointer;
}

.filter-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 6px;
  border-top: 1px solid #f1f5f9;
}

.filter-reset-btn {
  border: none;
  background: none;
  color: #dc2626;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.filter-close-btn {
  border: none;
  background: #0d9488;
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-left: auto;
}

/* Transições do filtro */
.filter-slide-enter-active,
.filter-slide-leave-active {
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.filter-slide-enter-from,
.filter-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
