<template>
  <div
    class="queue-item-card"
    :class="{
      active: ticket.id === ticketStore.activeTicketId,
      unread: ticket.unreadCount > 0
    }"
    @click="handleClick"
  >
    <!-- Avatar com Indicador Online -->
    <div class="avatar-wrap">
      <div
        class="user-avatar"
        :style="{ backgroundColor: ticket.avatarColor || '#1f62d0' }"
      >
        {{ ticket.initials || 'CL' }}
      </div>
      <span class="online-indicator" :class="{ 'is-whatsapp': isWhatsapp }"></span>
    </div>

    <!-- Info central -->
    <div class="queue-item-body">
      <!-- Linha 1: Nome + Hora -->
      <div class="queue-item-header">
        <div class="queue-item-name-wrap">
          <strong class="queue-item-name" :title="displayName">
            {{ displayName }}
          </strong>
          <span v-if="ticket.is_employee" class="employee-tag" title="Funcionário">
            <i class="fa-solid fa-id-badge"></i>
          </span>
        </div>
        <span class="queue-item-time">{{ relativeTime }}</span>
      </div>

      <!-- Linha 2: Preview da mensagem + Tag de Espera / SLA -->
      <div class="queue-item-footer">
        <span class="queue-item-snippet" :class="{ 'unread-text': ticket.unreadCount > 0 }">
          <span v-if="deptName" class="department-queue-label" :title="deptName">
            <span class="dept-indicator-line" :style="{ backgroundColor: deptColor }"></span>
            <span class="department-queue-name">{{ deptName }}</span>
          </span>
          <span class="preview-text">{{ cleanPreview(ticket.preview) }}</span>
        </span>

        <div class="queue-item-badges">
          <span v-if="waitTimeBadge" class="sla-timer-badge" title="Tempo deste atendimento na fila aguardando um atendente">
            <i class="fa-regular fa-clock"></i> {{ waitTimeBadge }}
          </span>
          <span v-if="ticket.unreadCount > 0" class="unread-count-pill">
            {{ ticket.unreadCount }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useTicketStore } from '@/stores/tickets.store'

const props = defineProps({
  ticket: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['select'])
const ticketStore = useTicketStore()
const clockTick = ref(Date.now())
let clockTimer = null

onMounted(() => {
  clockTimer = setInterval(() => { clockTick.value = Date.now() }, 30000)
})

onBeforeUnmount(() => clearInterval(clockTimer))

function handleClick() {
  ticketStore.selectTicket(props.ticket.id)
  emit('select', props.ticket.id)
}

const displayName = computed(() => props.ticket.clientName || props.ticket.client_name || 'Cliente')
const deptName = computed(() => props.ticket.department || props.ticket.departments?.name || props.ticket.deptInitial || '')
const deptColor = computed(() => props.ticket.departmentColor || '#1f62d0')
const isWhatsapp = computed(() => true)

const relativeTime = computed(() => {
  const t = props.ticket.time
  if (!t) return ''
  if (t.includes(':')) {
    const parts = t.split(':')
    return `${parts[0]}:${parts[1]}`
  }
  return t
})

const waitTimeBadge = computed(() => {
  if (props.ticket.status !== 'aguardando') return null
  const now = clockTick.value
  const enteredQueueAt = props.ticket.queued_at || props.ticket.created_at
  const enteredQueueMs = new Date(enteredQueueAt).getTime()
  if (!Number.isFinite(enteredQueueMs)) return null
  const totalMinutes = Math.max(0, Math.floor((now - enteredQueueMs) / 60000))
  if (totalMinutes < 1) return '<1m'
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours < 24) return `${hours}h${minutes ? ` ${minutes}m` : ''}`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
})

function cleanPreview(preview) {
  if (!preview) return 'Conversa iniciada'
  if (preview.startsWith('[Chatbot]')) {
    return 'Menu do robô'
  }
  return preview
}
</script>

<style scoped>
.queue-item-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin: 2px 8px;
  border-radius: 6px;
  cursor: pointer;
  background: #ffffff;
  transition: all 0.12s ease;
  user-select: none;
  box-sizing: border-box;
}

.queue-item-card:hover {
  background-color: #f8fafc;
}

.queue-item-card.active {
  background-color: #ebf3fe !important;
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: #ffffff;
  font-weight: 700;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #16a34a;
  box-shadow: 0 0 0 2px #ffffff;
}

.queue-item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.queue-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.queue-item-name-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.queue-item-name {
  font-size: 13px;
  font-weight: 650;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.employee-tag {
  color: #047857;
  font-size: 11px;
}

.queue-item-time {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
  margin-left: 6px;
}

.queue-item-card.active .queue-item-time {
  color: #1f62d0;
  font-weight: 600;
}

.queue-item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.queue-item-snippet {
  font-size: 11.5px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}

.unread-text {
  color: #0f172a;
  font-weight: 600;
}

.dept-indicator-line {
  width: 3px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
  flex-shrink: 0;
}

.department-queue-label {
  max-width: 45%;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  color: #475569;
  font-size: 10px;
  font-weight: 650;
}

.department-queue-name,
.preview-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-text {
  min-width: 0;
  color: #94a3b8;
}

.department-queue-label + .preview-text::before {
  content: '·';
  margin-right: 4px;
  color: #cbd5e1;
}

.queue-item-badges {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.sla-timer-badge {
  font-size: 10.5px;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.unread-count-pill {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: #ef4444;
  color: #ffffff;
  font-size: 9.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
