<template>
  <aside class="tools-sidebar" id="toolsSidebar">
    <!-- Header compatível com o design do sidebar esquerdo -->
    <div class="sidebar-header">
      <div class="tools-header-icon" title="Barra de Ferramentas e Atalhos">
        <i class="fa-solid fa-toolbox"></i>
      </div>
    </div>

    <!-- Lista de Ferramentas / Ícones Verticais -->
    <nav class="sidebar-nav">
      <!-- Bloco de Notas (Windows Notepad) -->
      <button
        type="button"
        class="nav-item"
        :class="{ active: notepad.isOpen }"
        title="Bloco de Notas"
        @click="notepad.toggle"
      >
        <i class="fa-regular fa-note-sticky"></i>
        <span v-if="hasDirtyTab" class="nav-dot-badge" title="Anotações com alterações"></span>
      </button>
    </nav>

    <!-- Base do Sidebar -->
    <div class="sidebar-bottom">
      <button
        type="button"
        class="bottom-action-btn"
        :title="notepad.isOpen ? 'Fechar painéis' : 'Abrir Bloco de Notas'"
        @click="notepad.toggle"
      >
        <i :class="notepad.isOpen ? 'fa-solid fa-angles-right' : 'fa-solid fa-angles-left'"></i>
      </button>
    </div>

    <!-- Drawer do Bloco de Notas -->
    <NotepadDrawer />
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useNotepadStore } from '@/stores/notepad.store'
import NotepadDrawer from '@/components/tools/NotepadDrawer.vue'

const notepad = useNotepadStore()

const hasDirtyTab = computed(() => {
  return notepad.tabs.some(t => t.isDirty)
})
</script>

<style scoped>
.tools-sidebar {
  width: 60px;
  min-width: 60px;
  max-width: 60px;
  background-color: #f3f4f6;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100vh;
  padding: 10px 0 14px;
  box-sizing: border-box;
  flex-shrink: 0;
  z-index: 60;
  user-select: none;
  position: relative;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding-bottom: 10px;
  border-bottom: 1px solid #e5e7eb;
}

.tools-header-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 16px;
  transition: all 0.15s ease;
}

.tools-header-icon:hover {
  background-color: #e5e7eb;
  color: #1e293b;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding-top: 10px;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #64748b;
  text-decoration: none;
  position: relative;
  transition: all 0.15s ease;
  cursor: pointer;
  border: none;
  background: transparent;
  outline: none;
  padding: 0;
}

.nav-item i {
  font-size: 16px;
  transition: color 0.15s ease;
}

.nav-item:hover {
  background-color: #e5e7eb;
  color: #1e293b;
}

.nav-item.active {
  background-color: #ffffff;
  color: #1f62d0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.nav-item.active i {
  color: #1f62d0;
}

.nav-dot-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #3b82f6;
  box-shadow: 0 0 0 2px #f3f4f6;
}

.sidebar-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding-top: 10px;
  border-top: 1px solid #e5e7eb;
}

.bottom-action-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.bottom-action-btn:hover {
  background-color: #e5e7eb;
  color: #1e293b;
}

@media (max-width: 768px) {
  .tools-sidebar {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 58;
  }
}
</style>
