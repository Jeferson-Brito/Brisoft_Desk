<template>
  <div class="chat-column">
    <!-- Header do Chat -->
    <div v-if="ticket" class="chat-header">
      <div
        class="chat-header-left"
        style="cursor:pointer;"
        title="Clique para ver os dados do contato"
        @click="$emit('toggle-details')"
      >
        <div
          class="initial-avatar"
          id="activeChatAvatar"
          :style="{ backgroundColor: ticket?.avatarColor || '#2563eb' }"
        >
          {{ ticket?.initials || 'CL' }}
        </div>
        <div class="chat-header-name">
          <span id="activeChatTitle">{{ ticket?.clientName || ticket?.client_name || 'Cliente' }}</span>
          <i
            class="fa-solid"
            :class="isDetailsOpen ? 'fa-chevron-up' : 'fa-chevron-down'"
            style="font-size:11px;color:#94a3b8;transition:transform 0.2s ease;"
          ></i>
        </div>
        <span class="badge badge-whatsapp">
          <i class="fa-brands fa-whatsapp"></i> {{ whatsappAccountLabel }}
        </span>
      </div>

      <div class="chat-header-actions">
        <!-- Botão Transferir -->
        <button
          v-if="ticket"
          type="button"
          class="btn-secondary"
          title="Transferir atendimento"
          style="padding:5px 12px;font-size:11.5px;display:inline-flex;gap:6px;"
          @click="showTransferModal = true"
        >
          <i class="fa-solid fa-arrow-right-arrow-left"></i> Transferir
        </button>

        <!-- Botão Assumir -->
        <button
          v-if="canAssume"
          type="button"
          class="btn-primary"
          id="btnAssumirChat"
          style="padding:5px 12px;font-size:11.5px;display:inline-flex;"
          @click="handleAssume"
        >
          <i class="fa-solid fa-hand-pointer"></i> Assumir
        </button>

        <!-- Botão Encerrar -->
        <button
          v-if="canClose"
          type="button"
          class="btn-secondary"
          id="btnEncerrarChat"
          style="padding:5px 12px;font-size:11.5px;color:#ef4444;border-color:rgba(239,68,68,0.3);display:inline-flex;"
          @click="ui.openModal('encerrar')"
        >
          <i class="fa-solid fa-check"></i> Encerrar
        </button>
      </div>
    </div>

    <!-- Mensagens do Chat -->
    <div class="chat-messages-container" id="chatMessagesBox" ref="msgBoxRef">
      <!-- Empty state se não tiver ticket -->
      <div
        v-if="!ticket"
        style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#94a3b8;gap:12px;margin:auto;"
      >
        <div style="width:52px;height:52px;border-radius:50%;background:#eff6ff;color:var(--brand-primary);display:flex;align-items:center;justify-content:center;font-size:22px;">
          <i class="fa-regular fa-comments"></i>
        </div>
        <strong style="color:#334155;font-size:14px;">Central Pronta para Atendimento</strong>
        <p style="font-size:11.5px;color:#64748b;max-width:300px;text-align:center;margin:0;line-height:1.45;">
          Conecte uma conta em Configurações → Conexões. As mensagens dos clientes aparecerão aqui automaticamente.
        </p>
      </div>

      <!-- Histórico de Mensagens agrupado por data com Sticky Header do WhatsApp -->
      <template v-else>
        <div
          v-for="(group, gIdx) in messageGroups"
          :key="gIdx"
          class="chat-date-group"
          style="display:flex;flex-direction:column;gap:10px;"
        >
          <div class="chat-date-sticky-wrapper">
            <div class="chat-date-pill">{{ group.dateLabel }}</div>
          </div>
          <ChatBubble
            v-for="(m, mIdx) in group.messages"
            :key="m.id || `${gIdx}_${mIdx}`"
            :msg="m"
            :initials="ticket.initials"
            :avatar-color="ticket.avatarColor"
          />
        </div>
      </template>
    </div>

    <!-- Botão Flutuante Voltar ao Final (Scroll to bottom) -->
    <Transition name="fade-slide">
      <button
        v-if="showScrollBottom"
        type="button"
        class="scroll-bottom-btn"
        :style="{ bottom: canSend ? '88px' : '24px' }"
        title="Rolar para as mensagens recentes"
        @click="scrollToBottomSmooth"
      >
        <i class="fa-solid fa-chevron-down"></i>
      </button>
    </Transition>

    <!-- Footer de Envio de Mensagem -->
    <div
      v-if="canSend"
      class="chat-footer"
      id="chatFooter"
    >
      <!-- Linha 1: Abas de Modo (Responder vs Observação) -->
      <div class="chat-mode-tabs">
        <button
          type="button"
          class="chat-mode-btn"
          :class="{ active: chatMode === 'responder' }"
          id="chatModeResponder"
          @click="setChatMode('responder')"
        >
          Responder
        </button>
        <button
          type="button"
          class="chat-mode-btn"
          :class="{ active: chatMode === 'observacao' }"
          id="chatModeObs"
          @click="setChatMode('observacao')"
        >
          Observação
        </button>
      </div>

      <!-- Linha 2: Input + Ações -->
      <div v-if="showQuickMessages" class="composer-popover quick-message-popover">
        <div class="composer-popover-header">
          <strong>Mensagens rápidas</strong>
          <button type="button" class="btn-icon" title="Fechar" @click="showQuickMessages = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <input v-model="quickSearch" class="composer-search" type="text" placeholder="Buscar mensagem..." />
        <div class="quick-message-list">
          <button v-for="item in filteredQuickMessages" :key="item.id" type="button" class="quick-message-option" @click="selectQuickMessage(item)">
            <strong>{{ item.title }}</strong>
            <span>{{ item.content }}</span>
          </button>
          <div v-if="quickMessagesLoading" class="composer-empty">Carregando...</div>
          <div v-else-if="filteredQuickMessages.length === 0" class="composer-empty">Nenhuma mensagem encontrada.</div>
        </div>
      </div>

      <div v-if="showEmojiPicker" class="composer-popover emoji-popover">
        <button v-for="emoji in emojis" :key="emoji" type="button" class="emoji-option" @click="insertEmoji(emoji)">{{ emoji }}</button>
      </div>

      <input ref="fileInputRef" type="file" hidden @change="handleFileSelection" />

      <div class="chat-input-row">
        <div class="chat-input-actions">
          <button type="button" class="btn-icon" :class="{ active: showQuickMessages }" title="Mensagens rápidas" @click="toggleQuickMessages">
            <i class="fa-solid fa-bolt"></i>
          </button>
          <button type="button" class="btn-icon" title="Anexar arquivo" :disabled="sendingMedia || isRecording" @click="fileInputRef?.click()">
            <i class="fa-solid fa-paperclip"></i>
          </button>
          <button type="button" class="btn-icon" :class="{ active: showEmojiPicker }" title="Emojis" @click="toggleEmojiPicker">
            <i class="fa-regular fa-face-smile"></i>
          </button>
        </div>

        <div v-if="isRecording" class="recording-status">
          <span class="recording-dot"></span>
          <strong>Gravando {{ recordingTime }}</strong>
          <button type="button" class="btn-icon recording-cancel" title="Cancelar gravação" @click="stopRecording(false)"><i class="fa-solid fa-trash"></i></button>
          <button type="button" class="btn-icon recording-send" title="Parar e enviar" @click="stopRecording(true)"><i class="fa-solid fa-paper-plane"></i></button>
        </div>

        <textarea
          v-else
          ref="chatInputRef"
          v-model="inputMsg"
          id="chatMessageInput"
          rows="1"
          :placeholder="chatMode === 'observacao' ? 'Digite uma observação interna (visível apenas para atendentes)...' : 'Digite sua mensagem...'"
          @keydown.enter.exact.prevent="sendMessage"
        ></textarea>

        <button
          v-if="!isRecording && !inputMsg.trim()"
          type="button"
          class="btn-primary composer-send-btn"
          title="Gravar áudio"
          :disabled="sendingMedia"
          @click="startRecording"
        >
          <i class="fa-solid fa-microphone"></i>
        </button>
        <button
          v-else-if="!isRecording"
          type="button"
          class="btn-primary composer-send-btn"
          title="Enviar (Enter)"
          :disabled="sendingMedia"
          @click="sendMessage"
        >
          <i class="fa-solid fa-paper-plane" style="font-size:12px;"></i>
        </button>
      </div>
    </div>

    <!-- Modal Transferir Atendimento -->
    <ModalTransferir
      v-if="showTransferModal && ticket"
      :ticket="ticket"
      @close="showTransferModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useTicketStore } from '@/stores/tickets.store'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { ticketsApi } from '@/api/tickets.api'
import { quickMessagesApi } from '@/api/quick-messages.api'
import ChatBubble from './ChatBubble.vue'
import ModalTransferir from '@/components/modals/ModalTransferir.vue'

const props = defineProps({
  ticket: {
    type: Object,
    default: null
  },
  isDetailsOpen: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle-details'])

const ticketStore = useTicketStore()
const authStore = useAuthStore()
const ui = useUiStore()

const showTransferModal = ref(false)
const msgBoxRef = ref(null)
const chatInputRef = ref(null)
const fileInputRef = ref(null)
const showScrollBottom = ref(false)
const showQuickMessages = ref(false)
const showEmojiPicker = ref(false)
const quickMessages = ref([])
const quickMessagesLoading = ref(false)
const quickSearch = ref('')
const sendingMedia = ref(false)
const isRecording = ref(false)
const recordingSeconds = ref(0)
let mediaRecorder = null
let recorderStream = null
let recordedChunks = []
let discardRecording = false
let recordingTimer = null

const inputMsg = ref('')
const chatMode = ref('responder') // 'responder' | 'observacao'
const emojis = ['😀', '😊', '😉', '😍', '🥰', '😄', '😂', '🙂', '🙏', '👏', '👍', '👎', '✅', '⚠️', '📌', '📎', '📞', '💬', '🎉', '❤️', '💙', '⭐', '🔥', '🤝', '👋', '⏳', '🚚', '💰', '🔧', '📋']

const filteredQuickMessages = computed(() => {
  const term = quickSearch.value.trim().toLowerCase()
  if (!term) return quickMessages.value
  return quickMessages.value.filter(item => `${item.title} ${item.content} ${item.shortcut || ''}`.toLowerCase().includes(term))
})

const recordingTime = computed(() => {
  const minutes = Math.floor(recordingSeconds.value / 60)
  const seconds = recordingSeconds.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const canAssume = computed(() => {
  if (!props.ticket) return false
  return props.ticket.status === 'aguardando' && !props.ticket.assumed
})

const canClose = computed(() => {
  if (!props.ticket) return false
  return props.ticket.status === 'em_atendimento' || props.ticket.assumed
})

const canSend = computed(() => {
  if (!props.ticket) return false
  return props.ticket.status === 'em_atendimento' || props.ticket.assumed
})

const whatsappAccountLabel = computed(() => {
  const channel = props.ticket?.channel || ''
  const accountId = channel.startsWith('whatsapp:') ? channel.slice('whatsapp:'.length) : null
  const account = accountId ? ui.whatsappAccounts.find(item => item.id === accountId) : null
  return account?.name || 'WhatsApp'
})

function parseValidDate(val) {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

function formatMessageDateLabel(dateObj) {
  if (!dateObj) return 'Hoje'

  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const isToday = dateObj.getFullYear() === today.getFullYear() &&
                  dateObj.getMonth() === today.getMonth() &&
                  dateObj.getDate() === today.getDate()
  if (isToday) return 'Hoje'

  const isYesterday = dateObj.getFullYear() === yesterday.getFullYear() &&
                      dateObj.getMonth() === yesterday.getMonth() &&
                      dateObj.getDate() === yesterday.getDate()
  if (isYesterday) return 'Ontem'

  const day = String(dateObj.getDate()).padStart(2, '0')
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const year = dateObj.getFullYear()

  if (year === today.getFullYear()) {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    return `${day} de ${months[dateObj.getMonth()]}`
  }

  return `${day}/${month}/${year}`
}

const messageGroups = computed(() => {
  const msgs = props.ticket?.messages || []
  if (msgs.length === 0) return []

  const groups = []
  let currentGroup = null
  let runningDate = parseValidDate(props.ticket?.created_at) || new Date()

  for (const m of msgs) {
    const parsed = parseValidDate(m.created_at || m.createdAt)
    if (parsed) {
      runningDate = parsed
    }

    const dateLabel = formatMessageDateLabel(runningDate)
    if (!currentGroup || currentGroup.dateLabel !== dateLabel) {
      currentGroup = {
        dateLabel,
        messages: []
      }
      groups.push(currentGroup)
    }
    currentGroup.messages.push(m)
  }

  return groups
})

// Foco automático imediato no campo de texto
function focusInput() {
  nextTick(() => {
    setTimeout(() => {
      if (chatInputRef.value) {
        chatInputRef.value.focus()
      }
    }, 40)
  })
}

function onChatScroll() {
  if (!msgBoxRef.value) return
  const { scrollTop, scrollHeight, clientHeight } = msgBoxRef.value
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight
  showScrollBottom.value = distanceFromBottom > 120
}

function scrollToBottomSmooth() {
  if (msgBoxRef.value) {
    msgBoxRef.value.scrollTo({
      top: msgBoxRef.value.scrollHeight,
      behavior: 'smooth'
    })
    focusInput()
  }
}

onMounted(() => {
  focusInput()
  if (msgBoxRef.value) {
    msgBoxRef.value.addEventListener('scroll', onChatScroll, { passive: true })
  }
})

onUnmounted(() => {
  if (msgBoxRef.value) {
    msgBoxRef.value.removeEventListener('scroll', onChatScroll)
  }
  if (recordingTimer) clearInterval(recordingTimer)
  recorderStream?.getTracks().forEach(track => track.stop())
})

watch(() => props.ticket?.id, () => {
  scrollToBottom()
  focusInput()
})

watch(canSend, (val) => {
  if (val) focusInput()
})

function setChatMode(mode) {
  chatMode.value = mode
  focusInput()
}

function scrollToBottom() {
  nextTick(() => {
    if (msgBoxRef.value) {
      msgBoxRef.value.scrollTop = msgBoxRef.value.scrollHeight
    }
  })
}

watch(() => props.ticket?.messages?.length, () => {
  scrollToBottom()
})

async function handleAssume() {
  if (!props.ticket) return
  const res = await ticketStore.assume(props.ticket.id)
  if (res.success) {
    ui.showToast('✅ Atendimento assumido com sucesso!')
    focusInput()
  } else {
    ui.showToast(`⚠️ ${res.error}`, 'error')
  }
}

function insertEmoji(emoji) {
  inputMsg.value += emoji
  showEmojiPicker.value = false
  focusInput()
}

function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value
  showQuickMessages.value = false
}

async function toggleQuickMessages() {
  showQuickMessages.value = !showQuickMessages.value
  showEmojiPicker.value = false
  if (!showQuickMessages.value || quickMessages.value.length > 0) return
  quickMessagesLoading.value = true
  try {
    const { data } = await quickMessagesApi.list()
    quickMessages.value = data.messages || []
  } catch (error) {
    ui.showToast('Não foi possível carregar as mensagens rápidas.', 'error')
  } finally {
    quickMessagesLoading.value = false
  }
}

function selectQuickMessage(item) {
  inputMsg.value = inputMsg.value.trim() ? `${inputMsg.value.trim()}\n${item.content}` : item.content
  showQuickMessages.value = false
  focusInput()
}

function detectMediaType(file) {
  if (file.type?.startsWith('image/')) return 'image'
  if (file.type?.startsWith('audio/')) return 'audio'
  if (file.type?.startsWith('video/')) return 'video'
  return 'document'
}

async function sendMediaFile(file, mediaType = detectMediaType(file), caption = '') {
  if (!props.ticket || !file) return
  if (file.size > 25 * 1024 * 1024) {
    ui.showToast('O arquivo ultrapassa o limite de 25 MB.', 'error')
    return
  }
  sendingMedia.value = true
  try {
    const { data } = await ticketsApi.sendMedia(props.ticket.id, file, {
      fileName: file.name,
      mimeType: file.type,
      mediaType,
      caption
    })
    const savedMessage = data?.result?.message
    if (savedMessage) ticketStore.appendMessage(props.ticket.id, savedMessage)
    if (caption && inputMsg.value.trim() === caption) inputMsg.value = ''
    ui.showToast(mediaType === 'audio' ? 'Áudio enviado com sucesso!' : 'Arquivo enviado com sucesso!')
    scrollToBottom()
  } catch (error) {
    ui.showToast(error.response?.data?.error || 'Não foi possível enviar o arquivo.', 'error')
  } finally {
    sendingMedia.value = false
    focusInput()
  }
}

async function handleFileSelection(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  await sendMediaFile(file, detectMediaType(file), inputMsg.value.trim())
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    ui.showToast('A gravação de áudio não é suportada neste navegador.', 'error')
    return
  }
  try {
    recorderStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const preferredTypes = ['audio/ogg;codecs=opus', 'audio/mp4;codecs=opus', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
    const mimeType = preferredTypes.find(type => MediaRecorder.isTypeSupported(type)) || ''
    mediaRecorder = new MediaRecorder(recorderStream, mimeType ? { mimeType } : undefined)
    recordedChunks = []
    discardRecording = false
    recordingSeconds.value = 0
    mediaRecorder.ondataavailable = event => { if (event.data.size > 0) recordedChunks.push(event.data) }
    mediaRecorder.onstop = async () => {
      const finalType = mediaRecorder?.mimeType || mimeType || 'audio/webm'
      recorderStream?.getTracks().forEach(track => track.stop())
      recorderStream = null
      if (discardRecording || recordedChunks.length === 0) return
      const extension = finalType.includes('ogg') ? 'ogg' : finalType.includes('mp4') ? 'm4a' : 'webm'
      const audioFile = new File(recordedChunks, `audio_${Date.now()}.${extension}`, { type: finalType })
      await sendMediaFile(audioFile, 'audio')
    }
    mediaRecorder.start(250)
    isRecording.value = true
    showEmojiPicker.value = false
    showQuickMessages.value = false
    recordingTimer = setInterval(() => { recordingSeconds.value += 1 }, 1000)
  } catch (error) {
    recorderStream?.getTracks().forEach(track => track.stop())
    recorderStream = null
    ui.showToast('Permita o acesso ao microfone para gravar um áudio.', 'error')
  }
}

function stopRecording(shouldSend) {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return
  discardRecording = !shouldSend
  clearInterval(recordingTimer)
  recordingTimer = null
  isRecording.value = false
  mediaRecorder.stop()
}

async function sendMessage() {
  const text = inputMsg.value.trim()
  if (!text || !props.ticket) return

  const isObs = chatMode.value === 'observacao'
  const agentName = authStore.user?.name || 'Atendente'
  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const formattedText = isObs
    ? null
    : `*${agentName}:*\n\n${text}`

  const msg = isObs
    ? { type: 'divider', text: `📌 NOTA INTERNA (${agentName}): ${text}`, time: timeStr }
    : { sender: 'agent', text: formattedText, time: timeStr, read: true }

  ticketStore.appendMessage(props.ticket.id, msg)
  inputMsg.value = ''
  scrollToBottom()
  focusInput()

  if (!isObs) {
    try {
      await ticketsApi.sendMessage(props.ticket.id, text)
    } catch (e) {
      console.warn('Erro ao enviar mensagem:', e)
    }
  }
}
</script>

<style scoped>
.chat-footer {
  position: relative;
}

.composer-popover {
  position: absolute;
  left: 20px;
  bottom: 58px;
  z-index: 80;
  width: min(360px, calc(100% - 40px));
  padding: 10px;
  border: 1px solid #dbe3ee;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 14px 35px rgba(15, 23, 42, 0.18);
}

.composer-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #1e293b;
  font-size: 12px;
}

.composer-search {
  width: 100%;
  height: 34px;
  margin-bottom: 8px;
  padding: 0 10px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  font-size: 12px;
  outline: none;
}

.quick-message-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 250px;
  overflow-y: auto;
}

.quick-message-option {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 10px;
  border: 0;
  border-radius: 8px;
  background: #f8fafc;
  color: #334155;
  text-align: left;
  cursor: pointer;
}

.quick-message-option:hover { background: #eff6ff; }
.quick-message-option strong { font-size: 11.5px; color: #1d4ed8; }
.quick-message-option span { font-size: 11px; line-height: 1.4; }
.composer-empty { padding: 18px; text-align: center; color: #94a3b8; font-size: 11.5px; }

.emoji-popover {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  width: 252px;
}

.emoji-option {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
}

.emoji-option:hover { background: #eff6ff; transform: scale(1.08); }
.btn-icon.active { color: #2563eb; background: #eff6ff; border-color: #bfdbfe; }

.composer-send-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.recording-status {
  min-width: 0;
  flex: 1;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 6px 0 12px;
  color: #b91c1c;
  font-size: 12px;
}

.recording-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #ef4444;
  animation: recording-pulse 1.2s infinite;
}

.recording-status strong { flex: 1; }
.recording-cancel { color: #ef4444; }
.recording-send { color: #ffffff; background: #2563eb; border-color: #2563eb; }

@keyframes recording-pulse {
  50% { opacity: 0.35; transform: scale(0.8); }
}

.chat-date-sticky-wrapper {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: center;
  pointer-events: none;
  padding: 6px 0;
}

.chat-date-pill {
  pointer-events: auto;
  padding: 4px 14px;
  background: rgba(255, 255, 255, 0.94);
  color: #54656f;
  border-radius: 8px;
  font-size: 11.5px;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(11, 20, 26, 0.08), 0 1px 2px rgba(11, 20, 26, 0.05);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(226, 232, 240, 0.85);
  transition: all 0.2s ease;
}

/* Botão Flutuante Rolar para o Final */
.scroll-bottom-btn {
  position: absolute;
  right: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #ffffff;
  color: #54656f;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.14), 0 2px 4px rgba(15, 23, 42, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  z-index: 30;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.scroll-bottom-btn:hover {
  background: #f8fafc;
  color: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.2), 0 2px 6px rgba(15, 23, 42, 0.08);
}

.scroll-bottom-btn:active {
  transform: translateY(0);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(12px);
}
</style>
