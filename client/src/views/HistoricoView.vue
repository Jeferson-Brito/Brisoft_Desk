<template>
  <div class="table-view-layout" style="width:100%;">
    <!-- Top Header -->
    <div class="table-toolbar" style="margin-bottom:4px;">
      <div>
        <h2 style="font-size:16px;font-weight:700;margin:0;color:#1e293b;display:flex;align-items:center;gap:8px;">
          Histórico de Atendimentos
          <span class="badge badge-info" style="font-size:11px;">{{ filteredHistory.length }} chamados</span>
        </h2>
        <p style="font-size:12px;color:#64748b;margin:2px 0 0 0;">
          Consulte, filtre e audite todas as conversas anteriores realizadas na central.
        </p>
      </div>

      <div style="display:flex;gap:8px;">
        <button class="btn-secondary" title="Atualizar dados" @click="fetchHistory">
          <i class="fa-solid fa-rotate-right" :class="{ 'fa-spin': loading }"></i> Atualizar
        </button>
      </div>
    </div>

    <!-- Barra de Filtros Avançados -->
    <div class="card-box" style="padding:12px 16px;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;">
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
        <!-- Busca Textual -->
        <div class="search-input-wrap" style="flex:1;min-width:220px;">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Buscar por cliente, telefone, protocolo ou mensagem..."
          />
        </div>

        <!-- Filtro: Departamento -->
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:11.5px;font-weight:600;color:#64748b;">Depto:</span>
          <select v-model="filters.department" class="form-control" style="font-size:12px;padding:6px 10px;height:34px;">
            <option value="">Todos os Departamentos</option>
            <option v-for="d in settingsStore.departments" :key="d.id" :value="d.name">
              {{ d.name }}
            </option>
          </select>
        </div>

        <!-- Filtro: Atendente -->
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:11.5px;font-weight:600;color:#64748b;">Atendente:</span>
          <select v-model="filters.agent" class="form-control" style="font-size:12px;padding:6px 10px;height:34px;">
            <option value="">Todos os Atendentes</option>
            <option v-for="ag in uniqueAgents" :key="ag" :value="ag">
              {{ ag }}
            </option>
          </select>
        </div>

        <!-- Filtro: Avaliação CSAT -->
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:11.5px;font-weight:600;color:#64748b;">Avaliação:</span>
          <select v-model="filters.rating" class="form-control" style="font-size:12px;padding:6px 10px;height:34px;">
            <option value="">Todas</option>
            <option value="5">⭐⭐⭐⭐⭐ (5 estrelas)</option>
            <option value="4">⭐⭐⭐⭐ (4 estrelas)</option>
            <option value="3">⭐⭐⭐ (3 estrelas)</option>
            <option value="2">⭐⭐ (2 estrelas)</option>
            <option value="1">⭐ (1 estrela)</option>
            <option value="sem_avaliacao">Sem avaliação</option>
          </select>
        </div>

        <!-- Filtro: Data Início -->
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:11.5px;font-weight:600;color:#64748b;">De:</span>
          <input v-model="filters.dateFrom" type="date" class="form-control" style="font-size:12px;padding:4px 8px;height:34px;" />
        </div>

        <!-- Filtro: Data Fim -->
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:11.5px;font-weight:600;color:#64748b;">Até:</span>
          <input v-model="filters.dateTo" type="date" class="form-control" style="font-size:12px;padding:4px 8px;height:34px;" />
        </div>

        <!-- Botão Limpar Filtros -->
        <button
          v-if="hasActiveFilters"
          class="btn-secondary"
          style="font-size:11.5px;height:34px;padding:0 10px;color:#ef4444;"
          title="Limpar todos os filtros"
          @click="clearFilters"
        >
          <i class="fa-solid fa-xmark"></i> Limpar
        </button>
      </div>
    </div>

    <!-- Tabela Full-Width do Histórico -->
    <div class="table-content-area" style="flex:1;min-height:0;">
      <div class="table-card-container">
        <div class="table-scroll-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Protocolo</th>
                <th>Departamento</th>
                <th>Atendente</th>
                <th>Encerrado em</th>
                <th>Avaliação</th>
                <th>Status</th>
                <th style="text-align:right;">Ação</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="paginatedList.length === 0">
                <td colspan="8" style="text-align:center;padding:36px 12px;color:#94a3b8;font-size:13px;">
                  <i class="fa-solid fa-magnifying-glass" style="font-size:20px;display:block;margin-bottom:8px;"></i>
                  Nenhum atendimento encontrado com os filtros selecionados.
                </td>
              </tr>
              <tr
                v-for="item in paginatedList"
                :key="item.id"
                style="cursor:pointer;"
                @click="openDetailsModal(item)"
              >
                <!-- Cliente -->
                <td>
                  <div class="contact-cell">
                    <div
                      class="initial-avatar"
                      style="width:34px;height:34px;font-size:12px;flex-shrink:0;"
                      :style="{ background: item.avatarColor || '#2563eb' }"
                    >
                      {{ item.initials || 'CL' }}
                    </div>
                    <div class="contact-cell-meta">
                      <span class="contact-cell-name">
                        {{ item.clientName || item.client_name || 'Cliente' }}
                      </span>
                      <span class="contact-cell-sub">
                        <i class="fa-brands fa-whatsapp" style="color:#22c55e;margin-right:2px;"></i>
                        {{ item.phone || 'WhatsApp' }}
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Protocolo -->
                <td>
                  <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:11.5px;color:#334155;">
                    #{{ shortProtocol(item.protocolo || item.id) }}
                  </code>
                </td>

                <!-- Departamento -->
                <td>
                  <span
                    class="badge"
                    :style="{
                      background: `${getDeptColor(item.deptFinal || item.department)}18`,
                      color: getDeptColor(item.deptFinal || item.department),
                      border: `1px solid ${getDeptColor(item.deptFinal || item.department)}40`
                    }"
                  >
                    {{ item.deptFinal || item.department || 'Geral' }}
                  </span>
                </td>

                <!-- Atendente -->
                <td style="font-weight:500;color:#334155;">
                  <i class="fa-solid fa-user" style="color:#94a3b8;font-size:10.5px;margin-right:4px;"></i>
                  {{ item.agent || item.encerrado_por || 'Sistema' }}
                </td>

                <!-- Data / Hora -->
                <td style="font-size:12px;color:#64748b;">
                  {{ formatDateTime(item.closed_at || item.updated_at || item.time) }}
                </td>

                <!-- Avaliação -->
                <td>
                  <div v-if="item.rating" style="display:inline-flex;align-items:center;gap:4px;background:#fefce8;border:1px solid #fef08a;padding:2px 8px;border-radius:12px;color:#ca8a04;font-weight:700;font-size:11.5px;">
                    <i class="fa-solid fa-star" style="color:#eab308;font-size:11px;"></i>
                    {{ item.rating }} {{ item.rating === 1 ? 'estrela' : 'estrelas' }}
                  </div>
                  <span v-else style="font-size:11px;color:#94a3b8;">
                    Não avaliado
                  </span>
                </td>

                <!-- Status -->
                <td>
                  <span class="badge badge-finalizado">Finalizado</span>
                </td>

                <!-- Ação -->
                <td style="text-align:right;">
                  <button
                    type="button"
                    class="btn-secondary"
                    style="font-size:11.5px;padding:4px 10px;gap:6px;"
                    title="Ver conversa completa"
                    @click.stop="openDetailsModal(item)"
                  >
                    <i class="fa-regular fa-comment-dots"></i> Ver Chat
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginação -->
        <div class="table-pagination-footer">
          <span>
            Mostrando <strong>{{ paginationInfo.from }}</strong> - <strong>{{ paginationInfo.to }}</strong> de <strong>{{ filteredHistory.length }}</strong> atendimentos
          </span>

          <div style="display:flex;align-items:center;gap:12px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span>Itens por página:</span>
              <select v-model.number="itemsPerPage" class="form-control" style="padding:2px 6px;font-size:11px;height:26px;">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </div>

            <div class="pagination-controls">
              <button
                class="page-btn"
                :disabled="currentPage <= 1"
                @click="currentPage--"
              >
                <i class="fa-solid fa-chevron-left" style="font-size:10px;"></i>
              </button>

              <button
                v-for="p in totalPages"
                :key="p"
                class="page-btn"
                :class="{ active: p === currentPage }"
                @click="currentPage = p"
              >
                {{ p }}
              </button>

              <button
                class="page-btn"
                :disabled="currentPage >= totalPages"
                @click="currentPage++"
              >
                <i class="fa-solid fa-chevron-right" style="font-size:10px;"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL DETALHADO DO ATENDIMENTO (POPUP) -->
    <Teleport to="body">
      <div
        v-if="selectedTicketModal"
        class="modal-overlay active"
        @click.self="selectedTicketModal = null"
      >
        <div class="modal-container" style="max-width:900px;width:90vw;height:85vh;display:flex;flex-direction:column;">
          <!-- Modal Header -->
          <div class="modal-header" style="flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div
                class="initial-avatar"
                style="width:40px;height:40px;font-size:14px;flex-shrink:0;"
                :style="{ background: selectedTicketModal.avatarColor || '#2563eb' }"
              >
                {{ selectedTicketModal.initials || 'CL' }}
              </div>
              <div>
                <span class="modal-title" style="font-size:15px;display:flex;align-items:center;gap:8px;">
                  {{ selectedTicketModal.clientName || selectedTicketModal.client_name || 'Cliente' }}
                  <span class="badge badge-whatsapp" style="font-size:10.5px;">
                    <i class="fa-brands fa-whatsapp"></i> {{ selectedTicketModal.phone }}
                  </span>
                </span>
                <span style="font-size:11px;color:#64748b;">
                  Protocolo: <code style="color:#1e293b;font-weight:600;">{{ selectedTicketModal.protocolo || selectedTicketModal.id }}</code>
                </span>
              </div>
            </div>

            <button type="button" class="btn-icon" @click="selectedTicketModal = null">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Modal Body em 2 Colunas -->
          <div style="flex:1;display:grid;grid-template-columns:1.6fr 1fr;overflow:hidden;min-height:0;">
            <!-- Coluna 1: Chat de Mensagens -->
            <div style="display:flex;flex-direction:column;border-right:1px solid #e2e8f0;height:100%;min-height:0;background:#f8fafc;">
              <div style="padding:10px 16px;background:#ffffff;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#475569;">
                <i class="fa-regular fa-comments" style="color:#2563eb;margin-right:4px;"></i>
                Histórico Completo da Conversa
              </div>

              <div class="chat-messages-container" style="flex:1;overflow-y:auto;padding:16px;">
                <div v-if="!selectedTicketModal.messages || selectedTicketModal.messages.length === 0" style="padding:32px;text-align:center;color:#94a3b8;font-size:12px;">
                  Nenhuma mensagem registrada neste chamado.
                </div>
                <template v-else>
                  <div class="chat-date-pill">Início do Atendimento</div>
                  <ChatBubble
                    v-for="(m, idx) in selectedTicketModal.messages"
                    :key="idx"
                    :msg="m"
                    :initials="selectedTicketModal.initials"
                    :avatar-color="selectedTicketModal.avatarColor"
                  />
                </template>
              </div>
            </div>

            <!-- Coluna 2: Informações e Metadados do Atendimento -->
            <div style="display:flex;flex-direction:column;padding:18px;gap:14px;overflow-y:auto;background:#ffffff;">
              <!-- Card de Avaliação do Cliente -->
              <div
                style="border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:6px;"
                :style="{
                  background: selectedTicketModal.rating ? '#fefce8' : '#f8fafc',
                  border: `1px solid ${selectedTicketModal.rating ? '#fef08a' : '#e2e8f0'}`
                }"
              >
                <span style="font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">
                  Avaliação do Atendimento
                </span>
                <div v-if="selectedTicketModal.rating" style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:24px;color:#eab308;">
                    {{ '⭐'.repeat(selectedTicketModal.rating) }}
                  </span>
                  <div>
                    <strong style="font-size:14px;color:#854d0e;">{{ selectedTicketModal.rating }} de 5 estrelas</strong>
                    <span style="font-size:11px;color:#a16207;display:block;">Avaliado pelo cliente via WhatsApp</span>
                  </div>
                </div>
                <div v-else style="display:flex;align-items:center;gap:6px;color:#94a3b8;font-size:12px;">
                  <i class="fa-regular fa-face-meh" style="font-size:16px;"></i>
                  <span>Pesquisa enviada automaticamente (aguardando ou sem resposta).</span>
                </div>
              </div>

              <!-- Metadados da Conversa -->
              <div>
                <span class="details-section-title" style="margin-bottom:8px;display:block;">
                  Detalhes Operacionais
                </span>
                <div class="contact-info-list">
                  <div class="contact-info-item">
                    <i class="fa-solid fa-user-tie"></i>
                    <span>Atendente Responsável: <strong>{{ selectedTicketModal.agent || selectedTicketModal.encerrado_por || 'Sistema' }}</strong></span>
                  </div>
                  <div class="contact-info-item">
                    <i class="fa-solid fa-building"></i>
                    <span>Departamento: <strong>{{ selectedTicketModal.deptFinal || selectedTicketModal.department || 'Geral' }}</strong></span>
                  </div>
                  <div class="contact-info-item">
                    <i class="fa-regular fa-clock"></i>
                    <span>Início do Chamado: <strong>{{ formatDateTime(selectedTicketModal.created_at || selectedTicketModal.time) }}</strong></span>
                  </div>
                  <div class="contact-info-item">
                    <i class="fa-solid fa-circle-check" style="color:#16a34a;"></i>
                    <span>Encerramento: <strong>{{ formatDateTime(selectedTicketModal.closed_at || selectedTicketModal.updated_at) }}</strong></span>
                  </div>
                </div>
              </div>

              <!-- Dados do Cliente -->
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <span class="details-section-title">
                    Dados do Cliente
                  </span>
                  <button class="btn-secondary" style="font-size:11px;padding:2px 8px;" @click="showEditContactModal = true">
                    <i class="fa-solid fa-pen"></i> Editar
                  </button>
                </div>
                <div class="contact-info-list">
                  <div class="contact-info-item">
                    <i class="fa-solid fa-user"></i>
                    <span>Nome: <strong>{{ selectedTicketModal.clientName || selectedTicketModal.client_name }}</strong></span>
                  </div>
                  <div class="contact-info-item">
                    <i class="fa-brands fa-whatsapp" style="color:#22c55e;"></i>
                    <span>Telefone: <strong>{{ formatPhone(selectedTicketModal.phone) }}</strong></span>
                  </div>
                  <div class="contact-info-item">
                    <i class="fa-regular fa-envelope"></i>
                    <span>E-mail: <strong>{{ selectedTicketModal.email || selectedTicketModal.contact?.email || 'Não informado' }}</strong></span>
                  </div>
                  <div class="contact-info-item">
                    <i class="fa-regular fa-id-card"></i>
                    <span>CNPJ/CPF: <strong>{{ formatCnpjCpf(selectedTicketModal.cnpj || selectedTicketModal.contact?.cnpj) }}</strong></span>
                  </div>
                  <div class="contact-info-item">
                    <i class="fa-regular fa-building"></i>
                    <span>Empresa: <strong>{{ selectedTicketModal.company || selectedTicketModal.contact?.company || 'Não informada' }}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="modal-footer" style="flex-shrink:0;">
            <button type="button" class="btn-secondary" @click="selectedTicketModal = null">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal Editar Contato -->
    <ModalEditarContato
      v-if="showEditContactModal && selectedTicketModal"
      :ticket="selectedTicketModal"
      @close="showEditContactModal = false"
      @saved="fetchHistory"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ticketsApi } from '@/api/tickets.api'
import { useSettingsStore } from '@/stores/settings.store'
import { formatPhone, formatCnpjCpf, formatDateTime } from '@/utils/formatters'
import ChatBubble from '@/components/atendimentos/ChatBubble.vue'
import ModalEditarContato from '@/components/modals/ModalEditarContato.vue'

const settingsStore = useSettingsStore()

const historyList = ref([])
const loading = ref(false)
const selectedTicketModal = ref(null)
const showEditContactModal = ref(false)

const currentPage = ref(1)
const itemsPerPage = ref(20)

const filters = ref({
  search: '',
  department: '',
  agent: '',
  rating: '',
  dateFrom: '',
  dateTo: ''
})

const uniqueAgents = computed(() => {
  const set = new Set()
  historyList.value.forEach(h => {
    const ag = h.agent || h.encerrado_por
    if (ag && ag !== '--') set.add(ag)
  })
  return Array.from(set)
})

const hasActiveFilters = computed(() => {
  return (
    filters.value.search !== '' ||
    filters.value.department !== '' ||
    filters.value.agent !== '' ||
    filters.value.rating !== '' ||
    filters.value.dateFrom !== '' ||
    filters.value.dateTo !== ''
  )
})

function clearFilters() {
  filters.value = {
    search: '',
    department: '',
    agent: '',
    rating: '',
    dateFrom: '',
    dateTo: ''
  }
  currentPage.value = 1
}

const filteredHistory = computed(() => {
  return historyList.value.filter(item => {
    // 1. Busca textual
    if (filters.value.search) {
      const term = filters.value.search.toLowerCase()
      const client = (item.clientName || item.client_name || '').toLowerCase()
      const phone = (item.phone || '').toLowerCase()
      const proto = (item.protocolo || item.id || '').toLowerCase()
      const msgMatch = (item.messages || []).some(m => (m.text || '').toLowerCase().includes(term))
      if (!client.includes(term) && !phone.includes(term) && !proto.includes(term) && !msgMatch) {
        return false
      }
    }

    // 2. Departamento
    if (filters.value.department) {
      const dept = item.deptFinal || item.department || ''
      if (dept !== filters.value.department) return false
    }

    // 3. Atendente
    if (filters.value.agent) {
      const ag = item.agent || item.encerrado_por || ''
      if (ag !== filters.value.agent) return false
    }

    // 4. Avaliação CSAT
    if (filters.value.rating) {
      if (filters.value.rating === 'sem_avaliacao') {
        if (item.rating) return false
      } else {
        if (String(item.rating) !== String(filters.value.rating)) return false
      }
    }

    // 5. Data Início
    if (filters.value.dateFrom) {
      const itemDate = new Date(item.closed_at || item.created_at || item.time)
      const fromDate = new Date(`${filters.value.dateFrom}T00:00:00`)
      if (itemDate < fromDate) return false
    }

    // 6. Data Fim
    if (filters.value.dateTo) {
      const itemDate = new Date(item.closed_at || item.created_at || item.time)
      const toDate = new Date(`${filters.value.dateTo}T23:59:59`)
      if (itemDate > toDate) return false
    }

    return true
  })
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredHistory.value.length / itemsPerPage.value))
})

const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredHistory.value.slice(start, start + itemsPerPage.value)
})

const paginationInfo = computed(() => {
  const total = filteredHistory.value.length
  if (total === 0) return { from: 0, to: 0 }
  const from = (currentPage.value - 1) * itemsPerPage.value + 1
  const to = Math.min(currentPage.value * itemsPerPage.value, total)
  return { from, to }
})

function shortProtocol(id) {
  if (!id) return '--'
  if (id.length > 12) return id.substring(0, 8)
  return id
}

function getDeptColor(deptName) {
  const d = settingsStore.departments.find(x => x.name === deptName)
  return d?.color || '#2563eb'
}

function openDetailsModal(item) {
  selectedTicketModal.value = item
}

async function fetchHistory() {
  loading.value = true
  try {
    const { data } = await ticketsApi.history()
    if (data.success && Array.isArray(data.history)) {
      historyList.value = data.history
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  settingsStore.fetchDepartments()
  fetchHistory()
})
</script>
