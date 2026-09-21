<template>
  <div class="details-column" id="contactDetailsCol">
    <!-- Header com gradiente verde -->
    <div class="details-header">
      <div class="details-header-left">
        <div class="details-header-icon">
          <i class="fa-solid fa-address-card"></i>
        </div>
        <span class="details-header-title">Detalhes</span>
      </div>
      <div class="details-header-actions">
        <button
          type="button"
          class="details-action-btn edit-btn"
          title="Editar contato"
          @click="showEditModal = true"
        >
          <i class="fa-solid fa-pen"></i>
        </button>
        <button
          type="button"
          class="details-action-btn close-btn"
          title="Fechar painel"
          @click="$emit('close')"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>

    <div class="details-body">

      <!-- Card: Dados do Chamado -->
      <div class="details-card">
        <div class="card-title-row">
          <span class="card-section-title">
            <i class="fa-solid fa-circle-info"></i> Dados do Chamado
          </span>
          <span class="status-pill" :class="ticket?.status || 'aberto'">
            <span class="status-dot"></span>
            {{ statusLabel }}
          </span>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <div class="meta-icon-label">
              <span class="meta-icon-box"><i class="fa-solid fa-tag"></i></span>
              <span class="meta-label">Departamento</span>
            </div>
            <span class="dept-badge">
              {{ ticket?.department || ticket?.deptInitial || 'Geral' }}
            </span>
          </div>

          <div class="meta-item">
            <div class="meta-icon-label">
              <span class="meta-icon-box"><i class="fa-regular fa-clock"></i></span>
              <span class="meta-label">{{ ticket?.status === 'em_atendimento' ? 'Tempo de Atendimento' : 'Tempo em Espera' }}</span>
            </div>
            <span class="duration-badge">{{ durationStr }}</span>
          </div>

          <div class="meta-item">
            <div class="meta-icon-label">
              <span class="meta-icon-box"><i class="fa-solid fa-hashtag"></i></span>
              <span class="meta-label">Protocolo</span>
            </div>
            <div class="id-copy-box" @click="copyTicketId" title="Clique para copiar ID">
              <code>#{{ ticket?.id ? ticket.id.substring(0, 8) : '—' }}</code>
              <i class="fa-regular" :class="copiedId ? 'fa-circle-check text-success' : 'fa-copy'"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Card: Contato Relacionado -->
      <div class="details-card contact-card">
        <!-- Banner do perfil -->
        <div class="contact-hero">
          <div
            class="contact-avatar-hero"
            :style="{ backgroundColor: ticket?.avatarColor || '#059669' }"
          >
            <img v-if="ticket?.avatar_url" :src="ticket.avatar_url" alt="Foto do cliente" referrerpolicy="no-referrer" />
            <span v-else>{{ ticket?.initials || 'CL' }}</span>
          </div>
          <div class="contact-hero-text">
            <strong class="contact-hero-name" :title="ticket?.clientName || ticket?.client_name">
              {{ normalizePersonName(ticket?.clientName || ticket?.client_name || 'Cliente') }}
            </strong>
            <span class="contact-hero-phone">{{ displayPhone }}</span>
            <div class="contact-role-tag" :class="{ employee: ticket?.is_employee }">
              <i class="fa-solid" :class="ticket?.is_employee ? 'fa-id-badge' : 'fa-user'"></i>
              {{ ticket?.is_employee ? 'Funcionário' : 'Cliente' }}
            </div>
          </div>
          <div class="contact-hero-actions">
            <button
              v-if="!contactSaved"
              type="button"
              class="btn-hero-save"
              :disabled="savingContact"
              @click="saveContact(ticket?.is_employee)"
              title="Salvar contato"
            >
              <i class="fa-solid" :class="savingContact ? 'fa-spinner fa-spin' : 'fa-user-plus'"></i>
            </button>
          </div>
        </div>

        <!-- Tipo de Contato -->
        <div class="contact-type-control">
          <span class="contact-type-label">Tipo de contato</span>
          <div class="contact-type-options" role="group" aria-label="Tipo de contato">
            <button
              type="button"
              :class="{ active: !ticket?.is_employee }"
              :disabled="savingContact"
              @click="saveContact(false)"
            >
              <i class="fa-solid fa-user"></i> Cliente
            </button>
            <button
              type="button"
              :class="{ active: ticket?.is_employee }"
              :disabled="savingContact"
              @click="saveContact(true)"
            >
              <i class="fa-solid fa-id-badge"></i> Funcionário
            </button>
          </div>
          <small>{{ contactSaved ? 'Alterações são salvas imediatamente.' : 'Ao escolher, o contato também será salvo.' }}</small>
        </div>

        <!-- Atributos do contato -->
        <div class="contact-attributes-list">
          <div class="attribute-row">
            <span class="attribute-icon"><i class="fa-regular fa-envelope"></i></span>
            <div class="attribute-content">
              <span class="attribute-label">E-mail</span>
              <span class="attribute-val" :class="{ 'text-muted': !contact.email }">
                {{ contact.email || 'Não informado' }}
              </span>
            </div>
          </div>

          <div class="attribute-row">
            <span class="attribute-icon"><i class="fa-regular fa-id-card"></i></span>
            <div class="attribute-content">
              <span class="attribute-label">CPF / CNPJ</span>
              <span class="attribute-val" :class="{ 'text-muted': !contact.cnpj }">
                {{ contact.cnpj ? formatCnpjCpf(contact.cnpj) : 'Não informado' }}
              </span>
            </div>
          </div>

          <div class="attribute-row">
            <span class="attribute-icon"><i class="fa-regular fa-building"></i></span>
            <div class="attribute-content">
              <span class="attribute-label">Empresa</span>
              <span class="attribute-val" :class="{ 'text-muted': !contact.company }">
                {{ contact.company || 'Não informada' }}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Modal de Edição de Contato -->
    <ModalEditarContato
      v-if="showEditModal"
      :ticket="ticket"
      @close="showEditModal = false"
      @saved="showEditModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useUiStore } from '@/stores/ui.store'
import { useTicketStore } from '@/stores/tickets.store'
import { ticketsApi } from '@/api/tickets.api'
import { formatPhone, formatCnpjCpf } from '@/utils/formatters'
import ModalEditarContato from '@/components/modals/ModalEditarContato.vue'
import { normalizePersonName } from '@/utils/person-display'

const props = defineProps({
  ticket: {
    type: Object,
    default: null
  }
})

defineEmits(['close'])

const ui = useUiStore()
const ticketStore = useTicketStore()
const showEditModal = ref(false)
const savingContact = ref(false)
const copiedId = ref(false)
const nowTick = ref(Date.now())
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  clearInterval(timer)
})

const contact = computed(() => props.ticket?.contact || {})
const contactSaved = computed(() => Boolean(props.ticket?.contact_id || contact.value?.id))

const displayPhone = computed(() => {
  const p = contact.value?.phone || props.ticket?.phone
  return formatPhone(p)
})

const statusLabel = computed(() => {
  const s = props.ticket?.status
  if (s === 'aguardando') return 'Aguardando'
  if (s === 'em_atendimento') return 'Em atendimento'
  if (s === 'chatbot') return 'Bot'
  if (s === 'finalizado') return 'Finalizado'
  return s || 'Aberto'
})

const whatsappAccountLabel = computed(() => {
  const channel = props.ticket?.channel || ''
  const accountId = channel.startsWith('whatsapp:') ? channel.slice('whatsapp:'.length) : null
  const account = accountId ? ui.whatsappAccounts.find(item => item.id === accountId) : null
  return account?.name || 'WhatsApp Principal'
})

const durationStr = computed(() => {
  // Trigger on every second
  const _ = nowTick.value
  const start = props.ticket?.assumed_at || props.ticket?.started_at || props.ticket?.created_at
  if (!start) return '00:00:00'
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 1000))
  const hrs = Math.floor(diffSec / 3600)
  const mins = Math.floor((diffSec % 3600) / 60)
  const secs = diffSec % 60
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

function copyTicketId() {
  if (!props.ticket?.id) return
  navigator.clipboard.writeText(props.ticket.id)
  copiedId.value = true
  setTimeout(() => { copiedId.value = false }, 2000)
}

async function saveContact(isEmployee = false) {
  if (!props.ticket?.id || savingContact.value) return
  savingContact.value = true
  try {
    const notes = typeof contact.value?.notes === 'string'
      ? contact.value.notes
      : contact.value?.notes?.[0]?.text || ''
    const { data } = await ticketsApi.updateContact(props.ticket.id, {
      name: props.ticket.clientName || props.ticket.client_name || contact.value?.name || 'Cliente',
      phone: contact.value?.phone || props.ticket.phone || '',
      email: contact.value?.email || '',
      cnpj: contact.value?.cnpj || '',
      note: notes,
      is_employee: Boolean(isEmployee)
    })
    if (!data?.success || !data.ticket) throw new Error(data?.error || 'NÃ£o foi possÃ­vel salvar o contato.')
    ticketStore.receiveTicket(data.ticket)
    ticketStore.notifyKpisUpdated()
    ui.showToast(Boolean(isEmployee) ? 'Contato salvo como funcionÃ¡rio.' : 'Contato salvo como cliente.')
  } catch (error) {
    ui.showToast(error.response?.data?.error || error.message || 'NÃ£o foi possÃ­vel salvar o contato.', 'error')
  } finally {
    savingContact.value = false
  }
}
</script>

<style scoped>
/* Layout Principal */
.details-column {
  width: 300px;
  min-width: 300px;
  max-width: 300px;
  flex-shrink: 0;
  background-color: #f0fdf4;
  border-left: 1px solid #bbf7d0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
  user-select: none;
}

/* Header Compacto com Identidade Verde */
.details-header {
  height: 52px;
  min-height: 52px;
  padding: 0 12px 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  gap: 8px;
}

.details-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.details-header-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(255,255,255,0.18);
  border: 1px solid rgba(255,255,255,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 13px;
  flex-shrink: 0;
}

.details-header-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.01em;
}

.details-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.details-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: 1px solid rgba(255,255,255,0.25);
  background: rgba(255,255,255,0.12);
  color: #e0f2f1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.details-action-btn:hover {
  background: rgba(255,255,255,0.22);
  color: #ffffff;
}

.details-action-btn.close-btn:hover {
  background: rgba(239,68,68,0.35);
  border-color: rgba(239,68,68,0.5);
  color: #ffffff;
}

/* Body */
.details-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Cards */
.details-card {
  background: #ffffff;
  border: 1px solid #d1fae5;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 1px 4px rgba(5, 150, 105, 0.06);
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-section-title {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #059669;
  display: flex;
  align-items: center;
  gap: 5px;
}

.card-section-title i {
  color: #34d399;
  font-size: 12px;
}

/* Status Pills */
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.status-pill .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-pill.em_atendimento {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}
.status-pill.em_atendimento .status-dot {
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.status-pill.aguardando {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fde68a;
}
.status-pill.aguardando .status-dot { background: #f59e0b; }

.status-pill.chatbot {
  background: #f5f3ff;
  color: #7c3aed;
  border: 1px solid #ddd6fe;
}
.status-pill.chatbot .status-dot { background: #8b5cf6; }

.status-pill.finalizado {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}
.status-pill.finalizado .status-dot { background: #94a3b8; }

/* Meta Grid (dados do chamado) */
.meta-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.meta-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0fdf4;
  gap: 6px;
}

.meta-item:last-child { border-bottom: none; padding-bottom: 0; }

.meta-icon-label {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.meta-icon-box {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #f0fdf4;
  border: 1px solid #d1fae5;
  color: #059669;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  flex-shrink: 0;
}

.meta-label {
  color: #64748b;
  font-size: 11.5px;
  white-space: nowrap;
}

.dept-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #047857;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.duration-badge {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 12px;
  font-weight: 700;
  color: #047857;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  padding: 2px 8px;
  border-radius: 5px;
  white-space: nowrap;
}

.id-copy-box {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  background: #f0fdf4;
  border: 1px solid #d1fae5;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.id-copy-box:hover {
  background: #dcfce7;
  border-color: #6ee7b7;
}

.id-copy-box code {
  font-size: 11px;
  font-family: monospace;
  color: #047857;
  font-weight: 700;
}

.id-copy-box i { font-size: 10px; color: #059669; }
.text-success { color: #10b981 !important; }

/* Card de Contato (Hero) */
.contact-card { gap: 14px; }

.contact-hero {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
  border: 1px solid #a7f3d0;
  border-radius: 10px;
  position: relative;
}

.contact-avatar-hero {
  width: 46px;
  height: 46px;
  min-width: 46px;
  border-radius: 50%;
  color: #ffffff;
  font-size: 16px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.25);
  border: 2px solid rgba(255,255,255,0.8);
}

.contact-avatar-hero img { width: 100%; height: 100%; object-fit: cover; }

.contact-hero-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
  flex: 1;
}

.contact-hero-name {
  font-size: 13.5px;
  font-weight: 800;
  color: #064e3b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-hero-phone {
  font-size: 11.5px;
  color: #059669;
  font-weight: 500;
}

.contact-role-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  padding: 2px 7px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  background: #d1fae5;
  color: #047857;
  border: 1px solid #a7f3d0;
  margin-top: 2px;
}

.contact-role-tag.employee {
  background: #fef3c7;
  color: #b45309;
  border-color: #fde68a;
}

.contact-hero-actions {
  position: absolute;
  top: 8px;
  right: 8px;
}

.btn-hero-save {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #059669;
  border: none;
  color: #ffffff;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
}

.btn-hero-save:hover {
  background: #047857;
  transform: scale(1.1);
}

/* Tipo de Contato */
.contact-type-control {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.contact-type-label {
  color: #059669;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.contact-type-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 3px;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  background: #f0fdf4;
}

.contact-type-options button {
  border: 0;
  border-radius: 6px;
  padding: 6px 5px;
  background: transparent;
  color: #64748b;
  font-size: 10.5px;
  font-weight: 650;
  cursor: pointer;
  transition: all 0.12s ease;
}

.contact-type-options button.active {
  background: #ffffff;
  color: #059669;
  box-shadow: 0 1px 3px rgba(5, 150, 105, 0.15);
  font-weight: 800;
}

.contact-type-options button:disabled { cursor: wait; opacity: 0.7; }

.contact-type-control small {
  color: #6ee7b7;
  font-size: 9.5px;
}

/* Atributos do Contato */
.contact-attributes-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.attribute-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 11.5px;
  padding: 8px 0;
  border-bottom: 1px solid #f0fdf4;
}

.attribute-row:last-child { border-bottom: none; padding-bottom: 0; }

.attribute-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #f0fdf4;
  border: 1px solid #d1fae5;
  color: #059669;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  flex-shrink: 0;
  margin-top: 1px;
}

.attribute-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 1px;
}

.attribute-label {
  font-size: 9.5px;
  color: #a7f3d0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
}

/* Override: label mais visÃ­vel dentro de card branco */
.contact-card .attribute-label {
  color: #059669;
}

.attribute-val {
  color: #1e293b;
  font-weight: 500;
  word-break: break-word;
  font-size: 11.5px;
}

.text-muted {
  color: #94a3b8;
  font-style: italic;
}

/* Scrollbar */
.details-body::-webkit-scrollbar { width: 4px; }
.details-body::-webkit-scrollbar-track { background: transparent; }
.details-body::-webkit-scrollbar-thumb {
  background: #a7f3d0;
  border-radius: 4px;
}
.details-body::-webkit-scrollbar-thumb:hover { background: #6ee7b7; }
</style>
