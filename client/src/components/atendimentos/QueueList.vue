<template>
  <div class="queue-column">
    <!-- Header da Fila -->
    <div class="queue-header">
      <div class="queue-header-title-wrap">
        <span class="queue-title">Fila de Atendimentos</span>
        <span class="queue-live-badge" title="Atualização em tempo real">
          <span class="live-dot"></span>
          {{ totalActiveCount }}
        </span>
      </div>
      
      <div class="queue-header-actions">
        <button
          class="btn-icon"
          :class="{ 'fa-spin': isRefreshing }"
          title="Recarregar atendimentos"
          @click="refreshQueue"
        >
          <i class="fa-solid fa-rotate-right"></i>
        </button>

        <button
          class="btn-icon"
          :class="{ 'active-filter': hasActiveFilter }"
          title="Filtros avançados"
          @click="showFilterPopover = !showFilterPopover"
        >
          <i class="fa-solid fa-sliders"></i>
          <span v-if="hasActiveFilter" class="filter-dot"></span>
        </button>
      </div>
    </div>

    <!-- Filtro Avançado Flutuante / Expansível -->
    <Transition name="fade-slide">
      <div v-if="showFilterPopover" class="queue-filter-panel">
        <div class="filter-panel-row">
          <label>Departamento:</label>
          <select v-model="selectedDepartment" class="filter-select">
            <option value="">Todos os Departamentos</option>
            <option v-for="d in settingsStore.departments" :key="d.id" :value="d.name">
              {{ d.name }}
            </option>
          </select>
        </div>

        <div class="filter-panel-row">
          <label>Ordenar por:</label>
          <select v-model="sortBy" class="filter-select">
            <option value="recent">Mais recentes</option>
            <option value="unread">Não lidos primeiro</option>
            <option value="oldest">Mais antigos</option>
          </select>
        </div>

        <div v-if="hasActiveFilter" class="filter-panel-footer">
          <button class="filter-reset-btn" @click="resetFilters">
            <i class="fa-solid fa-xmark"></i> Limpar filtros
          </button>
        </div>
      </div>
    </Transition>

    <!-- Abas / Segmentos da Fila -->
    <div class="queue-tabs">
      <button
        class="queue-tab-btn"
        :class="{ active: activeTab === 'aguardando' }"
        @click="activeTab = 'aguardando'"
      >
        <span>Aguardando</span>
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
        <span>Atendendo</span>
        <span
          class="queue-tab-badge"
          :class="ticketStore.inProgressTickets.length > 0 ? 'badge-progress-active' : 'badge-neutral'"
        >
          {{ ticketStore.inProgressTickets.length }}
        </span>
      </button>

      <button
        v-if="ticketStore.chatbotTickets.length > 0 || activeTab === 'chatbot'"
        class="queue-tab-btn"
        :class="{ active: activeTab === 'chatbot' }"
        @click="activeTab = 'chatbot'"
      >
        <span>Bot</span>
        <span class="queue-tab-badge badge-bot-active">
          {{ ticketStore.chatbotTickets.length }}
        </span>
      </button>

      <button
        class="queue-tab-btn"
        :class="{ active: activeTab === 'todos' }"
        @click="activeTab = 'todos'"
      >
        <span>Todos</span>
        <span class="queue-tab-badge badge-neutral">
          {{ totalActiveCount }}
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
          placeholder="Buscar por nome, telefone, mensagem..."
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
      <span>Filtro: <strong>{{ selectedDepartment }}</strong></span>
      <i class="fa-solid fa-xmark" @click="selectedDepartment = ''"></i>
    </div>

    <!-- Lista de Atendimentos -->
    <div class="queue-list" id="queueListContainer">
      <!-- Loading Skeleton -->
      <div v-if="ticketStore.loading && filteredTickets.length === 0" class="queue-skeleton-wrap">
        <div v-for="n in 4" :key="n" class="queue-skeleton-card">
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
          <i v-else-if="activeTab === 'em_atendimento'" class="fa-solid fa-headset"></i>
          <i v-else-if="activeTab === 'chatbot'" class="fa-solid fa-robot"></i>
          <i v-else class="fa-regular fa-comments"></i>
        </div>

        <strong class="empty-state-title">
          <template v-if="searchTerm || selectedDepartment">Nenhum atendimento encontrado</template>
          <template v-else-if="activeTab === 'aguardando'">Fila de espera vazia</template>
          <template v-else-if="activeTab === 'em_atendimento'">Nenhum atendimento em curso</template>
          <template v-else-if="activeTab === 'chatbot'">Nenhum cliente no robô</template>
          <template v-else>Nenhum atendimento ativo</template>
        </strong>

        <p class="empty-state-desc">
          <template v-if="searchTerm || selectedDepartment">
            Nenhum resultado corresponde aos filtros aplicados.
          </template>
          <template v-else-if="activeTab === 'aguardando'">
            Tudo em dia! Novas mensagens que chegarem aparecerão aqui automaticamente.
          </template>
          <template v-else-if="activeTab === 'em_atendimento'">
            Assuma um cliente na fila de espera para iniciar um atendimento.
          </template>
          <template v-else>
            As conversas em andamento e na fila serão listadas aqui.
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
        />
      </template>
    </div>

    <!-- Footer da Fila -->
    <div class="queue-footer">
      <span class="queue-footer-info">
        Exibindo <strong>{{ filteredTickets.length }}</strong> de {{ totalActiveCount }}
      </span>
      <button class="queue-footer-sync" title="Sincronizar" @click="refreshQueue">
        <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': isRefreshing }"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTicketStore } from '@/stores/tickets.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useUiStore } from '@/stores/ui.store'
import QueueItem from './QueueItem.vue'

const ticketStore = useTicketStore()
const settingsStore = useSettingsStore()
const ui = useUiStore()

const activeTab = ref('aguardando')
const searchTerm = ref('')
const selectedDepartment = ref('')
const sortBy = ref('recent') // 'recent', 'unread', 'oldest'
const showFilterPopover = ref(false)
const isRefreshing = ref(false)

const totalActiveCount = computed(() => ticketStore.visibleTickets.length)

const hasActiveFilter = computed(() => {
  return !!selectedDepartment.value || sortBy.value !== 'recent'
})

function resetFilters() {
  searchTerm.value = ''
  selectedDepartment.value = ''
  sortBy.value = 'recent'
  showFilterPopover.value = false
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

const filteredTickets = computed(() => {
  let list = []
  if (activeTab.value === 'aguardando') {
    list = ticketStore.waitingTickets
  } else if (activeTab.value === 'em_atendimento') {
    list = ticketStore.inProgressTickets
  } else if (activeTab.value === 'chatbot') {
    list = ticketStore.chatbotTickets
  } else {
    list = ticketStore.visibleTickets
  }

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
  min-width: 0;
  overflow: hidden;
  position: relative;
}

/* ─── Header ─────────────────────────────────────────── */
.queue-header {
  padding: 14px 16px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f1f5f9;
}

.queue-header-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.queue-title {
  font-size: 14.5px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.2px;
}

.queue-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 12px;
}

.live-dot {
  width: 6px;
  height: 6px;
  background: #22c55e;
  border-radius: 50%;
  animation: pulseLive 2s infinite ease-in-out;
}

@keyframes pulseLive {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}

.queue-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
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
  top: 6px;
  right: 6px;
  width: 6px;
  height: 6px;
  background: #2563eb;
  border-radius: 50%;
}

/* ─── Painel Filtros ─────────────────────────────────── */
.queue-filter-panel {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-panel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: #475569;
  font-weight: 500;
}

.filter-select {
  flex: 1;
  max-width: 180px;
  padding: 5px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 12px;
  background: #ffffff;
  color: #1e293b;
  outline: none;
}

.filter-panel-footer {
  display: flex;
  justify-content: flex-end;
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
  padding: 2px 6px;
}

/* ─── Abas / Segmentos ───────────────────────────────── */
.queue-tabs {
  display: flex;
  background: #f8fafc;
  padding: 4px 8px;
  gap: 4px;
  border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;
}

.queue-tab-btn {
  flex: 1;
  min-width: fit-content;
  padding: 6px 10px;
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

.badge-bot-active {
  background: #f3e8ff;
  color: #9333ea;
}

/* ─── Search Bar ─────────────────────────────────────── */
.queue-search-bar {
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.search-input-wrap {
  position: relative;
  flex: 1;
}

.search-input-wrap i.fa-magnifying-glass {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 12px;
  pointer-events: none;
}

.search-input-wrap input {
  width: 100%;
  padding: 7px 28px 7px 30px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 12px;
  outline: none;
  background-color: #f8fafc;
  color: #1e293b;
  transition: all 0.2s ease;
}

.search-input-wrap input:focus {
  background-color: #ffffff;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.search-clear-btn {
  position: absolute;
  right: 8px;
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
  margin: 6px 14px 0;
  padding: 4px 10px;
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
  padding: 48px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: auto;
}

.empty-state-icon-box {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
  border: 1px solid #e0f2fe;
  border-radius: 50%;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: 14px;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
}

.empty-state-title {
  font-size: 13.5px;
  color: #1e293b;
  font-weight: 700;
  margin-bottom: 6px;
}

.empty-state-desc {
  font-size: 12px;
  color: #64748b;
  line-height: 1.45;
  max-width: 230px;
  margin: 0 0 14px;
}

.empty-state-btn {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #334155;
  font-size: 11.5px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.empty-state-btn:hover {
  background: #e2e8f0;
}

/* ─── Skeletons ──────────────────────────────────────── */
.queue-skeleton-wrap {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.queue-skeleton-card {
  display: flex;
  gap: 12px;
  padding: 10px;
  background: #f8fafc;
  border-radius: 8px;
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e2e8f0;
  animation: pulseSkeleton 1.5s infinite;
}

.skeleton-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
}

.skeleton-line {
  height: 8px;
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
  padding: 8px 14px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #64748b;
}

.queue-footer-sync {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px;
  font-size: 11px;
  transition: color 0.15s;
}

.queue-footer-sync:hover {
  color: #2563eb;
}
</style>
