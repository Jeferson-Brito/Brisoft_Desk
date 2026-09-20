<template>
  <div class="internal-chat-layout">
    <!-- Coluna 1: Lista de Canais e Colegas de Equipe -->
    <aside class="internal-sidebar">
      <div class="sidebar-header">
        <div class="header-title-row">
          <div class="title-with-icon">
            <span class="chat-icon-badge"><i class="ri-team-line"></i></span>
            <div>
              <h2 class="sidebar-title">Equipe Brisoft</h2>
              <span class="sidebar-subtitle">Chat Interno da Empresa</span>
            </div>
          </div>
          <span class="online-counter-pill" :title="`${onlineCount} colaboradores online no sistema`">
            <span class="status-live-dot"></span>
            {{ onlineCount }} online
          </span>
        </div>

        <!-- Campo de Busca -->
        <div class="search-box-wrapper">
          <i class="ri-search-line search-icon"></i>
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Buscar colega ou canal..."
            class="search-input"
          />
          <button v-if="searchTerm" class="clear-search-btn" @click="searchTerm = ''">
            <i class="ri-close-line"></i>
          </button>
        </div>
      </div>

      <div class="sidebar-scrollable">
        <!-- SEÇÃO: Canais Coletivos -->
        <div class="section-label">
          <span>CANAIS DA EMPRESA</span>
        </div>

        <div class="conversations-list">
          <button
            v-for="conv in channelConversations"
            :key="conv.id"
            type="button"
            class="conversation-item channel-item"
            :class="{ active: chatStore.activeConversation?.id === conv.id }"
            @click="chatStore.selectConversation(conv)"
          >
            <div class="channel-icon-box">
              <i :class="conv.type === 'general' ? 'ri-megaphone-line' : 'ri-building-line'"></i>
            </div>
            <div class="conversation-info">
              <div class="conv-title-row">
                <span class="conv-title">{{ conv.name }}</span>
                <span v-if="conv.last_message_at" class="conv-time">{{ formatTime(conv.last_message_at) }}</span>
              </div>
              <div class="conv-preview-row">
                <span class="conv-preview">{{ conv.last_message_text || 'Sem mensagens recentes' }}</span>
                <span v-if="conv.unread_count > 0" class="conv-unread-badge">{{ conv.unread_count }}</span>
              </div>
            </div>
          </button>
        </div>

        <!-- SEÇÃO: Mensagens Diretas (Equipe) -->
        <div class="section-label section-mt">
          <span>COLEGAS DE TRABALHO ({{ filteredMembers.length }})</span>
        </div>

        <div class="members-list">
          <div v-if="filteredMembers.length === 0" class="empty-members-msg">
            <i class="ri-user-search-line"></i>
            <span>Nenhum colega encontrado</span>
          </div>

          <button
            v-for="member in filteredMembers"
            :key="member.id"
            type="button"
            class="conversation-item member-item"
            :class="{ active: isDirectActive(member.id) }"
            @click="openDirectChat(member.id)"
          >
            <div class="member-avatar-wrapper">
              <div class="member-avatar" :style="getAvatarStyle(member)">
                <img v-if="member.avatar_url" :src="member.avatar_url" :alt="member.name" />
                <span v-else>{{ getInitials(member.name) }}</span>
              </div>
              <span
                class="member-status-dot"
                :class="{ online: isUserOnline(member.id) }"
                :title="isUserOnline(member.id) ? 'Online no sistema' : 'Offline'"
              ></span>
            </div>

            <div class="conversation-info">
              <div class="conv-title-row">
                <span class="conv-title">{{ member.name }}</span>
                <span v-if="getDirectConv(member.id)?.last_message_at" class="conv-time">
                  {{ formatTime(getDirectConv(member.id).last_message_at) }}
                </span>
              </div>
              <div class="conv-preview-row">
                <span class="member-role-label">{{ member.role || 'Colaborador' }}</span>
                <span v-if="getDirectConv(member.id)?.unread_count > 0" class="conv-unread-badge">
                  {{ getDirectConv(member.id).unread_count }}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </aside>

    <!-- Coluna 2: Janela de Conversa Ativa -->
    <main class="internal-chat-main">
      <div v-if="chatStore.activeConversation" class="chat-main-container">
        <!-- Topo da Conversa -->
        <header class="chat-header">
          <div class="chat-header-info">
            <div
              v-if="chatStore.activeConversation.type === 'direct'"
              class="member-avatar-wrapper header-avatar"
            >
              <div class="member-avatar" :style="getAvatarStyle(activeDirectUser)">
                <img v-if="activeDirectUser?.avatar_url" :src="activeDirectUser.avatar_url" :alt="chatStore.activeConversation.name" />
                <span v-else>{{ getInitials(chatStore.activeConversation.name) }}</span>
              </div>
              <span
                class="member-status-dot"
                :class="{ online: isUserOnline(activeDirectUser?.id) }"
              ></span>
            </div>

            <div v-else class="channel-icon-box header-channel-icon">
              <i :class="chatStore.activeConversation.type === 'general' ? 'ri-megaphone-line' : 'ri-building-line'"></i>
            </div>

            <div class="chat-header-text">
              <h3 class="chat-title">{{ chatStore.activeConversation.name }}</h3>
              <p class="chat-subtitle">
                <template v-if="chatStore.activeConversation.type === 'direct'">
                  <span class="status-indicator-text" :class="{ online: isUserOnline(activeDirectUser?.id) }">
                    {{ isUserOnline(activeDirectUser?.id) ? 'Disponível agora' : 'Offline' }}
                  </span>
                  <span class="sep-dot">•</span>
                  <span>{{ activeDirectUser?.role || 'Colaborador' }}</span>
                </template>
                <template v-else-if="chatStore.activeConversation.type === 'general'">
                  <span>Canal visível para todos os colaboradores da empresa</span>
                </template>
                <template v-else>
                  <span>Canal exclusivo do setor</span>
                </template>
              </p>
            </div>
          </div>

          <div class="chat-header-actions">
            <span class="secure-internal-badge" title="Mensagens trafegam exclusivamente dentro da rede interna">
              <i class="ri-shield-check-line"></i> Chat Interno Seguro
            </span>
          </div>
        </header>

        <!-- Área de Rolagem das Mensagens -->
        <div class="chat-messages-area" ref="messagesContainerRef">
          <div v-if="chatStore.isLoading" class="messages-loading">
            <i class="ri-loader-4-line spin-icon"></i>
            <span>Carregando histórico...</span>
          </div>

          <div v-else-if="chatStore.messages.length === 0" class="empty-chat-state">
            <div class="empty-icon-circle">
              <i class="ri-chat-smile-2-line"></i>
            </div>
            <h4>Início da conversa</h4>
            <p>Nenhuma mensagem enviada ainda. Envie uma saudação para começar a interagir!</p>
          </div>

          <div v-else class="messages-flow">
            <div
              v-for="(msg, index) in chatStore.messages"
              :key="msg.id || index"
              class="message-row"
              :class="{
                'message-mine': msg.sender_id === auth.user?.id,
                'message-other': msg.sender_id !== auth.user?.id
              }"
            >
              <!-- Avatar do colega nas mensagens recebidas -->
              <div
                v-if="msg.sender_id !== auth.user?.id"
                class="message-sender-avatar"
                :style="getAvatarStyle(msg.sender)"
                :title="msg.sender?.name"
              >
                <img v-if="msg.sender?.avatar_url" :src="msg.sender.avatar_url" :alt="msg.sender.name" />
                <span v-else>{{ getInitials(msg.sender?.name) }}</span>
              </div>

              <div class="message-bubble-box">
                <!-- Nome do remetente (apenas em canais ou se for de outro usuário) -->
                <span
                  v-if="msg.sender_id !== auth.user?.id && chatStore.activeConversation.type !== 'direct'"
                  class="bubble-sender-name"
                >
                  {{ msg.sender?.name || 'Colega' }}
                </span>

                <div class="message-text-content">
                  {{ msg.text }}
                </div>

                <div class="message-meta-row">
                  <span class="message-timestamp">{{ formatMessageTime(msg.created_at) }}</span>
                  <i
                    v-if="msg.sender_id === auth.user?.id"
                    class="ri-check-double-line message-check-read"
                  ></i>
                </div>
              </div>
            </div>
          </div>

          <!-- Indicador de Digitação -->
          <div v-if="isTypingNow" class="typing-indicator-row">
            <div class="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span class="typing-label">{{ typingLabel }}</span>
          </div>
        </div>

        <!-- Barra Inferior de Envio de Mensagem -->
        <footer class="chat-input-footer">
          <form class="chat-input-form" @submit.prevent="handleSend">
            <button
              type="button"
              class="tool-btn"
              title="Inserir emoji"
              @click="insertEmoji('👋')"
            >
              <i class="ri-emotion-happy-line"></i>
            </button>

            <textarea
              ref="inputTextareaRef"
              v-model="inputMessage"
              rows="1"
              placeholder="Digite sua mensagem interna... (Enter para enviar, Shift+Enter para quebrar linha)"
              class="chat-textarea"
              @keydown="onKeyDown"
              @input="onInputTyping"
            ></textarea>

            <button
              type="submit"
              class="send-message-btn"
              :disabled="!inputMessage.trim() || chatStore.isSending"
              title="Enviar mensagem"
            >
              <i v-if="chatStore.isSending" class="ri-loader-4-line spin-icon"></i>
              <i v-else class="ri-send-plane-2-fill"></i>
            </button>
          </form>
        </footer>
      </div>

      <!-- Estado Vazio (Nenhuma conversa selecionada) -->
      <div v-else class="no-active-chat-state">
        <div class="no-chat-illustration">
          <div class="illustration-bubble"><i class="ri-discuss-line"></i></div>
        </div>
        <h3 class="no-chat-title">Chat Interno da Empresa</h3>
        <p class="no-chat-desc">
          Converse com seus colegas de equipe e compartilhe comunicados em tempo real, sem depender do WhatsApp.
        </p>
        <button
          type="button"
          class="btn-start-general"
          @click="selectGeneralChannel"
        >
          <i class="ri-megaphone-line"></i> Abrir Canal Geral
        </button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useInternalChatStore } from '@/stores/internal-chat.store'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

const chatStore = useInternalChatStore()
const auth = useAuthStore()
const ui = useUiStore()

const searchTerm = ref('')
const inputMessage = ref('')
const messagesContainerRef = ref(null)
const inputTextareaRef = ref(null)
let typingTimeout = null

// ─── Inicialização ────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([
    chatStore.fetchConversations(),
    chatStore.fetchTeamMembers()
  ])

  // Se não houver conversa ativa, seleciona o canal Geral por padrão
  if (!chatStore.activeConversation) {
    const general = chatStore.conversations.find(c => c.type === 'general')
    if (general) {
      chatStore.selectConversation(general)
    }
  }
})

// Rola para a mensagem mais recente ao carregar ou receber novas mensagens
watch(() => chatStore.messages.length, () => {
  scrollToBottom()
})

watch(() => chatStore.activeConversation?.id, () => {
  scrollToBottom()
  nextTick(() => {
    inputTextareaRef.value?.focus()
  })
})

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainerRef.value) {
      messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
    }
  })
}

// ─── Computeds ────────────────────────────────────────────────────────────────
const onlineCount = computed(() => ui.onlineUsersCount || 1)

const channelConversations = computed(() => {
  return chatStore.conversations.filter(c => c.type === 'general' || c.type === 'department')
})

const filteredMembers = computed(() => {
  const term = searchTerm.value.toLowerCase().trim()
  if (!term) return chatStore.teamMembers
  return chatStore.teamMembers.filter(m => 
    m.name?.toLowerCase().includes(term) ||
    m.role?.toLowerCase().includes(term) ||
    m.email?.toLowerCase().includes(term)
  )
})

const activeDirectUser = computed(() => {
  if (chatStore.activeConversation?.type !== 'direct') return null
  return chatStore.activeConversation.other_user
})

const isTypingNow = computed(() => {
  if (!chatStore.activeConversation) return false
  const typers = chatStore.typingUsers[chatStore.activeConversation.id]
  return typers && Object.keys(typers).length > 0
})

const typingLabel = computed(() => {
  if (!chatStore.activeConversation) return ''
  const typers = chatStore.typingUsers[chatStore.activeConversation.id] || {}
  const names = Object.values(typers)
  if (names.length === 1) return `${names[0]} está digitando...`
  if (names.length > 1) return `${names[0]} e outros estão digitando...`
  return ''
})

// ─── Helpers de Status e Conversas ───────────────────────────────────────────
function isUserOnline(userId) {
  if (!userId) return false
  if (userId === auth.user?.id) return true
  return ui.onlineUsersList.some(u => String(u.id) === String(userId))
}

function getDirectConv(userId) {
  return chatStore.conversations.find(c => 
    c.type === 'direct' && String(c.other_user?.id) === String(userId)
  )
}

function isDirectActive(userId) {
  if (chatStore.activeConversation?.type !== 'direct') return false
  return String(chatStore.activeConversation.other_user?.id) === String(userId)
}

async function openDirectChat(targetUserId) {
  await chatStore.startDirectChatWith(targetUserId)
}

function selectGeneralChannel() {
  const general = chatStore.conversations.find(c => c.type === 'general')
  if (general) chatStore.selectConversation(general)
}

// ─── Envio e Digitação ────────────────────────────────────────────────────────
async function handleSend() {
  const text = inputMessage.value.trim()
  if (!text) return

  inputMessage.value = ''
  await chatStore.sendMessage(text)
  scrollToBottom()
}

function onKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function onInputTyping() {
  clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {}, 1500)
}

function insertEmoji(emoji) {
  inputMessage.value += emoji
  inputTextareaRef.value?.focus()
}

// ─── Estilos de Avatar e Formatação de Data ──────────────────────────────────
function getInitials(name) {
  if (!name) return 'CB'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getAvatarStyle(user) {
  const colors = [
    '#2563eb', '#7c3aed', '#059669', '#ea580c', '#dc2626', '#0891b2', '#4f46e5'
  ]
  let hash = 0
  const str = user?.name || user?.id || 'Brisoft'
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  const color = colors[Math.abs(hash) % colors.length]
  return { backgroundColor: color, color: '#ffffff' }
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  } catch {
    return ''
  }
}

function formatMessageTime(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
</script>

<style scoped>
.internal-chat-layout {
  display: grid;
  grid-template-columns: 340px 1fr;
  height: calc(100vh - 54px);
  width: 100%;
  background: #f8fafc;
  overflow: hidden;
  font-family: inherit;
}

/* ─── SIDEBAR ESQUERDA ──────────────────────────────────────────────────────── */
.internal-sidebar {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  height: 100%;
  min-width: 0;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  background: #ffffff;
}

.header-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-icon-badge {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
}

.sidebar-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  line-height: 1.2;
}

.sidebar-subtitle {
  font-size: 11.5px;
  color: #64748b;
}

.online-counter-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.status-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
}

.search-box-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: #94a3b8;
  font-size: 14px;
}

.search-input {
  width: 100%;
  height: 34px;
  padding: 0 30px 0 32px;
  background: #f1f5f9;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 12.5px;
  color: #1e293b;
  outline: none;
  transition: all 0.15s ease;
}

.search-input:focus {
  background: #ffffff;
  border-color: #cbd5e1;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px;
}

.sidebar-scrollable {
  flex: 1;
  overflow-y: auto;
  padding: 10px 8px;
}

.section-label {
  padding: 8px 8px 4px 8px;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.5px;
}

.section-mt {
  margin-top: 14px;
}

.conversation-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  margin-bottom: 2px;
}

.conversation-item:hover {
  background: #f1f5f9;
}

.conversation-item.active {
  background: #eff6ff;
}

.channel-icon-box {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.conversation-item.active .channel-icon-box {
  background: #dbeafe;
  color: #1d4ed8;
  border-color: #bfdbfe;
}

.member-avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.member-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  overflow: hidden;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #cbd5e1;
  border: 2px solid #ffffff;
}

.member-status-dot.online {
  background: #22c55e;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conv-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.conv-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-time {
  font-size: 11px;
  color: #94a3b8;
  flex-shrink: 0;
  margin-left: 6px;
}

.conv-preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.conv-preview,
.member-role-label {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-unread-badge {
  background: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
  flex-shrink: 0;
}

.empty-members-msg {
  padding: 24px 12px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

/* ─── PAINEL CENTRAL DO CHAT ────────────────────────────────────────────────── */
.internal-chat-main {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8fafc;
  min-width: 0;
}

.chat-main-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
}

.chat-header {
  height: 58px;
  padding: 0 20px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.chat-header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-channel-icon {
  width: 38px;
  height: 38px;
  font-size: 19px;
  background: #eff6ff;
  color: #2563eb;
  border-color: #dbeafe;
}

.chat-title {
  font-size: 14.5px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.chat-subtitle {
  font-size: 11.5px;
  color: #64748b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-indicator-text.online {
  color: #16a34a;
  font-weight: 600;
}

.sep-dot {
  color: #cbd5e1;
}

.secure-internal-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: #059669;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  padding: 4px 10px;
  border-radius: 12px;
}

/* ─── MENSAGENS ─────────────────────────────────────────────────────────────── */
.chat-messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.messages-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
  margin: auto;
}

.empty-chat-state {
  margin: auto;
  text-align: center;
  max-width: 320px;
  color: #64748b;
}

.empty-icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #eff6ff;
  color: #3b82f6;
  font-size: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px auto;
}

.empty-chat-state h4 {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 6px 0;
}

.empty-chat-state p {
  font-size: 12.5px;
  margin: 0;
  line-height: 1.4;
}

.messages-flow {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 75%;
}

.message-mine {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-other {
  align-self: flex-start;
}

.message-sender-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
  overflow: hidden;
  margin-bottom: 2px;
}

.message-sender-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.message-bubble-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.message-mine .message-bubble-box {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
  border-bottom-right-radius: 2px;
}

.message-other .message-bubble-box {
  border-bottom-left-radius: 2px;
}

.bubble-sender-name {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #4f46e5;
  margin-bottom: 3px;
}

.message-text-content {
  font-size: 13.5px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-meta-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 4px;
}

.message-timestamp {
  font-size: 10.5px;
  color: #94a3b8;
}

.message-mine .message-timestamp {
  color: rgba(255, 255, 255, 0.8);
}

.message-check-read {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
}

.typing-indicator-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 12px;
  color: #64748b;
}

.typing-dots {
  display: flex;
  gap: 3px;
}

.typing-dots span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #94a3b8;
  animation: typing-blink 1.4s infinite both;
}

.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-blink {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

/* ─── FOOTER DO INPUT ───────────────────────────────────────────────────────── */
.chat-input-footer {
  padding: 12px 20px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
}

.chat-input-form {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 4px 8px;
  transition: all 0.15s ease;
}

.chat-input-form:focus-within {
  background: #ffffff;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.tool-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 18px;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.tool-btn:hover {
  color: #2563eb;
  background: #eff6ff;
}

.chat-textarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  font-size: 13.5px;
  color: #0f172a;
  max-height: 100px;
  line-height: 1.4;
  padding: 6px 0;
  font-family: inherit;
}

.send-message-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #2563eb;
  color: #ffffff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.send-message-btn:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.send-message-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ─── ESTADO VAZIO (NENHUMA CONVERSA ATIVA) ──────────────────────────────────── */
.no-active-chat-state {
  margin: auto;
  text-align: center;
  max-width: 380px;
  padding: 30px;
}

.no-chat-illustration {
  margin-bottom: 16px;
}

.illustration-bubble {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  box-shadow: 0 8px 16px -4px rgba(37, 99, 235, 0.15);
}

.no-chat-title {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px 0;
}

.no-chat-desc {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  margin: 0 0 20px 0;
}

.btn-start-general {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #2563eb;
  color: #ffffff;
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-start-general:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}

/* ─── RESPONSIVIDADE ────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .internal-chat-layout {
    grid-template-columns: 1fr;
  }
}
</style>
