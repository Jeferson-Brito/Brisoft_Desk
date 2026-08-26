<template>
  <div class="atendimentos-view-layout">
    <div
      class="atendimentos-main-grid"
      :class="{ 'details-open': isDetailsOpen }"
    >
      <!-- Coluna 1: Fila de Atendimentos -->
      <QueueList />

      <!-- Coluna 2: Chat em Tempo Real -->
      <ChatPanel
        :ticket="ticketStore.activeTicket"
        :is-details-open="isDetailsOpen"
        @toggle-details="isDetailsOpen = !isDetailsOpen"
      />

      <!-- Coluna 3: Detalhes do Contato -->
      <ContactDrawer
        v-if="isDetailsOpen"
        :ticket="ticketStore.activeTicket"
      />
    </div>

    <!-- Bottom Metrics KPI Bar -->
    <div class="bottom-metrics-bar">
      <div class="kpi-mini-card">
        <div class="kpi-mini-icon" style="background:#ecfdf5;color:#10b981;">
          <i class="fa-regular fa-comment-dots"></i>
        </div>
        <div class="kpi-mini-info">
          <span class="kpi-mini-label">Atendimentos hoje</span>
          <span class="kpi-mini-value">{{ ticketStore.queue.length }}</span>
        </div>
      </div>

      <div class="kpi-mini-card">
        <div class="kpi-mini-icon" style="background:#eff6ff;color:#2563eb;">
          <i class="fa-regular fa-clock"></i>
        </div>
        <div class="kpi-mini-info">
          <span class="kpi-mini-label">TMA (Tempo Médio)</span>
          <span class="kpi-mini-value">04:32</span>
        </div>
      </div>

      <div class="kpi-mini-card">
        <div class="kpi-mini-icon" style="background:#fff7ed;color:#f97316;">
          <i class="fa-solid fa-chart-pie"></i>
        </div>
        <div class="kpi-mini-info">
          <span class="kpi-mini-label">SLA cumprido</span>
          <span class="kpi-mini-value">98.5%</span>
        </div>
      </div>

      <div class="kpi-mini-card">
        <div class="kpi-mini-icon" style="background:#faf5ff;color:#9333ea;">
          <i class="fa-solid fa-user-group"></i>
        </div>
        <div class="kpi-mini-info">
          <span class="kpi-mini-label">Em atendimento</span>
          <span class="kpi-mini-value">{{ ticketStore.inProgressTickets.length }}</span>
        </div>
      </div>

      <div class="kpi-mini-card">
        <div class="kpi-mini-icon" style="background:#f3e8ff;color:#7e22ce;">
          <i class="fa-solid fa-stopwatch"></i>
        </div>
        <div class="kpi-mini-info">
          <span class="kpi-mini-label">Aguardando</span>
          <span class="kpi-mini-value">{{ ticketStore.waitingTickets.length }}</span>
        </div>
      </div>

      <div class="kpi-mini-card">
        <div class="kpi-mini-icon" style="background:#fef9c3;color:#ca8a04;">
          <i class="fa-solid fa-star"></i>
        </div>
        <div class="kpi-mini-info">
          <span class="kpi-mini-label">Média de avaliação</span>
          <span class="kpi-mini-value">4.9 ★</span>
        </div>
      </div>
    </div>

    <!-- Modal de Encerramento -->
    <ModalEncerrar
      v-if="ui.isModalOpen('encerrar')"
      :ticket="ticketStore.activeTicket"
      @close="ui.closeModal('encerrar')"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTicketStore } from '@/stores/tickets.store'
import { useUiStore } from '@/stores/ui.store'
import QueueList from '@/components/atendimentos/QueueList.vue'
import ChatPanel from '@/components/atendimentos/ChatPanel.vue'
import ContactDrawer from '@/components/atendimentos/ContactDrawer.vue'
import ModalEncerrar from '@/components/modals/ModalEncerrar.vue'

const ticketStore = useTicketStore()
const ui = useUiStore()

const isDetailsOpen = ref(false)

onMounted(() => {
  ticketStore.fetchQueue()
})
</script>
