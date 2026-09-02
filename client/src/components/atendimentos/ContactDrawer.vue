<template>
  <div class="details-column" id="contactDetailsCol">
    <!-- Header: Detalhes do Atendimento -->
    <div class="details-header">
      <div class="details-header-title-box">
        <span class="details-header-title">Detalhes do Atendimento</span>
      </div>
      <div class="details-header-actions">
        <button
          type="button"
          class="details-action-btn"
          title="Editar contato"
          @click="showEditModal = true"
        >
          <i class="fa-solid fa-pen"></i>
        </button>
        <button
          type="button"
          class="details-action-btn close"
          title="Fechar painel"
          @click="$emit('close')"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>

    <div class="details-body">
      <!-- Card Metadados do Atendimento -->
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
            <span class="meta-label">Departamento</span>
            <div class="meta-value-box">
              <span class="dept-badge">
                <i class="fa-solid fa-tag"></i>
                {{ ticket?.department || ticket?.deptInitial || 'Geral' }}
              </span>
            </div>
          </div>

          <div class="meta-item">
            <span class="meta-label">Canal / Conexão</span>
            <div class="meta-value-box">
              <span class="channel-badge">
                <i class="fa-brands fa-whatsapp"></i>
                {{ whatsappAccountLabel }}
              </span>
            </div>
          </div>

          <div class="meta-item">
            <span class="meta-label">
              {{ ticket?.status === 'em_atendimento' ? 'Tempo de Atendimento' : 'Tempo em Espera' }}
            </span>
            <span class="meta-value text-highlight">
              <i class="fa-regular fa-clock" style="font-size:11px; margin-right:3px;"></i>
              {{ durationStr }}
            </span>
          </div>

          <div class="meta-item">
            <span class="meta-label">Protocolo / ID</span>
            <div class="id-copy-box" @click="copyTicketId" title="Clique para copiar ID">
              <code>#{{ ticket?.id ? ticket.id.substring(0, 8) : '—' }}</code>
              <i class="fa-regular" :class="copiedId ? 'fa-circle-check text-success' : 'fa-copy'"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Card do Contato Relacionado -->
      <div class="details-card">
        <div class="card-title-row">
          <span class="card-section-title">
            <i class="fa-solid fa-user-circle"></i> Contato Relacionado
          </span>
          <button
            v-if="!contactSaved"
            type="button"
            class="btn-card-action save-contact"
            :disabled="savingContact"
            @click="saveContact(ticket?.is_employee)"
          >
            <i class="fa-solid" :class="savingContact ? 'fa-spinner fa-spin' : 'fa-user-plus'"></i>
            Salvar contato
          </button>
          <button v-else type="button" class="btn-card-action" @click="showEditModal = true">
            <i class="fa-solid fa-pen-to-square"></i> Editar
          </button>
        </div>

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

        <!-- Banner de Perfil do Contato -->
        <div class="contact-profile-box">
          <div
            class="contact-avatar-lg"
            :style="{ backgroundColor: ticket?.avatarColor || '#2563eb' }"
          >
            <img v-if="ticket?.avatar_url" :src="ticket.avatar_url" alt="Foto do cliente" referrerpolicy="no-referrer" />
            <span v-else>{{ ticket?.initials || 'CL' }}</span>
          </div>
          <div class="contact-profile-text">
            <strong class="contact-profile-name" :title="ticket?.clientName || ticket?.client_name">
              {{ normalizePersonName(ticket?.clientName || ticket?.client_name || 'Cliente') }}
            </strong>
            <span class="contact-profile-phone">{{ displayPhone }}</span>
            <div class="contact-role-tag" :class="{ employee: ticket?.is_employee }">
              <i class="fa-solid" :class="ticket?.is_employee ? 'fa-id-badge' : 'fa-user'"></i>
              {{ ticket?.is_employee ? 'Funcionário' : 'Cliente' }}
            </div>
          </div>
        </div>

        <!-- Lista de Atributos do Contato -->
        <div class="contact-attributes-list">
          <div class="attribute-row">
            <div class="attribute-icon"><i class="fa-solid fa-earth-americas"></i></div>
            <div class="attribute-content">
              <span class="attribute-label">País / Fuso</span>
              <span class="attribute-val">Brasil (GMT-3)</span>
            </div>
          </div>

          <div class="attribute-row">
            <div class="attribute-icon"><i class="fa-regular fa-envelope"></i></div>
            <div class="attribute-content">
              <span class="attribute-label">E-mail</span>
              <span class="attribute-val" :class="{ 'text-muted': !contact.email }">
                {{ contact.email || 'Não informado' }}
              </span>
            </div>
          </div>

          <div class="attribute-row">
            <div class="attribute-icon"><i class="fa-regular fa-id-card"></i></div>
            <div class="attribute-content">
              <span class="attribute-label">CPF / CNPJ</span>
              <span class="attribute-val" :class="{ 'text-muted': !contact.cnpj }">
                {{ contact.cnpj ? formatCnpjCpf(contact.cnpj) : 'Não informado' }}
              </span>
            </div>
          </div>

          <div class="attribute-row">
            <div class="attribute-icon"><i class="fa-regular fa-building"></i></div>
            <div class="attribute-content">
              <span class="attribute-label">Empresa</span>
              <span class="attribute-val" :class="{ 'text-muted': !contact.company }">
                {{ contact.company || 'Não informada' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Card: Histórico de Conversas Anteriores -->
      <div class="details-card">
        <div class="card-title-row">
          <span class="card-section-title">
            <i class="fa-solid fa-clock-rotate-left"></i> Histórico
          </span>
          <RouterLink to="/historico" class="btn-card-action">
            Ver todas <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:10px;"></i>
          </RouterLink>
        </div>

        <div class="history-list">
          <div v-if="contact.history && contact.history.length > 0">
            <div v-for="(h, idx) in contact.history" :key="idx" class="history-card-item">
              <div class="history-card-icon">
                <i class="fa-regular fa-comment-dots"></i>
              </div>
              <div class="history-card-info">
                <span class="history-card-title">{{ h.subject || 'Atendimento via WhatsApp' }}</span>
                <span class="history-card-date">{{ h.date }}</span>
              </div>
            </div>
          </div>
          <div v-else class="history-empty-box">
            <i class="fa-regular fa-comments"></i>
            <span>Nenhuma conversa anterior registrada para este contato.</span>
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
    if (!data?.success || !data.ticket) throw new Error(data?.error || 'Não foi possível salvar o contato.')
    ticketStore.receiveTicket(data.ticket)
    ticketStore.notifyKpisUpdated()
    ui.showToast(Boolean(isEmployee) ? 'Contato salvo como funcionário.' : 'Contato salvo como cliente.')
  } catch (error) {
    ui.showToast(error.response?.data?.error || error.message || 'Não foi possível salvar o contato.', 'error')
  } finally {
    savingContact.value = false
  }
}
</script>

<style scoped>
.details-column {
  width: 300px;
  min-width: 300px;
  max-width: 300px;
  flex-shrink: 0;
  background-color: #f8fafc;
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
  user-select: none;
}

/* Header */
.details-header {
  height: 52px;
  min-height: 52px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}

.details-header-title-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.details-header-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.details-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.details-action-btn {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12.5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.details-action-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
  border-color: #cbd5e1;
}

.details-action-btn.close:hover {
  background: #fee2e2;
  color: #ef4444;
  border-color: #fca5a5;
}

/* Body */
.details-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Cards */
.details-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-section-title {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-section-title i {
  color: #94a3b8;
  font-size: 12px;
}

.btn-card-action {
  background: none;
  border: none;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #2563eb;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  transition: all 0.12s ease;
}

.btn-card-action:hover {
  background: #eff6ff;
  color: #1d4ed8;
}

.btn-card-action:disabled {
  opacity: 0.6;
  cursor: wait;
}

.btn-card-action.save-contact {
  color: #047857;
  background: #ecfdf5;
  padding: 4px 7px;
}

.btn-card-action.save-contact:hover {
  background: #d1fae5;
  color: #065f46;
}

/* Status Pill */
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.status-pill .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-pill.em_atendimento {
  background: #ecfdf5;
  color: #059669;
}
.status-pill.em_atendimento .status-dot {
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.status-pill.aguardando {
  background: #fffbeb;
  color: #d97706;
}
.status-pill.aguardando .status-dot {
  background: #f59e0b;
}

.status-pill.chatbot {
  background: #f5f3ff;
  color: #7c3aed;
}
.status-pill.chatbot .status-dot {
  background: #8b5cf6;
}

.status-pill.finalizado {
  background: #f1f5f9;
  color: #64748b;
}
.status-pill.finalizado .status-dot {
  background: #94a3b8;
}

/* Meta Grid */
.meta-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  padding-bottom: 4px;
  border-bottom: 1px solid #f8fafc;
}

.meta-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.meta-label {
  color: #64748b;
  font-size: 11.5px;
}

.meta-value {
  font-weight: 600;
  color: #0f172a;
}

.text-highlight {
  color: #2563eb;
  font-family: monospace;
  font-weight: 700;
  font-size: 12px;
}

.dept-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  background: #eff6ff;
  border: 1px solid #dbeafe;
  color: #1d4ed8;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
}

.channel-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  background: #f0fdf4;
  border: 1px solid #dcfce7;
  color: #15803d;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
}

.id-copy-box {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px;
  background: #f1f5f9;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.id-copy-box:hover {
  background: #e2e8f0;
}

.id-copy-box code {
  font-size: 11px;
  font-family: monospace;
  color: #334155;
  font-weight: 600;
}

.id-copy-box i {
  font-size: 11px;
  color: #64748b;
}

.text-success {
  color: #10b981 !important;
}

/* Contact Profile Box */
.contact-profile-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
}

.contact-avatar-lg {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

.contact-profile-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.contact-profile-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-profile-phone {
  font-size: 11.5px;
  color: #64748b;
}

.contact-role-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  background: #e0f2fe;
  color: #0369a1;
  margin-top: 2px;
}

.contact-role-tag.employee {
  background: #fef3c7;
  color: #b45309;
}
.contact-avatar-lg { overflow:hidden; }
.contact-avatar-lg img { width:100%; height:100%; object-fit:cover; }

.contact-type-control {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.contact-type-label {
  color: #64748b;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.contact-type-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 3px;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  background: #f8fafc;
}

.contact-type-options button {
  border: 0;
  border-radius: 5px;
  padding: 6px 5px;
  background: transparent;
  color: #64748b;
  font-size: 10.5px;
  font-weight: 650;
  cursor: pointer;
}

.contact-type-options button.active {
  background: #fff;
  color: #1d4ed8;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.09);
}

.contact-type-options button:disabled {
  cursor: wait;
}

.contact-type-control small {
  color: #94a3b8;
  font-size: 9.5px;
}

/* Contact Attributes List */
.contact-attributes-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding-top: 4px;
}

.attribute-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 11.5px;
}

.attribute-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  flex-shrink: 0;
}

.attribute-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.attribute-label {
  font-size: 10px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-weight: 600;
}

.attribute-val {
  color: #1e293b;
  font-weight: 500;
  word-break: break-word;
}

.text-muted {
  color: #94a3b8;
  font-style: italic;
}

/* History List */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-card-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 6px;
  transition: all 0.12s ease;
}

.history-card-item:hover {
  background: #eff6ff;
  border-color: #dbeafe;
}

.history-card-icon {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  flex-shrink: 0;
}

.history-card-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.history-card-title {
  font-size: 11.5px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-card-date {
  font-size: 10px;
  color: #94a3b8;
}

.history-empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 8px;
  text-align: center;
  color: #94a3b8;
  gap: 6px;
  font-size: 11px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px dashed #e2e8f0;
}

.history-empty-box i {
  font-size: 16px;
  color: #cbd5e1;
}
</style>
