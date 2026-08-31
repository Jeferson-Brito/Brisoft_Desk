<template>
  <div class="details-column" id="contactDetailsCol">
    <!-- Abas de Navegação do Painel Lateral -->
    <div class="details-nav-tabs">
      <button
        type="button"
        class="details-tab-btn"
        :class="{ active: activeTab === 'contato' }"
        @click="activeTab = 'contato'"
      >
        <i class="fa-solid fa-user"></i> Contato
      </button>

      <button
        type="button"
        class="details-tab-btn"
        :class="{ active: activeTab === 'timeline' }"
        @click="activeTab = 'timeline'"
      >
        <i class="fa-solid fa-timeline"></i> Metadados & Timeline
      </button>
    </div>

    <!-- ==================== ABA 1: PERFIL E CONTATO ==================== -->
    <div v-show="activeTab === 'contato'" class="details-content-wrap">
      <!-- Card do Perfil do Contato -->
      <div class="contact-profile-card">
        <div class="contact-profile-info">
          <div
            class="initial-avatar"
            style="width:36px;height:36px;font-size:13px;flex-shrink:0;"
            :style="{ backgroundColor: ticket?.avatarColor || '#1f62d0' }"
          >
            {{ ticket?.initials || 'CL' }}
          </div>
          <div style="display:flex;flex-direction:column;min-width:0;">
            <span class="contact-profile-name">
              {{ ticket?.clientName || ticket?.client_name || 'Cliente' }}
              <i class="fa-brands fa-whatsapp" style="color:#168a52;font-size:12px;"></i>
            </span>
            <span style="font-size:11px;color:var(--text-muted);">{{ displayPhone }}</span>
            <span v-if="ticket?.is_employee" class="employee-detail-badge">
              <i class="fa-solid fa-id-badge"></i> Funcionário da empresa
            </span>
          </div>
        </div>
        <button class="btn-icon" title="Editar Contato" @click="showEditModal = true">
          <i class="fa-solid fa-pen"></i>
        </button>
      </div>

      <!-- Seção de Ações Rápidas -->
      <div class="quick-action-row">
        <button class="btn-secondary" @click="ui.showToast('Iniciando chamada...')">
          <i class="fa-solid fa-phone"></i> Ligar
        </button>
        <button class="btn-secondary" @click="ui.showToast('Abrindo e-mail...')">
          <i class="fa-solid fa-envelope"></i> E-mail
        </button>
        <button class="btn-secondary btn-icon-only" title="Editar Dados" @click="showEditModal = true">
          <i class="fa-solid fa-user-pen"></i>
        </button>
      </div>

      <!-- Informações do Contato -->
      <div class="details-section">
        <div class="details-section-title">
          <span>Informações de contato</span>
          <a href="#" class="details-link" @click.prevent="showEditModal = true">Editar</a>
        </div>

        <div class="contact-info-list">
          <div class="contact-info-item">
            <i class="fa-brands fa-whatsapp" style="color:#168a52;"></i>
            <span>Conexão: <strong>{{ whatsappAccountLabel }}</strong></span>
          </div>
          <div class="contact-info-item">
            <i class="fa-regular fa-envelope"></i>
            <span>{{ contact.email || 'Não informado' }}</span>
          </div>
          <div class="contact-info-item">
            <i class="fa-regular fa-id-card"></i>
            <span>{{ contact.cnpj ? `Documento: ${formatCnpjCpf(contact.cnpj)}` : 'Documento: Não informado' }}</span>
          </div>
          <div class="contact-info-item">
            <i class="fa-regular fa-building"></i>
            <span>{{ contact.company || 'Empresa não informada' }}</span>
          </div>
          <div class="contact-info-item">
            <i class="fa-solid fa-location-dot"></i>
            <span>Brasil</span>
          </div>
        </div>
      </div>

      <!-- Histórico de Atendimentos Anteriores -->
      <div class="details-section">
        <div class="details-section-title">
          <span>Conversas anteriores</span>
          <RouterLink to="/historico" class="details-link">Ver todos</RouterLink>
        </div>

        <div id="contactHistoryList">
          <div v-if="contact.history && contact.history.length > 0">
            <div v-for="(h, idx) in contact.history" :key="idx" class="history-mini-item">
              <div class="history-mini-top">
                <span class="history-mini-date">{{ h.date }}</span>
                <span class="badge badge-finalizado" style="font-size:9.5px;padding:1px 5px;">{{ h.status }}</span>
              </div>
              <span class="history-mini-subject">{{ h.subject }}</span>
            </div>
          </div>
          <div v-else style="font-size:11.5px;color:var(--text-muted);padding:4px 0;">
            Nenhum atendimento anterior registrado.
          </div>
        </div>
      </div>

      <!-- Notas do Cliente -->
      <div class="details-section">
        <div class="details-section-title">
          <span>Notas do cliente</span>
          <a href="#" class="details-link" @click.prevent="showEditModal = true">Editar</a>
        </div>

        <div class="note-card-clean">
          <p>{{ latestNoteText }}</p>
          <span class="note-card-footer">{{ latestNoteAuthor }}</span>
        </div>
      </div>

      <!-- Tags -->
      <div class="details-section">
        <div class="details-section-title">
          <span>Tags</span>
          <a href="#" class="details-link" @click.prevent="ui.showToast('Editar tags...')">Editar</a>
        </div>

        <div class="tags-container">
          <span
            v-for="(tag, idx) in (contact.tags || ['WhatsApp', 'Atendimento'])"
            :key="idx"
            class="tag-pill"
            :class="idx % 2 === 0 ? 'tag-blue' : 'tag-neutral'"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </div>

    <!-- ==================== ABA 2: LINHA DO TEMPO & METADADOS ==================== -->
    <div v-show="activeTab === 'timeline'" class="details-content-wrap">
      <!-- Card de Resumo Operacional -->
      <div class="operational-summary-box">
        <span class="summary-box-title">
          Resumo do Atendimento
        </span>

        <div class="summary-grid">
          <div class="summary-grid-item">
            <span class="summary-label">Departamento:</span>
            <strong style="color:var(--brand-primary);">{{ ticket?.department || ticket?.deptInitial || 'Geral' }}</strong>
          </div>
          <div class="summary-grid-item">
            <span class="summary-label">Atendente:</span>
            <strong style="color:var(--text-main);">{{ ticket?.agent_name || (ticket?.assumed ? 'Atendente' : 'Na Fila') }}</strong>
          </div>
          <div class="summary-grid-item summary-grid-full">
            <span class="summary-label">Conexão WhatsApp:</span>
            <strong style="color:#168a52;display:inline-flex;align-items:center;gap:5px;">
              <i class="fa-brands fa-whatsapp"></i> {{ whatsappAccountLabel }}
            </strong>
          </div>
        </div>

        <div class="summary-footer">
          <span>Tempo de Espera (TME):</span>
          <strong>{{ waitTimeStr }}</strong>
        </div>
      </div>

      <!-- Linha do Tempo Visual dos Eventos -->
      <div class="details-section">
        <span class="details-section-title" style="margin-bottom:10px;">
          Linha do Tempo dos Eventos
        </span>

        <div class="timeline-container">
          <div class="timeline-line"></div>

          <!-- 1. Primeira mensagem do cliente -->
          <div class="timeline-item">
            <div class="timeline-dot dot-green"></div>
            <div class="timeline-header">
              <strong>1ª Mensagem do Cliente</strong>
              <span>{{ timelineEvents.clientFirstTime || '--' }}</span>
            </div>
            <span class="timeline-desc">Cliente iniciou contato via WhatsApp</span>
          </div>

          <!-- 2. Resposta do Bot -->
          <div class="timeline-item">
            <div class="timeline-dot dot-blue"></div>
            <div class="timeline-header">
              <strong>Resposta do Chatbot</strong>
              <span>{{ timelineEvents.botGreetingTime || '--' }}</span>
            </div>
            <span class="timeline-desc">Menu de autoatendimento enviado</span>
          </div>

          <!-- 3. Entrada na Fila -->
          <div class="timeline-item">
            <div class="timeline-dot dot-yellow"></div>
            <div class="timeline-header">
              <strong>Entrada na Fila</strong>
              <span>{{ timelineEvents.queueEntryTime || '--' }}</span>
            </div>
            <span class="timeline-desc">Direcionado para <strong>{{ ticket?.department || 'Departamento' }}</strong></span>
          </div>

          <!-- 4. Atendimento Assumido -->
          <div v-if="timelineEvents.assumedTime" class="timeline-item">
            <div class="timeline-dot dot-purple"></div>
            <div class="timeline-header">
              <strong>Atendimento Assumido</strong>
              <span>{{ timelineEvents.assumedTime }}</span>
            </div>
            <span class="timeline-desc">Assumido por <strong>{{ ticket?.agent_name || 'Atendente' }}</strong></span>
          </div>

          <!-- 5. 1ª Resposta do Atendente -->
          <div v-if="timelineEvents.agentFirstTime" class="timeline-item">
            <div class="timeline-dot dot-cyan"></div>
            <div class="timeline-header">
              <strong>1ª Resposta do Atendente</strong>
              <span>{{ timelineEvents.agentFirstTime }}</span>
            </div>
            <span class="timeline-desc">Primeira mensagem enviada pelo atendente</span>
          </div>
        </div>
      </div>

      <!-- Histórico de Transferências -->
      <div class="details-section">
        <span class="details-section-title" style="margin-bottom:8px;">
          Histórico de Transferências
        </span>

        <div v-if="transferEvents.length > 0" style="display:flex;flex-direction:column;gap:6px;">
          <div
            v-for="(tr, idx) in transferEvents"
            :key="idx"
            class="transfer-event-card"
          >
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
              <strong style="color:var(--brand-primary);font-size:11.5px;">Transferência #{{ idx + 1 }}</strong>
              <span style="color:var(--text-muted);font-size:10.5px;">{{ tr.time || '--' }}</span>
            </div>
            <p style="margin:0;color:var(--text-main);font-size:11.5px;line-height:1.35;">{{ tr.text }}</p>
          </div>
        </div>
        <div v-else style="font-size:11px;color:var(--text-muted);padding:8px;background:#ffffff;border:1px dashed var(--border-color);border-radius:6px;text-align:center;">
          Nenhuma transferência realizada neste atendimento.
        </div>
      </div>

      <!-- Metadados Técnicos -->
      <div class="tech-metadata-box">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span>ID do Chamado:</span>
          <code>{{ ticket?.id ? ticket.id.substring(0, 8) : '--' }}</code>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span>Status:</span>
          <strong style="color:var(--text-main);text-transform:capitalize;">{{ ticket?.status || 'Aguardando' }}</strong>
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
const activeTab = ref('contato')
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

const latestNoteText = computed(() => {
  const notes = contact.value?.notes
  if (notes && notes.length > 0) return notes[0].text
  return 'Cliente em atendimento ativo via WhatsApp.'
})

const latestNoteAuthor = computed(() => {
  const notes = contact.value?.notes
  if (notes && notes.length > 0) return `Adicionado em ${notes[0].date} por ${notes[0].author}`
  return 'Registrado automaticamente pelo sistema'
})

const timelineEvents = computed(() => {
  const msgs = props.ticket?.messages || []
  
  const clientFirst = msgs.find(m => m.sender === 'client' && !m.text?.includes('[Chatbot]'))
  const botGreeting = msgs.find(m => m.sender === 'system' && (m.text?.includes('Bem-vindo') || m.text?.includes('central de atendimento')))
  const queueEntry = msgs.find(m => m.text?.includes('[Chatbot] Cliente escolheu:') || m.text?.includes('Você selecionou'))
  const assumed = msgs.find(m => m.text?.includes('Atendimento assumido por'))
  const agentFirst = msgs.find(m => m.sender === 'agent')

  return {
    clientFirstTime: clientFirst?.time || props.ticket?.time || '--',
    botGreetingTime: botGreeting?.time || clientFirst?.time || props.ticket?.time || '--',
    queueEntryTime: queueEntry?.time || props.ticket?.time || '--',
    assumedTime: assumed?.time || (props.ticket?.assumed ? props.ticket?.time : null),
    agentFirstTime: agentFirst?.time || null
  }
})

const transferEvents = computed(() => {
  const msgs = props.ticket?.messages || []
  return msgs
    .filter(m => m.text?.includes('🔄 Atendimento transferido'))
    .map(m => ({
      time: m.time,
      text: m.text
    }))
})

const waitTimeStr = computed(() => {
  if (props.ticket?.status === 'em_atendimento' || props.ticket?.assumed) {
    return 'Atendimento iniciado'
  }
  return 'Em espera na fila'
})
</script>

<style scoped>
.details-column {
  background-color: #fafbfc;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-left: 1px solid var(--border-color);
  box-sizing: border-box;
}

.details-nav-tabs {
  display: flex;
  gap: 3px;
  padding: 3px;
  background: #edf0f3;
  border-radius: 6px;
}

.details-tab-btn {
  flex: 1;
  padding: 6px 8px;
  font-size: 11.5px;
  font-weight: 600;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.details-tab-btn.active {
  background: #ffffff;
  color: var(--text-main);
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.06);
}

.details-content-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.contact-profile-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background-color: #ffffff;
  border-radius: 7px;
  border: 1px solid var(--border-color);
}

.contact-profile-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.contact-profile-name {
  font-weight: 650;
  font-size: 13px;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.employee-detail-badge {
  margin-top: 3px;
  font-size: 9.5px;
  font-weight: 700;
  color: #047857;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.quick-action-row {
  display: flex;
  gap: 6px;
}

.quick-action-row .btn-secondary {
  flex: 1;
  font-size: 11.5px;
  padding: 5px 8px;
  justify-content: center;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.quick-action-row .btn-icon-only {
  flex: 0 0 32px;
  padding: 5px;
}

.details-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid #edf0f3;
  padding-top: 10px;
}

.details-section-title {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-main);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.details-link {
  font-size: 11px;
  color: var(--brand-primary);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.details-link:hover {
  text-decoration: underline;
}

.contact-info-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--text-main);
}

.contact-info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.contact-info-item i {
  color: var(--text-light);
  width: 14px;
  font-size: 12px;
  text-align: center;
}

.history-mini-item {
  padding: 6px 0;
  border-bottom: 1px solid #edf0f3;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-mini-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10.5px;
}

.history-mini-date {
  color: var(--text-muted);
}

.history-mini-subject {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-main);
}

.note-card-clean {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 11.5px;
  color: var(--text-main);
}

.note-card-clean p {
  margin: 0 0 4px;
  line-height: 1.4;
}

.note-card-footer {
  font-size: 10px;
  color: var(--text-muted);
  display: block;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tag-pill {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 600;
}

.tag-blue {
  background: #eff6ff;
  color: var(--brand-primary);
  border: 1px solid #dbeafe;
}

.tag-neutral {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

/* Timeline & Summary */
.operational-summary-box {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-box-title {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  font-size: 11.5px;
}

.summary-grid-item {
  background: #f8fafc;
  padding: 6px 8px;
  border-radius: 5px;
  border: 1px solid #edf0f3;
}

.summary-grid-full {
  grid-column: span 2;
}

.summary-label {
  color: var(--text-muted);
  display: block;
  font-size: 10px;
  margin-bottom: 1px;
}

.summary-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  padding-top: 6px;
  border-top: 1px solid #edf0f3;
  color: var(--text-muted);
}

.summary-footer strong {
  color: var(--text-main);
}

.timeline-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  padding-left: 18px;
}

.timeline-line {
  position: absolute;
  left: 5px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: #e2e8f0;
}

.timeline-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.timeline-dot {
  position: absolute;
  left: -18px;
  top: 3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #ffffff;
}

.dot-green { background: #168a52; box-shadow: 0 0 0 1px #168a52; }
.dot-blue { background: #1f62d0; box-shadow: 0 0 0 1px #1f62d0; }
.dot-yellow { background: #b7791f; box-shadow: 0 0 0 1px #b7791f; }
.dot-purple { background: #7c3aed; box-shadow: 0 0 0 1px #7c3aed; }
.dot-cyan { background: #0891b2; box-shadow: 0 0 0 1px #0891b2; }

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timeline-header strong {
  font-size: 11.5px;
  color: var(--text-main);
}

.timeline-header span {
  font-size: 10.5px;
  color: var(--text-muted);
}

.timeline-desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.35;
}

.transfer-event-card {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-left: 3px solid #6366f1;
  border-radius: 5px;
  padding: 6px 9px;
  font-size: 11.5px;
}

.tech-metadata-box {
  font-size: 11px;
  color: var(--text-muted);
  border-top: 1px solid #edf0f3;
  padding-top: 8px;
}

.tech-metadata-box code {
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10.5px;
}
</style>
