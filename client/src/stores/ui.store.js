import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  // View ativa no SPA
  const activeView = ref(sessionStorage.getItem('activeView') || 'dashboard')

  // Toast notifications
  const toasts = ref([])

  // Modal aberto
  const openModals = ref(new Set())

  // Status do WhatsApp
  const whatsappStatus = ref('disconnected') // 'connected' | 'disconnected' | 'scan_qr'
  const whatsappQrCode = ref(null)
  const whatsappAccounts = ref([])

  // Status de conexão com o servidor e usuários online
  const serverOnline = ref(false)
  const onlineUsersCount = ref(1)
  const onlineUsersList = ref([])

  function switchView(view) {
    activeView.value = view
    try { sessionStorage.setItem('activeView', view) } catch {}
  }

  function showToast(message, type = 'success', duration = 3500) {
    const id = Date.now()
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, duration)
  }

  // Estado do Chat Mobile (para ocultar navegação inferior tipo WhatsApp)
  const isMobileChatOpen = ref(false)

  function setMobileChatOpen(val) {
    isMobileChatOpen.value = Boolean(val)
  }

  return {
    activeView, toasts, openModals, whatsappStatus, whatsappQrCode, whatsappAccounts, serverOnline,
    onlineUsersCount, onlineUsersList, isMobileChatOpen, setMobileChatOpen,
    switchView, showToast, openModal, closeModal, isModalOpen
  }
})
