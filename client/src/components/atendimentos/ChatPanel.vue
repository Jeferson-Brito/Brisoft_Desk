<template>
  <div class="chat-column">
    <!-- Header do Chat estilo Image 2 -->
    <div v-if="ticket" class="chat-header">
      <!-- Botão Voltar (mobile) -->
      <button
        class="chat-back-btn"
        style="display:none;"
        title="Voltar para fila"
        @click="$emit('go-back')"
      >
        <i class="fa-solid fa-chevron-left"></i>
      </button>

      <!-- Título: Nome do Cliente (clique para abrir detalhes) -->
      <div
        class="chat-header-title-box"
        :style="{ cursor: ticket.is_group ? 'default' : 'pointer' }"
        :title="ticket.is_group ? 'Grupo do WhatsApp' : 'Clique para ver os detalhes do contato'"
        @click="!ticket.is_group && $emit('toggle-details')"
      >
        <div class="chat-header-avatar" :style="{ background: ticket.avatarColor || '#2563eb' }">
          <img v-if="ticket.avatar_url && !headerAvatarFailed" :src="ticket.avatar_url" alt="Foto do contato" referrerpolicy="no-referrer" @error="headerAvatarFailed = true" />
          <span v-else>{{ ticket.initials || 'CL' }}</span>
        </div>
        <div class="chat-contact-copy">
          <div class="chat-contact-name-line">
            <h2 class="chat-contact-title">{{ headerPerson.name || 'Cliente' }}</h2>
            <i v-if="!ticket.is_group" class="fa-solid chat-contact-chevron" :class="isDetailsOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
            <span v-if="ticket.is_group" class="group-contact-badge"><i class="fa-solid fa-users"></i> Grupo</span>
            <span v-if="ticket?.is_employee" class="employee-contact-badge" title="Funcionário da empresa"><i class="fa-solid fa-id-badge"></i> Funcionário</span>
          </div>
          <div v-if="headerPerson.role || ticket?.department" class="chat-contact-subtitle">
            <span v-if="headerPerson.role">{{ headerPerson.role }}</span>
            <i v-if="headerPerson.role && ticket?.department"></i>
            <span v-if="ticket?.department">{{ ticket.department }}</span>
          </div>
        </div>
      </div>

      <!-- Ações à Direita -->
      <div class="chat-header-tools">
        <div v-if="!ticket.is_group" class="contact-call-actions" aria-label="Recursos de chamada em desenvolvimento">
          <span class="upcoming-action" title="Ligação — em desenvolvimento">
            <button type="button" class="header-call-btn" disabled aria-label="Ligação em desenvolvimento">
              <i class="fa-solid fa-phone"></i>
            </button>
          </span>
          <span class="upcoming-action" title="Chamada de vídeo — em desenvolvimento">
            <button type="button" class="header-call-btn" disabled aria-label="Chamada de vídeo em desenvolvimento">
              <i class="fa-solid fa-video"></i>
            </button>
          </span>
        </div>

        <!-- Conexão WhatsApp / Atendente Responsável -->
        <div
          v-if="handlingChannel?.label"
          class="handling-channel-indicator"
          :class="handlingChannel.kind"
          tabindex="0"
          :aria-label="handlingChannel.label"
        >
          <i :class="handlingChannel.icon"></i>
          <div class="handling-channel-popover" role="tooltip">
            <strong><i :class="handlingChannel.icon"></i>{{ handlingChannel.label }}</strong>
            <p>{{ handlingChannel.description }}</p>
          </div>
        </div>

        <button
          v-if="canAssume"
          type="button"
          class="assignee-assume-btn"
          :disabled="isAssuming"
          id="btnAssumirChat"
          @click="handleAssume"
        >
          <i class="fa-solid" :class="isAssuming ? 'fa-spinner fa-spin' : 'fa-hand-pointer'"></i>
          <span>{{ isAssuming ? 'Assumindo...' : 'Assumir' }}</span>
        </button>

        <button
          type="button"
          class="header-tool-btn"
          :class="{ active: showMessageSearch }"
          title="Pesquisar mensagens nesta conversa"
          aria-label="Pesquisar mensagens nesta conversa"
          @click="toggleMessageSearch"
        >
          <i class="fa-solid fa-magnifying-glass"></i>
        </button>

        <!-- 3 Pontinhos Dropdown (Menu de Ações) -->
        <div v-if="ticket && !ticket.is_group" class="actions-dropdown-wrapper" ref="actionsDropdownRef">
          <button
            type="button"
            class="header-tool-btn"
            :class="{ active: showActionsMenu }"
            title="Mais opções"
            @click.stop="showActionsMenu = !showActionsMenu"
          >
            <i class="fa-solid fa-ellipsis-vertical"></i>
          </button>

          <div v-if="showActionsMenu" class="actions-menu-dropdown">
            <button type="button" class="actions-menu-item" @click="openCollaborators">
              <i class="fa-solid fa-user-plus"></i>
              <span>Adicionar participante</span>
            </button>
            <button
              type="button"
              class="actions-menu-item"
              @click="openTransfer"
            >
              <i class="fa-solid fa-arrow-right-arrow-left"></i>
              <span>Transferir atendimento</span>
            </button>
            <button
              v-if="canClose"
              type="button"
              class="actions-menu-item danger"
              @click="openClose"
            >
              <i class="fa-solid fa-check"></i>
              <span>Encerrar atendimento</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <Transition name="incoming-call-slide">
      <div v-if="ticket?.incomingCall" class="incoming-call-banner" :class="{ video: ticket.incomingCall.isVideo, ended: ticket.incomingCall.status !== 'ringing' }" role="status" aria-live="assertive">
        <span class="incoming-call-pulse"><i :class="ticket.incomingCall.isVideo ? 'fa-solid fa-video' : 'fa-solid fa-phone'"></i></span>
        <div>
          <strong>{{ ticket.incomingCall.status === 'ringing' ? (ticket.incomingCall.isVideo ? 'Chamada de vídeo do WhatsApp' : 'Ligação do WhatsApp') : 'Chamada finalizada' }}</strong>
          <small>{{ headerPerson.name }} {{ ticket.incomingCall.status === 'ringing' ? (ticket.incomingCall.isVideo ? 'está fazendo uma chamada de vídeo agora' : 'está ligando agora') : 'encerrou a tentativa de chamada' }}</small>
        </div>
        <span class="incoming-call-time">{{ callTime(ticket.incomingCall.timestamp) }}</span>
        <button type="button" title="Fechar aviso" @click="dismissIncomingCall"><i class="fa-solid fa-xmark"></i></button>
      </div>
    </Transition>

    <Transition name="chat-search-slide">
      <div v-if="ticket && showMessageSearch" class="chat-message-searchbar">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input
          ref="messageSearchInputRef"
          v-model="messageSearchQuery"
          type="search"
          autocomplete="off"
          placeholder="Pesquisar nesta conversa..."
          @keydown.enter.prevent="goToNextSearchResult"
          @keydown.esc="closeMessageSearch"
        />
        <span class="chat-search-counter">
          {{ messageSearchQuery ? (messageSearchMatches.length ? `${activeSearchIndex + 1} de ${messageSearchMatches.length}` : 'Nenhum resultado') : 'Digite para pesquisar' }}
        </span>
        <button type="button" :disabled="activeSearchIndex <= 0" title="Resultado anterior" @click="goToPreviousSearchResult"><i class="fa-solid fa-chevron-up"></i></button>
        <button type="button" :disabled="!messageSearchMatches.length || activeSearchIndex >= messageSearchMatches.length - 1" title="Próximo resultado" @click="goToNextSearchResult"><i class="fa-solid fa-chevron-down"></i></button>
        <button type="button" title="Fechar pesquisa" @click="closeMessageSearch"><i class="fa-solid fa-xmark"></i></button>
      </div>
    </Transition>

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
      <div v-else-if="ticketStore.isLoadingMessages(ticket.id) && visibleMessages.length === 0" class="conversation-loading">
        <span class="conversation-loading-icon"><i class="fa-solid fa-comments"></i></span>
        <strong>Carregando conversa...</strong>
        <span>Buscando o histórico de mensagens com segurança.</span>
        <i class="fa-solid fa-spinner fa-spin"></i>
      </div>
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
          <div
            v-for="(m, mIdx) in group.messages"
            :key="m.id || `${gIdx}_${mIdx}`"
            class="chat-message-search-anchor"
            :class="{
              'search-hit': isSearchMatch(m),
              'search-hit-active': isActiveSearchMessage(m)
            }"
          >
            <ChatBubble
              :msg="m"
              :initials="ticket.initials"
              :avatar-color="ticket.avatarColor"
              :avatar-url="ticket.avatar_url"
              :current-user-id="authStore.user?.id"
              :is-group="Boolean(ticket.is_group)"
              :allow-device-message-mutations="ticket.departments?.allow_device_message_mutations === true"
              @reply="startReply"
              @edit="startEdit"
              @delete="deleteMessage"
              @copied="onMessageCopied"
            />
          </div>
        </div>

        <div
          v-for="upload in pendingUploads"
          :key="upload.id"
          class="pending-upload-bubble"
        >
          <span class="pending-upload-icon">
            <i :class="pendingUploadIcon(upload.mediaType)"></i>
          </span>
          <span class="pending-upload-copy">
            <strong>{{ upload.voiceNote ? 'Mensagem de voz' : upload.fileName }}</strong>
            <small>{{ pendingUploadStatus(upload) }}</small>
            <span class="pending-upload-track" role="progressbar" :aria-valuenow="upload.progress" aria-valuemin="0" aria-valuemax="100">
              <span class="pending-upload-progress" :style="{ width: `${upload.progress}%` }"></span>
            </span>
          </span>
          <span class="pending-upload-percent">{{ upload.progress }}%</span>
        </div>
      </template>
    </div>

    <!-- Botão Flutuante Voltar ao Final (Scroll to bottom) -->
    <Transition name="fade-slide">
      <button
        v-if="showScrollBottom"
        type="button"
        class="scroll-bottom-btn"
        :style="{ bottom: ticket?.is_group ? (canSend ? '88px' : '24px') : (metricsExpanded ? (canSend ? '138px' : '68px') : (canSend ? '88px' : '24px')) }"
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
      <!-- Linha 1: Abas de Modo (Responder vs Observação) e Toggle de Indicadores -->
      <div class="chat-mode-tabs">
        <div class="chat-mode-tabs-left">
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

        <button
          type="button"
          class="chat-metrics-tab-btn"
          :class="{ active: metricsExpanded }"
          title="Alternar indicadores do atendente"
          @click="toggleMetrics"
        >
          <i class="fa-solid fa-chart-line"></i>
          <span>Indicadores</span>
          <i class="fa-solid" :class="metricsExpanded ? 'fa-chevron-down' : 'fa-chevron-up'" style="font-size:9.5px;"></i>
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

      <div v-if="pastedImage" class="clipboard-image-preview">
        <img :src="pastedImage.url" alt="Prévia da imagem colada" />
        <span>
          <strong>Imagem pronta para enviar</strong>
          <small>Adicione uma legenda ou pressione Enter para enviar.</small>
        </span>
        <button type="button" class="btn-icon" title="Remover imagem" @click="clearPastedImage"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div v-if="replyingMessage || editingMessage" class="composer-message-context">
        <span class="composer-message-context-icon">
          <i :class="editingMessage ? 'fa-solid fa-pen' : 'fa-solid fa-reply'"></i>
        </span>
        <span class="composer-message-context-copy">
          <strong>{{ editingMessage ? 'Editando sua mensagem' : `Respondendo a ${messageAuthorLabel(replyingMessage)}` }}</strong>
          <small>{{ messagePlainText(editingMessage || replyingMessage) }}</small>
        </span>
        <button type="button" class="btn-icon" title="Cancelar" @click="cancelMessageContext"><i class="fa-solid fa-xmark"></i></button>
      </div>

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
          :placeholder="editingMessage ? 'Corrija sua mensagem...' : (chatMode === 'observacao' ? 'Digite uma observação interna (visível apenas para atendentes)...' : 'Digite sua mensagem...')"
          @input="adjustTextareaHeight"
          @paste="handleComposerPaste"
          @keydown.enter.exact.prevent="sendMessage"
        ></textarea>

        <button
          v-if="!isRecording && !inputMsg.trim() && !pastedImage"
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

    <!-- Barra de Indicadores KPIs no rodapé do ChatPanel (sempre visível quando metricsExpanded) -->
    <div v-if="metricsExpanded && !ticket?.is_group" class="chat-kpi-bar">
      <div class="kpi-mini-card" title="Total de chats de clientes recebidos hoje pelo departamento">
        <div class="kpi-mini-icon" style="background:#ecfdf5;color:#10b981;">
          <i class="fa-regular fa-comment-dots"></i>
        </div>
        <div class="kpi-mini-info">
          <span class="kpi-mini-label">Chats do setor hoje</span>
          <span class="kpi-mini-value">{{ performance?.today?.departmentReceived ?? 0 }}</span>
        </div>
      </div>

      <div class="kpi-mini-card" title="Atendimentos de clientes concluídos hoje por você">
        <div class="kpi-mini-icon" style="background:#eff6ff;color:#2563eb;">
          <i class="fa-solid fa-headset"></i>
        </div>
        <div class="kpi-mini-info">
          <span class="kpi-mini-label">Meus atendimentos hoje</span>
          <span class="kpi-mini-value">{{ performance?.today?.agentCompleted ?? 0 }}</span>
        </div>
      </div>

      <div class="kpi-mini-card" title="Tempo Médio de Atendimento no mês">
        <div class="kpi-mini-icon" style="background:#f1f5f9;color:#475569;">
          <i class="fa-regular fa-clock"></i>
        </div>
        <div class="kpi-mini-info">
          <span class="kpi-mini-label">TMA</span>
          <span class="kpi-mini-value">{{ displayTma }}</span>
        </div>
      </div>

      <div class="kpi-mini-card" title="Tempo médio de espera do analista no mês atual">
        <div class="kpi-mini-icon" style="background:#eef2ff;color:#4f46e5;"><i class="fa-regular fa-hourglass-half"></i></div>
        <div class="kpi-mini-info"><span class="kpi-mini-label">TME</span><span class="kpi-mini-value">{{ displayTme }}</span></div>
      </div>

      <div class="kpi-mini-card" title="Índice de cumprimento de SLA no mês">
        <div class="kpi-mini-icon" style="background:#f3e8ff;color:#7e22ce;">
          <i class="fa-solid fa-gauge-high"></i>
        </div>
        <div class="kpi-mini-info">
          <span class="kpi-mini-label">SLA no mês</span>
          <span class="kpi-mini-value">{{ displaySla }}</span>
        </div>
      </div>

      <div class="kpi-mini-card" :title="`Média das ${performance?.metrics?.ratingCount ?? 0} avaliações dos seus atendimentos neste mês`">
        <div class="kpi-mini-icon" style="background:#fffbeb;color:#d97706;">
          <i class="fa-regular fa-star"></i>
        </div>
        <div class="kpi-mini-info">
          <span class="kpi-mini-label">Avaliação no mês</span>
          <span class="kpi-mini-value">{{ ratingLabel }}</span>
        </div>
      </div>

      <button
        type="button"
        class="chat-kpi-close-btn"
        title="Ocultar barra de indicadores"
        @click="toggleMetrics"
      >
        <i class="fa-solid fa-chevron-down"></i>
      </button>
    </div>

    <!-- Barra recolhida caso metricsExpanded esteja desligado -->
    <div v-else-if="!ticket?.is_group" class="chat-kpi-bar-collapsed" @click="toggleMetrics" title="Exibir indicadores de atendimento">
      <div class="chat-kpi-collapsed-content">
        <i class="fa-solid fa-chart-line"></i>
        <span>Indicadores do mês • avaliação <strong>{{ ratingLabel }}</strong></span>
      </div>
      <i class="fa-solid fa-chevron-up"></i>
    </div>

    <!-- Modal Transferir Atendimento -->
    <ModalTransferir
      v-if="showTransferModal && ticket"
      :ticket="ticket"
      @close="showTransferModal = false"
    />
    <ModalColaboradores v-if="showCollaboratorsModal && ticket" :ticket="ticket" @close="showCollaboratorsModal = false" @updated="updateCollaborators" />

    <Teleport to="body">
      <div v-if="messageToDelete" class="modal-overlay active message-delete-overlay" @click.self="messageToDelete = null">
        <div class="message-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="deleteMessageTitle">
          <span class="message-delete-icon"><i class="fa-regular fa-trash-can"></i></span>
          <div>
            <h3 id="deleteMessageTitle">Excluir mensagem para todos?</h3>
            <p>A mensagem será removida deste atendimento e também da conversa no WhatsApp.</p>
          </div>
          <div class="message-delete-actions">
            <button type="button" class="btn-secondary" :disabled="deletingMessage" @click="messageToDelete = null">Cancelar</button>
            <button type="button" class="message-delete-confirm" :disabled="deletingMessage" @click="confirmDeleteMessage">
              <i :class="deletingMessage ? 'fa-solid fa-spinner fa-spin' : 'fa-regular fa-trash-can'"></i>
              {{ deletingMessage ? 'Excluindo...' : 'Excluir para todos' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useTicketStore } from '@/stores/tickets.store'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { useSocket } from '@/composables/useSocket'
import { ticketsApi } from '@/api/tickets.api'
import { quickMessagesApi } from '@/api/quick-messages.api'
import { classifyBotInteractions } from '@/utils/chat-message-visibility'
import { preloadTicketMedia } from '@/utils/protected-media-cache'
import { splitPersonLabel } from '@/utils/person-display'
import ChatBubble from './ChatBubble.vue'
import ModalTransferir from '@/components/modals/ModalTransferir.vue'
import ModalColaboradores from '@/components/modals/ModalColaboradores.vue'

const props = defineProps({
  ticket: {
    type: Object,
    default: null
  },
  performance: {
    type: Object,
    default: () => ({
      today: { departmentReceived: 0, agentCompleted: 0 },
      metrics: { tma: '00:00:00', tme: '00:00:00', slaPercent: 0, ratingAverage: null }
    })
  },
  isDetailsOpen: {
    type: Boolean,
    default: false
  }
})

const metricsExpanded = ref(localStorage.getItem('attendance_metrics_expanded') === 'true')

function toggleMetrics() {
  metricsExpanded.value = !metricsExpanded.value
  localStorage.setItem('attendance_metrics_expanded', String(metricsExpanded.value))
}

const ratingLabel = computed(() => {
  const avg = props.performance?.metrics?.ratingAverage
  if (avg == null || isNaN(avg)) return '—'
  return `${Number(avg).toFixed(1)} ★`
})

const displayTma = computed(() => {
  const tma = props.performance?.metrics?.tma
  if (tma && tma !== '00:00:00') return tma
  return '00:00:00'
})

const displaySla = computed(() => {
  const sla = props.performance?.metrics?.slaPercent
  if (sla != null && Number(sla) > 0) return `${Number(sla).toFixed(0)}%`
  if (props.performance?.metrics?.completed > 0) return `${Number(sla || 0).toFixed(0)}%`
  return '—'
})
const displayTme = computed(() => props.performance?.metrics?.tme || '00:00:00')
const headerPerson = computed(() => splitPersonLabel(props.ticket?.clientName || props.ticket?.client_name || 'Cliente'))

defineEmits(['toggle-details', 'go-back'])

const ticketStore = useTicketStore()
const authStore = useAuthStore()
const ui = useUiStore()
const { stopIncomingCallAlert } = useSocket()

const showTransferModal = ref(false)
const showCollaboratorsModal = ref(false)
const showActionsMenu = ref(false)
const actionsDropdownRef = ref(null)
const msgBoxRef = ref(null)
const chatInputRef = ref(null)
const fileInputRef = ref(null)
const showScrollBottom = ref(false)
const showMessageSearch = ref(false)
const messageSearchQuery = ref('')
const activeSearchIndex = ref(0)
const messageSearchInputRef = ref(null)
const showQuickMessages = ref(false)
const showBotInteractions = ref(false)
const showEmojiPicker = ref(false)
const replyingMessage = ref(null)
const editingMessage = ref(null)
const messageToDelete = ref(null)
const deletingMessage = ref(false)
const quickMessages = ref([])
const quickMessagesLoading = ref(false)
const quickSearch = ref('')
const sendingMedia = ref(false)
const isAssuming = ref(false)
const pendingUploads = ref([])
const pastedImage = ref(null)
const headerAvatarFailed = ref(false)
const isRecording = ref(false)
const recordingSeconds = ref(0)
let mediaRecorder = null
let recorderStream = null
let recordedChunks = []
let discardRecording = false
let recordingTimer = null

function openCollaborators() { showActionsMenu.value = false; showCollaboratorsModal.value = true }
function updateCollaborators(collaborators) { ticketStore.patchTicket(props.ticket.id, { collaborators }) }
function dismissIncomingCall() {
  if (!props.ticket?.id) return
  stopIncomingCallAlert(props.ticket.incomingCall?.callId)
  ticketStore.patchTicket(props.ticket.id, { incomingCall: null })
}
function callTime(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'agora' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

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
  if (props.ticket.is_group) return false
  return props.ticket.status === 'aguardando' && !props.ticket.assumed
})

const canClose = computed(() => {
  if (!props.ticket) return false
  if (props.ticket.is_group) return false
  return props.ticket.status === 'em_atendimento' || props.ticket.assumed
})

const canSend = computed(() => {
  if (!props.ticket) return false
  if (props.ticket.is_group) return true
  return props.ticket.status === 'em_atendimento' || props.ticket.assumed
})

const whatsappAccountLabel = computed(() => {
  const channel = props.ticket?.channel || ''
  const accountId = channel.startsWith('whatsapp:') ? channel.slice('whatsapp:'.length) : null
  const account = accountId ? ui.whatsappAccounts.find(item => item.id === accountId) : null
  return account?.name || 'WhatsApp'
})

const handlingChannel = computed(() => {
  if (props.ticket?.is_group) return {
    label: 'Grupo do WhatsApp',
    description: 'Conversa permanente compartilhada com os participantes deste grupo.',
    kind: 'device',
    icon: 'fa-solid fa-users'
  }
  let source = props.ticket?.handled_via || 'pending'
  if (source === 'pending' && String(props.ticket?.agent_name || '').startsWith('WhatsApp (')) source = 'whatsapp_device'
  if (source === 'whatsapp_device') return {
    label: 'Atendimento por WhatsApp',
    description: 'A conversa foi conduzida diretamente pelo aplicativo WhatsApp conectado.',
    kind: 'device',
    icon: 'fa-brands fa-whatsapp'
  }
  if (source === 'mixed') return {
    label: 'Atendimento misto',
    description: 'A conversa teve respostas enviadas tanto pelo Brisoft Desk quanto pelo WhatsApp.',
    kind: 'mixed',
    icon: 'fa-solid fa-shuffle'
  }
  if (source === 'platform') return {
    label: 'Atendimento pelo site',
    description: 'A conversa foi atendida pela equipe dentro da plataforma Brisoft Desk.',
    kind: 'platform',
    icon: 'fa-solid fa-headset'
  }
  return { label: '', description: '', kind: '', icon: '' }
})

const visibleMessages = computed(() => {
  return (props.ticket?.messages || []).filter(m => {
    if (!m?.text) return true
    if (typeof m.text === 'string' && m.text.startsWith('[Chatbot][State]')) return false
    return true
  })
})

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

function searchableMessageText(message) {
  return [
    message?.text,
    message?.caption,
    message?.file_name,
    message?.fileName,
    message?.sender_name,
    message?.senderName
  ].filter(Boolean).join(' ')
}

const normalizedMessageSearchQuery = computed(() => normalizeSearchText(messageSearchQuery.value.trim()))
const messageSearchMatches = computed(() => {
  const query = normalizedMessageSearchQuery.value
  if (!query) return []
  return visibleMessages.value.filter(message => normalizeSearchText(searchableMessageText(message)).includes(query))
})
const activeSearchMessage = computed(() => messageSearchMatches.value[activeSearchIndex.value] || null)

function isSearchMatch(message) {
  return messageSearchMatches.value.includes(message)
}

function isActiveSearchMessage(message) {
  return activeSearchMessage.value === message
}

function scrollToActiveSearchResult() {
  nextTick(() => {
    const target = msgBoxRef.value?.querySelector('.chat-message-search-anchor.search-hit-active')
    target?.scrollIntoView({ behavior: 'auto', block: 'center' })
  })
}

function goToNextSearchResult() {
  if (!messageSearchMatches.value.length) return
  activeSearchIndex.value = Math.min(activeSearchIndex.value + 1, messageSearchMatches.value.length - 1)
  scrollToActiveSearchResult()
}

function goToPreviousSearchResult() {
  const total = messageSearchMatches.value.length
  if (!total) return
  activeSearchIndex.value = Math.max(activeSearchIndex.value - 1, 0)
  scrollToActiveSearchResult()
}

function toggleMessageSearch() {
  showMessageSearch.value = !showMessageSearch.value
  if (showMessageSearch.value) nextTick(() => messageSearchInputRef.value?.focus())
  else messageSearchQuery.value = ''
}

function closeMessageSearch() {
  showMessageSearch.value = false
  messageSearchQuery.value = ''
  activeSearchIndex.value = 0
}

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
  const msgs = visibleMessages.value
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

function handleClickOutside(event) {
  if (actionsDropdownRef.value && !actionsDropdownRef.value.contains(event.target)) {
    showActionsMenu.value = false
  }
}

function openTransfer() {
  showActionsMenu.value = false
  showTransferModal.value = true
}

function openClose() {
  showActionsMenu.value = false
  ui.openModal('encerrar')
}

let resizeObserver = null

function onVisibilityChange() {
  if (document.visibilityState === 'visible' && props.ticket) {
    if (showMessageSearch.value && messageSearchQuery.value) return
    scrollToBottom()
  }
}

onMounted(() => {
  scrollToBottom()
  focusInput()
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('visibilitychange', onVisibilityChange)
  if (msgBoxRef.value) {
    msgBoxRef.value.addEventListener('scroll', onChatScroll, { passive: true })
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (showMessageSearch.value && messageSearchQuery.value) return
        if (!showScrollBottom.value) {
          scrollToBottom()
        }
      })
      resizeObserver.observe(msgBoxRef.value)
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (msgBoxRef.value) {
    msgBoxRef.value.removeEventListener('scroll', onChatScroll)
  }
  if (recordingTimer) clearInterval(recordingTimer)
  recorderStream?.getTracks().forEach(track => track.stop())
  clearPastedImage()
})

watch(() => props.ticket?.id, () => {
  headerAvatarFailed.value = false
  clearPastedImage()
  showBotInteractions.value = false
  closeMessageSearch()
  scrollToBottom()
  focusInput()
}, { immediate: true })

watch(() => props.ticket?.avatar_url, () => { headerAvatarFailed.value = false })

watch(messageSearchQuery, () => {
  activeSearchIndex.value = 0
  if (messageSearchMatches.value.length) scrollToActiveSearchResult()
})

watch(() => messageSearchMatches.value.length, (total) => {
  if (!total) activeSearchIndex.value = 0
  else if (activeSearchIndex.value >= total) activeSearchIndex.value = total - 1
})

watch(canSend, (val) => {
  if (val) focusInput()
})

function setChatMode(mode) {
  chatMode.value = mode
  if (mode === 'observacao') cancelMessageContext()
  focusInput()
}

function messagePlainText(message) {
  if (!message) return ''
  const mediaFallback = ({ image: 'Imagem', sticker: 'Figurinha', video: 'Vídeo', audio: 'Áudio', document: message.file_name || 'Documento' })[message.type]
  return String(message.text || mediaFallback || 'Mensagem')
    .replace(/^\*[^*]+:\*\s*/s, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150)
}

function messageAuthorLabel(message) {
  if (!message) return 'mensagem'
  if (message.sender === 'client') return props.ticket?.clientName || props.ticket?.client_name || 'cliente'
  return message.sender_name || 'atendente'
}

function startReply(message) {
  editingMessage.value = null
  replyingMessage.value = message
  chatMode.value = 'responder'
  focusInput()
}

function startEdit(message) {
  replyingMessage.value = null
  editingMessage.value = message
  chatMode.value = 'responder'
  inputMsg.value = messagePlainText(message)
  nextTick(adjustTextareaHeight)
  focusInput()
}

function cancelMessageContext() {
  replyingMessage.value = null
  editingMessage.value = null
}

function onMessageCopied(success = true) {
  ui.showToast(success === false ? 'Não foi possível copiar a mensagem.' : 'Mensagem copiada.', success === false ? 'error' : 'success')
}

async function deleteMessage(message) {
  if (!props.ticket || !message?.id) return
  messageToDelete.value = message
}

async function confirmDeleteMessage() {
  const message = messageToDelete.value
  if (!props.ticket || !message?.id || deletingMessage.value) return
  deletingMessage.value = true
  try {
    const { data } = await ticketsApi.deleteMessage(props.ticket.id, message.id)
    if (!data.success) throw new Error(data.error || 'Não foi possível excluir a mensagem.')
    ticketStore.patchMessage(props.ticket.id, message.id, data.message)
    if (editingMessage.value?.id === message.id || replyingMessage.value?.id === message.id) cancelMessageContext()
    messageToDelete.value = null
    ui.showToast('Mensagem excluída para todos.')
  } catch (error) {
    ui.showToast(error.response?.data?.error || error.message || 'Não foi possível excluir a mensagem.', 'error')
  } finally {
    deletingMessage.value = false
  }
}

function scrollToBottom() {
  const performScroll = () => {
    if (msgBoxRef.value) {
      msgBoxRef.value.scrollTop = msgBoxRef.value.scrollHeight
    }
  }

  nextTick(() => {
    performScroll()
    requestAnimationFrame(performScroll)
    setTimeout(performScroll, 40)
    setTimeout(performScroll, 120)
  })
}

watch(() => props.ticket?.messages?.length, () => {
  if (showMessageSearch.value && messageSearchQuery.value) return
  scrollToBottom()
})

async function handleAssume() {
  if (!props.ticket || isAssuming.value) return
  isAssuming.value = true
  try {
    const res = await ticketStore.assume(props.ticket.id)
    if (res.success) {
      ui.showToast('✅ Atendimento assumido com sucesso!')
      ticketsApi.get(props.ticket.id).then(({ data }) => {
        if (!data.success || !data.ticket?.messages) return
        props.ticket.messages = data.ticket.messages
        preloadTicketMedia(data.ticket.messages).catch(() => {})
      }).catch(() => {})
      focusInput()
    } else {
      ui.showToast(`⚠️ ${res.error}`, 'error')
    }
  } finally {
    isAssuming.value = false
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

function clearPastedImage() {
  if (pastedImage.value?.url) URL.revokeObjectURL(pastedImage.value.url)
  pastedImage.value = null
}

function handleComposerPaste(event) {
  if (chatMode.value !== 'responder' || editingMessage.value || !canSend.value) return
  const imageItem = [...(event.clipboardData?.items || [])].find(item => item.kind === 'file' && item.type.startsWith('image/'))
  if (!imageItem) return
  const sourceFile = imageItem.getAsFile()
  if (!sourceFile) return
  event.preventDefault()
  clearPastedImage()
  const extension = sourceFile.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
  const file = new File([sourceFile], `imagem-colada-${Date.now()}.${extension}`, { type: sourceFile.type || 'image/png' })
  pastedImage.value = { file, url: URL.createObjectURL(file) }
  nextTick(() => focusInput())
}

async function sendMediaFile(file, mediaType = detectMediaType(file), caption = '', voiceNote = false) {
  if (!props.ticket || !file) return
  if (file.size > 25 * 1024 * 1024) {
    ui.showToast('O arquivo ultrapassa o limite de 25 MB.', 'error')
    return
  }
  const pendingId = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`
  pendingUploads.value.push({
    id: pendingId,
    fileName: file.name,
    mediaType,
    voiceNote,
    progress: 0,
    uploadedBytes: 0,
    totalBytes: file.size,
    bytesPerSecond: 0,
    phase: 'uploading',
    startedAt: performance.now()
  })
  sendingMedia.value = true
  scrollToBottom()
  try {
    const { data } = await ticketsApi.sendMedia(props.ticket.id, file, {
      fileName: file.name,
      mimeType: file.type,
      mediaType,
      voiceNote,
      caption
    }, {
      onUploadProgress: event => {
        const upload = pendingUploads.value.find(item => item.id === pendingId)
        if (!upload) return
        const loaded = Math.min(Number(event.loaded || 0), file.size)
        const elapsedSeconds = Math.max(0.1, (performance.now() - upload.startedAt) / 1000)
        upload.uploadedBytes = loaded
        upload.totalBytes = Number(event.total || file.size) || file.size
        upload.progress = Math.min(100, Math.round((loaded / Math.max(1, file.size)) * 100))
        upload.bytesPerSecond = Number(event.rate || (loaded / elapsedSeconds))
        if (upload.progress >= 100) upload.phase = mediaType === 'video' || voiceNote ? 'processing' : 'whatsapp'
      }
    })
    const savedMessage = data?.result?.message
    if (savedMessage) ticketStore.appendMessage(props.ticket.id, savedMessage)
    if (caption && inputMsg.value.trim() === caption) inputMsg.value = ''
    ui.showToast(mediaType === 'audio' ? 'Áudio enviado com sucesso!' : 'Arquivo enviado com sucesso!')
    scrollToBottom()
  } catch (error) {
    ui.showToast(error.response?.data?.error || 'Não foi possível enviar o arquivo.', 'error')
  } finally {
    pendingUploads.value = pendingUploads.value.filter(upload => upload.id !== pendingId)
    sendingMedia.value = false
    focusInput()
  }
}

function formatFileSize(bytes) {
  const value = Number(bytes || 0)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`
  return `${(value / (1024 * 1024)).toFixed(value < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

function pendingUploadStatus(upload) {
  if (upload.phase === 'processing') {
    return `${upload.mediaType === 'video' ? 'Preparando vídeo' : 'Preparando áudio'} · ${formatFileSize(upload.totalBytes)}`
  }
  if (upload.phase === 'whatsapp') return `Enviando ao WhatsApp · ${formatFileSize(upload.totalBytes)}`
  const speed = upload.bytesPerSecond > 0 ? ` · ${formatFileSize(upload.bytesPerSecond)}/s` : ''
  return `${formatFileSize(upload.uploadedBytes)} de ${formatFileSize(upload.totalBytes)}${speed}`
}

function pendingUploadIcon(mediaType) {
  return {
    audio: 'fa-solid fa-microphone',
    image: 'fa-regular fa-image',
    video: 'fa-solid fa-video',
    document: 'fa-regular fa-file-lines'
  }[mediaType] || 'fa-solid fa-paperclip'
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
      await sendMediaFile(audioFile, 'audio', '', true)
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
  if (!props.ticket) return

  if (pastedImage.value && !editingMessage.value && chatMode.value === 'responder') {
    const image = pastedImage.value.file
    clearPastedImage()
    await sendMediaFile(image, 'image', text)
    return
  }

  if (!text) return

  if (editingMessage.value) {
    const target = editingMessage.value
    try {
      const { data } = await ticketsApi.editMessage(props.ticket.id, target.id, text)
      if (!data.success) throw new Error(data.error || 'Não foi possível editar a mensagem.')
      ticketStore.patchMessage(props.ticket.id, target.id, data.message)
      inputMsg.value = ''
      cancelMessageContext()
      ui.showToast('Mensagem editada no site e no WhatsApp.')
      focusInput()
    } catch (error) {
      ui.showToast(error.response?.data?.error || error.message || 'Não foi possível editar a mensagem.', 'error')
    }
    return
  }

  const isObs = chatMode.value === 'observacao'
  const agentName = authStore.user?.name || 'Atendente'
  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const formattedText = isObs
    ? null
    : `*${agentName}:*\n\n${text}`

  const msg = isObs
    ? { type: 'divider', text: `📌 NOTA INTERNA (${agentName}): ${text}`, time: timeStr }
    : {
        sender: 'agent',
        user_id: authStore.user?.id,
        sender_name: agentName,
        text: formattedText,
        time: timeStr,
        read: true,
        ...(replyingMessage.value ? {
          reply_to_message_id: replyingMessage.value.id,
          reply_preview: messagePlainText(replyingMessage.value),
          reply_sender: messageAuthorLabel(replyingMessage.value)
        } : {})
      }

  const replyToMessageId = replyingMessage.value?.id || null
  ticketStore.appendMessage(props.ticket.id, msg)
  inputMsg.value = ''
  cancelMessageContext()
  scrollToBottom()
  focusInput()

  if (!isObs) {
    try {
      await ticketsApi.sendMessage(props.ticket.id, text, replyToMessageId)
    } catch (e) {
      console.warn('Erro ao enviar mensagem:', e)
    }
  }
}

function adjustTextareaHeight() {
  if (!chatInputRef.value) return
  chatInputRef.value.style.height = 'auto'
  const newHeight = Math.min(chatInputRef.value.scrollHeight, 100)
  chatInputRef.value.style.height = `${Math.max(22, newHeight)}px`
}

watch(inputMsg, (newVal) => {
  if (!newVal) {
    nextTick(() => {
      if (chatInputRef.value) chatInputRef.value.style.height = '22px'
    })
  }
})
</script>

<style scoped>
.chat-header-avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: none;
  overflow: hidden;
  border-radius: 50%;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}
.chat-header-avatar img { width: 100%; height: 100%; object-fit: cover; }
.employee-contact-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding: 2px 6px;
  border: 1px solid #a7f3d0;
  border-radius: 4px;
  background: #ecfdf5;
  color: #047857;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.handling-channel-indicator {
  position: relative;
  width: 30px;
  height: 30px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex: none;
  background: #eff6ff;
  color: #1f62d0;
  font-size: 13px;
  cursor: help;
  outline: none;
  transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
}

.group-contact-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding: 2px 6px;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.handling-channel-indicator:hover,
.handling-channel-indicator:focus-visible {
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(37, 99, 235, .12);
}

.handling-channel-indicator.device { border-color: #a7f3d0; background: #ecfdf5; color: #047857; }
.handling-channel-indicator.mixed { border-color: #ddd6fe; background: #f5f3ff; color: #6d28d9; }

.handling-channel-popover {
  position: absolute;
  z-index: 80;
  top: calc(100% + 9px);
  right: 0;
  width: 246px;
  padding: 11px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  color: #334155;
  box-shadow: 0 12px 30px rgba(15, 23, 42, .14);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  pointer-events: none;
  transition: opacity .14s ease, transform .14s ease, visibility .14s ease;
}

.handling-channel-popover::before {
  content: '';
  position: absolute;
  top: -5px;
  right: 10px;
  width: 9px;
  height: 9px;
  border-left: 1px solid #e2e8f0;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
  transform: rotate(45deg);
}

.handling-channel-indicator:hover .handling-channel-popover,
.handling-channel-indicator:focus .handling-channel-popover {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.handling-channel-popover strong {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #0f172a;
  font-size: 11.5px;
  font-weight: 600;
}

.handling-channel-popover p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 10.5px;
  font-weight: 400;
  line-height: 1.45;
}


.chat-message-searchbar {
  min-height: 42px;
  padding: 6px 12px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  background: #f8fafc;
  color: #94a3b8;
}
.incoming-call-banner { flex:none;display:flex;align-items:center;gap:10px;min-height:52px;padding:8px 14px;border-bottom:1px solid #bbf7d0;background:linear-gradient(90deg,#ecfdf5,#f0fdf4);color:#166534;position:relative;z-index:25; }
.incoming-call-banner.video { border-bottom-color:#bfdbfe;background:linear-gradient(90deg,#eff6ff,#f5f8ff);color:#1d4ed8; }
.incoming-call-banner.ended { border-bottom-color:#e2e8f0;background:#f8fafc;color:#64748b; }
.incoming-call-pulse { width:34px;height:34px;flex:none;border-radius:50%;display:grid;place-items:center;background:#16a34a;color:#fff;box-shadow:0 0 0 0 rgba(22,163,74,.35);animation:incoming-call-pulse 1.35s infinite; }
.incoming-call-banner.video .incoming-call-pulse { background:#2563eb;box-shadow:0 0 0 0 rgba(37,99,235,.35); }.incoming-call-banner.ended .incoming-call-pulse { background:#94a3b8;animation:none;box-shadow:none; }
.incoming-call-banner>div { min-width:0;flex:1;display:flex;flex-direction:column;gap:2px; }.incoming-call-banner strong { font-size:11.5px; }.incoming-call-banner small { overflow:hidden;color:currentColor;font-size:9.5px;opacity:.78;white-space:nowrap;text-overflow:ellipsis; }.incoming-call-time { font-size:9px;opacity:.72; }
.incoming-call-banner>button { width:27px;height:27px;border:0;border-radius:7px;background:transparent;color:currentColor;cursor:pointer; }.incoming-call-banner>button:hover { background:rgba(255,255,255,.75); }
.incoming-call-slide-enter-active,.incoming-call-slide-leave-active { transition:opacity .18s ease,transform .18s ease; }.incoming-call-slide-enter-from,.incoming-call-slide-leave-to { opacity:0;transform:translateY(-7px); }
@keyframes incoming-call-pulse { 70% { box-shadow:0 0 0 8px transparent; } 100% { box-shadow:0 0 0 0 transparent; } }

.chat-message-searchbar > i { font-size: 11px; }
.chat-message-searchbar input {
  min-width: 120px;
  flex: 1;
  height: 30px;
  padding: 0 10px;
  border: 1px solid #dbe3ec;
  border-radius: 7px;
  background: #ffffff;
  color: #0f172a;
  font-size: 11.5px;
  outline: none;
}
.chat-message-searchbar input:focus { border-color: #93c5fd; box-shadow: 0 0 0 2px rgba(59, 130, 246, .1); }
.chat-search-counter { min-width: 102px; color: #64748b; font-size: 10.5px; text-align: right; }
.chat-message-searchbar button {
  width: 27px;
  height: 27px;
  border: 0;
  border-radius: 6px;
  display: grid;
  place-items: center;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}
.chat-message-searchbar button:hover:not(:disabled) { background: #e8f1ff; color: #2563eb; }
.chat-message-searchbar button:disabled { opacity: .35; cursor: default; }
.chat-search-slide-enter-active,.chat-search-slide-leave-active { transition: opacity .14s ease, transform .14s ease; }
.chat-search-slide-enter-from,.chat-search-slide-leave-to { opacity: 0; transform: translateY(-5px); }
.chat-message-search-anchor { border-radius: 10px; transition: background-color .16s ease; }
.chat-message-search-anchor.search-hit { background: rgba(250, 204, 21, .08); }
.chat-message-search-anchor.search-hit-active { background: rgba(250, 204, 21, .16); }
.chat-message-search-anchor.search-hit-active :deep(.chat-bubble) { box-shadow: 0 0 0 2px rgba(234, 179, 8, .45), 0 5px 15px rgba(15, 23, 42, .08); }

.composer-message-context {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 7px 9px;
  border: 1px solid #dbeafe;
  border-left: 3px solid #2563eb;
  border-radius: 8px;
  background: #f8fbff;
}

.composer-message-context-icon {
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  flex: none;
  border-radius: 7px;
  background: #e8f1ff;
  color: #2563eb;
  font-size: 11px;
}

.composer-message-context-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.composer-message-context-copy strong { color: #1e40af; font-size: 10.5px; }
.composer-message-context-copy small { overflow: hidden; color: #64748b; font-size: 10.5px; text-overflow: ellipsis; white-space: nowrap; }

.clipboard-image-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 62px;
  padding: 8px 10px;
  border: 1px solid #dbeafe;
  border-radius: 9px;
  background: #f8fbff;
}
.clipboard-image-preview img { width: 48px; height: 48px; flex: none; border-radius: 7px; object-fit: cover; }
.clipboard-image-preview span { display: grid; min-width: 0; flex: 1; gap: 3px; }
.clipboard-image-preview strong { color: #1e3a8a; font-size: 11.5px; }
.clipboard-image-preview small { color: #64748b; font-size: 10.5px; line-height: 1.35; }

.message-delete-overlay { z-index: 10050; display: grid; place-items: center; padding: 18px; }
.message-delete-dialog { width: min(420px, 100%); padding: 22px; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; box-shadow: 0 24px 60px rgba(15, 23, 42, .25); }
.message-delete-dialog { display: grid; grid-template-columns: 42px 1fr; gap: 13px; }
.message-delete-icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 11px; background: #fff1f2; color: #dc2626; font-size: 17px; }
.message-delete-dialog h3 { margin: 1px 0 6px; color: #0f172a; font-size: 15px; }
.message-delete-dialog p { margin: 0; color: #64748b; font-size: 12px; line-height: 1.55; }
.message-delete-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; padding-top: 15px; border-top: 1px solid #e2e8f0; }
.message-delete-actions button { min-height: 34px; padding: 0 13px; border-radius: 7px; font-size: 11.5px; font-weight: 700; cursor: pointer; }
.message-delete-actions button:disabled { opacity: .6; cursor: wait; }
.message-delete-confirm { border: 1px solid #ef4444; background: #ef4444; color: #fff; }
.message-delete-confirm:hover:not(:disabled) { background: #dc2626; }

.bot-history-toolbar {
  display: flex;
  justify-content: center;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border-color);
  background: #fafbfc;
}

.bot-history-toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 10px;
  border: 1px solid #d7dce2;
  border-radius: 6px;
  background: #ffffff;
  color: #475569;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.bot-history-toggle:hover { border-color: #bfdbfe; color: var(--brand-primary); }
.bot-history-count {
  min-width: 16px;
  padding: 1px 5px;
  border-radius: 4px;
  background: #eff6ff;
  color: var(--brand-primary);
  font-size: 9.5px;
  text-align: center;
}

.chat-footer {
  position: relative;
  padding: 8px 16px 12px;
  background: #ffffff;
  border-top: 1px solid var(--border-color, #e2e8f0);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chat-mode-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px 2px;
}

.chat-mode-tabs-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.chat-metrics-tab-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chat-metrics-tab-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.chat-metrics-tab-btn.active {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: var(--brand-primary, #2563eb);
}

.chat-kpi-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 14px 8px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  overflow-x: auto;
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
}

.chat-kpi-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  transition: all 0.12s ease;
  flex-shrink: 0;
}

.chat-kpi-close-btn:hover {
  background: #e2e8f0;
  color: #334155;
}

.chat-kpi-bar-collapsed {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  font-size: 11px;
  color: #64748b;
  cursor: pointer;
  transition: background-color 0.12s ease;
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
}

.chat-kpi-bar-collapsed:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.chat-kpi-collapsed-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-kpi-bar .kpi-mini-card {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.chat-kpi-bar .kpi-mini-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.chat-kpi-bar .kpi-mini-info {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.chat-kpi-bar .kpi-mini-label {
  font-size: 9.5px;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
}

.chat-kpi-bar .kpi-mini-value {
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
}

.chat-mode-btn {
  background: none;
  border: none;
  padding: 0 0 4px 0;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
}

.chat-mode-btn.active {
  color: var(--brand-primary, #2563eb);
  border-bottom-color: var(--brand-primary, #2563eb);
}

.chat-input-row {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 6px;
  background: #ffffff;
  border: 1px solid #d7dce2;
  border-radius: 8px;
  padding: 4px 6px 4px 8px;
  min-height: 42px;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.chat-input-row:focus-within {
  border-color: #77a4df;
  box-shadow: 0 0 0 3px rgba(31, 98, 208, 0.08);
}

.chat-input-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.chat-input-actions .btn-icon {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.12s ease;
}

.chat-input-actions .btn-icon:hover {
  background: #f1f5f9;
  color: var(--brand-primary, #2563eb);
}

.chat-input-actions .btn-icon.active {
  color: var(--brand-primary, #2563eb);
  background: #eff6ff;
}

.chat-input-row textarea {
  flex: 1;
  width: 100%;
  border: none !important;
  outline: none !important;
  padding: 4px 8px !important;
  font-size: 13px;
  color: #0f172a;
  background: transparent !important;
  min-height: 22px !important;
  max-height: 100px;
  height: 22px;
  resize: none !important;
  font-family: inherit;
  box-sizing: border-box;
  line-height: 1.4;
}

.composer-popover {
  position: absolute;
  left: 20px;
  bottom: 58px;
  z-index: 80;
  width: min(360px, calc(100% - 40px));
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(16, 24, 40, 0.12);
}

.composer-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--text-main);
  font-size: 12px;
  font-weight: 650;
}

.composer-search {
  width: 100%;
  box-sizing: border-box;
  height: 32px;
  margin-bottom: 8px;
  padding: 0 10px;
  border: 1px solid #d7dce2;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
}

.quick-message-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 240px;
  overflow-y: auto;
}

.quick-message-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: #f8fafc;
  color: var(--text-main);
  text-align: left;
  cursor: pointer;
  transition: all 0.12s ease;
}

.quick-message-option:hover { background: #eff6ff; border-color: #bfdbfe; }
.quick-message-option strong { font-size: 11.5px; color: var(--brand-primary); }
.quick-message-option span { font-size: 11px; line-height: 1.4; color: var(--text-muted); }
.composer-empty { padding: 16px; text-align: center; color: var(--text-light); font-size: 11.5px; }

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
  border-radius: 6px;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  transition: background 0.12s ease;
}

.emoji-option:hover { background: #f1f5f9; }

.composer-send-btn {
  width: 34px !important;
  height: 34px !important;
  min-width: 34px !important;
  padding: 0 !important;
  border-radius: 6px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
  background: var(--brand-primary, #2563eb) !important;
  border: none !important;
  color: #ffffff !important;
  cursor: pointer;
  font-size: 13px !important;
  transition: background 0.15s ease;
}

.composer-send-btn:hover {
  background: var(--brand-primary-hover, #1d4ed8) !important;
}

.recording-status {
  min-width: 0;
  flex: 1;
  height: 34px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 6px 0 10px;
  color: #d92d20;
  font-size: 12px;
}

.recording-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d92d20;
  animation: recording-pulse 1.2s infinite;
}

.recording-status strong { flex: 1; font-weight: 600; }
.recording-cancel { color: #d92d20; }
.recording-send { color: #ffffff; background: var(--brand-primary); border-color: var(--brand-primary); }

@keyframes recording-pulse {
  50% { opacity: 0.35; transform: scale(0.8); }
}

.pending-upload-bubble {
  align-self: flex-end;
  width: min(330px, 78%);
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 14px 2px auto;
  padding: 9px 12px;
  border-radius: 8px;
  color: #14532d;
  background: #ecfdf5;
  border: 1px solid #bbf7d0;
}

.pending-upload-icon {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #ffffff;
  background: #168a52;
  font-size: 11px;
}

.pending-upload-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pending-upload-copy strong {
  overflow: hidden;
  color: #166534;
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-upload-copy small { color: #4d7c5d; font-size: 10px; }
.pending-upload-track {
  width: 100%;
  height: 4px;
  overflow: hidden;
  margin-top: 3px;
  border-radius: 2px;
  background: rgba(22, 101, 52, 0.16);
}
.pending-upload-progress {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #168a52;
  transition: width 180ms ease;
}
.pending-upload-percent {
  min-width: 28px;
  color: #15803d;
  font-size: 10.5px;
  font-weight: 700;
  text-align: right;
}

.chat-date-sticky-wrapper {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: center;
  pointer-events: none;
  padding: 4px 0;
}

.chat-date-pill {
  pointer-events: auto;
  padding: 3px 10px;
  background: rgba(255, 255, 255, 0.94);
  color: #64748b;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid #e0e3e7;
  transition: all 0.15s ease;
}

/* Botão Flutuante Rolar para o Final */
.scroll-bottom-btn {
  position: absolute;
  right: 20px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #ffffff;
  color: #64748b;
  border: 1px solid var(--border-color);
  box-shadow: 0 3px 10px rgba(16, 24, 40, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  z-index: 30;
  transition: all 0.15s ease;
}

.scroll-bottom-btn:hover {
  background: #f8fafc;
  color: var(--brand-primary);
  border-color: #bfdbfe;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.18s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* Menu de Ações Suspenso */
.actions-dropdown-wrapper {
  position: relative;
  display: inline-flex;
}

.btn-actions-trigger {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: #ffffff;
  color: #64748b;
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-actions-trigger:hover,
.btn-actions-trigger.active {
  background: #f1f5f9;
  color: var(--text-main);
}

.actions-menu-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 190px;
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  box-shadow: 0 8px 24px rgba(16, 24, 40, 0.1);
  padding: 4px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.actions-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: none;
  background: transparent;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-main);
  cursor: pointer;
  text-align: left;
  transition: all 0.12s ease;
}

.actions-menu-item:hover {
  background: #f1f5f9;
}

.actions-menu-item i {
  font-size: 12.5px;
  width: 16px;
  color: #64748b;
  text-align: center;
}

.actions-menu-item.danger {
  color: #d92d20;
}

.actions-menu-item.danger i {
  color: #d92d20;
}

.actions-menu-item.danger:hover {
  background: #fef2f2;
}

.conversation-loading{flex:1;min-height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#94a3b8;margin:auto}.conversation-loading-icon{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:#eff6ff;color:#2563eb;font-size:18px}.conversation-loading strong{font-size:13px;color:#334155}.conversation-loading span:not(.conversation-loading-icon){font-size:11px}

/* Botão voltar (mobile) */
.chat-back-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f1f5f9;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: #475569;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
  margin-right: 6px;
  transition: background 0.15s;
}

.chat-back-btn:hover {
  background: #e2e8f0;
  color: var(--text-main);
}
</style>
