<template>
  <div class="inbox-nav-column">
    <!-- Header: Inbox + Actions -->
    <div class="inbox-nav-header">
      <div class="inbox-nav-title">
        <span>Inbox</span>
      </div>
      <div class="inbox-nav-actions">
        <button
          type="button"
          class="inbox-icon-btn"
          title="Nova Conversa"
          @click="$emit('new-conversation')"
        >
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>
    </div>

    <!-- Section: Conversations -->
    <div class="inbox-nav-body">
      <div class="inbox-nav-section-title">
        <span>CONVERSAS</span>
        <i class="fa-solid fa-chevron-down"></i>
      </div>

      <div class="inbox-nav-list">
        <!-- Meus Atendimentos -->
        <button
          type="button"
          class="inbox-nav-item"
          :class="{ active: activeFilter === 'mine' }"
          @click="selectFilter('mine')"
        >
          <div class="inbox-nav-item-left">
            <i class="fa-regular fa-user"></i>
            <span>Meus Atendimentos</span>
          </div>
          <span class="inbox-nav-item-count" :class="{ 'has-items': myCount > 0 }">{{ myCount }}</span>
        </button>

        <!-- Aguardando Resposta -->
        <button
          type="button"
          class="inbox-nav-item"
          :class="{ active: activeFilter === 'waiting' }"
          @click="selectFilter('waiting')"
        >
          <div class="inbox-nav-item-left">
            <i class="fa-regular fa-clock"></i>
            <span>Aguardando Fila</span>
          </div>
          <span class="inbox-nav-item-count badge-urgent" :class="{ 'has-items': waitingCount > 0 }">{{ waitingCount }}</span>
        </button>

        <!-- Todos os Abertos -->
        <button
          type="button"
          class="inbox-nav-item"
          :class="{ active: activeFilter === 'all' }"
          @click="selectFilter('all')"
        >
          <div class="inbox-nav-item-left">
            <i class="fa-solid fa-inbox"></i>
            <span>Todos os Abertos</span>
          </div>
          <span class="inbox-nav-item-count" :class="{ 'has-items': totalOpenCount > 0 }">{{ totalOpenCount }}</span>
        </button>
      </div>

      <!-- Section: Departments -->
      <div class="inbox-nav-section-title" style="margin-top: 18px;">
        <span>DEPARTAMENTOS</span>
        <i class="fa-solid fa-chevron-down"></i>
      </div>

      <div class="inbox-nav-list">
        <button
          v-for="dept in settingsStore.departments"
          :key="dept.id"
          type="button"
          class="inbox-nav-item"
          :class="{ active: activeFilter === `dept:${dept.name}` }"
          @click="selectFilter(`dept:${dept.name}`)"
        >
          <div class="inbox-nav-item-left">
            <span class="dept-bullet" :style="{ backgroundColor: dept.color || '#1f62d0' }"></span>
            <span class="truncate">{{ dept.name }}</span>
          </div>
          <span class="inbox-nav-item-count">{{ getDeptCount(dept.name) }}</span>
        </button>
      </div>

      <!-- Quick Link to History / Resolvidos -->
      <div class="inbox-nav-section-title" style="margin-top: 18px;">
        <span>RESOLVIDOS</span>
      </div>
      <div class="inbox-nav-list">
        <RouterLink to="/historico" class="inbox-nav-item">
          <div class="inbox-nav-item-left">
            <i class="fa-solid fa-check-double"></i>
            <span>Histórico de Chamados</span>
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTicketStore } from '@/stores/tickets.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useAuthStore } from '@/stores/auth.store'

const props = defineProps({
  activeFilter: {
    type: String,
    default: 'all'
  }
})

const emit = defineEmits(['update:activeFilter', 'new-conversation'])

const ticketStore = useTicketStore()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()

const myCount = computed(() => {
  const myId = authStore.user?.id
  const myName = (authStore.user?.name || '').toLowerCase()
  return ticketStore.tickets.filter(t => {
    if (t.status === 'finalizado') return false
    return t.agent_id === myId || (t.agent_name && t.agent_name.toLowerCase().includes(myName))
  }).length
})

const waitingCount = computed(() => ticketStore.waitingTickets.length)
const totalOpenCount = computed(() => ticketStore.waitingTickets.length + ticketStore.inProgressTickets.length)

function getDeptCount(deptName) {
  return ticketStore.tickets.filter(t => {
    if (t.status === 'finalizado') return false
    return (t.department || t.deptInitial) === deptName
  }).length
}

function selectFilter(filter) {
  emit('update:activeFilter', filter)
}
</script>

<style scoped>
.inbox-nav-column {
  width: 210px;
  min-width: 210px;
  max-width: 210px;
  background-color: #f8fafc;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
  user-select: none;
}

.inbox-nav-header {
  height: 48px;
  min-height: 48px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.inbox-nav-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 6px;
}

.inbox-nav-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.inbox-icon-btn {
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

.inbox-icon-btn:hover {
  color: #1f62d0;
  border-color: #bfdbfe;
  background: #eff6ff;
}

.inbox-nav-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
}

.inbox-nav-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  font-weight: 750;
  color: #94a3b8;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  padding: 0 6px;
}

.inbox-nav-section-title i {
  font-size: 9px;
}

.inbox-nav-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.inbox-nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 8px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #475569;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s ease;
  width: 100%;
  text-align: left;
}

.inbox-nav-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
}

.inbox-nav-item-left i {
  font-size: 13px;
  width: 14px;
  text-align: center;
  color: #64748b;
}

.dept-bullet {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.inbox-nav-item:hover {
  background-color: #f1f5f9;
  color: #0f172a;
}

.inbox-nav-item.active {
  background-color: #eff6ff;
  color: #1f62d0;
  font-weight: 650;
}

.inbox-nav-item.active .inbox-nav-item-left i {
  color: #1f62d0;
}

.inbox-nav-item-count {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 999px;
}

.inbox-nav-item-count.has-items {
  color: #475569;
}

.inbox-nav-item.active .inbox-nav-item-count {
  background: #dbeafe;
  color: #1f62d0;
}

.badge-urgent.has-items {
  background: #fee2e2;
  color: #ef4444;
}

@media (max-width: 1024px) {
  .inbox-nav-column {
    display: none;
  }
}
</style>
