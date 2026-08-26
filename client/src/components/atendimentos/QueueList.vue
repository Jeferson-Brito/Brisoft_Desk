<template>
  <div class="queue-column">
    <div class="queue-header">
      <span class="queue-title">Fila de atendimentos</span>
      <button class="btn-icon" title="Filtros da fila" @click="ui.showToast('Filtro de fila')">
        <i class="fa-solid fa-sliders"></i>
      </button>
    </div>

    <div class="queue-tabs">
      <button
        class="queue-tab-btn"
        :class="{ active: activeTab === 'aguardando' }"
        @click="activeTab = 'aguardando'"
      >
        Aguardando ({{ ticketStore.waitingTickets.length }})
      </button>
      <button
        class="queue-tab-btn"
        :class="{ active: activeTab === 'em_atendimento' }"
        @click="activeTab = 'em_atendimento'"
      >
        Em atendimento ({{ ticketStore.inProgressTickets.length }})
      </button>
    </div>

    <div class="queue-search-bar">
      <div class="search-input-wrap">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Buscar atendimento..."
        />
      </div>
      <button class="btn-icon">
        <i class="fa-solid fa-filter"></i>
      </button>
    </div>

    <div class="queue-list" id="queueListContainer">
      <div
        v-if="filteredTickets.length === 0"
        style="padding:28px 16px;text-align:center;color:#94a3b8;font-size:12px;"
      >
        <i class="fa-regular fa-inbox" style="font-size:24px;margin-bottom:8px;display:block;"></i>
        Nenhum atendimento {{ activeTab === 'aguardando' ? 'em espera' : 'em andamento' }}.
      </div>
      <QueueItem
        v-for="t in filteredTickets"
        :key="t.id"
        :ticket="t"
      />
    </div>

    <div class="queue-load-more" @click="ui.showToast('Carregando mais atendimentos...')">
      Carregar mais <i class="fa-solid fa-chevron-down" style="font-size:10px;margin-left:4px;"></i>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTicketStore } from '@/stores/tickets.store'
import { useUiStore } from '@/stores/ui.store'
import QueueItem from './QueueItem.vue'

const ticketStore = useTicketStore()
const ui = useUiStore()

const activeTab = ref('aguardando')
const searchTerm = ref('')

const filteredTickets = computed(() => {
  const list = activeTab.value === 'aguardando'
    ? ticketStore.waitingTickets
    : ticketStore.inProgressTickets

  if (!searchTerm.value.trim()) return list

  const term = searchTerm.value.toLowerCase()
  return list.filter(t => {
    const name = (t.clientName || t.client_name || '').toLowerCase()
    const msg = (t.preview || '').toLowerCase()
    const dept = (t.department || '').toLowerCase()
    const phone = (t.phone || '').toLowerCase()
    return name.includes(term) || msg.includes(term) || dept.includes(term) || phone.includes(term)
  })
})
</script>
