<template>
  <div class="table-view-layout" style="width:100%;">
<!-- Clientes View - v2 -->
    <!-- Toolbar -->
    <div class="table-toolbar">
      <div class="table-toolbar-left">
        <div class="search-input-wrap" style="width:280px;">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="searchTerm" type="text" placeholder="Buscar por nome, telefone, e-mail..." />
        </div>
      </div>
      <button class="btn-primary" @click="openNewModal">
        <i class="fa-solid fa-plus"></i> Novo Cliente
      </button>
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
                <th>Cliente</th>
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
                  Nenhum cliente encontrado.
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
                  <span v-if="c.channel" class="badge" style="background:#1e293b;color:#94a3b8;">
                    <i class="fa-brands fa-whatsapp" v-if="c.channel?.toLowerCase().includes('whatsapp')" style="color:#25d366;margin-right:4px;"></i>
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
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-panel clientes-modal">
          <div class="modal-header">
            <h3>{{ isNew ? 'Novo Cliente' : 'Editar Cliente' }}</h3>
            <button class="modal-close-btn" @click="closeModal"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group">
                <label>Nome *</label>
                <input v-model="form.name" type="text" placeholder="Nome do cliente" />
              </div>
              <div class="form-group">
                <label>Telefone (WhatsApp)</label>
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
            <button class="btn-primary" :disabled="saving || !form.name?.trim()" @click="saveContact">
              <i class="fa-solid fa-floppy-disk"></i>
              {{ saving ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal de Confirmação de Exclusão -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
        <div class="modal-panel" style="max-width:380px;">
          <div class="modal-header">
            <h3>Excluir Contato</h3>
            <button class="modal-close-btn" @click="deleteTarget = null"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body" style="padding:20px 24px;">
            <p style="color:#cbd5e1;margin:0 0 4px;">Tem certeza que deseja excluir o contato:</p>
            <p style="font-weight:700;color:#f1f5f9;margin:0;">{{ deleteTarget.name }}</p>
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

const emptyForm = () => ({ name: '', phone: '', email: '', cnpj: '', channel: 'WhatsApp', status: 'Ativo', notes: '' })
const form = ref(emptyForm())
let editingId = null

const filteredContacts = computed(() => {
  if (!searchTerm.value.trim()) return contacts.value
  const t = searchTerm.value.toLowerCase()
  return contacts.value.filter(c =>
    (c.name || '').toLowerCase().includes(t) ||
    (c.phone || '').includes(t) ||
    (c.email || '').toLowerCase().includes(t) ||
    (c.cnpj || '').includes(t)
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
  form.value = { name: c.name || '', phone: c.phone || '', email: c.email || '', cnpj: c.cnpj || '', channel: c.channel || 'WhatsApp', status: c.status || 'Ativo', notes: c.notes || '' }
  saveError.value = ''
  showModal.value = true
}

function openNewModal() {
  isNew.value = true
  editingId = null
  form.value = emptyForm()
  saveError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function saveContact() {
  if (!form.value.name?.trim()) return
  saving.value = true
  saveError.value = ''
  try {
    if (isNew.value) {
      const res = await api.post('/contacts', form.value)
      contacts.value.unshift(res.data.contact)
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
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input,
.form-group select,
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
</style>
