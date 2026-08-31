<template>
  <Teleport to="body">
    <div class="modal-overlay active" @click.self="emit('close')">
      <div class="modal-container conversation-modal">
        <div class="modal-header">
          <div>
            <span class="modal-title">Iniciar nova conversa</span>
            <p>Escolha um contato para abrir um atendimento pelo WhatsApp.</p>
          </div>
          <button type="button" class="btn-icon" title="Fechar" @click="emit('close')"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="conversation-controls">
          <div v-if="departments.length > 1" class="department-select">
            <label>Departamento do atendimento</label>
            <select v-model="departmentId">
              <option value="" disabled>Selecione o departamento</option>
              <option v-for="department in departments" :key="department.id" :value="department.id">{{ department.name }}</option>
            </select>
          </div>

          <div class="conversation-tabs">
            <button :class="{ active: contactType === 'customers' }" @click="contactType = 'customers'">
              Clientes <span>{{ customerCount }}</span>
            </button>
            <button :class="{ active: contactType === 'employees' }" @click="contactType = 'employees'">
              Funcionários <span>{{ employeeCount }}</span>
            </button>
          </div>

          <div class="conversation-search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="search" autofocus type="text" placeholder="Nome, WhatsApp, e-mail, CPF ou CNPJ..." />
            <button v-if="search" type="button" @click="search = ''"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>

        <div class="conversation-list">
          <div v-if="loading" class="conversation-state"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando contatos...</div>
          <div v-else-if="filteredContacts.length === 0" class="conversation-state">
            <i class="fa-regular fa-address-book"></i>
            <strong>Nenhum contato disponível</strong>
            <span>Cadastre ou importe contatos com um número de WhatsApp.</span>
          </div>
          <template v-else>
            <button
              v-for="contact in filteredContacts"
              :key="contact.id"
              type="button"
              class="conversation-contact"
              :disabled="startingId === contact.id"
              @click="startConversation(contact)"
            >
              <span class="conversation-avatar">{{ initials(contact.name) }}</span>
              <span class="conversation-contact-info">
                <strong>{{ contact.name }}</strong>
                <small><i class="fa-brands fa-whatsapp"></i> {{ formatPhone(contact.phone) }}<template v-if="contact.email"> • {{ contact.email }}</template></small>
                <small v-if="contact.cnpj">CPF/CNPJ: {{ contact.cnpj }}</small>
              </span>
              <span class="conversation-start-icon">
                <i :class="startingId === contact.id ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-arrow-right'"></i>
              </span>
            </button>
          </template>
        </div>

        <div class="modal-footer">
          <span>Somente contatos ativos com WhatsApp são exibidos.</span>
          <button type="button" class="btn-secondary" @click="emit('close')">Cancelar</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api/http'
import { ticketsApi } from '@/api/tickets.api'
import { useTicketStore } from '@/stores/tickets.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { formatPhone } from '@/utils/formatters'

const emit = defineEmits(['close', 'started'])
const ticketStore = useTicketStore()
const settingsStore = useSettingsStore()
const auth = useAuthStore()
const ui = useUiStore()

const contacts = ref([])
const loading = ref(true)
const search = ref('')
const contactType = ref('customers')
const departmentId = ref(auth.departmentId || '')
const startingId = ref(null)

const departments = computed(() => settingsStore.departments || [])
const customerCount = computed(() => contacts.value.filter(contact => !contact.is_employee && usable(contact)).length)
const employeeCount = computed(() => contacts.value.filter(contact => contact.is_employee && usable(contact)).length)

function usable(contact) {
  return contact?.status !== 'Inativo' && String(contact?.phone || '').replace(/\D/g, '').length >= 10
}

const filteredContacts = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('pt-BR')
  return contacts.value.filter(contact => {
    if (!usable(contact)) return false
    if (contactType.value === 'employees' ? !contact.is_employee : contact.is_employee) return false
    if (!term) return true
    return [contact.name, contact.phone, contact.email, contact.cnpj, contact.notes]
      .some(value => String(value || '').toLocaleLowerCase('pt-BR').includes(term))
  }).slice(0, 100)
})

function initials(name) {
  return String(name || 'CL').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

async function startConversation(contact) {
  if (!departmentId.value) {
    ui.showToast('Selecione o departamento do atendimento.', 'error')
    return
  }
  startingId.value = contact.id
  try {
    const { data } = await ticketsApi.startConversation(contact.id, departmentId.value)
    if (!data.success || !data.ticket) throw new Error(data.error || 'Não foi possível iniciar a conversa.')
    ticketStore.receiveTicket(data.ticket)
    await ticketStore.selectTicket(data.ticket.id)
    ui.showToast(data.existing ? 'Conversa existente aberta.' : 'Nova conversa aberta. Digite a primeira mensagem.')
    emit('started', data.ticket)
    emit('close')
  } catch (error) {
    ui.showToast(error.response?.data?.error || error.message || 'Não foi possível iniciar a conversa.', 'error')
  } finally {
    startingId.value = null
  }
}

onMounted(async () => {
  try {
    await settingsStore.fetchDepartments()
    if (!departmentId.value) departmentId.value = departments.value[0]?.id || ''
    const { data } = await api.get('/contacts')
    contacts.value = data.contacts || []
  } catch (error) {
    ui.showToast('Não foi possível carregar os contatos.', 'error')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.conversation-modal { width: min(520px, calc(100vw - 24px)); max-width: 520px; max-height: min(720px, calc(100vh - 30px)); display: flex; flex-direction: column; }
.modal-header p { margin: 3px 0 0; color: #64748b; font-size: 11px; }
.conversation-controls { padding: 12px 16px 10px; border-bottom: 1px solid #e2e8f0; display: grid; gap: 10px; }
.department-select { display: grid; gap: 4px; }
.department-select label { color: #475569; font-size: 10px; font-weight: 700; text-transform: uppercase; }
.department-select select { width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #0f172a; }
.conversation-tabs { display: grid; grid-template-columns: 1fr 1fr; padding: 3px; border-radius: 9px; background: #f1f5f9; }
.conversation-tabs button { border: none; border-radius: 7px; padding: 7px; background: transparent; color: #64748b; font-size: 11px; font-weight: 700; cursor: pointer; }
.conversation-tabs button.active { background: #fff; color: #2563eb; box-shadow: 0 1px 3px rgba(15,23,42,.1); }
.conversation-tabs span { margin-left: 4px; padding: 1px 5px; border-radius: 999px; background: #e2e8f0; font-size: 9px; }
.conversation-search { display: flex; align-items: center; gap: 8px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 8px; color: #94a3b8; }
.conversation-search:focus-within { border-color: #2563eb; box-shadow: 0 0 0 2px #dbeafe; }
.conversation-search input { min-width: 0; flex: 1; padding: 9px 0; border: none; outline: none; color: #0f172a; }
.conversation-search button { border: none; background: none; color: #94a3b8; cursor: pointer; }
.conversation-list { min-height: 220px; overflow-y: auto; padding: 6px 8px; }
.conversation-contact { width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 10px; border: none; border-bottom: 1px solid #f1f5f9; border-radius: 8px; background: #fff; text-align: left; cursor: pointer; }
.conversation-contact:hover { background: #f8fafc; }
.conversation-contact:disabled { opacity: .65; cursor: wait; }
.conversation-avatar { width: 34px; height: 34px; flex: 0 0 34px; display: grid; place-items: center; border-radius: 50%; background: #2563eb; color: #fff; font-size: 11px; font-weight: 800; }
.conversation-contact-info { min-width: 0; flex: 1; display: grid; gap: 2px; }
.conversation-contact-info strong { overflow: hidden; color: #0f172a; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.conversation-contact-info small { overflow: hidden; color: #64748b; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.conversation-contact-info .fa-whatsapp { color: #16a34a; }
.conversation-start-icon { color: #2563eb; }
.conversation-state { min-height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; color: #94a3b8; font-size: 12px; text-align: center; }
.conversation-state > i { font-size: 23px; }
.conversation-state strong { color: #475569; }
.modal-footer span { margin-right: auto; color: #94a3b8; font-size: 9px; }
@media (max-width: 520px) { .modal-footer span { display: none; } }
</style>
