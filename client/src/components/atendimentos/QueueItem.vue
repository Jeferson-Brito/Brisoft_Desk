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
        :style="{ backgroundColor: ticket.avatarColor || '#2563eb' }"
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
              background: `${deptColor}18`,
              color: deptColor,
              borderColor: `${deptColor}35`
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
const deptColor = computed(() => props.ticket.departmentColor || '#2563eb')

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
  padding: 12px 14px;
  display: flex;
  gap: 12px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  background: #ffffff;
  position: relative;
  transition: all 0.15s ease;
  user-select: none;
}

.queue-card:hover {
  background-color: #f8fafc;
}

.queue-card.active {
  background-color: #eff6ff;
  border-left: 3.5px solid #2563eb;
}

.queue-card.unread {
  background-color: #fcfdfe;
}

/* ─── Avatar ─────────────────────────────────────────── */
.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
  width: 42px;
  height: 42px;
}

.queue-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  letter-spacing: 0.5px;
}

.avatar-channel-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  background: #22c55e;
  color: #ffffff;
  border-radius: 50%;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

/* ─── Conteúdo ───────────────────────────────────────── */
.queue-card-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
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
  padding: 2px 6px;
  border-radius: 999px;
  background: #d1fae5;
  color: #047857;
  font-size: 9px;
  font-weight: 700;
}

.queue-card-time {
  font-size: 11px;
  color: #94a3b8;
  flex-shrink: 0;
  font-weight: 500;
}

.queue-card.active .queue-card-time {
  color: #3b82f6;
  font-weight: 600;
}

/* ─── Preview ────────────────────────────────────────── */
.queue-card-preview {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 5px;
  line-height: 1.35;
}

.preview-unread {
  color: #1e293b;
  font-weight: 600;
}

.unread-dot {
  width: 6px;
  height: 6px;
  background: #2563eb;
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
  margin-top: 2px;
}

.queue-card-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.dept-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  font-weight: 600;
  padding: 1.5px 7px;
  border-radius: 12px;
  border: 1px solid transparent;
  white-space: nowrap;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dept-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.bot-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: #f3e8ff;
  color: #9333ea;
  border: 1px solid #e9d5ff;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 10px;
}

.agent-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: #f1f5f9;
  color: #475569;
  font-size: 10px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: 10px;
}

.queue-unread-badge {
  background: #ef4444;
  color: #ffffff;
  font-size: 10.5px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(239, 68, 68, 0.4);
}
</style>
