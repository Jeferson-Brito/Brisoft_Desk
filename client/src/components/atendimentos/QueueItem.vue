<template>
  <div
    class="queue-item-card"
    :class="{
      active: ticket.id === ticketStore.activeTicketId,
      unread: ticket.unreadCount > 0,
      'incoming-call': isIncomingCall,
      'incoming-video-call': isIncomingCall && ticket.incomingCall?.isVideo
    }"
    @click="handleClick"
  >
    <!-- Avatar com Indicador / Checkmark -->
    <div class="queue-avatar-wrap">
      <div
        class="queue-avatar-circle"
        :style="avatarColorStyle"
      >
        <img
          v-if="ticket.avatar_url && !avatarFailed"
          :src="ticket.avatar_url"
          :alt="displayName"
          referrerpolicy="no-referrer"
          @error="avatarFailed = true"
        />
        <span v-else>{{ fallbackInitials }}</span>
      </div>
      <span class="queue-avatar-badge" title="Online no WhatsApp">
        <i class="fa-solid fa-check"></i>
      </span>
    </div>

    <!-- Corpo do Card -->
    <div class="queue-item-content">
      <!-- Linha 1: Nome + Hora -->
      <div class="queue-item-row-top">
        <div class="queue-name-wrapper">
          <strong class="queue-client-name" :title="displayName">
            {{ displayName }}
          </strong>
          <span v-if="ticket.is_employee" class="badge-icon-tag" title="Funcionário">
            <i class="fa-solid fa-id-badge"></i>
          </span>
          <span v-if="ticket.is_group" class="badge-icon-tag group" title="Grupo WhatsApp">
            <i class="fa-solid fa-users"></i>
          </span>
          <span
            v-if="isIncomingCall"
            class="badge-icon-call"
            :class="{ video: ticket.incomingCall?.isVideo }"
            :title="ticket.incomingCall?.isVideo ? 'Chamada de vídeo' : 'Chamada de voz'"
          >
            <i :class="ticket.incomingCall?.isVideo ? 'fa-solid fa-video' : 'fa-solid fa-phone'"></i>
          </span>
        </div>
        <span class="queue-time-label">{{ relativeTime }}</span>
      </div>

      <!-- Linha 2: Departamento + Tempo de Espera ou Badge Não Lidos -->
      <div class="queue-item-row-mid">
        <div class="queue-dept-wrap" :title="deptName || 'Atendimento Geral'">
          <span class="dept-dot-bullet" :style="{ backgroundColor: deptColor }"></span>
          <span class="dept-name-text">{{ deptName || 'Atendimento Geral' }}</span>
        </div>

        <div class="queue-right-badges">
          <span v-if="waitTimeBadge" class="queue-wait-pill" title="Tempo de espera na fila">
            <i class="fa-regular fa-clock"></i> {{ waitTimeBadge }}
          </span>
          <span v-else-if="ticket.unreadCount > 0" class="queue-unread-pill">
            {{ ticket.unreadCount }}
          </span>
        </div>
      </div>

      <!-- Linha 3: Snippet da Mensagem entre aspas ou reação -->
      <div class="queue-item-row-bottom">
        <p class="queue-snippet-text" :class="{ 'is-unread': ticket.unreadCount > 0 }">
          <template v-if="isReaction">
            <i class="fa-solid fa-check-double reaction-double-check"></i>
            <span class="reaction-label">Reagiu a uma mensagem</span>
          </template>
          <template v-else>
            "{{ cleanPreview(ticket.preview) }}"
          </template>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useTicketStore } from '@/stores/tickets.store'
import { splitPersonLabel } from '@/utils/person-display'

const props = defineProps({
  ticket: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['select'])
const ticketStore = useTicketStore()
const clockTick = ref(Date.now())
const avatarFailed = ref(false)
let clockTimer = null

onMounted(() => {
  clockTimer = setInterval(() => { clockTick.value = Date.now() }, 30000)
})

onBeforeUnmount(() => clearInterval(clockTimer))
watch(() => props.ticket.avatar_url, () => { avatarFailed.value = false })

function handleClick() {
  ticketStore.selectTicket(props.ticket.id)
  emit('select', props.ticket.id)
}

const person = computed(() => splitPersonLabel(props.ticket.clientName || props.ticket.client_name || 'Cliente'))
const displayName = computed(() => person.value.name || 'Cliente')

const fallbackInitials = computed(() => {
  const clean = displayName.value.trim()
  if (!clean) return props.ticket.is_group ? 'GR' : 'CL'
  // Se for código numérico como 502 ou C08
  if (/^[A-Za-z]?\d+/.test(clean)) {
    return clean.slice(0, 3).toUpperCase()
  }
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
})

const avatarColorStyle = computed(() => {
  const name = displayName.value.trim()
  // Paletas elegantes e suaves
  if (/^C\d+/i.test(name)) {
    return { backgroundColor: '#fef3c7', color: '#d97706' }
  }
  if (/^\d+/.test(name)) {
    return { backgroundColor: '#eff6ff', color: '#2563eb' }
  }
  if (/tático|agente|viatura/i.test(name)) {
    return { backgroundColor: '#ccfbf1', color: '#0d9488' }
  }
  // Cores variadas pelo hash do nome
  const palettes = [
    { bg: '#fef3c7', color: '#d97706' },
    { bg: '#eff6ff', color: '#2563eb' },
    { bg: '#ccfbf1', color: '#0d9488' },
    { bg: '#ffe4e6', color: '#e11d48' },
    { bg: '#f3e8ff', color: '#7c3aed' },
    { bg: '#e0f2fe', color: '#0284c7' }
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const idx = Math.abs(hash) % palettes.length
  return { backgroundColor: palettes[idx].bg, color: palettes[idx].color }
})

const deptName = computed(() => props.ticket.department || props.ticket.departments?.name || props.ticket.deptInitial || '')
const deptColor = computed(() => props.ticket.departmentColor || '#0d9488')
const isIncomingCall = computed(() => props.ticket.incomingCall?.status === 'ringing')

const isReaction = computed(() => {
  const p = (props.ticket.preview || '').toLowerCase()
  return p.includes('reagiu') || p.includes('reaction')
})

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
  let clean = String(preview).replace(/^WhatsApp:\s*/i, '').trim()
  if (clean.startsWith('[Chatbot]')) return 'Interação com o assistente'
  clean = clean.replace(/^\[[^\]]+\]\s*/, '').trim()
  clean = clean
    .replace(/📹?\s*\[Vídeo\]/i, 'Vídeo')
    .replace(/📷?\s*\[Imagem\]/i, 'Imagem')
    .replace(/🎙️?\s*\[Mensagem de Voz\]/i, 'Mensagem de voz')
    .replace(/🎵?\s*\[Áudio\]/i, 'Áudio')
  return clean || 'Nova mensagem'
}
</script>

<style scoped>
/* ─── Card Principal da Fila ─────────────────────────────────────────────── */
.queue-item-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 12px 14px;
  margin: 4px 10px;
  border-radius: 16px;
  border: 1.5px solid transparent;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  background: transparent;
  transition: all 0.16s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  box-sizing: border-box;
}

.queue-item-card:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
}

/* Card Selecionado (Estilo Imagem 1) */
.queue-item-card.active {
  background: #ffffff !important;
  border: 1.5px solid #2dd4bf !important;
  border-radius: 16px;
  box-shadow: 0 4px 14px rgba(45, 212, 191, 0.09);
}

/* Chamada em curso */
.queue-item-card.incoming-call {
  background: #fef2f2 !important;
  border-color: #f87171 !important;
  animation: pulseCall 1.2s infinite ease-in-out;
}

@keyframes pulseCall {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.2); }
  50% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.15); }
}

/* ─── Avatar ─────────────────────────────────────────────────────────────── */
.queue-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.queue-avatar-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  font-weight: 700;
  font-size: 13.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.queue-avatar-circle img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

/* Checkmark verde no rodapé do avatar */
.queue-avatar-badge {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: #10b981;
  border: 2px solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 7.5px;
}

/* ─── Conteúdo do Card ───────────────────────────────────────────────────── */
.queue-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

/* Linha 1: Nome + Hora */
.queue-item-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.queue-name-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.queue-client-name {
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge-icon-tag {
  color: #64748b;
  font-size: 10px;
}

.badge-icon-tag.group {
  color: #2563eb;
}

.badge-icon-call {
  color: #ef4444;
  font-size: 10px;
  animation: pulseCallIcon 1s infinite alternate;
}

.queue-time-label {
  font-size: 11.5px;
  color: #94a3b8;
  font-weight: 500;
  flex-shrink: 0;
}

/* Linha 2: Setor / Contexto + Tempo de Espera */
.queue-item-row-mid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.queue-dept-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.dept-dot-bullet {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dept-name-text {
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-right-badges {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

/* Pill de Espera (Estilo Imagem 1) */
.queue-wait-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #ea580c;
  background: #fff7ed;
  border-radius: 6px;
  padding: 1.5px 6px;
  line-height: 1.3;
}

.queue-wait-pill i {
  font-size: 10px;
}

.queue-unread-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 17px;
  height: 17px;
  padding: 0 5px;
  border-radius: 10px;
  font-size: 10.5px;
  font-weight: 700;
  color: #ffffff;
  background: #2563eb;
  line-height: 1;
}

/* Linha 3: Snippet da Mensagem */
.queue-item-row-bottom {
  display: flex;
  align-items: center;
  margin-top: 1px;
}

.queue-snippet-text {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.35;
  width: 100%;
}

.queue-snippet-text.is-unread {
  color: #1e293b;
  font-weight: 600;
}

.reaction-double-check {
  color: #0d9488;
  font-size: 11px;
  margin-right: 4px;
}

.reaction-label {
  color: #0d9488;
  font-weight: 500;
}
</style>
