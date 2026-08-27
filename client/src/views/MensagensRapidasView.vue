<template>
  <div class="table-view-layout" style="width:100%;">
    <!-- Toolbar -->
    <div class="table-toolbar">
      <div class="table-toolbar-left">
        <div class="search-input-wrap" style="width:320px;">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="searchTerm" type="text" placeholder="Buscar mensagens rápidas..." />
        </div>
      </div>
      <button v-if="auth.isAdmin" class="btn-primary" @click="openCreate">
        <i class="fa-solid fa-plus"></i> Nova Mensagem
      </button>
    </div>

    <!-- Grid de Cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:16px;">
      <div v-if="filteredMessages.length === 0" class="card-box" style="padding:48px;text-align:center;color:#64748b;grid-column:1/-1;">
        <i class="fa-regular fa-comment-dots" style="font-size:32px;color:#cbd5e1;margin-bottom:12px;display:block;"></i>
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
            <span class="tag-pill" :class="idx % 2 === 0 ? 'tag-blue' : 'tag-purple'">{{ msg.category || 'Atendimento' }}</span>
          </div>
          <p class="qm-card-content">{{ msg.content }}</p>
        </div>

        <div class="qm-card-footer">
          <span class="qm-shortcut">
            Atalho: <code v-if="msg.shortcut">/{{ msg.shortcut }}</code><span v-else style="color:#94a3b8;">não definido</span>
          </span>
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
      <div v-if="showForm" class="modal-overlay active" @click.self="showForm = false">
        <div class="modal-container" style="max-width:540px;">
          <div class="modal-header">
            <span class="modal-title">{{ editingId ? 'Editar mensagem rápida' : 'Nova mensagem rápida' }}</span>
            <button type="button" class="btn-icon" @click="showForm = false">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form @submit.prevent="saveMessage">
            <div class="modal-body">
              <div class="form-group">
                <label>Título *</label>
                <input v-model="form.title" type="text" required maxlength="120" placeholder="Ex.: Saudação" class="form-control" />
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                  <label>Categoria</label>
                  <input v-model="form.category" type="text" maxlength="80" placeholder="Ex.: Atendimento" class="form-control" />
                </div>
                <div class="form-group">
                  <label>Atalho (ex: /saudacao)</label>
                  <input v-model="form.shortcut" type="text" maxlength="50" placeholder="Ex.: saudacao" class="form-control" />
                </div>
              </div>

              <div class="form-group">
                <label>Mensagem *</label>
                <textarea
                  v-model="form.content"
                  required
                  rows="5"
                  maxlength="4000"
                  placeholder="Digite o texto da mensagem rápida que será enviado..."
                  class="form-control"
                  style="resize:vertical;"
                ></textarea>
              </div>

              <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#334155;cursor:pointer;">
                <input v-model="form.is_active" type="checkbox" style="width:16px;height:16px;accent-color:#2563eb;" />
                <span>Disponível para todos os atendentes</span>
              </label>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" @click="showForm = false">Cancelar</button>
              <button type="submit" class="btn-primary" :disabled="saving">
                <i class="fa-solid fa-floppy-disk" :class="{ 'fa-spin': saving }"></i>
                {{ saving ? 'Salvando...' : 'Salvar' }}
              </button>
            </div>
          </form>
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

const emptyForm = () => ({ title: '', category: 'Atendimento', shortcut: '', content: '', is_active: true })
const form = ref(emptyForm())

const filteredMessages = computed(() => {
  if (!searchTerm.value.trim()) return messages.value
  const t = searchTerm.value.toLowerCase()
  return messages.value.filter(m =>
    (m.title || '').toLowerCase().includes(t) ||
    (m.content || '').toLowerCase().includes(t) ||
    (m.shortcut || '').toLowerCase().includes(t) ||
    (m.category || '').toLowerCase().includes(t)
  )
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
  form.value = {
    title: message.title || '',
    category: message.category || 'Atendimento',
    shortcut: message.shortcut || '',
    content: message.content || '',
    is_active: message.is_active ?? true
  }
  showForm.value = true
}

async function saveMessage() {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    ui.showToast('Informe o título e a mensagem.', 'error')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await quickMessagesApi.update(editingId.value, form.value)
      ui.showToast('Mensagem rápida atualizada com sucesso!')
    } else {
      await quickMessagesApi.create(form.value)
      ui.showToast('Mensagem rápida criada com sucesso!')
    }
    showForm.value = false
    await loadMessages()
  } catch (error) {
    ui.showToast(error.response?.data?.error || 'Não foi possível salvar a mensagem.', 'error')
  } finally {
    saving.value = false
  }
}

async function removeMessage(message) {
  if (!window.confirm(`Excluir a mensagem "${message.title}"?`)) return
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
.qm-card {
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.qm-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.qm-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 8px;
}

.qm-card-title {
  font-size: 14px;
  color: #1e293b;
  font-weight: 700;
}

.qm-card-content {
  font-size: 13px;
  color: #475569;
  margin: 0;
  line-height: 1.5;
  white-space: pre-wrap;
}

.qm-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.qm-shortcut {
  font-size: 12px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
}

.qm-shortcut code {
  background: #0f172a;
  color: #38bdf8;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 600;
  font-family: monospace;
}

.btn-icon-danger {
  color: #ef4444;
}

.btn-icon-danger:hover {
  background: rgba(239, 68, 68, 0.1);
}
</style>
