<template>
  <div class="table-view-layout" style="width:100%;">
    <!-- Barra Compacta de Ferramentas: Lupa + Pesquisa Pequena + Botão de Filtros -->
    <div class="history-toolbar">
      <div class="history-toolbar-actions">
        <!-- Botão Lupa & Caixa de Pesquisa Pequena -->
        <div class="history-search-wrapper" :class="{ open: isSearchOpen || filters.search }">
          <button
            type="button"
            class="history-tool-btn history-search-toggle"
            :class="{ active: isSearchOpen || filters.search }"
            title="Pesquisar conversas"
            @click="toggleSearch"
          >
            <i class="fa-solid fa-magnifying-glass"></i>
          </button>

          <Transition name="search-expand">
            <div v-if="isSearchOpen || filters.search" class="history-compact-search">
              <input
                ref="searchInputRef"
                v-model="filters.search"
                type="text"
                class="history-search-input"
                placeholder="Buscar cliente, tel, protocolo..."
                @keydown.esc="onSearchEsc"
              />
              <button
                v-if="filters.search"
                type="button"
                class="history-search-clear"
                title="Limpar pesquisa"
                @click="clearSearch"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </Transition>
        </div>

        <!-- Botão de Filtros com Popover Suspenso -->
        <div class="history-filter-wrapper" ref="filterDropdownRef">
          <button
            type="button"
            class="history-tool-btn history-filter-btn"
            :class="{ active: showFilterPopover || hasActiveFilters }"
            title="Filtros de conversas"
            @click="showFilterPopover = !showFilterPopover"
          >
            <i class="fa-solid fa-sliders"></i>
            <span>Filtros</span>
            <span v-if="activeFilterCount > 0" class="history-filter-count">
              {{ activeFilterCount }}
            </span>
          </button>

          <!-- Painel Suspenso de Filtros -->
          <Transition name="popover-fade">
            <div v-if="showFilterPopover" class="history-filter-popover">
              <div class="popover-header">
                <span><i class="fa-solid fa-sliders"></i> Filtros de Conversas</span>
                <button type="button" class="popover-close-btn" @click="showFilterPopover = false">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div class="popover-content">
                <!-- Filtro: Departamento -->
                <div class="popover-field">
                  <label><i class="fa-solid fa-building"></i> Departamento</label>
                  <select v-model="filters.department" class="popover-select">
                    <option value="">Todos os Departamentos</option>
                    <option v-for="d in settingsStore.departments" :key="d.id" :value="d.name">
                      {{ d.name }}
                    </option>
                  </select>
                </div>

                <!-- Filtro: Atendente -->
                <div class="popover-field">
                  <label><i class="fa-solid fa-user-tie"></i> Atendente</label>
                  <select v-model="filters.agent" class="popover-select">
                    <option value="">Todos os Atendentes</option>
                    <option v-for="ag in uniqueAgents" :key="ag" :value="ag">
                      {{ ag }}
                    </option>
                  </select>
                </div>

                <!-- Filtro: Avaliação CSAT -->
                <div class="popover-field">
                  <label><i class="fa-solid fa-star"></i> Avaliação</label>
                  <select v-model="filters.rating" class="popover-select">
                    <option value="">Todas</option>
                    <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                    <option value="4">⭐⭐⭐⭐ (4)</option>
                    <option value="3">⭐⭐⭐ (3)</option>
                    <option value="2">⭐⭐ (2)</option>
                    <option value="1">⭐ (1)</option>
                    <option value="sem_avaliacao">Sem avaliação</option>
                  </select>
                </div>

                <!-- Filtros de Data -->
                <div class="popover-date-grid">
                  <div class="popover-field">
                    <label><i class="fa-regular fa-calendar"></i> De</label>
                    <input v-model="filters.dateFrom" type="date" class="popover-input" />
                  </div>
                  <div class="popover-field">
                    <label><i class="fa-regular fa-calendar-check"></i> Até</label>
                    <input v-model="filters.dateTo" type="date" class="popover-input" />
                  </div>
                </div>
              </div>

              <div class="popover-footer">
                <button
                  v-if="hasActiveFilters"
                  type="button"
                  class="popover-reset-btn"
                  @click="clearFilters"
                >
                  <i class="fa-solid fa-eraser"></i> Limpar filtros
                </button>
                <button
                  type="button"
                  class="popover-apply-btn"
                  @click="showFilterPopover = false"
                >
                  Concluído
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Chips dos filtros ativos para rápida visualização e remoção -->
        <div v-if="hasActiveChips" class="history-chips-row">
          <span v-if="filters.department" class="history-chip">
            Setor: <strong>{{ filters.department }}</strong>
            <i class="fa-solid fa-xmark" @click="filters.department = ''"></i>
          </span>
          <span v-if="filters.agent" class="history-chip">
            Atendente: <strong>{{ filters.agent }}</strong>
            <i class="fa-solid fa-xmark" @click="filters.agent = ''"></i>
          </span>
          <span v-if="filters.rating" class="history-chip">
            {{ filters.rating === 'sem_avaliacao' ? 'Sem avaliação' : `${filters.rating} ★` }}
            <i class="fa-solid fa-xmark" @click="filters.rating = ''"></i>
          </span>
          <span v-if="filters.dateFrom || filters.dateTo" class="history-chip">
            {{ filters.dateFrom ? formatShortDate(filters.dateFrom) : 'Início' }} - {{ filters.dateTo ? formatShortDate(filters.dateTo) : 'Hoje' }}
            <i class="fa-solid fa-xmark" @click="filters.dateFrom = ''; filters.dateTo = ''"></i>
          </span>
          <button type="button" class="history-chip-clear" @click="clearFilters" title="Limpar todos os filtros">
            Limpar tudo
          </button>
        </div>
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
                  Cliente não encontrado ou funcionário não encontrado!
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
                      <img v-if="item.avatar_url" :src="item.avatar_url" alt="Foto do cliente" referrerpolicy="no-referrer" class="history-avatar-image" />
                      <span v-else>{{ item.initials || 'CL' }}</span>
                    </div>
                    <div class="contact-cell-meta">
                      <span class="contact-cell-name">
                        {{ normalizePersonName(item.clientName || item.client_name || 'Cliente') }}
                      </span>
                      <span class="contact-cell-sub">
                        <i class="fa-brands fa-whatsapp" style="color:#22c55e;margin-right:2px;"></i>
                        {{ formatPhone(item.phone) }}
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
                <img v-if="selectedTicketModal.avatar_url" :src="selectedTicketModal.avatar_url" alt="Foto do cliente" referrerpolicy="no-referrer" class="history-avatar-image" />
                <span v-else>{{ selectedTicketModal.initials || 'CL' }}</span>
              </div>
              <div>
                <span class="modal-title" style="font-size:15px;display:flex;align-items:center;gap:8px;">
                  {{ normalizePersonName(selectedTicketModal.clientName || selectedTicketModal.client_name || 'Cliente') }}
                  <span class="badge badge-whatsapp" style="font-size:10.5px;">
                    <i class="fa-brands fa-whatsapp"></i> {{ formatPhone(selectedTicketModal.phone) }}
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
                Conversa completa
              </div>

              <div class="chat-messages-container" style="flex:1;overflow-y:auto;padding:16px;">
                <div v-if="detailLoading" style="padding:32px;text-align:center;color:#64748b;font-size:12px;">
                  <i class="fa-solid fa-spinner fa-spin" style="margin-right:6px;"></i> Carregando conversa completa...
                </div>
                <div v-else-if="!selectedTicketModal.messages || selectedTicketModal.messages.length === 0" style="padding:32px;text-align:center;color:#94a3b8;font-size:12px;">
                  Nenhuma mensagem registrada neste chamado.
                </div>
                <template v-else>
                  <div class="chat-date-pill">Início do Atendimento</div>
                  <ChatBubble
                    v-for="(m, idx) in (selectedTicketModal.messages || []).filter(msg => !msg?.text?.startsWith?.('[Chatbot][State]'))"
                    :key="idx"
                    :msg="m"
                    :initials="selectedTicketModal.initials"
                    :avatar-color="selectedTicketModal.avatarColor"
                    :avatar-url="selectedTicketModal.avatar_url"
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
                    <span>Nome: <strong>{{ normalizePersonName(selectedTicketModal.clientName || selectedTicketModal.client_name) }}</strong></span>
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
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ticketsApi } from '@/api/tickets.api'
import { useSettingsStore } from '@/stores/settings.store'
import { formatPhone, formatCnpjCpf, formatDateTime } from '@/utils/formatters'
import { normalizePersonName } from '@/utils/person-display'
import ChatBubble from '@/components/atendimentos/ChatBubble.vue'
import ModalEditarContato from '@/components/modals/ModalEditarContato.vue'

const settingsStore = useSettingsStore()

const historyList = ref([])
const loading = ref(false)
const selectedTicketModal = ref(null)
const detailLoading = ref(false)
const showEditContactModal = ref(false)

const currentPage = ref(1)
const itemsPerPage = ref(20)

const isSearchOpen = ref(false)
const showFilterPopover = ref(false)
const searchInputRef = ref(null)
const filterDropdownRef = ref(null)

const filters = ref({
  search: '',
  department: '',
  agent: '',
  rating: '',
  dateFrom: '',
  dateTo: ''
})

function toggleSearch() {
  isSearchOpen.value = !isSearchOpen.value
  if (isSearchOpen.value) {
    nextTick(() => searchInputRef.value?.focus())
  }
}

function onSearchEsc() {
  if (!filters.value.search) {
    isSearchOpen.value = false
  }
}

function clearSearch() {
  filters.value.search = ''
  searchInputRef.value?.focus()
}

const activeFilterCount = computed(() => {
  let count = 0
  if (filters.value.department) count++
  if (filters.value.agent) count++
  if (filters.value.rating) count++
  if (filters.value.dateFrom || filters.value.dateTo) count++
  return count
})

const hasActiveChips = computed(() => {
  return Boolean(
    filters.value.department ||
    filters.value.agent ||
    filters.value.rating ||
    filters.value.dateFrom ||
    filters.value.dateTo
  )
})

function formatShortDate(d) {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`
  return d
}

function handleClickOutside(event) {
  if (filterDropdownRef.value && !filterDropdownRef.value.contains(event.target)) {
    showFilterPopover.value = false
  }
}

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
      const itemDate = (item.closed_at || item.created_at || '').substring(0, 10)
      if (itemDate && itemDate < filters.value.dateFrom) return false
    }

    // 6. Data Fim
    if (filters.value.dateTo) {
      const itemDate = (item.closed_at || item.created_at || '').substring(0, 10)
      if (itemDate && itemDate > filters.value.dateTo) return false
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

async function openDetailsModal(item) {
  selectedTicketModal.value = { ...item }
  detailLoading.value = true
  try {
    const { data } = await ticketsApi.get(item.id)
    if (data?.success && data.ticket && selectedTicketModal.value?.id === item.id) {
      selectedTicketModal.value = {
        ...item,
        ...data.ticket,
        clientName: data.ticket.clientName || data.ticket.client_name || item.clientName,
        avatarColor: data.ticket.avatarColor || data.ticket.avatar_color || item.avatarColor,
        rating: item.rating,
        messages: data.ticket.messages || item.messages || []
      }
    }
  } catch (error) {
    console.warn('Falha ao atualizar a conversa completa:', error)
  } finally {
    detailLoading.value = false
  }
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
  document.addEventListener('click', handleClickOutside)
  settingsStore.fetchDepartments()
  fetchHistory()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.initial-avatar { overflow: hidden; }
.history-avatar-image { width: 100%; height: 100%; object-fit: cover; }

/* ── Barra Compacta de Ferramentas ── */
.history-toolbar {
  margin-bottom: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  padding: 8px 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.history-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* ── Botão Genérico de Ação na Toolbar ── */
.history-tool-btn {
  height: 34px;
  min-width: 34px;
  padding: 0 12px;
  border-radius: 7px;
  border: 1px solid #dbe2ea;
  background: #ffffff;
  color: #475569;
  font-size: 12.5px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.history-tool-btn:hover {
  background: #f8fafc;
  color: #1f62d0;
  border-color: #bfdbfe;
}

.history-tool-btn.active {
  background: #eff6ff;
  color: #1f62d0;
  border-color: #1f62d0;
}

/* ── Lupa / Busca Pequena Expansível ── */
.history-search-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.history-search-toggle {
  padding: 0;
  width: 34px;
}

.history-compact-search {
  position: relative;
  display: flex;
  align-items: center;
}

.history-search-input {
  width: 250px;
  height: 34px;
  padding: 0 28px 0 10px;
  border: 1px solid #1f62d0;
  border-radius: 7px;
  font-size: 12.5px;
  color: #0f172a;
  background: #ffffff;
  outline: none;
  box-shadow: 0 0 0 3px rgba(31, 98, 208, 0.1);
  transition: all 0.2s ease;
}

.history-search-input:focus {
  border-color: #1d4ed8;
}

.history-search-clear {
  position: absolute;
  right: 6px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 3px;
  font-size: 11px;
}

.history-search-clear:hover {
  color: #ef4444;
}

/* Transição suave da busca */
.search-expand-enter-active,
.search-expand-leave-active {
  transition: all 0.18s ease;
  overflow: hidden;
}

.search-expand-enter-from,
.search-expand-leave-to {
  width: 0;
  opacity: 0;
}

/* ── Popover de Filtros ── */
.history-filter-wrapper {
  position: relative;
}

.history-filter-count {
  min-width: 17px;
  height: 17px;
  padding: 0 5px;
  border-radius: 999px;
  background: #1f62d0;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.history-filter-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 340px;
  background: #ffffff;
  border: 1px solid #dbe2ea;
  border-radius: 10px;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06);
  z-index: 100;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.popover-title,
.popover-header span {
  font-size: 12.5px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.popover-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 13px;
  padding: 2px 4px;
  border-radius: 4px;
}

.popover-close-btn:hover {
  color: #0f172a;
  background: #f1f5f9;
}

.popover-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.popover-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.popover-field label {
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 5px;
}

.popover-field label i {
  color: #94a3b8;
  font-size: 10px;
}

.popover-select,
.popover-input {
  width: 100%;
  height: 32px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  font-size: 12px;
  color: #0f172a;
  outline: none;
  box-sizing: border-box;
}

.popover-select:focus,
.popover-input:focus {
  border-color: #1f62d0;
}

.popover-date-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.popover-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
}

.popover-reset-btn {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.popover-reset-btn:hover {
  text-decoration: underline;
}

.popover-apply-btn {
  background: #1f62d0;
  color: #ffffff;
  border: none;
  border-radius: 5px;
  padding: 5px 12px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  margin-left: auto;
  transition: background 0.15s ease;
}

.popover-apply-btn:hover {
  background: #1d4ed8;
}

/* Transição Popover */
.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.popover-fade-enter-from,
.popover-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── Chips de Filtros Ativos ── */
.history-chips-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-left: 4px;
}

.history-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 5px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1f62d0;
  font-size: 11px;
  font-weight: 500;
}

.history-chip i {
  font-size: 9px;
  cursor: pointer;
  color: #60a5fa;
}

.history-chip i:hover {
  color: #ef4444;
}

.history-chip-clear {
  background: transparent;
  border: none;
  color: #ef4444;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 0 4px;
}

.history-chip-clear:hover {
  text-decoration: underline;
}
</style>
