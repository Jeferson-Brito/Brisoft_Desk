import { io } from 'socket.io-client'
import { useAuthStore }   from '@/stores/auth.store'
import { useTicketStore } from '@/stores/tickets.store'
import { useUiStore }     from '@/stores/ui.store'

let socket = null

/**
 * Composable que gerencia a conexão Socket.io.
 * Todos os eventos do servidor atualizam as Pinia stores diretamente —
 * a UI reage automaticamente sem nenhum render() manual.
 */
export function useSocket() {
  function connect() {
    const auth = useAuthStore()
    if (!auth.token) return
    if (socket?.connected) return

    if (socket) {
      socket.auth = { token: auth.token }
      socket.connect()
      return
    }

    socket = io('/', {
      auth:               { token: auth.token },
      reconnectionAttempts: Infinity,
      reconnectionDelay:  2000,
      timeout:            15000,
      transports:         ['websocket', 'polling']
    })

    const tickets = useTicketStore()
    const ui      = useUiStore()

    // ── Conexão ──────────────────────────────────────────────────────────────
    socket.on('connect', () => {
      ui.serverOnline = true
      tickets.fetchQueue({ silent: true }).catch(() => {})
      tickets.notifyKpisUpdated()
    })

    socket.on('disconnect', () => {
      ui.serverOnline = false
    })

    socket.on('connect_error', (err) => {
      ui.serverOnline = false
      if (/autenticado|inválida|expirada/i.test(err.message)) {
        auth.logout()
      }
    })

    socket.on('session_expired', () => {
      disconnect()
      auth.clearSession()
      window.location.assign('/login')
    })

    socket.io.on('reconnect', () => {
      ui.serverOnline = true
      tickets.fetchQueue({ silent: true }).catch(() => {})
      tickets.notifyKpisUpdated()
    })

    // ── WhatsApp ─────────────────────────────────────────────────────────────
    socket.on('whatsapp_status', (data) => {
      ui.whatsappStatus = data.status
      if (auth.isAdmin && Array.isArray(data.accounts)) ui.whatsappAccounts = data.accounts
    })

    socket.on('whatsapp_accounts_updated', (data) => {
      if (!auth.isAdmin) return
      ui.whatsappAccounts = data.accounts || []
    })

    // ── Tickets em tempo real ─────────────────────────────────────────────────
    socket.on('ticket_created', ({ ticket }) => {
      if (!ticket) return
      tickets.receiveTicket(ticket)
      tickets.notifyKpisUpdated()
      _notifyIfRelevant(ticket, `💬 Novo atendimento (${ticket.department || 'Geral'}): ${ticket.clientName || 'Cliente'}`)
    })

    socket.on('ticket_updated', ({ ticket }) => {
      if (!ticket) return
      tickets.receiveTicket(ticket)
      tickets.notifyKpisUpdated()
    })

    socket.on('queue_updated', ({ ticket }) => {
      if (!ticket) return
      tickets.receiveTicket(ticket)
      tickets.notifyKpisUpdated()
    })

    socket.on('new_message', (data) => {
      const { ticketId, message, ticket, contact } = data

      // Garante que o ticket existe na store
      if (ticket) tickets.receiveTicket(ticket)
      if (message && ticketId) {
        tickets.appendMessage(ticketId, message)
      }
      tickets.notifyKpisUpdated()

      // Toast + som apenas para mensagens do cliente destinadas ao usuário
      if (message?.sender === 'client' || !message?.sender) {
        const t = tickets.queue.find(q => q.id === ticketId)
        if (t && _isForMe(t)) {
          const name     = contact?.name || t.clientName || 'Cliente'
          const preview  = (message?.text || '').substring(0, 40)
          ui.showToast(`💬 ${name}: "${preview}"`)
          _playMessageSound()
        }
      }
    })

    socket.on('rating_received', (data) => {
      const auth = useAuthStore()
      if (data.agentName && auth.user?.name === data.agentName) {
        ui.showToast(`⭐ Cliente avaliou seu atendimento com ${data.rating} estrelas!`)
      }
    })

    socket.on('kpis_updated', () => {
      tickets.notifyKpisUpdated()
    })
  }

  function disconnect() {
    socket?.disconnect()
    socket = null
  }

  function sendEvent(event, payload) {
    socket?.emit(event, payload)
  }

  return { connect, disconnect, sendEvent, getSocket: () => socket }
}

// ─── Helpers privados ─────────────────────────────────────────────────────────

function _isForMe(ticket) {
  const auth = useAuthStore()
  if (auth.isAdmin) return true
  if (auth.isSupervisor && ticket.department_id && auth.departmentIds.includes(String(ticket.department_id))) return true
  if (auth.departmentId && ticket.department_id && String(auth.departmentId) === String(ticket.department_id)) return true
  if (auth.departmentName && ticket.department && auth.departmentName.toLowerCase() === ticket.department.toLowerCase()) return true
  return false
}

function _notifyIfRelevant(ticket, message) {
  if (!_isForMe(ticket)) return
  if (window.location.pathname.startsWith('/painel-tv')) return
  const ui = useUiStore()
  ui.showToast(message)
  _playTicketSound()
}

function _playMessageSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18)
    osc.start(); osc.stop(ctx.currentTime + 0.18)
  } catch {}
}

function _playTicketSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const ping = (freq, start, dur) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.4, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.01, start + dur)
      osc.start(start); osc.stop(start + dur)
    }
    ping(900, ctx.currentTime, 0.22)
    ping(1300, ctx.currentTime + 0.26, 0.22)
  } catch {}
}
