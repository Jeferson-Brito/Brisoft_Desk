import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth.store'
import { ticketsApi } from '@/api/tickets.api'

export const useTicketStore = defineStore('tickets', () => {
  // ─── State ──────────────────────────────────────────────────────────────────
  const queue          = ref([])      // todos os tickets ativos (aguardando + em_atendimento)
  const activeTicketId = ref(null)    // ticket selecionado no painel direito
  const loading        = ref(false)
  const assumeRequests = new Map()

  // ─── Getters ─────────────────────────────────────────────────────────────────

  // Tickets visíveis conforme perfil: admin vê tudo, analista vê só seu departamento
  const visibleTickets = computed(() => {
    const auth = useAuthStore()
    if (auth.isAdmin) return queue.value

    return queue.value.filter(t => {
      // Ticket atribuído diretamente ao analista
      if (t.user_id && auth.user?.id && t.user_id === auth.user.id) return true
      // Ticket do departamento do analista
      if (auth.departmentId && t.department_id && String(t.department_id) === String(auth.departmentId)) return true
      if (auth.departmentName && t.department && t.department.toLowerCase() === auth.departmentName.toLowerCase()) return true
      return false
    })
  })

  const waitingTickets     = computed(() => visibleTickets.value.filter(t => t.status === 'aguardando'))
  const inProgressTickets  = computed(() => visibleTickets.value.filter(t => t.status === 'em_atendimento'))
  const chatbotTickets     = computed(() => visibleTickets.value.filter(t => t.status === 'chatbot'))

  const activeTicket = computed(() =>
    visibleTickets.value.find(t => t.id === activeTicketId.value) ?? null
  )

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async function fetchQueue() {
    loading.value = true
    try {
      const { data } = await ticketsApi.list()
      if (data.success) {
        queue.value = (data.tickets || []).map(t => ({
          ...t,
          unreadCount: t.unread_count || 0,
          messages: t.messages || []
        }))
        // Seleciona o primeiro ticket relevante dentro dos visíveis
        if (!activeTicketId.value || !visibleTickets.value.find(t => t.id === activeTicketId.value)) {
          const first = inProgressTickets.value[0] ?? waitingTickets.value[0] ?? null
          activeTicketId.value = first?.id ?? null
        }

        // Se há um ticket ativo, carrega o histórico completo de 24h em background
        if (activeTicketId.value) {
          const act = queue.value.find(t => t.id === activeTicketId.value)
          if (act) {
            ticketsApi.get(activeTicketId.value).then(res => {
              if (res.data?.success && res.data.ticket?.messages) {
                act.messages = res.data.ticket.messages
              }
            }).catch(() => {})
          }
        }
      }
    } finally {
      loading.value = false
    }
  }

  // Recebe ticket via WebSocket e insere/atualiza na fila
  function receiveTicket(ticket) {
    if (ticket?.status === 'finalizado') {
      removeTicket(ticket.id)
      return
    }
    const idx = queue.value.findIndex(t => t.id === ticket.id)
    if (idx !== -1) {
      const existing = queue.value[idx]
      queue.value[idx] = {
        ...existing,
        ...ticket,
        messages: (ticket.messages?.length ?? 0) >= (existing.messages?.length ?? 0)
          ? ticket.messages
          : existing.messages
      }
    } else {
      queue.value.unshift({ ...ticket, unreadCount: ticket.unread_count || 0, messages: ticket.messages || [] })
    }

    // Se o ticket ativo atual não está mais visível para este usuário (ex: foi transferido), desseleciona imediatamente
    if (activeTicketId.value && !visibleTickets.value.some(t => t.id === activeTicketId.value)) {
      const next = inProgressTickets.value[0] ?? waitingTickets.value[0] ?? null
      activeTicketId.value = next?.id ?? null
    }
  }

  // Adiciona mensagem a um ticket existente com desduplicação robusta
  function appendMessage(ticketId, message) {
    const ticket = queue.value.find(t => t.id === ticketId)
    if (!ticket) return
    if (!ticket.messages) ticket.messages = []

    // 1. Se a mensagem tem ID, checa se já existe por ID
    if (message.id) {
      const existingIdx = ticket.messages.findIndex(m => m.id === message.id)
      if (existingIdx !== -1) return

      // Se havia uma mensagem otimista sem ID com mesmo texto/remetente, substitui
      const optIdx = ticket.messages.findIndex(m => !m.id && m.sender === message.sender && m.text === message.text)
      if (optIdx !== -1) {
        ticket.messages[optIdx] = message
        return
      }
    } else {
      // Mensagem local otimista sem ID: previne duplicata exata recente
      const isDuplicate = ticket.messages.some(m => m.sender === message.sender && m.text === message.text && m.time === message.time)
      if (isDuplicate) return
    }

    ticket.messages.push(message)
    ticket.preview = message.text || ticket.preview
    ticket.time    = message.time  || ticket.time
    if (message.sender === 'client' && ticketId !== activeTicketId.value) {
      ticket.unreadCount = (ticket.unreadCount || 0) + 1
    }
  }

  // Remove ticket da fila (após encerramento)
  function removeTicket(ticketId) {
    const idx = queue.value.findIndex(t => t.id === ticketId)
    if (idx !== -1) queue.value.splice(idx, 1)
    if (activeTicketId.value === ticketId) {
      activeTicketId.value = visibleTickets.value[0]?.id ?? null
    }
  }

  // Atualiza campos específicos de um ticket
  function patchTicket(ticketId, patch) {
    const ticket = queue.value.find(t => t.id === ticketId)
    if (ticket) Object.assign(ticket, patch)
  }

  async function selectTicket(ticketId) {
    activeTicketId.value = ticketId
    // Marca como lido
    const ticket = queue.value.find(t => t.id === ticketId)
    if (ticket) {
      ticket.unreadCount = 0
      // Carrega o histórico completo de 24h em background
      try {
        const { data } = await ticketsApi.get(ticketId)
        if (data.success && data.ticket?.messages) {
          ticket.messages = data.ticket.messages
        }
      } catch (e) {}
    }
  }

  async function assume(ticketId) {
    // Um clique duplo ou dois componentes reagindo ao mesmo evento compartilham
    // a mesma requisição. Isso evita que a segunda tentativa reverta a primeira.
    if (assumeRequests.has(ticketId)) return assumeRequests.get(ticketId)

    const request = performAssume(ticketId)
    assumeRequests.set(ticketId, request)
    try {
      return await request
    } finally {
      assumeRequests.delete(ticketId)
    }
  }

  async function performAssume(ticketId) {
    const auth   = useAuthStore()
    const ticket = queue.value.find(t => t.id === ticketId)
    if (!ticket) return { success: false, error: 'Ticket não encontrado' }

    // Snapshot para rollback
    const snapshot = { assumed: ticket.assumed, status: ticket.status, messages: [...(ticket.messages || [])] }

    // Mutação otimista
    ticket.assumed = true
    ticket.status  = 'em_atendimento'
    ticket.messages.push({ type: 'divider', text: `Atendimento assumido por ${auth.user?.name}` })

    try {
      const { data } = await ticketsApi.assume(ticketId)
      if (data.success) return { success: true }
      // Rollback
      Object.assign(ticket, snapshot)
      return { success: false, error: data.error || 'Erro ao assumir' }
    } catch (e) {
      Object.assign(ticket, snapshot)
      const serverError = e.response?.data?.error
      const error = serverError || (e.request ? 'Sem conexão com o servidor' : 'Não foi possível assumir o atendimento')
      return { success: false, error }
    }
  }

  async function close(ticketId) {
    const ticket = queue.value.find(t => t.id === ticketId)
    if (!ticket) return { success: false, error: 'Ticket não encontrado' }

    const ticketIdx = queue.value.findIndex(t => t.id === ticketId)
    const snapshot  = { ...ticket, messages: [...(ticket.messages || [])] }

    // Remoção otimista
    queue.value.splice(ticketIdx, 1)
    activeTicketId.value = visibleTickets.value[0]?.id ?? null

    try {
      const { data } = await ticketsApi.close(ticketId)
      if (data.success) return { success: true }
      // Rollback: reinsere na posição original
      queue.value.splice(ticketIdx, 0, snapshot)
      activeTicketId.value = ticketId
      return { success: false, error: data.error || 'Erro ao encerrar' }
    } catch (e) {
      queue.value.splice(ticketIdx, 0, snapshot)
      activeTicketId.value = ticketId
      return { success: false, error: 'Sem conexão com o servidor' }
    }
  }

  return {
    // state
    queue, activeTicketId, loading,
    // getters
    visibleTickets, waitingTickets, inProgressTickets, chatbotTickets, activeTicket,
    // actions
    fetchQueue, fetchTickets: fetchQueue, receiveTicket, appendMessage, removeTicket, patchTicket,
    selectTicket, assume, close
  }
})
