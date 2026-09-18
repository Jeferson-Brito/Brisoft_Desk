import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { notesApi } from '@/api/notes.api'
import { useAuthStore } from '@/stores/auth.store'

const STORAGE_KEY_TABS = 'brisoft_notepad_tabs'
const STORAGE_KEY_ACTIVE = 'brisoft_notepad_active_tab'

function createDefaultTab(index = 1) {
  return {
    id: 'tab_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    savedId: null,
    title: `Sem título ${index}`,
    content: '',
    isDirty: false,
    updatedAt: new Date().toISOString()
  }
}

export const useNotepadStore = defineStore('notepad', () => {
  const auth = useAuthStore()
  const isOpen = ref(false)
  const isHistoryOpen = ref(false)
  const historyLoading = ref(false)
  const isSaving = ref(false)
  const savedNotes = ref([])
  const filterUserId = ref('')
  const searchQuery = ref('')
  const autoSave = ref(localStorage.getItem('brisoft_notepad_autosave') === 'true')
  let autoSaveTimeout = null

  function toggleAutoSave() {
    autoSave.value = !autoSave.value
    try {
      localStorage.setItem('brisoft_notepad_autosave', autoSave.value ? 'true' : 'false')
    } catch (e) {
      console.warn('Erro ao salvar preferência de auto-save:', e)
    }
  }

  // Abas abertas no editor
  const tabs = ref([])
  const activeTabId = ref('')

  // Carregar abas do localStorage
  try {
    const rawTabs = localStorage.getItem(STORAGE_KEY_TABS)
    if (rawTabs) {
      const parsed = JSON.parse(rawTabs)
      if (Array.isArray(parsed) && parsed.length > 0) {
        tabs.value = parsed
      }
    }
  } catch (e) {
    console.error('Falha ao restaurar abas do bloco de notas:', e)
  }

  if (tabs.value.length === 0) {
    const firstTab = createDefaultTab(1)
    tabs.value = [firstTab]
    activeTabId.value = firstTab.id
  } else {
    const savedActive = localStorage.getItem(STORAGE_KEY_ACTIVE)
    if (savedActive && tabs.value.some(t => t.id === savedActive)) {
      activeTabId.value = savedActive
    } else {
      activeTabId.value = tabs.value[0].id
    }
  }

  // Persistir abas localmente no navegador
  watch(tabs, (newTabs) => {
    try {
      localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(newTabs))
    } catch (e) {
      console.warn('Erro ao persistir abas:', e)
    }
  }, { deep: true })

  watch(activeTabId, (newId) => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, newId)
    } catch (e) {
      console.warn('Erro ao persistir aba ativa:', e)
    }
  })

  const activeTab = computed(() => {
    return tabs.value.find(t => t.id === activeTabId.value) || tabs.value[0] || null
  })

  function toggle() {
    isOpen.value = !isOpen.value
  }

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function addTab(initialData = null) {
    const newTab = {
      id: 'tab_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      savedId: initialData?.id || null,
      title: initialData?.title || `Sem título ${tabs.value.length + 1}`,
      content: initialData?.content || '',
      isDirty: false,
      updatedAt: new Date().toISOString()
    }
    tabs.value.push(newTab)
    activeTabId.value = newTab.id
    return newTab
  }

  function closeTab(tabId) {
    if (tabs.value.length === 1) {
      // Se for a última aba, apenas reseta ela
      const single = tabs.value[0]
      single.title = 'Sem título 1'
      single.content = ''
      single.savedId = null
      single.isDirty = false
      single.updatedAt = new Date().toISOString()
      return
    }

    const index = tabs.value.findIndex(t => t.id === tabId)
    if (index === -1) return

    tabs.value.splice(index, 1)

    // Se fechou a aba ativa, define nova aba ativa
    if (activeTabId.value === tabId) {
      const nextTab = tabs.value[Math.max(0, index - 1)]
      activeTabId.value = nextTab ? nextTab.id : (tabs.value[0]?.id || '')
    }
  }

  function selectTab(tabId) {
    activeTabId.value = tabId
  }

  function markCurrentDirty() {
    if (activeTab.value) {
      activeTab.value.isDirty = true
      activeTab.value.updatedAt = new Date().toISOString()
      if (autoSave.value) {
        clearTimeout(autoSaveTimeout)
        autoSaveTimeout = setTimeout(() => {
          saveCurrentNote()
        }, 1200)
      }
    }
  }

  // Carregar histórico de notas do servidor
  async function fetchNotes() {
    historyLoading.value = true
    try {
      const res = await notesApi.list(filterUserId.value || '')
      if (res.data?.success) {
        savedNotes.value = res.data.notes || []
      }
    } catch (err) {
      console.error('Erro ao buscar notas:', err)
    } finally {
      historyLoading.value = false
    }
  }

  // Salvar nota atual no servidor
  async function saveCurrentNote() {
    const tab = activeTab.value
    if (!tab) return { success: false }

    isSaving.value = true
    try {
      const payload = {
        id: tab.savedId || undefined,
        title: tab.title.trim() || 'Sem título',
        content: tab.content || ''
      }
      const res = await notesApi.save(payload)
      if (res.data?.success && res.data.note) {
        tab.savedId = res.data.note.id
        tab.title = res.data.note.title
        tab.isDirty = false
        tab.updatedAt = res.data.note.updated_at
        
        // Atualiza na lista salva se já estiver carregada
        const idx = savedNotes.value.findIndex(n => n.id === tab.savedId)
        if (idx >= 0) {
          savedNotes.value[idx] = res.data.note
        } else {
          savedNotes.value.unshift(res.data.note)
        }
        return { success: true, note: res.data.note }
      }
      return { success: false, error: res.data?.error || 'Erro ao salvar' }
    } catch (err) {
      console.error('Erro ao salvar nota:', err)
      return { success: false, error: err.response?.data?.error || err.message }
    } finally {
      isSaving.value = false
    }
  }

  // Carregar uma nota salva numa aba
  function openSavedNoteInTab(savedNote) {
    // Verifica se já está aberta em alguma aba
    const existing = tabs.value.find(t => t.savedId === savedNote.id)
    if (existing) {
      activeTabId.value = existing.id
      isHistoryOpen.value = false
      return
    }

    // Se a aba atual estiver vazia e sem id salvo, aproveita ela
    const current = activeTab.value
    if (current && !current.savedId && !current.content && current.title.startsWith('Sem título')) {
      current.savedId = savedNote.id
      current.title = savedNote.title
      current.content = savedNote.content
      current.isDirty = false
      current.updatedAt = savedNote.updated_at
      isHistoryOpen.value = false
      return
    }

    // Caso contrário, abre em nova aba
    addTab(savedNote)
    isHistoryOpen.value = false
  }

  // Excluir nota salva do servidor
  async function deleteNote(id) {
    try {
      const res = await notesApi.remove(id)
      if (res.data?.success) {
        savedNotes.value = savedNotes.value.filter(n => n.id !== id)
        // Se alguma aba tinha esse savedId, desvincula
        tabs.value.forEach(t => {
          if (t.savedId === id) {
            t.savedId = null
            t.isDirty = true
          }
        })
        return { success: true }
      }
      return { success: false }
    } catch (err) {
      console.error('Erro ao deletar nota:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    isOpen,
    isHistoryOpen,
    historyLoading,
    isSaving,
    savedNotes,
    filterUserId,
    searchQuery,
    autoSave,
    toggleAutoSave,
    tabs,
    activeTabId,
    activeTab,
    toggle,
    open,
    close,
    addTab,
    closeTab,
    selectTab,
    markCurrentDirty,
    fetchNotes,
    saveCurrentNote,
    openSavedNoteInTab,
    deleteNote
  }
})
