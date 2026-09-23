import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { internalChatApi } from '@/api/internal-chat.api'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

export const useInternalChatStore = defineStore('internalChat', () => {
  const auth = useAuthStore()
  const ui = useUiStore()

  const conversations = ref([])
  const teamMembers = ref([])
  const activeConversation = ref(null)
  const conversationDetails = ref(null)
  const isLoadingDetails = ref(false)
  const messages = ref([])
  const isLoading = ref(false)
  const isSending = ref(false)
  const typingUsers = ref({}) // conversationId -> { [userId]: userName }

  // Total de mensagens internas não lidas em todas as conversas
  const totalUnreadCount = computed(() => {
    return conversations.value.reduce((acc, conv) => acc + (conv.unread_count || 0), 0)
  })

  async function fetchConversations() {
    try {
      const { data } = await internalChatApi.listConversations()
      if (data?.success && Array.isArray(data.conversations)) {
        conversations.value = data.conversations

        // Se já tiver uma conversa ativa, atualiza os dados dela
        if (activeConversation.value) {
          const found = conversations.value.find(c => c.id === activeConversation.value.id)
          if (found) activeConversation.value = found
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar conversas internas:', err)
    }
  }

  async function fetchTeamMembers() {
    try {
      const { data } = await internalChatApi.listTeamMembers()
      if (data?.success && Array.isArray(data.members)) {
        teamMembers.value = data.members
      }
    } catch (err) {
      console.warn('Erro ao carregar membros da equipe:', err)
    }
  }

  async function selectConversation(conv) {
    if (!conv) return
    activeConversation.value = conv
    isLoading.value = true

    try {
      const { data } = await internalChatApi.getMessages(conv.id)
      if (data?.success && Array.isArray(data.messages)) {
        messages.value = data.messages
      }

      // Marca como lida
      if (conv.unread_count > 0) {
        conv.unread_count = 0
        await internalChatApi.markAsRead(conv.id)
      }
    } catch (err) {
      console.error('Erro ao buscar mensagens da conversa:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function startDirectChatWith(userId) {
    try {
      const { data } = await internalChatApi.startDirectChat(userId)
      if (data?.success && data.conversation) {
        await fetchConversations()
        const targetConv = conversations.value.find(c => c.id === data.conversation.id) || data.conversation
        await selectConversation(targetConv)
        return targetConv
      }
    } catch (err) {
      ui.showToast('Erro ao abrir conversa direta: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  async function sendMessage(text, options = {}) {
    if (!activeConversation.value) return
    if (!text?.trim() && !options.media_url) return

    isSending.value = true
    try {
      const payload = {
        text: text?.trim(),
        media_url: options.media_url || null,
        media_type: options.media_type || null,
        file_name: options.file_name || null,
        reply_to_id: options.reply_to_id || null
      }

      const { data } = await internalChatApi.sendMessage(activeConversation.value.id, payload)
      if (data?.success && data.message) {
        // Se ainda não estiver na lista local, adiciona
        if (!messages.value.some(m => m.id === data.message.id)) {
          messages.value.push(data.message)
        }
        // Atualiza a conversa na lista lateral
        const conv = conversations.value.find(c => c.id === activeConversation.value.id)
        if (conv) {
          conv.last_message_text = data.message.text || 'Arquivo compartilhado'
          conv.last_message_at = data.message.created_at
          // Move para o topo da lista
          conversations.value = [conv, ...conversations.value.filter(c => c.id !== conv.id)]
        }
      }
    } catch (err) {
      ui.showToast('Erro ao enviar mensagem: ' + (err.response?.data?.error || err.message), 'error')
    } finally {
      isSending.value = false
    }
  }

  async function sendMedia(file, metadata = {}) {
    if (!activeConversation.value || !file) return
    isSending.value = true
    try {
      const { data } = await internalChatApi.sendMedia(activeConversation.value.id, file, metadata)
      if (data?.success && data.message) {
        if (!messages.value.some(m => m.id === data.message.id)) {
          messages.value.push(data.message)
        }
        const conv = conversations.value.find(c => c.id === activeConversation.value.id)
        if (conv) {
          conv.last_message_text = data.message.text || (metadata.mediaType === 'audio' ? 'Mensagem de voz' : 'Arquivo compartilhado')
          conv.last_message_at = data.message.created_at
          conversations.value = [conv, ...conversations.value.filter(c => c.id !== conv.id)]
        }
        return data.message
      }
    } catch (err) {
      ui.showToast('Erro ao enviar arquivo: ' + (err.response?.data?.error || err.message), 'error')
    } finally {
      isSending.value = false
    }
  }

  // Recebe mensagem em tempo real do Socket.io
  function handleIncomingInternalMessage(message) {
    if (!message || !message.conversation_id) return

    const isCurrentActive = activeConversation.value?.id === message.conversation_id
    const isFromMe = message.sender_id === auth.user?.id

    if (isCurrentActive) {
      if (!messages.value.some(m => m.id === message.id)) {
        messages.value.push(message)
      }
      if (!isFromMe) {
        internalChatApi.markAsRead(message.conversation_id).catch(() => {})
      }
    } else {
      // Notificação se for de outro usuário
      if (!isFromMe) {
        const senderName = message.sender?.name || 'Colega de equipe'
        const preview = (message.text || 'Enviou um arquivo').slice(0, 50)
        ui.showToast(`💬 [Chat Interno] ${senderName}: "${preview}"`)
      }
    }

    // Atualiza prévia e contador na lista de conversas
    let conv = conversations.value.find(c => c.id === message.conversation_id)
    if (conv) {
      conv.last_message_text = message.text || 'Arquivo compartilhado'
      conv.last_message_at = message.created_at
      if (!isCurrentActive && !isFromMe) {
        conv.unread_count = (conv.unread_count || 0) + 1
      }
      // Reordena conversa para o topo
      conversations.value = [conv, ...conversations.value.filter(c => c.id !== conv.id)]
    } else {
      // Se não estiver na lista (ex: nova conversa criada por outro usuário), recarrega lista
      fetchConversations()
    }
  }

  // Indicador de digitação
  function handleUserTyping({ conversationId, userId, userName, isTyping }) {
    if (userId === auth.user?.id) return
    if (!typingUsers.value[conversationId]) {
      typingUsers.value[conversationId] = {}
    }
    if (isTyping) {
      typingUsers.value[conversationId][userId] = userName
    } else {
      delete typingUsers.value[conversationId][userId]
    }
  }

  // Cria canal ou grupo corporativo
  async function createChannel(payload) {
    try {
      const { data } = await internalChatApi.createChannel(payload)
      if (data?.success && data.conversation) {
        if (!conversations.value.some(c => c.id === data.conversation.id)) {
          conversations.value.unshift(data.conversation)
        }
        await selectConversation(data.conversation)
        ui.showToast(`🎉 Canal "${data.conversation.name}" criado com sucesso!`)
        return data.conversation
      }
    } catch (err) {
      ui.showToast('Erro ao criar canal: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  // Busca detalhes da conversa (participantes e mídias)
  async function fetchConversationDetails(conversationId) {
    if (!conversationId) return
    isLoadingDetails.value = true
    try {
      const { data } = await internalChatApi.getConversationDetails(conversationId)
      if (data?.success && data.details) {
        conversationDetails.value = data.details
      }
    } catch (err) {
      console.warn('Erro ao carregar detalhes da conversa:', err)
    } finally {
      isLoadingDetails.value = false
    }
  }

  // Notificação de novo canal criado em tempo real
  function handleConversationCreated(conv) {
    if (!conv || !conv.id) return
    if (!conversations.value.some(c => c.id === conv.id)) {
      conversations.value.unshift(conv)
      ui.showToast(`📢 Novo canal disponível: ${conv.name}`)
    }
  }

  // ─── Fase 4: Reações, Fixação e Edição/Exclusão ──────────────────────────────
  const pinnedMessages = computed(() => {
    return messages.value.filter(m => m.is_pinned && !m.is_deleted)
  })

  async function toggleReaction(messageId, emoji) {
    try {
      // Otimista
      const msg = messages.value.find(m => m.id === messageId)
      if (msg) {
        msg.reactions = Array.isArray(msg.reactions) ? [...msg.reactions] : []
        const idx = msg.reactions.findIndex(r => r.emoji === emoji && r.user_id === auth.user?.id)
        if (idx >= 0) {
          msg.reactions.splice(idx, 1)
        } else {
          msg.reactions.push({ emoji, user_id: auth.user?.id, user_name: auth.user?.name })
        }
      }
      await internalChatApi.toggleReaction(messageId, emoji)
    } catch (err) {
      console.warn('Erro ao alternar reação:', err)
    }
  }

  async function togglePinMessage(messageId) {
    try {
      const msg = messages.value.find(m => m.id === messageId)
      if (msg) {
        msg.is_pinned = !msg.is_pinned
      }
      const { data } = await internalChatApi.togglePinMessage(messageId)
      if (data?.success) {
        ui.showToast(data.is_pinned ? '📌 Mensagem fixada!' : 'Mensagem desafixada.')
      }
    } catch (err) {
      ui.showToast('Erro ao fixar mensagem: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  async function editMessage(messageId, newText) {
    try {
      const { data } = await internalChatApi.editMessage(messageId, newText)
      if (data?.success && data.message) {
        const msg = messages.value.find(m => m.id === messageId)
        if (msg) {
          msg.text = data.message.text
          msg.is_edited = true
          msg.edited_at = data.message.edited_at
        }
        ui.showToast('Mensagem editada com sucesso!')
      }
    } catch (err) {
      ui.showToast('Erro ao editar mensagem: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  async function deleteMessage(messageId) {
    try {
      const { data } = await internalChatApi.deleteMessage(messageId)
      if (data?.success) {
        const msg = messages.value.find(m => m.id === messageId)
        if (msg) {
          msg.is_deleted = true
          msg.text = 'Esta mensagem foi apagada'
          msg.media_url = null
        }
        ui.showToast('Mensagem apagada.')
      }
    } catch (err) {
      ui.showToast('Erro ao excluir mensagem: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  // Handlers para eventos de WebSocket em tempo real (Fase 4)
  function handleReactionUpdated({ messageId, reactions }) {
    const msg = messages.value.find(m => m.id === messageId)
    if (msg) {
      msg.reactions = reactions || []
    }
  }

  function handleMessagePinned({ messageId, is_pinned, pinned_by, pinned_at }) {
    const msg = messages.value.find(m => m.id === messageId)
    if (msg) {
      msg.is_pinned = is_pinned
      msg.pinned_by = pinned_by
      msg.pinned_at = pinned_at
    }
  }

  function handleMessageEdited({ messageId, text, is_edited, edited_at }) {
    const msg = messages.value.find(m => m.id === messageId)
    if (msg) {
      msg.text = text
      msg.is_edited = is_edited
      msg.edited_at = edited_at
    }
  }

  function handleMessageDeleted({ messageId }) {
    const msg = messages.value.find(m => m.id === messageId)
    if (msg) {
      msg.is_deleted = true
      msg.text = 'Esta mensagem foi apagada'
      msg.media_url = null
    }
  }

  return {
    conversations,
    teamMembers,
    activeConversation,
    conversationDetails,
    isLoadingDetails,
    messages,
    pinnedMessages,
    isLoading,
    isSending,
    typingUsers,
    totalUnreadCount,
    fetchConversations,
    fetchTeamMembers,
    selectConversation,
    startDirectChatWith,
    createChannel,
    fetchConversationDetails,
    handleConversationCreated,
    sendMessage,
    sendMedia,
    handleIncomingInternalMessage,
    handleUserTyping,
    toggleReaction,
    togglePinMessage,
    editMessage,
    deleteMessage,
    handleReactionUpdated,
    handleMessagePinned,
    handleMessageEdited,
    handleMessageDeleted
  }
})
