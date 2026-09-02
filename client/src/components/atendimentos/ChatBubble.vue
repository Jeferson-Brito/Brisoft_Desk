<template>
  <!-- Mensagens de Sistema / Notificações / Dividers -->
  <div
    v-if="isSystemMessage"
    class="chat-divider-row"
  >
    <div class="chat-divider-pill" style="white-space:pre-wrap;">{{ formattedSystemText }}</div>
  </div>

  <!-- Mensagens do Cliente (Incoming) -->
  <div v-else-if="msg.sender === 'client'" class="chat-bubble-row">
    <div
      class="initial-avatar"
      style="width:28px;height:28px;font-size:10px;flex-shrink:0;"
      :style="{ backgroundColor: avatarColor || '#2563eb' }"
    >
      {{ initials || 'CL' }}
    </div>
    <div class="message-bubble-shell incoming-shell">
      <button v-if="msg.id" ref="actionsTriggerRef" type="button" class="message-actions-trigger" aria-label="Opções da mensagem" @click.stop="toggleActions">
        <i class="fa-solid fa-chevron-down"></i>
      </button>
    <div class="chat-bubble incoming">
      <div v-if="isGroup && msg.sender_name" class="group-message-sender">{{ msg.sender_name }}</div>
      <div v-if="replyPreview" class="message-reply-preview">
        <strong>{{ replySender || 'Mensagem respondida' }}</strong>
        <span>{{ replyPreview }}</span>
      </div>
      <div v-if="isReaction" class="reaction-card">
        <div class="reaction-quote">{{ reactionData.preview }}</div>
        <div class="reaction-result">
          <span class="reaction-emoji">{{ reactionData.emoji }}</span>
          <span>{{ reactionData.removed ? 'Reação removida' : 'Reagiu a esta mensagem' }}</span>
        </div>
      </div>

      <div v-if="hasMedia && mediaLoading" class="media-status-card">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>Carregando mídia...</span>
      </div>

      <div v-else-if="hasMedia && mediaUnavailable" class="media-status-card media-status-error">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>Não foi possível carregar esta mídia.</span>
        <button type="button" class="media-retry-button" @click="retryMedia">Tentar novamente</button>
      </div>

      <!-- Imagem -->
      <div v-else-if="isImage" style="margin-bottom:6px;">
        <img
          :src="resolvedMediaSrc"
          alt="Imagem recebida"
          style="max-width:260px;max-height:260px;border-radius:8px;cursor:pointer;object-fit:cover;display:block;"
          @click="showImageZoom = true"
          @error="mediaLoadError = true"
        />
      </div>

      <!-- Áudio / Mensagem de Voz -->
      <div v-else-if="isAudio" style="margin-bottom:6px;min-width:220px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:11px;color:#64748b;">
          <i class="fa-solid fa-microphone" style="color:#2563eb;"></i>
          <span>Mensagem de Voz</span>
        </div>
        <audio controls preload="metadata" :src="resolvedMediaSrc" style="width:100%;height:36px;border-radius:20px;" @error="mediaLoadError = true"></audio>
      </div>

      <!-- Vídeo -->
      <div v-else-if="isVideo" style="margin-bottom:6px;">
        <video controls preload="metadata" :src="resolvedMediaSrc" style="max-width:280px;max-height:260px;border-radius:8px;display:block;" @error="mediaLoadError = true"></video>
      </div>

      <!-- Documento -->
      <div v-else-if="isDocument" style="margin-bottom:6px;">
        <a
          :href="resolvedMediaSrc"
          target="_blank"
          download
          style="display:inline-flex;align-items:center;gap:8px;padding:8px 12px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;color:#2563eb;text-decoration:none;font-weight:600;font-size:12px;"
        >
          <i class="fa-solid fa-file-arrow-down" style="font-size:16px;"></i>
          <span>{{ documentName }}</span>
        </a>
      </div>

      <!-- Texto / Legenda -->
      <div v-if="displayText" style="white-space:pre-wrap;">{{ displayText }}</div>
      <div class="chat-bubble-time">{{ displayTime }}</div>
    </div>
    </div>
  </div>

  <!-- Mensagens do Atendente (Outgoing) -->
  <div v-else class="chat-bubble-row outgoing">
    <div class="message-bubble-shell outgoing-shell">
      <button v-if="!isDeleted" ref="actionsTriggerRef" type="button" class="message-actions-trigger" aria-label="Opções da mensagem" @click.stop="toggleActions">
        <i class="fa-solid fa-chevron-down"></i>
      </button>
    <div class="chat-bubble outgoing">
      <div v-if="agentName" style="font-weight:700;font-size:11px;color:#1d4ed8;margin-bottom:3px;">
        {{ agentName }}
        <span v-if="isDirectWhatsapp" class="direct-whatsapp-label">
          <i class="fa-brands fa-whatsapp"></i> enviado pelo celular
        </span>
      </div>

      <div v-if="replyPreview" class="message-reply-preview">
        <strong>{{ replySender || 'Mensagem respondida' }}</strong>
        <span>{{ replyPreview }}</span>
      </div>

      <div v-if="isDeleted" class="deleted-message">
        <i class="fa-solid fa-ban"></i> Esta mensagem foi excluída
      </div>

      <div v-else-if="isReaction" class="reaction-card">
        <div class="reaction-quote">{{ reactionData.preview }}</div>
        <div class="reaction-result">
          <span class="reaction-emoji">{{ reactionData.emoji }}</span>
          <span>{{ reactionData.removed ? 'Reação removida' : 'Reagiu a esta mensagem' }}</span>
        </div>
      </div>

      <div v-if="hasMedia && mediaLoading" class="media-status-card">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>Carregando mídia...</span>
      </div>

      <div v-else-if="hasMedia && mediaUnavailable" class="media-status-card media-status-error">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>Não foi possível carregar esta mídia.</span>
        <button type="button" class="media-retry-button" @click="retryMedia">Tentar novamente</button>
      </div>

      <!-- Imagem enviada pelo atendente -->
      <div v-else-if="isImage" style="margin-bottom:6px;">
        <img
          :src="resolvedMediaSrc"
          alt="Imagem enviada"
          style="max-width:260px;max-height:260px;border-radius:8px;cursor:pointer;object-fit:cover;display:block;"
          @click="showImageZoom = true"
          @error="mediaLoadError = true"
        />
      </div>

      <!-- Áudio enviado -->
      <div v-else-if="isAudio" style="margin-bottom:6px;min-width:220px;">
        <audio controls preload="metadata" :src="resolvedMediaSrc" style="width:100%;height:36px;border-radius:20px;" @error="mediaLoadError = true"></audio>
      </div>

      <!-- Vídeo enviado -->
      <div v-else-if="isVideo" style="margin-bottom:6px;">
        <video controls preload="metadata" :src="resolvedMediaSrc" style="max-width:280px;max-height:260px;border-radius:8px;display:block;" @error="mediaLoadError = true"></video>
      </div>

      <!-- Documento enviado -->
      <div v-else-if="isDocument" style="margin-bottom:6px;">
        <a
          :href="resolvedMediaSrc"
          target="_blank"
          download
          style="display:inline-flex;align-items:center;gap:8px;padding:8px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;color:#1d4ed8;text-decoration:none;font-weight:600;font-size:12px;"
        >
          <i class="fa-solid fa-file-arrow-down" style="font-size:16px;"></i>
          <span>{{ documentName }}</span>
        </a>
      </div>

      <!-- Texto / Legenda -->
      <div v-if="displayText" style="white-space:pre-wrap;">{{ displayText }}</div>
      <div class="chat-bubble-time">
        {{ displayTime }}
        <span v-if="msg.edited_at && !isDeleted" class="edited-label">editada</span>
        <i class="fa-solid fa-check-double" style="margin-left:3px;"></i>
      </div>
    </div>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="showActions" class="message-actions-menu" :style="actionsMenuStyle" @click.stop>
      <button type="button" @click="chooseReply"><i class="fa-solid fa-reply"></i> Responder</button>
      <button v-if="canCopyMessage" type="button" @click="copyMessage"><i class="fa-regular fa-copy"></i> Copiar</button>
      <button v-if="canEditMessage" type="button" @click="chooseEdit"><i class="fa-solid fa-pen"></i> Editar</button>
      <button v-if="canDeleteMessage" type="button" class="danger" @click="chooseDelete"><i class="fa-regular fa-trash-can"></i> Excluir para todos</button>
    </div>
  </Teleport>

  <!-- Zoom de Imagem (Modal Lightbox) -->
  <Teleport to="body">
    <div
      v-if="showImageZoom"
      class="modal-overlay active"
      style="z-index:99999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;cursor:pointer;"
      @click="showImageZoom = false"
    >
      <div style="position:relative;max-width:90vw;max-height:90vh;">
        <img
          :src="resolvedMediaSrc"
          alt="Imagem ampliada"
          style="max-width:90vw;max-height:90vh;border-radius:8px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);object-fit:contain;"
        />
        <button
          type="button"
          class="btn-icon"
          style="position:absolute;top:-12px;right:-12px;background:#ffffff;border-radius:50%;width:32px;height:32px;box-shadow:0 4px 6px rgba(0,0,0,0.3);"
          @click.stop="showImageZoom = false"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { cleanMediaDisplayText, getDocumentDisplayName, getMediaSource } from '@/utils/media-message'
import { loadProtectedMedia } from '@/utils/protected-media-cache'

const companyTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
})

const props = defineProps({
  msg: {
    type: Object,
    required: true
  },
  initials: {
    type: String,
    default: 'CL'
  },
  avatarColor: {
    type: String,
    default: '#2563eb'
  },
  currentUserId: {
    type: [String, Number],
    default: null
  },
  isGroup: {
    type: Boolean,
    default: false
  },
  allowDeviceMessageMutations: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['reply', 'edit', 'delete', 'copied'])

const showImageZoom = ref(false)
const showActions = ref(false)
const actionsTriggerRef = ref(null)
const actionsMenuStyle = ref({})
const mediaLoading = ref(false)
const mediaLoadError = ref(false)

const displayTime = computed(() => {
  const timestamp = props.msg?.created_at || props.msg?.createdAt
  if (timestamp) {
    const date = new Date(timestamp)
    if (!Number.isNaN(date.getTime())) return companyTimeFormatter.format(date)
  }

  return props.msg?.time || ''
})

const isBotStateMessage = computed(() => {
  const t = props.msg?.text || ''
  return typeof t === 'string' && t.startsWith('[Chatbot][State]')
})

const isSystemMessage = computed(() => {
  if (isBotStateMessage.value) return false
  const t = props.msg?.text || ''
  return (
    props.msg?.type === 'divider' ||
    props.msg?.type === 'system' ||
    props.msg?.sender === 'system' ||
    t.startsWith('[Chatbot]') ||
    t.startsWith('🤖') ||
    t.startsWith('Atendimento assumido') ||
    t.startsWith('✅') ||
    t.startsWith('⭐') ||
    t.startsWith('📜') ||
    t.startsWith('⚡') ||
    t.startsWith('🔄') ||
    t.startsWith('📌 NOTA INTERNA') ||
    t.includes('Atendimento finalizado') ||
    t.includes('Atendimento encerrado') ||
    t.includes('Atendimento assumido') ||
    t.includes('Histórico anterior') ||
    t.includes('Atendimento Atual') ||
    t.includes('Avaliação do cliente')
  )
})

const formattedSystemText = computed(() => {
  return (props.msg?.text || '').replace(/\*/g, '')
})

// Identifica URL e tipo de mídia
const mediaSrc = computed(() => {
  return getMediaSource(props.msg)
})

const resolvedMediaSrc = ref(null)

async function resolveMedia(source) {
  resolvedMediaSrc.value = null
  mediaLoading.value = Boolean(source)
  mediaLoadError.value = false
  if (!source) return

  if (source.startsWith('/api/media/') || source.startsWith('/media/')) {
    try {
      resolvedMediaSrc.value = await loadProtectedMedia(source)
    } catch (error) {
      mediaLoadError.value = true
      console.error('Não foi possível carregar o anexo protegido.', error)
    } finally {
      mediaLoading.value = false
    }
    return
  }

  try {
    const url = new URL(source, window.location.origin)
    if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'blob:') {
      resolvedMediaSrc.value = url.href
      mediaLoading.value = false
    }
  } catch {
    mediaLoadError.value = true
    mediaLoading.value = false
    resolvedMediaSrc.value = null
  }
}

watch(mediaSrc, resolveMedia, { immediate: true })

function retryMedia() {
  if (mediaSrc.value) resolveMedia(mediaSrc.value)
}

const isImage = computed(() => {
  if (props.msg?.deleted_at) return false
  if (props.msg?.type === 'image' || props.msg?.type === 'sticker') return true
  if (mediaSrc.value && (mediaSrc.value.endsWith('.jpg') || mediaSrc.value.endsWith('.png') || mediaSrc.value.endsWith('.webp') || mediaSrc.value.endsWith('.jpeg'))) return true
  return false
})

const isAudio = computed(() => {
  if (props.msg?.deleted_at) return false
  if (props.msg?.type === 'audio') return true
  if (mediaSrc.value && (mediaSrc.value.endsWith('.ogg') || mediaSrc.value.endsWith('.mp3') || mediaSrc.value.endsWith('.m4a') || mediaSrc.value.endsWith('.wav'))) return true
  return false
})

const isVideo = computed(() => {
  if (props.msg?.deleted_at) return false
  if (props.msg?.type === 'video') return true
  if (mediaSrc.value && (mediaSrc.value.endsWith('.mp4') || mediaSrc.value.endsWith('.webm') || mediaSrc.value.endsWith('.mov'))) return true
  return false
})

const isDocument = computed(() => {
  if (props.msg?.deleted_at) return false
  if (props.msg?.type === 'document') return true
  if (mediaSrc.value && !isImage.value && !isAudio.value && !isVideo.value) return true
  return false
})

const hasMedia = computed(() => !isDeleted.value && (isImage.value || isAudio.value || isVideo.value || isDocument.value))
const mediaUnavailable = computed(() => mediaLoadError.value || !mediaSrc.value || !resolvedMediaSrc.value)

const reactionData = computed(() => {
  if (props.msg?.type !== 'reaction') return null
  try {
    const parsed = JSON.parse(props.msg?.text || '{}')
    return {
      emoji: parsed.emoji || '👍',
      preview: parsed.preview || 'Mensagem',
      removed: parsed.removed === true
    }
  } catch {
    return { emoji: '👍', preview: props.msg?.text || 'Mensagem', removed: false }
  }
})
const isReaction = computed(() => Boolean(reactionData.value))
const isDeleted = computed(() => Boolean(props.msg?.deleted_at))
const replyPreview = computed(() => props.msg?.reply_preview || '')
const replySender = computed(() => props.msg?.reply_sender || '')

const documentName = computed(() => {
  return getDocumentDisplayName(props.msg, mediaSrc.value)
})

// Extrai *Nome*:\n\nTexto ou *Nome:* Texto para mensagens do atendente
const agentMatch = computed(() => {
  const text = props.msg?.text || ''
  return text.match(/^\*(.+?):?\*:?\s*([\s\S]*)$/)
})

const agentName = computed(() => agentMatch.value ? agentMatch.value[1] : null)
const isDirectWhatsapp = computed(() => props.msg?.sender_type === 'whatsapp_device'
  || String(props.msg?.sender_name || '').startsWith('WhatsApp (')
  || String(agentName.value || '').startsWith('WhatsApp ('))

const canManageOutgoingMessage = computed(() => props.msg?.sender === 'agent'
  && Boolean(props.msg?.id)
  && (isDirectWhatsapp.value
    ? props.allowDeviceMessageMutations
    : (Boolean(props.currentUserId) && String(props.msg?.user_id || '') === String(props.currentUserId)))
  && !isDeleted.value)

const canEditMessage = computed(() => canManageOutgoingMessage.value
  && (!props.msg?.type || props.msg.type === 'text')
  && Boolean(displayText.value))
const canDeleteMessage = computed(() => canManageOutgoingMessage.value)

const displayText = computed(() => {
  if (isDeleted.value) return ''
  if (isReaction.value) return ''
  let raw = agentMatch.value ? agentMatch.value[2] : props.msg?.text || ''
  return cleanMediaDisplayText(raw, Boolean(mediaSrc.value))
})
const canCopyMessage = computed(() => Boolean(displayText.value))

function toggleActions() {
  showActions.value = !showActions.value
  if (showActions.value) positionActionsMenu()
}

function positionActionsMenu() {
  const rect = actionsTriggerRef.value?.getBoundingClientRect()
  if (!rect) return
  const width = 178
  const estimatedHeight = canDeleteMessage.value ? 154 : 82
  const left = Math.max(8, Math.min(window.innerWidth - width - 8, props.msg?.sender === 'agent' ? rect.right - width : rect.left))
  const belowTop = rect.bottom + 5
  const top = belowTop + estimatedHeight <= window.innerHeight - 8
    ? belowTop
    : Math.max(8, rect.top - estimatedHeight - 5)
  actionsMenuStyle.value = { position: 'fixed', left: `${left}px`, top: `${top}px`, width: `${width}px` }
}

function closeActions() {
  showActions.value = false
}

function chooseReply() {
  closeActions()
  emit('reply', props.msg)
}

function chooseEdit() {
  closeActions()
  emit('edit', props.msg)
}

function chooseDelete() {
  closeActions()
  emit('delete', props.msg)
}

async function copyMessage() {
  const text = displayText.value || replyPreview.value
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    emit('copied')
  } catch {
    emit('copied', false)
  }
  closeActions()
}

onMounted(() => {
  document.addEventListener('click', closeActions)
  window.addEventListener('resize', closeActions)
  window.addEventListener('scroll', closeActions, true)
})
onUnmounted(() => {
  document.removeEventListener('click', closeActions)
  window.removeEventListener('resize', closeActions)
  window.removeEventListener('scroll', closeActions, true)
})
</script>

<style scoped>
.direct-whatsapp-label {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: 5px;
  padding: 1.5px 5px;
  border-radius: 4px;
  background: #dcfce7;
  color: #15803d;
  font-size: 9px;
  font-weight: 700;
}

.message-bubble-shell {
  position: relative;
  max-width: min(72%, 720px);
}

.message-bubble-shell > .chat-bubble {
  max-width: 100%;
}

.message-actions-trigger {
  position: absolute;
  z-index: 5;
  top: 5px;
  right: 5px;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, .9);
  color: #64748b;
  box-shadow: 0 1px 4px rgba(15, 23, 42, .14);
  opacity: 0;
  cursor: pointer;
  transition: opacity .15s ease, background .15s ease;
}

.message-bubble-shell:hover .message-actions-trigger,
.message-actions-trigger:focus-visible {
  opacity: 1;
}

.message-actions-menu {
  z-index: 100000;
  min-width: 154px;
  padding: 5px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, .16);
}

.message-actions-menu button {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 8px 9px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #334155;
  font-size: 11.5px;
  text-align: left;
  cursor: pointer;
}

.message-actions-menu button:hover { background: #f1f5f9; }
.message-actions-menu button.danger { color: #dc2626; }

.message-reply-preview {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 7px;
  padding: 6px 8px;
  border-left: 3px solid #2563eb;
  border-radius: 5px;
  background: rgba(255, 255, 255, .64);
  color: #64748b;
  font-size: 10.5px;
  line-height: 1.35;
}

.message-reply-preview strong { color: #1d4ed8; }
.message-reply-preview span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.deleted-message { display: flex; align-items: center; gap: 6px; color: #64748b; font-style: italic; }
.edited-label { margin-left: 5px; color: #64748b; font-size: 9px; }
.group-message-sender { margin-bottom: 4px; color: #2563eb; font-size: 10.5px; font-weight: 700; }

@media (hover: none) {
  .message-actions-trigger { opacity: .72; }
}

.media-status-card {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 220px;
  padding: 10px 12px;
  margin-bottom: 6px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #f8fbff;
  color: #475569;
  font-size: 11.5px;
}

.media-status-error {
  border-color: #fecaca;
  background: #fff7f7;
  color: #b91c1c;
}

.media-retry-button {
  margin-left: auto;
  padding: 4px 8px;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  background: #fff;
  color: #b91c1c;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.media-retry-button:hover {
  background: #fee2e2;
}

.reaction-card {
  min-width: 180px;
  max-width: 280px;
}

.reaction-quote {
  padding: 7px 9px;
  border-left: 3px solid #60a5fa;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.62);
  color: #475569;
  font-size: 11px;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reaction-result {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-top: 7px;
  color: #334155;
  font-size: 11px;
  font-weight: 600;
}

.reaction-emoji {
  font-size: 22px;
  line-height: 1;
}

.chat-divider-row {
  display: flex;
  justify-content: center;
  margin: 6px 0;
  width: 100%;
}

.chat-divider-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  font-size: 11px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 6px;
  max-width: 90%;
  line-height: 1.4;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}
</style>
