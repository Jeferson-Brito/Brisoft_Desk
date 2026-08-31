// ==========================================================================
// SIDEBAR STORE — controla o estado do drawer mobile da sidebar
// ==========================================================================
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSidebarStore = defineStore('sidebar', () => {
  const mobileOpen = ref(false)

  function open()   { mobileOpen.value = true  }
  function close()  { mobileOpen.value = false }
  function toggle() { mobileOpen.value = !mobileOpen.value }

  return { mobileOpen, open, close, toggle }
})
