<template>
  <div class="table-view-layout" style="width:100%;">
    <div class="table-toolbar">
      <div class="table-toolbar-left">
        <div class="search-input-wrap" style="width:280px;">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="searchTerm" type="text" placeholder="Buscar mensagens rápidas..." />
        </div>
      </div>
      <button v-if="auth.isAdmin" class="btn-primary" @click="openCreate">
        <i class="fa-solid fa-plus"></i> Nova Mensagem
      </button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:16px;">
      <div v-if="filteredMessages.length === 0" class="card-box" style="padding:32px;text-align:center;color:#64748b;">
        Nenhuma mensagem rápida cadastrada.
      </div>
      <div
        v-for="(msg, idx) in filteredMessages"
        :key="msg.id"
        class="card-box qm-card"
      >
        <div>
          <div class="qm-card-header">
            <strong class="qm-card-title">{{ msg.title }}</strong>
            <span class="tag-pill" :class="idx % 2 === 0 ? 'tag-blue' : 'tag-purple'">{{ msg.category }}</span>
          </div>
          <p class="qm-card-content">{{ msg.content }}</p>
        </div>
        <div class="qm-card-footer">
          <span class="qm-shortcut">Atalho: <code v-if="msg.shortcut">/{{ msg.shortcut }}</code><span v-else style="color:#475569;">não definido</span></span>
          <div v-if="auth.isAdmin" style="display:flex;gap:6px;">
            <button class="btn-icon" title="Editar" @click="openEdit(msg)">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-icon btn-icon-danger" title="Excluir" @click="removeMessage(msg)">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de criação/edição -->
    <Teleport to="body">
      <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
        <div class="modal-panel qm-modal">
          <div class="modal-header">
            <h3>{{ editingId ? 'Editar mensagem rápida' : 'Nova mensagem rápida' }}</h3>
            <button class="modal-close-btn" @click="showForm = false"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body qm-form-grid">
            <div class="form-group">
              <label>Título *</label>
              <input v-model="form.title" maxlength="120" placeholder="Ex.: Aguarde um momento" />
            </div>
            <div class="form-group">
              <label>Categoria</label>
              <input v-model="form.category" maxlength="80" placeholder="Ex.: Geral" />
            </div>
            <div class="form-group">
              <label>Atalho <span style="color:#64748b;font-weight:400;">(digitado como /atalho no chat)</span></label>
              <input v-model="form.shortcut" maxlength="50" placeholder="Ex.: aguarde" />
            </div>
            <div class="form-group qm-form-full">
              <label>Mensagem *</label>
              <textarea v-model="form.content" rows="6" maxlength="4000" placeholder="Digite o texto da mensagem rápida..."></textarea>
            </div>
            <label class="qm-checkbox-row">
              <input v-model="form.is_active" type="checkbox" />
              <span>Disponível para os atendentes</span>
            </label>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showForm = false">Cancelar</button>
            <button class="btn-primary" :disabled="saving" @click="saveMessage">
              <i class="fa-solid fa-floppy-disk"></i>
              {{ saving ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { quickMessagesApi } from '@/api/quick-messages.api'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

const auth = useAuthStore()
const ui = useUiStore()
const searchTerm = ref('')
const messages = ref([])
const showForm = ref(false)
const editingId = ref(null)
const saving = ref(false)
const emptyForm = () => ({ title: '', category: 'Geral', shortcut: '', content: '', is_active: true })
const form = ref(emptyForm())

const filteredMessages = computed(() => {
  if (!searchTerm.value.trim()) return messages.value
  const t = searchTerm.value.toLowerCase()
  return messages.value.filter(m => m.title.toLowerCase().includes(t) || m.content.toLowerCase().includes(t) || (m.shortcut || '').includes(t))
})

async function loadMessages() {
  try {
    const { data } = await quickMessagesApi.list()
    messages.value = data.messages || []
  } catch (_) {
    ui.showToast('Não foi possível carregar as mensagens rápidas.', 'error')
  }
}

function openCreate() {
  editingId.value = null
  form.value = emptyForm()
  showForm.value = true
}

function openEdit(message) {
  editingId.value = message.id
  form.value = { ...message }
  showForm.value = true
}

async function saveMessage() {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    ui.showToast('Informe o título e a mensagem.', 'error')
    return
  }
  saving.value = true
  try {
    if (editingId.value) await quickMessagesApi.update(editingId.value, form.value)
    else await quickMessagesApi.create(form.value)
    showForm.value = false
    await loadMessages()
    ui.showToast('Mensagem rápida salva com sucesso!')
  } catch (error) {
    ui.showToast(error.response?.data?.error || 'Não foi possível salvar a mensagem.', 'error')
  } finally {
    saving.value = false
  }
}

async function removeMessage(message) {
  if (!window.confirm(`Excluir a mensagem “${message.title}”?`)) return
  try {
    await quickMessagesApi.remove(message.id)
    await loadMessages()
    ui.showToast('Mensagem rápida excluída.')
  } catch (error) {
    ui.showToast(error.response?.data?.error || 'Não foi possível excluir a mensagem.', 'error')
  }
}

onMounted(loadMessages)
</script>

<style scoped>
/* ─── Cards ─────────────────────────────────────────── */
.qm-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
}

.qm-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.qm-card-title {
  font-size: 13.5px;
  color: #e2e8f0;
  font-weight: 600;
}

.qm-card-content {
  font-size: 12.5px;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
  white-space: pre-wrap;
}

.qm-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid #1e293b;
}

.qm-shortcut {
  font-size: 11px;
  color: #64748b;
}

.qm-shortcut code {
  background: #1e293b;
  color: #7dd3fc;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

/* ─── Modal ──────────────────────────────────────────── */
.qm-modal {
  max-width: 540px;
  width: 100%;
}

.modal-body.qm-form-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input,
.form-group textarea {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 9px 12px;
  color: #e2e8f0;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  resize: vertical;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #2563eb;
}

.qm-form-full {
  grid-column: 1 / -1;
}

/* ─── Checkbox Row ───────────────────────────────────── */
.qm-checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: #cbd5e1;
  font-size: 13px;
}

.qm-checkbox-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #2563eb;
  cursor: pointer;
}
</style>
