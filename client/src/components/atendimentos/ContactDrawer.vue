<template>
  <div class="details-column" id="contactDetailsCol">
    <!-- Header: Conversation Details -->
    <div class="details-header">
      <span class="details-header-title">Detalhes do Atendimento</span>
      <button type="button" class="details-gear-btn" title="Configurar detalhes" @click="showEditModal = true">
        <i class="fa-solid fa-gear"></i>
      </button>
    </div>

    <div class="details-body">
      <!-- Metadados do Atendimento (Key-Value Table estilo Image 2) -->
      <div class="metadata-table">
        <div class="metadata-row">
          <span class="metadata-key">Departamento</span>
          <strong class="metadata-val" style="color:#1f62d0;">{{ ticket?.department || ticket?.deptInitial || 'Geral' }}</strong>
        </div>
        <div class="metadata-row">
          <span class="metadata-key">Conexão</span>
          <span class="metadata-val" style="color:#168a52;display:flex;align-items:center;gap:4px;">
            <i class="fa-brands fa-whatsapp"></i> {{ whatsappAccountLabel }}
          </span>
        </div>
        <div class="metadata-row">
          <span class="metadata-key">Status</span>
          <span class="metadata-val">{{ ticket?.status || 'Aberto' }}</span>
        </div>
        <div class="metadata-row">
          <span class="metadata-key">Tempo de Espera</span>
          <span class="metadata-val">{{ waitTimeStr }}</span>
        </div>
        <div class="metadata-row">
          <span class="metadata-key">ID</span>
          <code class="metadata-val">{{ ticket?.id ? ticket.id.substring(0, 10) : '—' }}</code>
        </div>
      </div>

      <div class="details-divider"></div>

      <!-- Section: Related / Contato Relacionado -->
      <div class="details-section">
        <div class="section-title-row">
          <span class="section-title">Contato Relacionado</span>
          <button type="button" class="section-action-link" @click="showEditModal = true">Editar</button>
        </div>

        <!-- Card de Perfil do Contato -->
        <div class="related-contact-card">
          <div
            class="contact-avatar"
            :style="{ backgroundColor: ticket?.avatarColor || '#1f62d0' }"
          >
            {{ ticket?.initials || 'CL' }}
          </div>
          <div class="contact-card-info">
            <strong class="contact-name">{{ ticket?.clientName || ticket?.client_name || 'Cliente' }}</strong>
            <span class="contact-sub">{{ displayPhone }}</span>
          </div>
        </div>

        <!-- Lista de Campos do Contato -->
        <div class="contact-fields-list">
          <div class="contact-field-item">
            <i class="fa-solid fa-location-dot"></i>
            <span>Brasil</span>
          </div>
          <div class="contact-field-item">
            <i class="fa-regular fa-clock"></i>
            <span>Horário de Brasília (GMT-3)</span>
          </div>
          <div class="contact-field-item">
            <i class="fa-regular fa-user"></i>
            <span>{{ ticket?.is_employee ? 'Funcionário da Empresa' : 'Cliente' }}</span>
          </div>
          <div class="contact-field-item">
            <i class="fa-regular fa-envelope"></i>
            <span>{{ contact.email || 'E-mail não informado' }}</span>
          </div>
          <div class="contact-field-item">
            <i class="fa-regular fa-id-card"></i>
            <span>{{ contact.cnpj ? `Documento: ${formatCnpjCpf(contact.cnpj)}` : 'Documento: —' }}</span>
          </div>
          <div class="contact-field-item">
            <i class="fa-regular fa-building"></i>
            <span>{{ contact.company || 'Empresa não informada' }}</span>
          </div>
        </div>
      </div>

      <div class="details-divider"></div>

      <!-- Section: Latest Conversations / Conversas Anteriores -->
      <div class="details-section">
        <div class="section-title-row">
          <span class="section-title">Conversas Anteriores</span>
          <RouterLink to="/historico" class="section-action-link">Ver todas</RouterLink>
        </div>

        <div class="latest-conversations-list">
          <div v-if="contact.history && contact.history.length > 0">
            <div v-for="(h, idx) in contact.history" :key="idx" class="history-item-row">
              <div class="history-item-avatar">
                <i class="fa-regular fa-comment"></i>
              </div>
              <div class="history-item-copy">
                <span class="history-item-subject">{{ h.subject || 'Atendimento via WhatsApp' }}</span>
                <small class="history-item-date">{{ h.date }}</small>
              </div>
            </div>
          </div>
          <div v-else class="empty-history-text">
            Nenhuma conversa anterior registrada.
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Edição de Contato -->
    <ModalEditarContato
      v-if="showEditModal"
      :ticket="ticket"
      @close="showEditModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUiStore } from '@/stores/ui.store'
import { formatPhone, formatCnpjCpf } from '@/utils/formatters'
import ModalEditarContato from '@/components/modals/ModalEditarContato.vue'

const props = defineProps({
  ticket: {
    type: Object,
    default: null
  }
})

const ui = useUiStore()
const showEditModal = ref(false)

const contact = computed(() => props.ticket?.contact || {})

const displayPhone = computed(() => {
  const p = contact.value?.phone || props.ticket?.phone
  return formatPhone(p)
})

const whatsappAccountLabel = computed(() => {
  const channel = props.ticket?.channel || ''
  const accountId = channel.startsWith('whatsapp:') ? channel.slice('whatsapp:'.length) : null
  const account = accountId ? ui.whatsappAccounts.find(item => item.id === accountId) : null
  return account?.name || 'WhatsApp Principal'
})

const waitTimeStr = computed(() => {
  if (props.ticket?.status === 'em_atendimento' || props.ticket?.assumed) {
    return 'Em atendimento'
  }
  return 'Na fila (00:04:12)'
})
</script>

<style scoped>
.details-column {
  width: 280px;
  min-width: 280px;
  max-width: 280px;
  background-color: #ffffff;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
  user-select: none;
}

.details-header {
  height: 48px;
  min-height: 48px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e7eb;
}

.details-header-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
}

.details-gear-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid transparent;
  background: transparent;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
}

.details-gear-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.details-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.metadata-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metadata-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.metadata-key {
  color: #64748b;
}

.metadata-val {
  color: #0f172a;
  font-weight: 600;
}

.details-divider {
  height: 1px;
  background: #edf0f3;
  margin: 4px 0;
}

.details-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
}

.section-action-link {
  font-size: 11px;
  font-weight: 600;
  color: #1f62d0;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.section-action-link:hover {
  text-decoration: underline;
}

.related-contact-card {
  display: flex;
  align-items: center;
  gap: 10px;
}

.contact-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.contact-card-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.contact-name {
  font-size: 12.5px;
  font-weight: 650;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-sub {
  font-size: 11px;
  color: #64748b;
}

.contact-fields-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-top: 4px;
}

.contact-field-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: #475569;
}

.contact-field-item i {
  width: 14px;
  text-align: center;
  color: #94a3b8;
  font-size: 11px;
}

.latest-conversations-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #f1f5f9;
}

.history-item-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.history-item-copy {
  display: flex;
  flex-direction: column;
}

.history-item-subject {
  font-size: 11.5px;
  font-weight: 500;
  color: #0f172a;
}

.history-item-date {
  font-size: 10px;
  color: #94a3b8;
}

.empty-history-text {
  font-size: 11px;
  color: #94a3b8;
  padding: 4px 0;
}
</style>
