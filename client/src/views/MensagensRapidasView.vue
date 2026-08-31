<template>
  <div class="qm-page">
    <section class="qm-summary">
      <div class="qm-summary-copy">
        <span class="qm-eyebrow"><i class="fa-solid fa-bolt"></i> Respostas padronizadas</span>
        <h2>Responda com mais agilidade</h2>
        <p>Organize textos frequentes por categoria e use-os diretamente durante os atendimentos.</p>
      </div>
      <div class="qm-stats">
        <div class="qm-stat"><strong>{{ messages.length }}</strong><span>Total</span></div>
        <div class="qm-stat"><strong>{{ activeCount }}</strong><span>Ativas</span></div>
        <div class="qm-stat"><strong>{{ categories.length }}</strong><span>Categorias</span></div>
      </div>
      <button v-if="auth.canManageTeam" class="btn-primary qm-create-btn" @click="openCreate">
        <i class="fa-solid fa-plus"></i> Nova mensagem
      </button>
    </section>

    <section class="qm-toolbar">
      <div class="search-input-wrap qm-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="searchTerm" type="text" placeholder="Buscar por título, conteúdo ou atalho..." />
        <button v-if="searchTerm" type="button" class="qm-clear-search" title="Limpar busca" @click="searchTerm = ''">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <select v-if="auth.canManageTeam" v-model="statusFilter" class="form-control qm-select" aria-label="Filtrar por status">
        <option value="all">Todas</option>
        <option value="active">Ativas</option>
        <option value="inactive">Inativas</option>
      </select>
      <select v-model="sortBy" class="form-control qm-select" aria-label="Ordenar mensagens">
        <option value="title">Título A–Z</option>
        <option value="category">Categoria</option>
        <option value="recent">Mais recentes</option>
      </select>
    </section>

    <div class="qm-category-row" aria-label="Categorias">
      <button type="button" class="qm-category-chip" :class="{ active: selectedCategory === 'all' }" @click="selectedCategory = 'all'">
        Todas <span>{{ messages.length }}</span>
      </button>
      <button
        v-for="category in categories"
        :key="category"
        type="button"
        class="qm-category-chip"
        :class="{ active: selectedCategory === category }"
        @click="selectedCategory = category"
      >
        {{ category }} <span>{{ categoryCount(category) }}</span>
      </button>
    </div>

    <div v-if="loading" class="qm-grid">
      <div v-for="n in 3" :key="n" class="qm-skeleton"></div>
    </div>

    <div v-else-if="filteredMessages.length === 0" class="qm-empty">
      <div class="qm-empty-icon"><i class="fa-regular fa-comment-dots"></i></div>
      <strong>{{ hasFilters ? 'Nenhuma mensagem encontrada' : 'Nenhuma mensagem pronta cadastrada' }}</strong>
      <p>{{ hasFilters ? 'Tente alterar os filtros ou o termo pesquisado.' : 'Crie respostas reutilizáveis para agilizar os atendimentos.' }}</p>
      <button v-if="hasFilters" type="button" class="btn-secondary" @click="clearFilters">Limpar filtros</button>
    </div>

    <div v-else class="qm-grid">
      <article v-for="msg in filteredMessages" :key="msg.id" class="qm-card" :class="{ inactive: !msg.is_active }">
        <div class="qm-card-top">
          <div class="qm-card-icon" :style="categoryStyle(msg.category)">
            <i class="fa-regular fa-message"></i>
          </div>
          <div class="qm-card-heading">
            <strong>{{ msg.title }}</strong>
            <span>{{ msg.category || 'Geral' }}</span>
          </div>
          <span class="qm-status" :class="msg.is_active ? 'active' : 'inactive'">
            <i class="fa-solid fa-circle"></i> {{ msg.is_active ? 'Ativa' : 'Inativa' }}
          </span>
        </div>

        <p class="qm-card-content">{{ msg.content }}</p>
        <p class="qm-author"><i class="fa-regular fa-user"></i> {{ authorLabel(msg) }}</p>

        <div class="qm-card-bottom">
          <button v-if="msg.shortcut" type="button" class="qm-shortcut" title="Copiar atalho" @click="copyText(`/${msg.shortcut}`, 'Atalho copiado!')">
            <span>/{{ msg.shortcut }}</span><i class="fa-regular fa-copy"></i>
          </button>
          <span v-else class="qm-no-shortcut">Sem atalho</span>
          <div class="qm-actions">
            <button type="button" class="btn-icon" title="Copiar mensagem" @click="copyText(msg.content, 'Mensagem copiada!')">
              <i class="fa-regular fa-copy"></i>
            </button>
            <button v-if="canManageMessage(msg)" type="button" class="btn-icon" title="Editar" @click="openEdit(msg)">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button v-if="canManageMessage(msg)" type="button" class="btn-icon btn-icon-danger" title="Excluir" @click="removeMessage(msg)">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </article>
    </div>

    <Teleport to="body">
      <div v-if="showForm" class="modal-overlay active" @click.self="closeForm">
        <div class="modal-container qm-modal">
          <div class="modal-header">
            <div>
              <span class="modal-title">{{ editingId ? 'Editar mensagem pronta' : 'Nova mensagem pronta' }}</span>
              <p class="qm-modal-subtitle">O texto ficará disponível no campo de resposta dos atendentes.</p>
            </div>
            <button type="button" class="btn-icon" title="Fechar" @click="closeForm"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <form @submit.prevent="saveMessage">
            <div class="modal-body qm-modal-body">
              <div class="qm-form-fields">
                <div class="form-group">
                  <label>Título <span>*</span></label>
                  <input v-model="form.title" type="text" required maxlength="120" placeholder="Ex.: Confirmação de atendimento" class="form-control" />
                </div>

                <div class="qm-two-columns">
                  <div class="form-group">
                    <label>Categoria</label>
                    <input v-model="form.category" list="quick-message-categories" type="text" maxlength="80" placeholder="Ex.: Atendimento" class="form-control" />
                    <datalist id="quick-message-categories">
                      <option v-for="category in categories" :key="category" :value="category" />
                    </datalist>
                  </div>
                  <div class="form-group">
                    <label>Atalho</label>
                    <div class="qm-shortcut-input">
                      <span>/</span>
                      <input v-model="form.shortcut" type="text" maxlength="50" placeholder="confirmacao" class="form-control" @input="sanitizeShortcut" />
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <div class="qm-label-row"><label>Mensagem <span>*</span></label><small>{{ form.content.length }}/4000</small></div>
                  <textarea v-model="form.content" required rows="8" maxlength="4000" placeholder="Digite a mensagem exatamente como deverá ser enviada..." class="form-control qm-textarea"></textarea>
                </div>

                <label class="qm-active-toggle">
                  <input v-model="form.is_active" type="checkbox" />
                  <span class="qm-toggle-track"><span></span></span>
                  <span><strong>Mensagem ativa</strong><small>Disponível para uso dos atendentes</small></span>
                </label>
              </div>

              <aside class="qm-preview">
                <span class="qm-preview-label"><i class="fa-regular fa-eye"></i> Prévia no atendimento</span>
                <div class="qm-preview-bubble">
                  <strong>{{ form.title || 'Título da mensagem' }}</strong>
                  <p>{{ form.content || 'O conteúdo da mensagem aparecerá aqui enquanto você digita.' }}</p>
                  <small>{{ form.shortcut ? `/${form.shortcut}` : 'Sem atalho' }}</small>
                </div>
              </aside>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" @click="closeForm">Cancelar</button>
              <button type="submit" class="btn-primary" :disabled="saving">
                <i :class="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-floppy-disk'"></i>
                {{ saving ? 'Salvando...' : 'Salvar mensagem' }}
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
const selectedCategory = ref('all')
const statusFilter = ref('all')
const sortBy = ref('title')
const messages = ref([])
const loading = ref(true)
const showForm = ref(false)
const editingId = ref(null)
const saving = ref(false)

const emptyForm = () => ({ title: '', category: 'Atendimento', shortcut: '', content: '', is_active: true })
const form = ref(emptyForm())
const categories = computed(() => [...new Set(messages.value.map(item => item.category || 'Geral'))].sort((a, b) => a.localeCompare(b, 'pt-BR')))
const activeCount = computed(() => messages.value.filter(item => item.is_active).length)
const hasFilters = computed(() => Boolean(searchTerm.value.trim()) || selectedCategory.value !== 'all' || statusFilter.value !== 'all')

const filteredMessages = computed(() => {
  const term = searchTerm.value.trim().toLocaleLowerCase('pt-BR')
  const list = messages.value.filter(item => {
    const searchable = `${item.title} ${item.content} ${item.shortcut || ''} ${item.category || ''}`.toLocaleLowerCase('pt-BR')
    if (term && !searchable.includes(term)) return false
    if (selectedCategory.value !== 'all' && (item.category || 'Geral') !== selectedCategory.value) return false
    if (statusFilter.value === 'active' && !item.is_active) return false
    if (statusFilter.value === 'inactive' && item.is_active) return false
    return true
  })
  return [...list].sort((a, b) => {
    if (sortBy.value === 'category') return (a.category || '').localeCompare(b.category || '', 'pt-BR') || a.title.localeCompare(b.title, 'pt-BR')
    if (sortBy.value === 'recent') return messages.value.indexOf(b) - messages.value.indexOf(a)
    return a.title.localeCompare(b.title, 'pt-BR')
  })
})

async function loadMessages() {
  loading.value = true
  try {
    const { data } = await quickMessagesApi.list()
    messages.value = data.messages || []
  } catch (_) {
    ui.showToast('Não foi possível carregar as mensagens prontas.', 'error')
  } finally {
    loading.value = false
  }
}

function categoryCount(category) { return messages.value.filter(item => (item.category || 'Geral') === category).length }
function canManageMessage(message) { return auth.isAdmin || (auth.isSupervisor && String(message.created_by_id || '') === String(auth.user?.id || '')) }
function authorLabel(message) {
  const author = message.created_by_name || 'Sistema'
  if (!message.created_at) return `Mensagem rápida criada por ${author}`
  return `Mensagem rápida criada por ${author} em ${new Date(message.created_at).toLocaleDateString('pt-BR')}`
}
function categoryStyle(category = 'Geral') {
  const palettes = [
    ['#eff6ff', '#2563eb'], ['#f5f3ff', '#7c3aed'], ['#ecfdf5', '#059669'],
    ['#fff7ed', '#ea580c'], ['#fdf2f8', '#db2777'], ['#f0f9ff', '#0284c7']
  ]
  const index = [...category].reduce((total, char) => total + char.charCodeAt(0), 0) % palettes.length
  return { backgroundColor: palettes[index][0], color: palettes[index][1] }
}
function clearFilters() { searchTerm.value = ''; selectedCategory.value = 'all'; statusFilter.value = 'all' }
function closeForm() { if (!saving.value) showForm.value = false }
function openCreate() { editingId.value = null; form.value = emptyForm(); showForm.value = true }
function openEdit(message) {
  editingId.value = message.id
  form.value = { title: message.title || '', category: message.category || 'Atendimento', shortcut: message.shortcut || '', content: message.content || '', is_active: message.is_active !== false }
  showForm.value = true
}
function sanitizeShortcut() { form.value.shortcut = form.value.shortcut.toLowerCase().replace(/^\/+/, '').replace(/[^a-z0-9_-]/g, '') }
async function copyText(value, message) {
  try { await navigator.clipboard.writeText(value); ui.showToast(message) }
  catch (_) { ui.showToast('Não foi possível copiar.', 'error') }
}

async function saveMessage() {
  if (!form.value.title.trim() || !form.value.content.trim()) return ui.showToast('Informe o título e a mensagem.', 'error')
  const duplicateShortcut = form.value.shortcut && messages.value.some(item => item.id !== editingId.value && item.shortcut === form.value.shortcut)
  if (duplicateShortcut) return ui.showToast('Esse atalho já está sendo utilizado.', 'error')
  saving.value = true
  try {
    if (editingId.value) await quickMessagesApi.update(editingId.value, form.value)
    else await quickMessagesApi.create(form.value)
    ui.showToast(editingId.value ? 'Mensagem atualizada com sucesso!' : 'Mensagem criada com sucesso!')
    showForm.value = false
    await loadMessages()
  } catch (error) {
    ui.showToast(error.response?.data?.error || 'Não foi possível salvar a mensagem.', 'error')
  } finally { saving.value = false }
}

async function removeMessage(message) {
  if (!window.confirm(`Excluir a mensagem "${message.title}"?`)) return
  try { await quickMessagesApi.remove(message.id); await loadMessages(); ui.showToast('Mensagem excluída.') }
  catch (error) { ui.showToast(error.response?.data?.error || 'Não foi possível excluir a mensagem.', 'error') }
}

onMounted(loadMessages)
</script>

<style scoped>
.qm-page { width: 100%; display: flex; flex-direction: column; gap: 14px; padding: 16px 20px 20px; box-sizing: border-box; }
.qm-summary { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 24px; padding: 16px 18px; border: 1px solid var(--border-color); border-radius: 8px; background: #ffffff; box-shadow: none; }
.qm-eyebrow { display: inline-flex; align-items: center; gap: 6px; color: var(--brand-primary); font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.qm-summary h2 { margin: 4px 0 2px; color: var(--text-main); font-size: 18px; font-weight: 700; }
.qm-summary p { margin: 0; color: var(--text-muted); font-size: 11.5px; }
.qm-stats { display: flex; gap: 6px; }
.qm-stat { min-width: 64px; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: #f8fafc; text-align: center; }
.qm-stat strong { display: block; color: var(--text-main); font-size: 16px; font-weight: 700; }
.qm-stat span { color: var(--text-muted); font-size: 9.5px; text-transform: uppercase; font-weight: 650; }
.qm-create-btn { white-space: nowrap; }
.qm-toolbar { display: flex; gap: 8px; align-items: center; }
.qm-search { flex: 1; }
.qm-search input { height: 34px; background: #ffffff; }
.qm-select { width: 140px; height: 34px; font-size: 12px; }
.qm-clear-search { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); border: 0; background: transparent; color: var(--text-light); cursor: pointer; }
.qm-category-row { display: flex; gap: 6px; overflow-x: auto; padding: 1px; }
.qm-category-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px; border: 1px solid var(--border-color); border-radius: 5px; background: #ffffff; color: var(--text-muted); font-size: 11.5px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.15s ease; }
.qm-category-chip span { min-width: 16px; padding: 1px 4px; border-radius: 4px; background: #f1f5f9; font-size: 9.5px; text-align: center; }
.qm-category-chip.active { border-color: #bfdbfe; background: #eff6ff; color: var(--brand-primary); }
.qm-category-chip.active span { background: #dbeafe; }
.qm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 12px; }
.qm-card { min-height: 180px; display: flex; flex-direction: column; padding: 14px; border: 1px solid var(--border-color); border-radius: 8px; background: #ffffff; box-shadow: none; transition: border-color 0.15s ease; }
.qm-card:hover { border-color: #bfdbfe; }
.qm-card.inactive { opacity: 0.65; }
.qm-card-top { display: flex; align-items: center; gap: 8px; }
.qm-card-icon { width: 30px; height: 30px; border-radius: 6px; display: grid; place-items: center; flex: none; font-size: 13px; }
.qm-card-heading { min-width: 0; display: flex; flex-direction: column; }
.qm-card-heading strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-main); font-size: 13px; }
.qm-card-heading span { color: var(--text-muted); font-size: 10px; }
.qm-status { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 650; }
.qm-status i { font-size: 5px; }
.qm-status.active { color: #168a52; }
.qm-status.inactive { color: #94a3b8; }
.qm-card-content { flex: 1; margin: 12px 0; color: var(--text-main); font-size: 12.5px; line-height: 1.5; white-space: pre-wrap; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; }
.qm-author { margin: 0 0 8px; color: var(--text-light); font-size: 9.5px; }
.qm-card-bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 10px; border-top: 1px solid #edf0f3; }
.qm-shortcut { display: inline-flex; align-items: center; gap: 6px; padding: 3px 6px; border: 1px solid #dbeafe; border-radius: 4px; background: #eff6ff; color: var(--brand-primary); font: 600 10.5px monospace; cursor: pointer; }
.qm-no-shortcut { color: var(--text-light); font-size: 10.5px; }
.qm-actions { display: flex; gap: 4px; }
.btn-icon-danger { color: #d92d20; }
.btn-icon-danger:hover { background: #fef2f2; }
.qm-empty { min-height: 240px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; border: 1px dashed var(--border-color); border-radius: 8px; background: #ffffff; text-align: center; }
.qm-empty-icon { width: 44px; height: 44px; display: grid; place-items: center; margin-bottom: 10px; border-radius: 50%; background: #f1f5f9; color: var(--brand-primary); font-size: 18px; }
.qm-empty strong { color: var(--text-main); font-size: 13.5px; }
.qm-empty p { margin: 4px 0 12px; color: var(--text-muted); font-size: 11.5px; }
.qm-skeleton { height: 180px; border-radius: 8px; background: #f8fafc; border: 1px solid #edf0f3; }
.qm-modal { max-width: 800px; }
.qm-modal-subtitle { margin: 3px 0 0; color: var(--text-muted); font-size: 11px; }
.qm-modal-body { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(230px, 0.8fr); gap: 18px; }
.qm-form-fields { min-width: 0; }
.qm-two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.form-group label span, .qm-label-row label span { color: #d92d20; }
.qm-label-row { display: flex; justify-content: space-between; align-items: center; }
.qm-label-row small { color: var(--text-light); font-size: 10.5px; }
.qm-textarea { resize: vertical; min-height: 140px; line-height: 1.5; }
.qm-shortcut-input { position: relative; }
.qm-shortcut-input > span { position: absolute; z-index: 1; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-weight: 700; }
.qm-shortcut-input input { padding-left: 22px; }
.qm-active-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.qm-active-toggle > input { position: absolute; opacity: 0; }
.qm-toggle-track { width: 34px; height: 18px; padding: 2px; border-radius: 999px; background: #cbd5e1; transition: 0.2s; box-sizing: border-box; }
.qm-toggle-track span { display: block; width: 14px; height: 14px; border-radius: 50%; background: #ffffff; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15); transition: 0.2s; }
.qm-active-toggle > input:checked + .qm-toggle-track { background: var(--brand-primary); }
.qm-active-toggle > input:checked + .qm-toggle-track span { transform: translateX(16px); }
.qm-active-toggle > span:last-child { display: flex; flex-direction: column; }
.qm-active-toggle strong { color: var(--text-main); font-size: 12px; }
.qm-active-toggle small { color: var(--text-muted); font-size: 10px; }
.qm-preview { padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; background: #fafbfc; }
.qm-preview-label { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; color: var(--text-muted); font-size: 10px; font-weight: 700; text-transform: uppercase; }
.qm-preview-bubble { padding: 10px; border-radius: 8px; background: #ecfdf5; border: 1px solid #bbf7d0; }
.qm-preview-bubble strong { display: block; margin-bottom: 4px; color: #166534; font-size: 11px; }
.qm-preview-bubble p { margin: 0; color: #14532d; font-size: 11.5px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; }
.qm-preview-bubble small { display: block; margin-top: 8px; color: #4d7c5a; font: 600 9.5px monospace; }

@media (max-width: 900px) {
  .qm-summary { grid-template-columns: 1fr auto; }
  .qm-stats { order: 3; grid-column: 1 / -1; }
  .qm-modal-body { grid-template-columns: 1fr; }
  .qm-preview { display: none; }
}

@media (max-width: 650px) {
  .qm-summary { grid-template-columns: 1fr; }
  .qm-create-btn { width: 100%; }
  .qm-toolbar { flex-wrap: wrap; }
  .qm-search { flex-basis: 100%; }
  .qm-select { flex: 1; }
  .qm-two-columns { grid-template-columns: 1fr; }
  .qm-grid { grid-template-columns: 1fr; }
}
</style>
