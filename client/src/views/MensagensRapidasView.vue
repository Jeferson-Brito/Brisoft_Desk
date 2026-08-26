<template>
  <div class="table-view-layout" style="width:100%;">
    <div class="table-toolbar">
      <div class="table-toolbar-left">
        <div class="search-input-wrap" style="width:280px;">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="searchTerm" type="text" placeholder="Buscar mensagens rápidas..." />
        </div>
      </div>
      <button class="btn-primary" disabled title="Mensagens rápidas ainda não integradas ao servidor">
        <i class="fa-solid fa-plus"></i> Nova Mensagem
      </button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:16px;">
      <div v-if="filteredMessages.length === 0" class="card-box" style="padding:32px;text-align:center;color:#64748b;">
        Nenhuma mensagem rápida cadastrada.
      </div>
      <div
        v-for="(msg, idx) in filteredMessages"
        :key="idx"
        class="card-box"
        style="padding:16px;background:#ffffff;border:1px solid #e2e8f0;display:flex;flex-direction:column;justify-content:space-between;gap:12px;"
      >
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <strong style="font-size:13.5px;color:#1e293b;">{{ msg.title }}</strong>
            <span class="tag-pill" :class="idx % 2 === 0 ? 'tag-blue' : 'tag-purple'">{{ msg.tag }}</span>
          </div>
          <p style="font-size:12.5px;color:#475569;margin:0;line-height:1.45;white-space:pre-wrap;">{{ msg.text }}</p>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid #f1f5f9;">
          <span style="font-size:11px;color:#94a3b8;">Atalho: <code>/{{ msg.shortcut }}</code></span>
          <div style="display:flex;gap:6px;">
            <button class="btn-icon" title="Editar" @click="ui.showToast('Editar mensagem')">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-icon" style="color:#ef4444;" title="Excluir" @click="ui.showToast('Excluir mensagem')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
const searchTerm = ref('')

const messages = ref([])

const filteredMessages = computed(() => {
  if (!searchTerm.value.trim()) return messages.value
  const t = searchTerm.value.toLowerCase()
  return messages.value.filter(m => m.title.toLowerCase().includes(t) || m.text.toLowerCase().includes(t) || m.shortcut.includes(t))
})
</script>
