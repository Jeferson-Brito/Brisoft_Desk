<template>
  <div class="queue-column">
    <!-- Header da Fila -->
    <div class="queue-header">
      <div class="queue-header-title-wrap">
        <span class="queue-title">Fila de Atendimentos</span>
        <span class="queue-live-badge" title="Total de atendimentos visíveis">
          <span class="live-dot"></span>
          {{ totalActiveCount }}
        </span>
      </div>
      
      <div class="queue-header-actions">
        <button
          class="btn-icon"
          :class="{ 'spin-anim': isRefreshing }"
          title="Recarregar atendimentos"
          @click="refreshQueue"
        >
          <i class="fa-solid fa-rotate-right"></i>
        </button>

        <button
          class="btn-icon"
          :class="{ 'active-filter': hasActiveFilter || showFilterPopover }"
          title="Filtros avançados"
          @click="showFilterPopover = !showFilterPopover"
        >
          <i class="fa-solid fa-sliders"></i>
          <span v-if="hasActiveFilter" class="filter-dot"></span>
        </button>
      </div>
    </div>

    <!-- Painel de Filtros Integrado e Bem Alinhado -->
    <Transition name="filter-slide">
      <div v-if="showFilterPopover" class="queue-filter-panel">
        <div class="filter-group">
          <label class="filter-label">Departamento</label>
          <select v-model="selectedDepartment" class="filter-select">
            <option value="">Todos os Departamentos</option>
            <option v-for="d in settingsStore.departments" :key="d.id" :value="d.name">
              {{ d.name }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Ordenar por</label>
          <select v-model="sortBy" class="filter-select">
            <option value="recent">Mais recentes</option>
            <option value="unread">Não lidos primeiro</option>
            <option value="oldest">Mais antigos</option>
          </select>
        </div>

        <div class="filter-panel-footer">
          <button v-if="hasActiveFilter" class="filter-reset-btn" @click="resetFilters">
            <i class="fa-solid fa-xmark"></i> Limpar filtros
          </button>
          <button class="filter-close-btn" @click="showFilterPopover = false">
            Fechar
          </button>
        </div>
      </div>
    </Transition>

    <!-- Abas da Fila: Apenas Aguardando e Em Atendimento (100% de largura, sem scroll horizontal) -->
    <div class="queue-tabs">
      <button
        class="queue-tab-btn"
        :class="{ active: activeTab === 'aguardando' }"
        @click="activeTab = 'aguardando'"
      >
        <span class="tab-text">Aguardando</span>
        <span
          class="queue-tab-badge"
          :class="ticketStore.waitingTickets.length > 0 ? 'badge-waiting-active' : 'badge-neutral'"
        >
          {{ ticketStore.waitingTickets.length }}
        </span>
      </button>

      <button
        class="queue-tab-btn"
        :class="{ active: activeTab === 'em_atendimento' }"
        @click="activeTab = 'em_atendimento'"
      >
        <span class="tab-text">Atendendo</span>
        <span
          class="queue-tab-badge"
          :class="ticketStore.inProgressTickets.length > 0 ? 'badge-progress-active' : 'badge-neutral'"
        >
          {{ ticketStore.inProgressTickets.length }}
        </span>
      </button>
    </div>

    <!-- Barra de Busca -->
    <div class="queue-search-bar">
      <div class="search-input-wrap">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Buscar atendimento..."
        />
        <button
          v-if="searchTerm"
          type="button"
          class="search-clear-btn"
          title="Limpar busca"
          @click="searchTerm = ''"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>

    <!-- Chip de Filtro Ativo -->
    <div v-if="selectedDepartment" class="queue-active-chip">
      <span>Setor: <strong>{{ selectedDepartment }}</strong></span>
      <i class="fa-solid fa-xmark" title="Remover filtro" @click="selectedDepartment = ''"></i>
    </div>

    <!-- Lista de Atendimentos -->
    <div class="queue-list" id="queueListContainer">
      <!-- Loading Skeleton -->
      <div v-if="ticketStore.loading && filteredTickets.length === 0" class="queue-skeleton-wrap">
        <div v-for="n in 3" :key="n" class="queue-skeleton-card">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-lines">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line full"></div>
            <div class="skeleton-line tiny"></div>
          </div>
        </div>
      </div>

      <!-- Empty State Elegante -->
      <div
        v-else-if="filteredTickets.length === 0"
        class="queue-empty-state"
      >
        <div class="empty-state-icon-box">
          <i v-if="searchTerm || selectedDepartment" class="fa-solid fa-magnifying-glass"></i>
          <i v-else-if="activeTab === 'aguardando'" class="fa-solid fa-inbox"></i>
          <i v-else class="fa-solid fa-headset"></i>
        </div>

        <strong class="empty-state-title">
          <template v-if="searchTerm || selectedDepartment">Nenhum atendimento encontrado</template>
          <template v-else-if="activeTab === 'aguardando'">Fila de espera vazia</template>
          <template v-else>Nenhum atendimento em curso</template>
        </strong>

        <p class="empty-state-desc">
          <template v-if="searchTerm || selectedDepartment">
            Nenhum resultado corresponde aos filtros aplicados.
          </template>
          <template v-else-if="activeTab === 'aguardando'">
            Tudo em dia! Novas mensagens que chegarem aparecerão aqui automaticamente.
          </template>
          <template v-else>
            Assuma um cliente na fila de espera para iniciar o atendimento.
          </template>
        </p>

        <button
          v-if="searchTerm || selectedDepartment"
          class="empty-state-btn"
          @click="resetFilters"
        >
          Limpar filtros
        </button>
      </div>

      <!-- Cards de Atendimento -->
      <template v-else>
        <QueueItem
          v-for="t in filteredTickets"
          :key="t.id"
          :ticket="t"
          @select="emit('ticket-selected', t.id)"
        />
        <button
          v-if="hasMoreTickets"
          type="button"
          class="queue-load-more"
          @click="visibleLimit += PAGE_SIZE"
        >
          Carregar mais {{ Math.min(PAGE_SIZE, allFilteredTickets.length - filteredTickets.length) }}
        </button>
      </template>
    </div>

    <!-- Footer da Fila -->
    <div class="queue-footer">
      <span class="queue-footer-info">
        Exibindo <strong>{{ filteredTickets.length }}</strong> de {{ allFilteredTickets.length }}
      </span>
      <button class="queue-footer-sync" title="Sincronizar" @click="refreshQueue">
        <i class="fa-solid fa-arrows-rotate" :class="{ 'spin-anim': isRefreshing }"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useTicketStore }   from '@/stores/tickets.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useUiStore }       from '@/stores/ui.store'
import QueueItem from './QueueItem.vue'

const emit = defineEmits(['ticket-selected'])

const ticketStore = useTicketStore()
const settingsStore = useSettingsStore()
const ui = useUiStore()

const activeTab = ref('aguardando')
const searchTerm = ref('')
const selectedDepartment = ref('')
const sortBy = ref('recent') // 'recent', 'unread', 'oldest'
const showFilterPopover = ref(false)
const isRefreshing = ref(false)
const PAGE_SIZE = 100
const visibleLimit = ref(PAGE_SIZE)

const totalActiveCount = computed(() => ticketStore.visibleTickets.length)

const hasActiveFilter = computed(() => {
  return !!selectedDepartment.value || sortBy.value !== 'recent'
})

function resetFilters() {
  searchTerm.value = ''
  selectedDepartment.value = ''
  sortBy.value = 'recent'
}

async function refreshQueue() {
  isRefreshing.value = true
  try {
    await ticketStore.fetchQueue()
    ui.showToast('Fila atualizada!')
  } finally {
    setTimeout(() => {
      isRefreshing.value = false
    }, 400)
  }
}

const allFilteredTickets = computed(() => {
  let list = activeTab.value === 'aguardando'
    ? ticketStore.waitingTickets
    : ticketStore.inProgressTickets

  // Filtro por departamento
  if (selectedDepartment.value) {
    const dept = selectedDepartment.value.toLowerCase()
    list = list.filter(t => (t.department || '').toLowerCase() === dept)
  }

  // Filtro por busca de texto
  if (searchTerm.value.trim()) {
    const term = searchTerm.value.toLowerCase()
    list = list.filter(t => {
      const name = (t.clientName || t.client_name || '').toLowerCase()
      const msg = (t.preview || '').toLowerCase()
      const dept = (t.department || '').toLowerCase()
      const phone = (t.phone || '').toLowerCase()
      return name.includes(term) || msg.includes(term) || dept.includes(term) || phone.includes(term)
    })
  }

  // Ordenação
  const copy = [...list]
  if (sortBy.value === 'unread') {
    copy.sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0))
  } else if (sortBy.value === 'oldest') {
    copy.reverse()
  }

  return copy
})

const filteredTickets = computed(() => allFilteredTickets.value.slice(0, visibleLimit.value))
const hasMoreTickets = computed(() => filteredTickets.value.length < allFilteredTickets.value.length)

watch([activeTab, searchTerm, selectedDepartment, sortBy], () => {
  visibleLimit.value = PAGE_SIZE
})

onMounted(() => {
  settingsStore.fetchDepartments().catch(() => {})
})
</script>

<style scoped>
.queue-column {
  background-color: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}

/* ─── Header ─────────────────────────────────────────── */
.queue-header {
  padding: 12px 14px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f1f5f9;
  box-sizing: border-box;
}

.queue-header-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.queue-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
}

.queue-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
  font-size: 10.5px;
  font-weight: 700;
  padding: 1.5px 6px;
  border-radius: 12px;
}

.live-dot {
  width: 5px;
  height: 5px;
  background: #22c55e;
  border-radius: 50%;
}

.queue-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.btn-icon {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  position: relative;
  transition: all 0.15s ease;
}

.btn-icon:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.btn-icon.active-filter {
  background: #eff6ff;
  color: #2563eb;
}

.filter-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 6px;
  height: 6px;
  background: #2563eb;
  border-radius: 50%;
}

.spin-anim {
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

/* ─── Painel Filtros ─────────────────────────────────── */
.queue-filter-panel {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.filter-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.filter-select {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 12px;
  background: #ffffff;
  color: #1e293b;
  outline: none;
  transition: border-color 0.15s;
}

.filter-select:focus {
  border-color: #2563eb;
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
}

.filter-close-btn {
  background: #e2e8f0;
  border: none;
  color: #475569;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-left: auto;
}

.filter-close-btn:hover {
  background: #cbd5e1;
}

/* ─── Abas da Fila (50% / 50% sem scroll) ─────────────── */
.queue-tabs {
  display: flex;
  background: #f8fafc;
  padding: 4px 8px;
  gap: 4px;
  border-bottom: 1px solid #e2e8f0;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.queue-tab-btn {
  flex: 1;
  width: 50%;
  padding: 7px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.queue-tab-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.queue-tab-btn.active {
  background: #ffffff;
  color: #2563eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.tab-text {
  white-space: nowrap;
}

.queue-tab-badge {
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
  line-height: 1.3;
}

.badge-neutral {
  background: #e2e8f0;
  color: #64748b;
}

.badge-waiting-active {
  background: #fef3c7;
  color: #d97706;
}

.badge-progress-active {
  background: #dbeafe;
  color: #2563eb;
}

/* ─── Search Bar ─────────────────────────────────────── */
.queue-search-bar {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #f1f5f9;
  box-sizing: border-box;
}

.search-input-wrap {
  position: relative;
  width: 100%;
}

.search-input-wrap i.fa-magnifying-glass {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 11.5px;
  pointer-events: none;
}

.search-input-wrap input {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 26px 6px 28px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
  background-color: #f8fafc;
  color: #1e293b;
  transition: all 0.15s ease;
}

.search-input-wrap input:focus {
  background-color: #ffffff;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.search-clear-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px;
  font-size: 11px;
}

.search-clear-btn:hover {
  color: #475569;
}

/* ─── Active Chip ────────────────────────────────────── */
.queue-active-chip {
  margin: 6px 12px 0;
  padding: 4px 8px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  font-size: 11px;
  color: #1e40af;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.queue-active-chip i {
  cursor: pointer;
  padding: 2px;
}

/* ─── Queue List Container ───────────────────────────── */
.queue-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.queue-list::-webkit-scrollbar {
  width: 5px;
}

.queue-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

/* ─── Empty State ────────────────────────────────────── */
.queue-empty-state {
  padding: 40px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: auto;
}

.empty-state-icon-box {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
  border: 1px solid #e0f2fe;
  border-radius: 50%;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-bottom: 12px;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.08);
}

.empty-state-title {
  font-size: 13px;
  color: #1e293b;
  font-weight: 700;
  margin-bottom: 5px;
}

.empty-state-desc {
  font-size: 11.5px;
  color: #64748b;
  line-height: 1.45;
  max-width: 220px;
  margin: 0 0 12px;
}

.empty-state-btn {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #334155;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 5px;
  cursor: pointer;
}

.empty-state-btn:hover {
  background: #e2e8f0;
}

/* ─── Skeletons ──────────────────────────────────────── */
.queue-skeleton-wrap {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.queue-skeleton-card {
  display: flex;
  gap: 10px;
  padding: 10px;
  background: #f8fafc;
  border-radius: 8px;
}

.skeleton-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #e2e8f0;
  animation: pulseSkeleton 1.5s infinite;
}

.skeleton-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: center;
}

.skeleton-line {
  height: 7px;
  background: #e2e8f0;
  border-radius: 4px;
  animation: pulseSkeleton 1.5s infinite;
}

.skeleton-line.short { width: 45%; }
.skeleton-line.full { width: 85%; }
.skeleton-line.tiny { width: 30%; }

@keyframes pulseSkeleton {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* ─── Footer ─────────────────────────────────────────── */
.queue-footer {
  padding: 7px 12px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #64748b;
  box-sizing: border-box;
}

.queue-footer-sync {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px;
  font-size: 11px;
}

.queue-footer-sync:hover {
  color: #2563eb;
}

.queue-load-more {
  margin: 10px 12px 14px;
  padding: 8px 10px;
  border: 1px solid #dbeafe;
  border-radius: 7px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}

.queue-load-more:hover {
  background: #dbeafe;
}
</style>
