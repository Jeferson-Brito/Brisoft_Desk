<template>
  <div class="kanban-view-layout">
    <!-- Top KPI Bar -->
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-weight:700;font-size:14px;color:#1e293b;">Quadro de Atendimentos em Tempo Real</span>
        <span class="badge badge-info" style="font-size:11px;">{{ ticketStore.queue.length }} tickets ativos</span>
      </div>
      <button class="btn-secondary" @click="ticketStore.fetchQueue">
        <i class="fa-solid fa-rotate-right" :class="{ 'fa-spin': ticketStore.loading }"></i> Atualizar
      </button>
    </div>

    <!-- Kanban Board Columns -->
    <div class="kanban-board-container">
      <div class="kanban-columns-track">
        <!-- Coluna 1: Aguardando -->
        <div class="kanban-column">
          <div class="kanban-column-header">
            <div class="kanban-column-title-wrap">
              <i class="fa-solid fa-hourglass-half" style="color:#ef4444;font-size:13px;"></i>
              <span class="kanban-column-title" style="color:#ef4444;">Aguardando</span>
            </div>
            <span class="kanban-column-count" style="background:#fee2e2;color:#ef4444;">
              {{ ticketStore.waitingTickets.length }}
            </span>
          </div>

          <div class="kanban-cards-list">
            <div
              v-if="ticketStore.waitingTickets.length === 0"
              style="text-align:center;padding:24px 12px;color:#94a3b8;font-size:11.5px;"
            >
              Nenhum ticket aguardando.
            </div>
            <div
              v-for="t in ticketStore.waitingTickets"
              :key="t.id"
              class="kanban-card"
              @click="openTicket(t.id)"
            >
              <div class="kanban-card-top">
                <span class="kanban-card-client">
                  <i class="fa-brands fa-whatsapp"></i>
                  {{ t.clientName || t.client_name || 'Cliente' }}
                </span>
                <span class="kanban-card-time">{{ t.time }}</span>
              </div>
              <div class="kanban-card-subject">
                {{ t.preview || 'Sem mensagens' }}
              </div>
              <div class="kanban-card-footer">
                <span
                  class="badge"
                  :style="{
                    background: `${t.departmentColor || '#2563eb'}18`,
                    color: t.departmentColor || '#2563eb',
                    fontSize: '10px'
                  }"
                >
                  {{ t.department || 'Geral' }}
                </span>
                <button class="btn-primary" style="padding:2px 8px;font-size:10px;" @click.stop="handleAssume(t.id)">
                  Assumir
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Coluna 2: Em Atendimento -->
        <div class="kanban-column">
          <div class="kanban-column-header">
            <div class="kanban-column-title-wrap">
              <i class="fa-regular fa-comment-dots" style="color:#2563eb;font-size:13px;"></i>
              <span class="kanban-column-title" style="color:#2563eb;">Em Atendimento</span>
            </div>
            <span class="kanban-column-count" style="background:#eff6ff;color:#2563eb;">
              {{ ticketStore.inProgressTickets.length }}
            </span>
          </div>

          <div class="kanban-cards-list">
            <div
              v-if="ticketStore.inProgressTickets.length === 0"
              style="text-align:center;padding:24px 12px;color:#94a3b8;font-size:11.5px;"
            >
              Nenhum ticket em atendimento.
            </div>
            <div
              v-for="t in ticketStore.inProgressTickets"
              :key="t.id"
              class="kanban-card"
              @click="openTicket(t.id)"
            >
              <div class="kanban-card-top">
                <span class="kanban-card-client">
                  <i class="fa-brands fa-whatsapp"></i>
                  {{ t.clientName || t.client_name || 'Cliente' }}
                </span>
                <span class="kanban-card-time" style="color:#16a34a;">{{ t.time }}</span>
              </div>
              <div class="kanban-card-subject">
                {{ t.preview || 'Sem mensagens' }}
              </div>
              <div class="kanban-card-footer">
                <span
                  class="badge"
                  :style="{
                    background: `${t.departmentColor || '#2563eb'}18`,
                    color: t.departmentColor || '#2563eb',
                    fontSize: '10px'
                  }"
                >
                  {{ t.department || 'Geral' }}
                </span>
                <span style="font-size:10.5px;color:#16a34a;font-weight:600;">
                  <i class="fa-solid fa-user"></i> {{ t.agent_name || 'Atendente' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Coluna 3: Concluídos -->
        <div class="kanban-column">
          <div class="kanban-column-header">
            <div class="kanban-column-title-wrap">
              <i class="fa-regular fa-circle-check" style="color:#16a34a;font-size:13px;"></i>
              <span class="kanban-column-title" style="color:#16a34a;">Finalizados</span>
            </div>
            <span class="kanban-column-count" style="background:#ecfdf5;color:#16a34a;">
              ✓
            </span>
          </div>

          <div class="kanban-cards-list" style="justify-content:center;align-items:center;text-align:center;">
            <div style="padding:20px;color:#64748b;font-size:12px;display:flex;flex-direction:column;align-items:center;gap:8px;">
              <i class="fa-solid fa-clock-rotate-left" style="font-size:24px;color:#94a3b8;"></i>
              <span>Consulte o menu <strong>Histórico</strong> para visualizar todos os atendimentos concluídos.</span>
              <RouterLink to="/historico" class="btn-secondary" style="margin-top:8px;font-size:11.5px;">
                Ver Histórico
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useTicketStore } from '@/stores/tickets.store'
import { useUiStore } from '@/stores/ui.store'

const router = useRouter()
const ticketStore = useTicketStore()
const ui = useUiStore()

function openTicket(id) {
  ticketStore.selectTicket(id)
  router.push({ name: 'atendimentos' })
}

async function handleAssume(id) {
  const res = await ticketStore.assume(id)
  if (res.success) {
    ui.showToast('Atendimento assumido!')
  }
}
</script>
