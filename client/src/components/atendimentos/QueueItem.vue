<template>
  <div
    class="queue-card"
    :class="{
      active: ticket.id === ticketStore.activeTicketId,
      unread: ticket.unreadCount > 0
    }"
    @click="handleClick"
  >
    <!-- Avatar com Badge de Canal WhatsApp -->
    <div class="avatar-wrapper">
      <div
        class="queue-avatar"
        :style="{ backgroundColor: ticket.avatarColor || '#1f62d0' }"
      >
        {{ ticket.initials || 'CL' }}
      </div>
      <span class="avatar-channel-badge" title="WhatsApp">
        <i class="fa-brands fa-whatsapp"></i>
      </span>
    </div>

    <!-- Conteúdo Central do Card -->
    <div class="queue-card-content">
      <!-- Linha Superior: Nome do Cliente + Hora -->
      <div class="queue-card-top">
        <div class="queue-card-identity">
          <span class="queue-card-name" :title="ticket.clientName || ticket.client_name || 'Cliente'">
            {{ ticket.clientName || ticket.client_name || 'Cliente' }}
          </span>
          <span v-if="ticket.is_employee" class="employee-pill" title="Funcionário da empresa — não contabilizado nos KPIs de clientes">
            <i class="fa-solid fa-id-badge"></i> Funcionário
          </span>
        </div>
        <span class="queue-card-time">{{ formatTime(ticket.time) }}</span>
      </div>

      <!-- Linha do Meio: Preview da Mensagem -->
      <div class="queue-card-preview" :class="{ 'preview-unread': ticket.unreadCount > 0 }">
        <span v-if="ticket.unreadCount > 0" class="unread-dot"></span>
        <span class="preview-text">{{ cleanPreview(ticket.preview) }}</span>
      </div>

      <!-- Linha Inferior: Departamento + Status / Não Lidos -->
      <div class="queue-card-bottom">
        <div class="queue-card-tags">
          <!-- Tag Departamento -->
          <span
            class="dept-pill"
            :style="{
              background: `${deptColor}14`,
              color: deptColor,
              borderColor: `${deptColor}30`
            }"
          >
            <span class="dept-dot" :style="{ backgroundColor: deptColor }"></span>
            {{ deptName }}
          </span>

          <!-- Tag Atendente ou Bot -->
          <span v-if="ticket.status === 'chatbot'" class="bot-pill" title="Em navegação no robô">
            <i class="fa-solid fa-robot"></i> Bot
          </span>
          <span v-else-if="ticket.agentName || ticket.user_name" class="agent-pill" title="Atendido por">
            <i class="fa-regular fa-user"></i> {{ firstName(ticket.agentName || ticket.user_name) }}
          </span>
        </div>

        <!-- Badge de Não Lidos -->
        <span v-if="ticket.unreadCount > 0" class="queue-unread-badge">
          {{ ticket.unreadCount > 99 ? '99+' : ticket.unreadCount }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTicketStore } from '@/stores/tickets.store'

const props = defineProps({
  ticket: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['select'])
const ticketStore = useTicketStore()

function handleClick() {
  ticketStore.selectTicket(props.ticket.id)
  emit('select', props.ticket.id)
}

const deptName = computed(() => props.ticket.department || props.ticket.deptInitial || 'Geral')
const deptColor = computed(() => props.ticket.departmentColor || '#1f62d0')

function firstName(fullName) {
  if (!fullName) return ''
  return String(fullName).split(' ')[0]
}

function cleanPreview(preview) {
  if (!preview) return 'Conversa iniciada'
  if (preview.startsWith('[Chatbot]')) {
    return '🤖 Resposta do chatbot'
  }
  return preview
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':')
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}`
  }
  return timeStr
}
</script>

<style scoped>
.queue-card {
  padding: 10px 14px;
  display: flex;
  gap: 10px;
  border-bottom: 1px solid #edf0f3;
  cursor: pointer;
  background: #ffffff;
  position: relative;
  transition: background 0.12s ease;
  user-select: none;
  box-sizing: border-box;
}

.queue-card:hover {
  background-color: #f8fafc;
}

.queue-card.active {
  background-color: #f0f7ff;
  border-left: 3px solid var(--brand-primary);
}

.queue-card.unread {
  background-color: #fcfdfe;
}

/* ─── Avatar ─────────────────────────────────────────── */
.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
  width: 38px;
  height: 38px;
}

.queue-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.3px;
}

.avatar-channel-badge {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 15px;
  height: 15px;
  background: #168a52;
  color: #ffffff;
  border-radius: 50%;
  font-size: 8.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #ffffff;
}

/* ─── Conteúdo ───────────────────────────────────────── */
.queue-card-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  justify-content: center;
}

.queue-card-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
}

.queue-card-name {
  min-width: 0;
  font-size: 13px;
  font-weight: 650;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-card-identity {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.employee-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  padding: 1.5px 5px;
  border-radius: 4px;
  background: #ecfdf5;
  color: #047857;
  font-size: 9px;
  font-weight: 700;
}

.queue-card-time {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
  font-weight: 500;
}

.queue-card.active .queue-card-time {
  color: var(--brand-primary);
  font-weight: 600;
}

/* ─── Preview ────────────────────────────────────────── */
.queue-card-preview {
  font-size: 12px;
  color: #667085;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 5px;
  line-height: 1.35;
}

.preview-unread {
  color: #172033;
  font-weight: 600;
}

.unread-dot {
  width: 6px;
  height: 6px;
  background: var(--brand-primary);
  border-radius: 50%;
  flex-shrink: 0;
}

.preview-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ─── Bottom ─────────────────────────────────────────── */
.queue-card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1px;
}

.queue-card-tags {
  display: flex;
  align-items: center;
  gap: 5px;
  overflow: hidden;
}

.dept-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid transparent;
  white-space: nowrap;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dept-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  flex-shrink: 0;
}

.bot-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: #f5f3ff;
  color: #7c3aed;
  border: 1px solid #ede9fe;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
}

.agent-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: #f1f5f9;
  color: #475569;
  font-size: 10px;
  font-weight: 500;
  padding: 1px 5px;
  border-radius: 4px;
}

.queue-unread-badge {
  background: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
