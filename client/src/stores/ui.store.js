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

  // Status de conexão com o servidor
  const serverOnline = ref(false)

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

  function openModal(name) { openModals.value.add(name) }
  function closeModal(name) { openModals.value.delete(name) }
  function isModalOpen(name) { return openModals.value.has(name) }

  return {
    activeView, toasts, openModals, whatsappStatus, whatsappQrCode, whatsappAccounts, serverOnline,
    switchView, showToast, openModal, closeModal, isModalOpen
  }
})
