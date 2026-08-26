<template>
  <div
    class="queue-card"
    :class="{
      active: ticket.id === ticketStore.activeTicketId,
      unread: ticket.unreadCount > 0
    }"
    @click="ticketStore.selectTicket(ticket.id)"
  >
    <div
      class="initial-avatar"
      :style="{ backgroundColor: ticket.avatarColor || '#2563eb' }"
    >
      {{ ticket.initials || 'CL' }}
    </div>
    <div class="queue-card-content">
      <div class="queue-card-top">
        <span class="queue-card-name">
          {{ ticket.clientName || ticket.client_name || 'Cliente' }}
          <i class="fa-brands fa-whatsapp"></i>
        </span>
        <div style="display:flex;align-items:center;gap:6px;">
          <span
            v-if="ticket.unreadCount"
            class="badge"
            style="background:#ef4444;color:white;min-width:18px;text-align:center;padding:2px 4px;border-radius:10px;font-size:10px;font-weight:700;"
          >
            {{ ticket.unreadCount }}
          </span>
          <span class="queue-card-time">{{ ticket.time || '' }}</span>
        </div>
      </div>
      <span class="queue-card-msg">{{ ticket.preview || 'Sem mensagens' }}</span>
      <div class="queue-card-bottom">
        <span
          style="
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.03em;
            padding: 2px 8px;
            border-radius: 20px;
          "
          :style="{
            background: `${deptColor}22`,
            color: deptColor,
            border: `1px solid ${deptColor}55`
          }"
        >
          <i class="fa-solid fa-circle" style="font-size:6px;"></i>
          {{ deptName }}
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

const ticketStore = useTicketStore()

const deptName = computed(() => props.ticket.department || props.ticket.deptInitial || 'Geral')
const deptColor = computed(() => props.ticket.departmentColor || '#2563eb')
</script>
