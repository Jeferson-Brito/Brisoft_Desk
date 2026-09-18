<template>
  <Teleport to="body">
    <div v-if="isOpen" class="history-modal-backdrop" @click="handleBackdropClick">
      <div class="history-modal-container" @click.stop>
        
        <!-- VISÃO 1: LISTA DE ATENDIMENTOS DO HISTÓRICO -->
        <template v-if="!selectedChat">
          <!-- Cabeçalho do Modal -->
          <div class="history-modal-header">
            <div class="history-header-info">
              <div class="history-icon-badge">
                <i class="fa-solid fa-clock-rotate-left"></i>
              </div>
              <div>
                <h3 class="history-modal-title">
                  Histórico de Atendimentos — {{ ticket?.client_name || 'Cliente' }}
                </h3>
                <div class="history-header-meta">
                  <span v-if="ticket?.phone" class="meta-item">
                    <i class="fa-brands fa-whatsapp"></i> {{ formatPhone(ticket.phone) }}
                  </span>
                  <span v-if="ticket?.department" class="meta-item">
                    <i class="fa-solid fa-building"></i> {{ ticket.department }}
                  </span>
                  <span class="meta-badge">{{ historyList.length }} atendimento(s)</span>
                </div>
              </div>
            </div>

            <button type="button" class="history-close-btn" @click="close" title="Fechar (Esc)">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Barra de Filtros e Pesquisa -->
          <div class="history-filter-bar">
            <div class="search-input-wrapper">
              <i class="fa-solid fa-magnifying-glass search-icon"></i>
              <input
                type="text"
                v-model="searchQuery"
                class="history-search-input"
                placeholder="Pesquisar por assunto ou mensagem (ex: Nota Fiscal)..."
                @keyup.enter="fetchHistory"
              />
              <button
                v-if="searchQuery"
                type="button"
                class="clear-search-btn"
                @click="clearSearch"
                title="Limpar pesquisa"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div class="filter-controls-row">
              <div class="filter-group">
                <label>De:</label>
                <input type="date" v-model="dateFrom" class="filter-date-input" @change="fetchHistory" />
              </div>

              <div class="filter-group">
                <label>Até:</label>
                <input type="date" v-model="dateTo" class="filter-date-input" @change="fetchHistory" />
              </div>

              <div class="filter-group">
                <label>Atendente:</label>
                <input
                  type="text"
                  v-model="agentNameFilter"
                  class="filter-text-input"
                  placeholder="Nome..."
                  @keyup.enter="fetchHistory"
                />
              </div>

              <button type="button" class="btn-filter-apply" @click="fetchHistory" title="Aplicar filtros">
                <i class="fa-solid fa-filter"></i>
                <span>Filtrar</span>
              </button>

              <button
                v-if="hasActiveFilters"
                type="button"
                class="btn-filter-reset"
                @click="resetFilters"
                title="Limpar todos os filtros"
              >
                <span>Limpar</span>
              </button>
            </div>
          </div>

          <!-- Lista de Atendimentos Estilo Solicitado -->
          <div class="history-list-area">
            <div v-if="loading" class="history-loading-state">
              <i class="fa-solid fa-spinner fa-spin"></i>
              <span>Carregando histórico do cliente...</span>
            </div>

            <div v-else-if="historyList.length === 0" class="history-empty-state">
              <i class="fa-regular fa-folder-open empty-icon"></i>
              <h4>Nenhum atendimento anterior encontrado</h4>
              <p v-if="hasActiveFilters">Tente alterar os termos da busca ou os filtros aplicados.</p>
              <p v-else>Este cliente ainda não possui outros atendimentos finalizados neste departamento.</p>
            </div>

            <div v-else class="history-items-container">
              <div
                v-for="item in historyList"
                :key="item.id"
                class="history-item-card"
                @click="openChatDetails(item)"
                title="Clique para visualizar a conversa completa deste atendimento"
              >
                <!-- Linha superior: Data/Hora e Atendente -->
                <div class="history-item-top">
                  <span class="history-date">
                    <i class="fa-regular fa-calendar-check"></i>
                    {{ item.date }}
                  </span>
                  <span class="history-agent">
                    <i class="fa-regular fa-user"></i>
                    {{ item.agent_name }}
                  </span>
                </div>

                <!-- Resumo do Atendimento -->
                <div class="history-item-summary">
                  {{ item.summary || 'Atendimento finalizado' }}
                </div>

                <div class="history-item-hover-hint">
                  <span>Ver conversa completa</span>
                  <i class="fa-solid fa-chevron-right"></i>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- VISÃO 2: CONVERSA COMPLETA DO ATENDIMENTO SELECIONADO -->
        <template v-else>
          <!-- Cabeçalho da Conversa -->
          <div class="history-modal-header chat-detail-header">
            <div class="history-header-info">
              <button
                type="button"
                class="btn-back-to-list"
                @click="closeChatDetails"
                title="Voltar para a lista de atendimentos"
              >
                <i class="fa-solid fa-arrow-left"></i>
                <span>Voltar</span>
              </button>

              <div>
                <h3 class="history-modal-title">
                  Conversa de {{ selectedChat.date }}
                </h3>
                <div class="history-header-meta">
                  <span class="meta-item">
                    <i class="fa-regular fa-user"></i> Atendido por: <strong>{{ selectedChat.agent_name }}</strong>
                  </span>
                  <span v-if="selectedChat.department" class="meta-item">
                    <i class="fa-solid fa-building"></i> {{ selectedChat.department }}
                  </span>
                </div>
              </div>
            </div>

            <button type="button" class="history-close-btn" @click="close" title="Fechar (Esc)">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Barra de Pesquisa Dentro da Conversa -->
          <div class="chat-search-bar">
            <div class="search-input-wrapper">
              <i class="fa-solid fa-magnifying-glass search-icon"></i>
              <input
                type="text"
                v-model="chatSearchQuery"
                class="history-search-input"
                placeholder="Pesquisar nesta conversa..."
              />
              <span v-if="chatSearchQuery" class="chat-search-count">
                {{ filteredChatMessages.length }} encontrada(s)
              </span>
              <button
                v-if="chatSearchQuery"
                type="button"
                class="clear-search-btn"
                @click="chatSearchQuery = ''"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          <!-- Área de Mensagens -->
          <div class="chat-detail-body" ref="chatDetailBodyRef">
            <div v-if="loadingChat" class="history-loading-state">
              <i class="fa-solid fa-spinner fa-spin"></i>
              <span>Carregando mensagens da conversa...</span>
            </div>

            <div v-else-if="filteredChatMessages.length === 0" class="history-empty-state">
              <p>Nenhuma mensagem correspondente encontrada.</p>
            </div>

            <div v-else class="chat-messages-scroll">
              <div
                v-for="msg in filteredChatMessages"
                :key="msg.id || msg.created_at"
                class="chat-bubble-row"
                :class="[
                  msg.sender === 'client' ? 'from-client' : 'from-agent',
                  { 'highlighted': isMessageHighlighted(msg) }
                ]"
              >
                <div class="chat-bubble-content">
                  <div class="bubble-sender-name">
                    {{ msg.sender === 'client' ? (ticket?.client_name || 'Cliente') : (msg.sender_name || selectedChat.agent_name) }}
                  </div>

                  <!-- Mídia se houver -->
                  <div v-if="msg.media_url" class="bubble-media-wrapper">
                    <img
                      v-if="msg.type === 'image' || msg.media_type === 'image'"
                      :src="msg.media_url"
                      alt="Imagem do chat"
                      class="bubble-image"
                    />
                    <audio
                      v-else-if="msg.type === 'audio' || msg.media_type === 'audio'"
                      controls
                      :src="msg.media_url"
                      class="bubble-audio"
                    ></audio>
                    <a
                      v-else
                      :href="msg.media_url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="bubble-doc-link"
                    >
                      <i class="fa-solid fa-file-lines"></i>
                      <span>{{ msg.file_name || 'Abrir documento' }}</span>
                    </a>
                  </div>

                  <!-- Texto da Mensagem -->
                  <p class="bubble-text">{{ msg.text }}</p>

                  <!-- Horário -->
                  <span class="bubble-time">
                    {{ formatMessageTime(msg.created_at || msg.time) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ticketsApi } from '@/api/tickets.api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  ticket: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

const loading = ref(false)
const historyList = ref([])
const searchQuery = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const agentNameFilter = ref('')

const selectedChat = ref(null)
const loadingChat = ref(false)
const chatMessages = ref([])
const chatSearchQuery = ref('')

const hasActiveFilters = computed(() => {
  return Boolean(searchQuery.value || dateFrom.value || dateTo.value || agentNameFilter.value)
})

function formatPhone(phone) {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  return phone
}

function formatMessageTime(rawTime) {
  if (!rawTime) return ''
  try {
    const d = new Date(rawTime)
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  } catch {}
  return String(rawTime).slice(0, 5)
}

async function fetchHistory() {
  if (!props.ticket?.id) return
  loading.value = true
  try {
    const params = {}
    if (searchQuery.value.trim()) params.search = searchQuery.value.trim()
    if (dateFrom.value) params.dateFrom = dateFrom.value
    if (dateTo.value) params.dateTo = dateTo.value
    if (agentNameFilter.value.trim()) params.agentName = agentNameFilter.value.trim()

    const res = await ticketsApi.getClientHistory(props.ticket.id, params)
    if (res.data?.success) {
      historyList.value = res.data.history || []
    }
  } catch (err) {
    console.error('Erro ao buscar histórico do cliente:', err)
  } finally {
    loading.value = false
  }
}

function clearSearch() {
  searchQuery.value = ''
  fetchHistory()
}

function resetFilters() {
  searchQuery.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  agentNameFilter.value = ''
  fetchHistory()
}

async function openChatDetails(item) {
  selectedChat.value = item
  loadingChat.value = true
  chatMessages.value = []
  chatSearchQuery.value = ''
  try {
    const res = await ticketsApi.get(item.id)
    if (res.data?.success && res.data.ticket) {
      chatMessages.value = res.data.ticket.messages || []
    }
  } catch (err) {
    console.error('Erro ao carregar mensagens do atendimento:', err)
  } finally {
    loadingChat.value = false
  }
}

function closeChatDetails() {
  selectedChat.value = null
  chatMessages.value = []
  chatSearchQuery.value = ''
}

const filteredChatMessages = computed(() => {
  if (!chatSearchQuery.value.trim()) {
    return chatMessages.value
  }
  const term = chatSearchQuery.value.trim().toLowerCase()
  return chatMessages.value.filter(m => (m.text || '').toLowerCase().includes(term))
})

function isMessageHighlighted(msg) {
  if (!chatSearchQuery.value.trim()) return false
  return (msg.text || '').toLowerCase().includes(chatSearchQuery.value.trim().toLowerCase())
}

function close() {
  selectedChat.value = null
  emit('close')
}

function handleBackdropClick(e) {
  if (e.target === e.currentTarget) {
    close()
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape' && props.isOpen) {
    if (selectedChat.value) {
      closeChatDetails()
    } else {
      close()
    }
  }
}

watch(() => props.isOpen, (open) => {
  if (open && props.ticket?.id) {
    selectedChat.value = null
    fetchHistory()
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.history-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.48);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.history-modal-container {
  background: #ffffff;
  width: 100%;
  max-width: 680px;
  height: 82vh;
  max-height: 760px;
  border-radius: 16px;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.2), 0 4px 16px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: scaleUp 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleUp {
  from { transform: scale(0.96); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Header */
.history-modal-header {
  padding: 16px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.history-header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.history-icon-badge {
  width: 40px;
  height: 40px;
  background: #eff6ff;
  color: #1f62d0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.history-modal-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.history-header-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 3px;
  font-size: 12px;
  color: #64748b;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-badge {
  background: #e2e8f0;
  color: #334155;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 999px;
}

.history-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.history-close-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}

/* Filtros */
.history-filter-bar {
  padding: 12px 20px;
  background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #94a3b8;
  font-size: 13px;
}

.history-search-input {
  width: 100%;
  height: 38px;
  padding: 0 34px 0 34px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 13px;
  color: #0f172a;
  background: #f8fafc;
  outline: none;
  transition: all 0.15s ease;
}

.history-search-input:focus {
  background: #ffffff;
  border-color: #1f62d0;
  box-shadow: 0 0 0 3px rgba(31, 98, 208, 0.12);
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
}

.clear-search-btn:hover {
  color: #ef4444;
}

.filter-controls-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: #64748b;
  font-weight: 500;
}

.filter-date-input,
.filter-text-input {
  height: 30px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 12px;
  color: #334155;
  outline: none;
  background: #ffffff;
}

.filter-text-input {
  width: 110px;
}

.btn-filter-apply {
  height: 30px;
  padding: 0 12px;
  background: #1f62d0;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-filter-apply:hover {
  background: #1d4ed8;
}

.btn-filter-reset {
  height: 30px;
  padding: 0 10px;
  background: transparent;
  color: #64748b;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.btn-filter-reset:hover {
  background: #f1f5f9;
  color: #0f172a;
}

/* Área de Lista */
.history-list-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 20px;
}

.history-loading-state,
.history-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  color: #64748b;
  gap: 8px;
  text-align: center;
}

.empty-icon {
  font-size: 38px;
  color: #cbd5e1;
  margin-bottom: 4px;
}

.history-items-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Item de Histórico no Formato Requisitado */
.history-item-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-item-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 4px 14px rgba(31, 98, 208, 0.09);
  transform: translateY(-1px);
}

.history-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.history-date {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #1e293b;
}

.history-agent {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #1f62d0;
  font-weight: 600;
}

.history-item-summary {
  font-size: 13px;
  color: #475569;
  line-height: 1.4;
  word-break: break-word;
}

.history-item-hover-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
  align-self: flex-end;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.history-item-card:hover .history-item-hover-hint {
  opacity: 1;
  color: #1f62d0;
}

/* VISÃO DA CONVERSA COMPLETA */
.btn-back-to-list {
  height: 32px;
  padding: 0 10px;
  background: #ffffff;
  color: #334155;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-back-to-list:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.chat-search-bar {
  padding: 10px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.chat-search-count {
  position: absolute;
  right: 32px;
  font-size: 11px;
  color: #1f62d0;
  font-weight: 600;
}

.chat-detail-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 20px;
  background: #f8fafc;
}

.chat-messages-scroll {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-bubble-row {
  display: flex;
  width: 100%;
}

.chat-bubble-row.from-client {
  justify-content: flex-start;
}

.chat-bubble-row.from-agent {
  justify-content: flex-end;
}

.chat-bubble-content {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 12px;
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.from-client .chat-bubble-content {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-bottom-left-radius: 3px;
}

.from-agent .chat-bubble-content {
  background: #dbeafe;
  border: 1px solid #bfdbfe;
  border-bottom-right-radius: 3px;
}

.chat-bubble-row.highlighted .chat-bubble-content {
  box-shadow: 0 0 0 2px #3b82f6;
}

.bubble-sender-name {
  font-size: 10.5px;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 4px;
}

.from-agent .bubble-sender-name {
  color: #1e40af;
}

.bubble-text {
  margin: 0;
  font-size: 13px;
  color: #1e293b;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.bubble-time {
  display: block;
  font-size: 10px;
  color: #94a3b8;
  text-align: right;
  margin-top: 4px;
}

.bubble-media-wrapper {
  margin-bottom: 6px;
}

.bubble-image {
  max-width: 100%;
  max-height: 240px;
  border-radius: 8px;
  object-fit: cover;
}

.bubble-audio {
  width: 100%;
  max-width: 260px;
  height: 36px;
}

.bubble-doc-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #1f62d0;
  text-decoration: underline;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 6px;
}
</style>
