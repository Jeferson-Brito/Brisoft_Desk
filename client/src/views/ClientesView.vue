<template>
  <div class="table-view-layout" style="width:100%;">
<!-- Clientes View - v2 -->
    <!-- Toolbar -->
    <div class="table-toolbar">
      <div class="table-toolbar-left">
        <div class="search-input-wrap" style="width:280px;">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="searchTerm" type="text" :placeholder="activeContactTab === 'employees' ? 'Buscar funcionário...' : 'Buscar cliente...'" />
        </div>
      </div>
      <div class="contacts-toolbar-actions">
        <input ref="importInput" type="file" accept=".xlsx,.csv" hidden @change="importSpreadsheet" />
        <button v-if="auth.canManageTeam" class="btn-secondary model-button" title="Baixar modelo de importação" @click="downloadImportTemplate">
          <i class="fa-solid fa-download"></i>
          <span>Modelo</span>
        </button>
        <button v-if="auth.canManageTeam" class="btn-secondary" :disabled="importing" @click="importInput?.click()">
          <i :class="importing ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-file-import'"></i>
          {{ importing ? 'Importando...' : 'Importar planilha' }}
        </button>
        <button class="btn-primary" @click="openNewModal">
          <i class="fa-solid fa-plus"></i> Novo contato
        </button>
      </div>
    </div>

    <div class="contacts-tabs-bar">
      <button :class="{ active: activeContactTab === 'customers' }" @click="activeContactTab = 'customers'">
        <i class="fa-solid fa-user-group"></i> Clientes <span>{{ customerCount }}</span>
      </button>
      <button :class="{ active: activeContactTab === 'employees' }" @click="activeContactTab = 'employees'">
        <i class="fa-solid fa-id-badge"></i> Funcionários <span>{{ employeeCount }}</span>
      </button>
      <small v-if="importSummary">{{ importSummary }}</small>
    </div>

    <!-- Tabela -->
    <div class="table-content-area">
      <div class="table-card-container">
        <div class="table-scroll-wrap">
          <div v-if="loading" class="clientes-loading">
            <i class="fa-solid fa-circle-notch fa-spin"></i> Carregando contatos...
          </div>
          <div v-else-if="errorMsg" class="clientes-error">
            <i class="fa-solid fa-triangle-exclamation"></i> {{ errorMsg }}
          </div>
          <table v-else class="data-table">
            <thead>
              <tr>
                <th>Contato</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th>Canal</th>
                <th>Status</th>
                <th style="text-align:right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredContacts.length === 0">
                <td colspan="6" style="text-align:center;color:#64748b;padding:32px;">
                  <i class="fa-solid fa-users-slash" style="margin-right:8px;"></i>
                  Nenhum {{ activeContactTab === 'employees' ? 'funcionário' : 'cliente' }} encontrado.
                </td>
              </tr>
              <tr v-for="c in filteredContacts" :key="c.id">
                <td>
                  <div class="contact-cell">
                    <div class="initial-avatar" :style="{ background: avatarColor(c.name) }" style="width:32px;height:32px;font-size:11px;">
                      {{ initials(c.name) }}
                    </div>
                    <div class="contact-cell-meta">
                      <span class="contact-cell-name">{{ c.name }}</span>
                      <span v-if="c.cnpj" style="font-size:11px;color:#64748b;">{{ c.cnpj }}</span>
                    </div>
                  </div>
                </td>
                <td>{{ formatPhone(c.phone) }}</td>
                <td style="color:#64748b;">{{ c.email || '—' }}</td>
                <td>
                  <span v-if="c.channel" class="badge" :style="c.channel?.toLowerCase().includes('whatsapp') ? 'background:#dcfce7;color:#166534;' : 'background:#e2e8f0;color:#475569;'">
                    <i class="fa-brands fa-whatsapp" v-if="c.channel?.toLowerCase().includes('whatsapp')" style="color:#16a34a;margin-right:4px;"></i>
                    <i class="fa-solid fa-globe" v-else-if="c.channel?.toLowerCase().includes('web')" style="color:#64748b;margin-right:4px;"></i>
                    <i class="fa-solid fa-envelope" v-else-if="c.channel?.toLowerCase().includes('email')" style="color:#64748b;margin-right:4px;"></i>
                    {{ c.channel }}
                  </span>
                  <span v-else>—</span>
                </td>
                <td>
                  <span class="badge" :class="c.status === 'Ativo' || !c.status ? 'badge-ativo' : 'badge-inativo'">
                    {{ c.status || 'Ativo' }}
                  </span>
                </td>
                <td style="text-align:right;">
                  <div class="table-actions-cell" style="justify-content:flex-end;gap:6px;">
                    <button class="btn-icon" title="Editar contato" @click="openEdit(c)">
                      <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon btn-icon-danger" title="Excluir contato" @click="confirmDelete(c)">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal de Edição / Criação -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay active" @click.self="closeModal">
        <div class="modal-container clientes-modal">
          <div class="modal-header">
            <h3>{{ isNew ? 'Novo contato' : 'Editar contato' }}</h3>
            <button type="button" class="btn-icon" title="Fechar" @click="closeModal"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group form-group-full">
                <label>Tipo de contato</label>
                <div class="contact-type-options">
                  <label :class="{ selected: !form.is_employee }">
                    <input v-model="form.is_employee" type="radio" :value="false" />
                    <i class="fa-solid fa-user"></i>
                    <span><strong>Cliente</strong><small>Conta normalmente nos indicadores</small></span>
                  </label>
                  <label :class="{ selected: form.is_employee }">
                    <input v-model="form.is_employee" type="radio" :value="true" />
                    <i class="fa-solid fa-id-badge"></i>
                    <span><strong>Funcionário</strong><small>Identificado na fila e fora dos KPIs</small></span>
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label>Nome *</label>
                <input v-model="form.name" type="text" :placeholder="form.is_employee ? 'Nome do funcionário' : 'Nome do cliente'" />
              </div>
              <div class="form-group">
                <label>Telefone (WhatsApp){{ form.is_employee ? ' *' : '' }}</label>
                <input v-model="form.phone" type="text" placeholder="Ex: 5511999999999" />
              </div>
              <div class="form-group">
                <label>E-mail</label>
                <input v-model="form.email" type="email" placeholder="email@exemplo.com" />
              </div>
              <div class="form-group">
                <label>CPF / CNPJ</label>
                <input v-model="form.cnpj" type="text" placeholder="Documento" />
              </div>
              <div class="form-group">
                <label>Canal</label>
                <select v-model="form.channel">
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Web">Web</option>
                  <option value="Email">E-mail</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div class="form-group">
                <label>Status</label>
                <select v-model="form.status">
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
              <div class="form-group form-group-full">
                <label>Observações</label>
                <textarea v-model="form.notes" rows="3" placeholder="Anotações sobre o cliente..."></textarea>
              </div>
            </div>
            <div v-if="saveError" class="form-error-msg">
              <i class="fa-solid fa-circle-exclamation"></i> {{ saveError }}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="closeModal">Cancelar</button>
            <button class="btn-primary" :disabled="saving || !form.name?.trim() || (form.is_employee && !form.phone?.trim())" @click="saveContact">
              <i class="fa-solid fa-floppy-disk"></i>
              {{ saving ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal de Confirmação de Exclusão -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="modal-overlay active" @click.self="deleteTarget = null">
        <div class="modal-container" style="max-width:380px;">
          <div class="modal-header">
            <h3>Excluir Contato</h3>
            <button type="button" class="btn-icon" title="Fechar" @click="deleteTarget = null"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body" style="padding:20px 24px;">
            <p style="color:#475569;margin:0 0 4px;">Tem certeza que deseja excluir o contato:</p>
            <p style="font-weight:700;color:#0f172a;margin:0;">{{ deleteTarget.name }}</p>
            <p style="font-size:12px;color:#64748b;margin:8px 0 0;">Esta ação não pode ser desfeita.</p>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="deleteTarget = null">Cancelar</button>
            <button class="btn-danger" :disabled="deleting" @click="doDelete">
              <i class="fa-solid fa-trash"></i> {{ deleting ? 'Excluindo...' : 'Excluir' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api/http'
import { formatPhone } from '@/utils/formatters'
import { parseCsv, rowsToContacts } from '@/utils/contact-import'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

const auth = useAuthStore()
const ui = useUiStore()

const contacts = ref([])
const loading = ref(true)
const errorMsg = ref('')
const searchTerm = ref('')
const showModal = ref(false)
const isNew = ref(false)
const saving = ref(false)
const saveError = ref('')
const deleteTarget = ref(null)
const deleting = ref(false)
const activeContactTab = ref('customers')
const importInput = ref(null)
const importing = ref(false)
const importSummary = ref('')

const emptyForm = () => ({ name: '', phone: '', email: '', cnpj: '', channel: 'WhatsApp', status: 'Ativo', notes: '', is_employee: false })
const form = ref(emptyForm())
let editingId = null

const customerCount = computed(() => contacts.value.filter(contact => !contact.is_employee).length)
const employeeCount = computed(() => contacts.value.filter(contact => contact.is_employee).length)

const filteredContacts = computed(() => {
  const byType = contacts.value.filter(contact => activeContactTab.value === 'employees' ? contact.is_employee : !contact.is_employee)
  if (!searchTerm.value.trim()) return byType
  const t = searchTerm.value.toLowerCase()
  return byType.filter(c =>
    (c.name || '').toLowerCase().includes(t) ||
    (c.phone || '').includes(t) ||
    (c.email || '').toLowerCase().includes(t) ||
    (c.cnpj || '').includes(t) ||
    (c.is_employee ? 'funcionario' : 'cliente').includes(t)
  )
})

const avatarColors = ['#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706', '#dc2626', '#0891b2']
function avatarColor(name) {
  let hash = 0
  for (const ch of (name || '')) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}
function initials(name) {
  return (name || '??').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

async function loadContacts() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await api.get('/contacts')
    contacts.value = res.data?.contacts || []
  } catch (err) {
    errorMsg.value = 'Não foi possível carregar os contatos. Verifique a conexão com o servidor.'
  } finally {
    loading.value = false
  }
}

function openEdit(c) {
  isNew.value = false
  editingId = c.id
  form.value = { name: c.name || '', phone: c.phone || '', email: c.email || '', cnpj: c.cnpj || '', channel: c.channel || 'WhatsApp', status: c.status || 'Ativo', notes: c.notes || '', is_employee: Boolean(c.is_employee) }
  saveError.value = ''
  showModal.value = true
}

function openNewModal() {
  isNew.value = true
  editingId = null
  form.value = { ...emptyForm(), is_employee: activeContactTab.value === 'employees' }
  saveError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

function downloadImportTemplate() {
  const csv = '\uFEFFNome;WhatsApp;E-mail;CPF/CNPJ;Tipo;Observações;Status\r\nMaria da Silva;5511999999999;maria@exemplo.com;12345678900;Cliente;;Ativo\r\nJoão Souza;5511888888888;joao@empresa.com;98765432100;Funcionário;;Ativo\r\n'
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'modelo-importacao-contatos.csv'
  link.click()
  URL.revokeObjectURL(url)
}

async function saveContact() {
  if (!form.value.name?.trim()) return
  saving.value = true
  saveError.value = ''
  try {
    if (isNew.value) {
      const res = await api.post('/contacts', form.value)
      const idx = contacts.value.findIndex(c => c.id === res.data.contact.id)
      if (idx !== -1) contacts.value[idx] = res.data.contact
      else contacts.value.unshift(res.data.contact)
    } else {
      const res = await api.put(`/contacts/${editingId}`, form.value)
      const idx = contacts.value.findIndex(c => c.id === editingId)
      if (idx !== -1) contacts.value[idx] = res.data.contact
    }
    closeModal()
  } catch (err) {
    saveError.value = err.response?.data?.error || 'Erro ao salvar. Tente novamente.'
  } finally {
    saving.value = false
  }
}

function confirmDelete(c) {
  deleteTarget.value = c
}

async function doDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await api.delete(`/contacts/${deleteTarget.value.id}`)
    contacts.value = contacts.value.filter(c => c.id !== deleteTarget.value.id)
    deleteTarget.value = null
  } catch (err) {
    alert('Erro ao excluir contato: ' + (err.response?.data?.error || err.message))
  } finally {
    deleting.value = false
  }
}

async function importSpreadsheet(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (file.size > 8 * 1024 * 1024) {
    ui.showToast('A planilha deve ter no máximo 8 MB.', 'error')
    return
  }
  importing.value = true
  importSummary.value = ''
  try {
    let rows
    if (file.name.toLowerCase().endsWith('.csv')) rows = parseCsv(await file.text())
    else {
      const { default: readXlsxFile } = await import('read-excel-file')
      rows = await readXlsxFile(file)
    }
    const parsedContacts = rowsToContacts(rows, activeContactTab.value === 'employees')
    if (!parsedContacts.length) throw new Error('A planilha não possui linhas para importar.')
    const totals = { imported: 0, updated: 0, ignored: 0 }
    for (let index = 0; index < parsedContacts.length; index += 400) {
      const { data } = await api.post('/contacts/import', { contacts: parsedContacts.slice(index, index + 400) })
      totals.imported += Number(data.imported || 0)
      totals.updated += Number(data.updated || 0)
      totals.ignored += Number(data.ignored || 0)
    }
    await loadContacts()
    importSummary.value = `${totals.imported} novo(s), ${totals.updated} atualizado(s)${totals.ignored ? `, ${totals.ignored} ignorado(s)` : ''}`
    ui.showToast(`✅ Importação concluída: ${importSummary.value}`)
  } catch (error) {
    ui.showToast(error.response?.data?.error || error.message || 'Não foi possível importar a planilha.', 'error')
  } finally {
    importing.value = false
  }
}

onMounted(loadContacts)
</script>

<style scoped>
.clientes-loading,
.clientes-error {
  padding: 40px;
  text-align: center;
  color: #64748b;
  font-size: 14px;
}
.clientes-error { color: #f87171; }

.clientes-modal {
  max-width: 600px;
  width: 100%;
}

.contacts-toolbar-actions,
.contacts-tabs-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.contacts-tabs-bar {
  padding: 0 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.contacts-tabs-bar button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 11px 4px 9px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.contacts-tabs-bar button.active { color: #2563eb; border-bottom-color: #2563eb; }
.contacts-tabs-bar button span { padding: 1px 6px; border-radius: 999px; background: #f1f5f9; font-size: 10px; }
.contacts-tabs-bar button.active span { background: #dbeafe; }
.contacts-tabs-bar small { margin-left: auto; color: #047857; font-size: 11px; }

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group-full {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input,
.form-group select,
.form-group textarea {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 9px 12px;
  color: #0f172a;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  resize: vertical;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #2563eb;
}

.form-error-msg {
  margin-top: 12px;
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #f87171;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-icon-danger {
  color: #f87171 !important;
}
.btn-icon-danger:hover {
  background: rgba(239, 68, 68, 0.1) !important;
}

.btn-danger {
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
}
.btn-danger:hover:not(:disabled) { background: #b91c1c; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

.badge-inativo {
  background: rgba(100, 116, 139, 0.15);
  color: #94a3b8;
}

.contact-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}
.contact-type-badge.customer { color: #2563eb; background: #dbeafe; }
.contact-type-badge.employee { color: #047857; background: #d1fae5; }

.contact-type-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.form-group .contact-type-options label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  cursor: pointer;
  color: #334155;
  text-transform: none;
  letter-spacing: normal;
}
.form-group .contact-type-options label.selected {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.1);
}
.contact-type-options input { width: auto; padding: 0; }
.contact-type-options i { font-size: 17px; color: #60a5fa; }
.contact-type-options span { display: flex; flex-direction: column; gap: 2px; }
.contact-type-options strong { font-size: 13px; color: #0f172a; }
.contact-type-options small { font-size: 10px; color: #64748b; font-weight: 400; }

@media (max-width: 640px) {
  .contact-type-options { grid-template-columns: 1fr; }
  .contacts-toolbar-actions .btn-secondary { width: 36px; padding: 8px; font-size: 0; }
  .contacts-toolbar-actions .btn-secondary i { font-size: 13px; }
  .contacts-toolbar-actions .model-button { display: none; }
  .contacts-tabs-bar small { display: none; }
}
</style>
