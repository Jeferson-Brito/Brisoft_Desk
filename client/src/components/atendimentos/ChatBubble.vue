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
    <div class="chat-bubble incoming">
      <div v-if="hasMedia && mediaLoading" class="media-status-card">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>Carregando mídia...</span>
      </div>

      <div v-else-if="hasMedia && mediaUnavailable" class="media-status-card media-status-error">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>Não foi possível carregar esta mídia.</span>
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
      <div class="chat-bubble-time">{{ msg.time || '' }}</div>
    </div>
  </div>

  <!-- Mensagens do Atendente (Outgoing) -->
  <div v-else class="chat-bubble-row outgoing">
    <div class="chat-bubble outgoing">
      <div v-if="agentName" style="font-weight:700;font-size:11px;color:#1d4ed8;margin-bottom:3px;">
        {{ agentName }}
      </div>

      <div v-if="hasMedia && mediaLoading" class="media-status-card">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>Carregando mídia...</span>
      </div>

      <div v-else-if="hasMedia && mediaUnavailable" class="media-status-card media-status-error">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>Não foi possível carregar esta mídia.</span>
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
        {{ msg.time || '' }}
        <i class="fa-solid fa-check-double" style="margin-left:3px;"></i>
      </div>
    </div>
  </div>

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
import { ref, computed, watch } from 'vue'
import { cleanMediaDisplayText, getDocumentDisplayName, getMediaSource } from '@/utils/media-message'
import { loadProtectedMedia } from '@/utils/protected-media-cache'

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
  }
})

const showImageZoom = ref(false)
const mediaLoading = ref(false)
const mediaLoadError = ref(false)

const isSystemMessage = computed(() => {
  const t = props.msg?.text || ''
  return (
    props.msg?.type === 'divider' ||
    props.msg?.sender === 'system' ||
    t.startsWith('[Chatbot]') ||
    t.startsWith('Atendimento assumido') ||
    t.startsWith('✅ Atendimento encerrado') ||
    t.startsWith('🔄 Atendimento transferido') ||
    t.startsWith('📌 NOTA INTERNA')
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

watch(mediaSrc, async (source) => {
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
}, { immediate: true })

const isImage = computed(() => {
  if (props.msg?.type === 'image' || props.msg?.type === 'sticker') return true
  if (mediaSrc.value && (mediaSrc.value.endsWith('.jpg') || mediaSrc.value.endsWith('.png') || mediaSrc.value.endsWith('.webp') || mediaSrc.value.endsWith('.jpeg'))) return true
  return false
})

const isAudio = computed(() => {
  if (props.msg?.type === 'audio') return true
  if (mediaSrc.value && (mediaSrc.value.endsWith('.ogg') || mediaSrc.value.endsWith('.mp3') || mediaSrc.value.endsWith('.m4a') || mediaSrc.value.endsWith('.wav'))) return true
  return false
})

const isVideo = computed(() => {
  if (props.msg?.type === 'video') return true
  if (mediaSrc.value && (mediaSrc.value.endsWith('.mp4') || mediaSrc.value.endsWith('.webm') || mediaSrc.value.endsWith('.mov'))) return true
  return false
})

const isDocument = computed(() => {
  if (props.msg?.type === 'document') return true
  if (mediaSrc.value && !isImage.value && !isAudio.value && !isVideo.value) return true
  return false
})

const hasMedia = computed(() => isImage.value || isAudio.value || isVideo.value || isDocument.value)
const mediaUnavailable = computed(() => mediaLoadError.value || !mediaSrc.value || !resolvedMediaSrc.value)

const documentName = computed(() => {
  return getDocumentDisplayName(props.msg, mediaSrc.value)
})

// Extrai *Nome*:\n\nTexto ou *Nome:* Texto para mensagens do atendente
const agentMatch = computed(() => {
  const text = props.msg?.text || ''
  return text.match(/^\*(.+?):?\*:?\s*([\s\S]*)$/)
})

const agentName = computed(() => agentMatch.value ? agentMatch.value[1] : null)

const displayText = computed(() => {
  let raw = agentMatch.value ? agentMatch.value[2] : props.msg?.text || ''
  return cleanMediaDisplayText(raw, Boolean(mediaSrc.value))
})
</script>

<style scoped>
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
</style>
