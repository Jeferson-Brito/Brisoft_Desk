<template>
  <aside class="tools-sidebar" id="toolsSidebar">
    <!-- Apenas o ícone do Bloco de Notas, centralizado e compacto -->
    <nav class="sidebar-nav">
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
  width: 44px;
  min-width: 44px;
  max-width: 44px;
  background-color: #f3f4f6;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  height: 100vh;
  padding: 12px 0;
  box-sizing: border-box;
  flex-shrink: 0;
  z-index: 60;
  user-select: none;
  position: relative;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.nav-item {
  width: 34px;
  height: 34px;
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
  top: 4px;
  right: 4px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #3b82f6;
  box-shadow: 0 0 0 2px #f3f4f6;
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
