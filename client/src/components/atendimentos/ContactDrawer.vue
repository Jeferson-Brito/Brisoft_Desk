<template>
  <div class="details-column" id="contactDetailsCol">
    <!-- Abas de Navegação do Painel Lateral -->
    <div style="display:flex;gap:4px;padding:2px;background:#f1f5f9;border-radius:8px;margin-bottom:12px;">
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'contato' }"
        style="flex:1;padding:6px 8px;font-size:11.5px;font-weight:600;border:none;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:all 0.2s ease;"
        :style="{
          background: activeTab === 'contato' ? '#ffffff' : 'transparent',
          color: activeTab === 'contato' ? '#0f172a' : '#64748b',
          boxShadow: activeTab === 'contato' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
        }"
        @click="activeTab = 'contato'"
      >
        <i class="fa-solid fa-user"></i> Contato
      </button>

      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'timeline' }"
        style="flex:1;padding:6px 8px;font-size:11.5px;font-weight:600;border:none;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:all 0.2s ease;"
        :style="{
          background: activeTab === 'timeline' ? '#ffffff' : 'transparent',
          color: activeTab === 'timeline' ? '#0f172a' : '#64748b',
          boxShadow: activeTab === 'timeline' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
        }"
        @click="activeTab = 'timeline'"
      >
        <i class="fa-solid fa-timeline"></i> Metadados & Timeline
      </button>
    </div>

    <!-- ==================== ABA 1: PERFIL E CONTATO ==================== -->
    <div v-show="activeTab === 'contato'" style="display:flex;flex-direction:column;gap:14px;">
      <!-- Card do Perfil do Contato -->
      <div class="contact-profile-card">
        <div class="contact-profile-info">
          <div
            class="initial-avatar"
            style="width:38px;height:38px;font-size:14px;flex-shrink:0;"
            :style="{ backgroundColor: ticket?.avatarColor || '#2563eb' }"
          >
            {{ ticket?.initials || 'CL' }}
          </div>
          <div style="display:flex;flex-direction:column;overflow:hidden;">
            <span class="contact-profile-name">
              {{ ticket?.clientName || ticket?.client_name || 'Cliente' }}
              <i class="fa-brands fa-whatsapp" style="color:#22c55e;font-size:12px;"></i>
            </span>
            <span style="font-size:11px;color:#64748b;">{{ displayPhone }}</span>
          </div>
        </div>
        <button class="btn-icon" title="Editar Contato" @click="showEditModal = true">
          <i class="fa-solid fa-pen"></i>
        </button>
      </div>

      <!-- Seção de Ações Rápidas -->
      <div style="display:flex;gap:8px;justify-content:space-between;">
        <button class="btn-secondary" style="flex:1;font-size:11.5px;padding:6px 8px;justify-content:center;" @click="ui.showToast('Iniciando chamada...')">
          <i class="fa-solid fa-phone"></i> Ligar
        </button>
        <button class="btn-secondary" style="flex:1;font-size:11.5px;padding:6px 8px;justify-content:center;" @click="ui.showToast('Abrindo e-mail...')">
          <i class="fa-solid fa-envelope"></i> E-mail
        </button>
        <button class="btn-secondary" style="font-size:11.5px;padding:6px 10px;" title="Editar Dados" @click="showEditModal = true">
          <i class="fa-solid fa-user-pen"></i>
        </button>
      </div>

      <!-- Informações do Contato -->
      <div>
        <div class="details-section-title" style="margin-bottom:8px;">
          <span>Informações de contato</span>
          <a href="#" class="details-link" @click.prevent="showEditModal = true">Editar</a>
        </div>

        <div class="contact-info-list">
          <div class="contact-info-item">
            <i class="fa-brands fa-whatsapp" style="color:#22c55e;"></i>
            <span>Conexão: <strong>{{ whatsappAccountLabel }}</strong></span>
          </div>
          <div class="contact-info-item">
            <i class="fa-regular fa-envelope"></i>
            <span>{{ contact.email || 'Não informado' }}</span>
          </div>
          <div class="contact-info-item">
            <i class="fa-regular fa-id-card"></i>
            <span>{{ contact.cnpj ? `CNPJ: ${formatCnpjCpf(contact.cnpj)}` : 'CNPJ: Não informado' }}</span>
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
      <div>
        <div class="details-section-title" style="margin-bottom:8px;">
          <span>Conversas anteriores</span>
          <RouterLink to="/historico" class="details-link">Ver todos</RouterLink>
        </div>

        <div id="contactHistoryList">
          <div v-if="contact.history && contact.history.length > 0">
            <div v-for="(h, idx) in contact.history" :key="idx" class="history-mini-item">
              <div class="history-mini-top">
                <span class="history-mini-date">{{ h.date }}</span>
                <span class="badge badge-finalizado" style="font-size:9.5px;padding:1px 6px;">{{ h.status }}</span>
              </div>
              <span class="history-mini-subject">{{ h.subject }}</span>
            </div>
          </div>
          <div v-else style="font-size:11px;color:#94a3b8;padding:4px 0;">
            Nenhum atendimento anterior registrado.
          </div>
        </div>
      </div>

      <!-- Notas do Cliente -->
      <div>
        <div class="details-section-title" style="margin-bottom:8px;">
          <span>Notas do cliente</span>
          <a href="#" class="details-link" @click.prevent="showEditModal = true">Editar</a>
        </div>

        <div class="note-card-yellow">
          <p>{{ latestNoteText }}</p>
          <span class="note-card-footer">{{ latestNoteAuthor }}</span>
        </div>
      </div>

      <!-- Tags -->
      <div>
        <div class="details-section-title" style="margin-bottom:8px;">
          <span>Tags</span>
          <a href="#" class="details-link" @click.prevent="ui.showToast('Editar tags...')">Editar</a>
        </div>

        <div class="tags-container">
          <span
            v-for="(tag, idx) in (contact.tags || ['WhatsApp', 'Atendimento'])"
            :key="idx"
            class="tag-pill"
            :class="idx % 2 === 0 ? 'tag-blue' : 'tag-purple'"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </div>

    <!-- ==================== ABA 2: LINHA DO TEMPO & METADADOS ==================== -->
    <div v-show="activeTab === 'timeline'" style="display:flex;flex-direction:column;gap:14px;">
      <!-- Card de Resumo Operacional -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;">
        <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">
          Resumo do Atendimento
        </span>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11.5px;">
          <div style="background:#ffffff;padding:8px;border-radius:6px;border:1px solid #e2e8f0;">
            <span style="color:#64748b;display:block;font-size:10.5px;">Departamento:</span>
            <strong style="color:#2563eb;">{{ ticket?.department || ticket?.deptInitial || 'Geral' }}</strong>
          </div>
          <div style="background:#ffffff;padding:8px;border-radius:6px;border:1px solid #e2e8f0;">
            <span style="color:#64748b;display:block;font-size:10.5px;">Atendente:</span>
            <strong style="color:#334155;">{{ ticket?.agent_name || (ticket?.assumed ? 'Atendente' : 'Na Fila') }}</strong>
          </div>
          <div style="background:#ffffff;padding:8px;border-radius:6px;border:1px solid #e2e8f0;grid-column:span 2;">
            <span style="color:#64748b;display:block;font-size:10.5px;">Conexão WhatsApp:</span>
            <strong style="color:#16a34a;display:inline-flex;align-items:center;gap:6px;">
              <i class="fa-brands fa-whatsapp"></i> {{ whatsappAccountLabel }}
            </strong>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;padding-top:4px;border-top:1px dashed #e2e8f0;">
          <span style="color:#64748b;">Tempo de Espera (TME):</span>
          <strong style="color:#0f172a;">{{ waitTimeStr }}</strong>
        </div>
      </div>

      <!-- Linha do Tempo Visual dos Eventos -->
      <div>
        <span class="details-section-title" style="margin-bottom:10px;display:block;">
          Linha do Tempo dos Eventos
        </span>

        <div class="timeline-container" style="display:flex;flex-direction:column;gap:12px;position:relative;padding-left:18px;">
          <!-- Linha vertical guia -->
          <div style="position:absolute;left:6px;top:6px;bottom:6px;width:2px;background:#e2e8f0;"></div>

          <!-- 1. Primeira mensagem do cliente -->
          <div class="timeline-item" style="position:relative;display:flex;flex-direction:column;gap:2px;">
            <div style="position:absolute;left:-18px;top:2px;width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid #ffffff;box-shadow:0 0 0 1px #22c55e;"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="font-size:11.5px;color:#0f172a;">1ª Mensagem do Cliente</strong>
              <span style="font-size:10.5px;color:#64748b;">{{ timelineEvents.clientFirstTime || '--' }}</span>
            </div>
            <span style="font-size:11px;color:#64748b;line-height:1.35;">
              Cliente iniciou contato via WhatsApp
            </span>
          </div>

          <!-- 2. Resposta do Bot -->
          <div class="timeline-item" style="position:relative;display:flex;flex-direction:column;gap:2px;">
            <div style="position:absolute;left:-18px;top:2px;width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2px solid #ffffff;box-shadow:0 0 0 1px #3b82f6;"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="font-size:11.5px;color:#0f172a;">Resposta do Chatbot</strong>
              <span style="font-size:10.5px;color:#64748b;">{{ timelineEvents.botGreetingTime || '--' }}</span>
            </div>
            <span style="font-size:11px;color:#64748b;line-height:1.35;">
              Menu de autoatendimento enviado
            </span>
          </div>

          <!-- 3. Entrada na Fila (Escolha do Departamento) -->
          <div class="timeline-item" style="position:relative;display:flex;flex-direction:column;gap:2px;">
            <div style="position:absolute;left:-18px;top:2px;width:14px;height:14px;border-radius:50%;background:#f59e0b;border:2px solid #ffffff;box-shadow:0 0 0 1px #f59e0b;"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="font-size:11.5px;color:#0f172a;">Entrada na Fila</strong>
              <span style="font-size:10.5px;color:#64748b;">{{ timelineEvents.queueEntryTime || '--' }}</span>
            </div>
            <span style="font-size:11px;color:#64748b;line-height:1.35;">
              Direcionado para <strong>{{ ticket?.department || 'Departamento' }}</strong>
            </span>
          </div>

          <!-- 4. Atendimento Assumido -->
          <div v-if="timelineEvents.assumedTime" class="timeline-item" style="position:relative;display:flex;flex-direction:column;gap:2px;">
            <div style="position:absolute;left:-18px;top:2px;width:14px;height:14px;border-radius:50%;background:#8b5cf6;border:2px solid #ffffff;box-shadow:0 0 0 1px #8b5cf6;"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="font-size:11.5px;color:#0f172a;">Atendimento Assumido</strong>
              <span style="font-size:10.5px;color:#64748b;">{{ timelineEvents.assumedTime }}</span>
            </div>
            <span style="font-size:11px;color:#64748b;line-height:1.35;">
              Assumido por <strong>{{ ticket?.agent_name || 'Atendente' }}</strong>
            </span>
          </div>

          <!-- 5. 1ª Resposta do Atendente -->
          <div v-if="timelineEvents.agentFirstTime" class="timeline-item" style="position:relative;display:flex;flex-direction:column;gap:2px;">
            <div style="position:absolute;left:-18px;top:2px;width:14px;height:14px;border-radius:50%;background:#06b6d4;border:2px solid #ffffff;box-shadow:0 0 0 1px #06b6d4;"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="font-size:11.5px;color:#0f172a;">1ª Resposta do Atendente</strong>
              <span style="font-size:10.5px;color:#64748b;">{{ timelineEvents.agentFirstTime }}</span>
            </div>
            <span style="font-size:11px;color:#64748b;line-height:1.35;">
              Primeira mensagem enviada pelo atendente
            </span>
          </div>
        </div>
      </div>

      <!-- Histórico de Transferências -->
      <div>
        <span class="details-section-title" style="margin-bottom:8px;display:block;">
          Histórico de Transferências
        </span>

        <div v-if="transferEvents.length > 0" style="display:flex;flex-direction:column;gap:8px;">
          <div
            v-for="(tr, idx) in transferEvents"
            :key="idx"
            style="background:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid #6366f1;border-radius:6px;padding:8px 10px;font-size:11.5px;"
          >
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
              <strong style="color:#4338ca;">Transferência #{{ idx + 1 }}</strong>
              <span style="color:#94a3b8;font-size:10.5px;">{{ tr.time || '--' }}</span>
            </div>
            <p style="margin:0;color:#334155;line-height:1.35;">{{ tr.text }}</p>
          </div>
        </div>
        <div v-else style="font-size:11px;color:#94a3b8;padding:4px 0;background:#f8fafc;border:1px dashed #e2e8f0;border-radius:6px;text-align:center;">
          Nenhuma transferência realizada neste atendimento.
        </div>
      </div>

      <!-- Metadados Técnicos -->
      <div style="font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span>ID do Chamado:</span>
          <code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;">{{ ticket?.id ? ticket.id.substring(0, 8) : '--' }}</code>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span>Status:</span>
          <strong style="color:#0f172a;text-transform:capitalize;">{{ ticket?.status || 'Aguardando' }}</strong>
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

// Computa os eventos da linha do tempo com base nas mensagens do ticket
const timelineEvents = computed(() => {
  const msgs = props.ticket?.messages || []
  
  // 1ª mensagem do cliente
  const clientFirst = msgs.find(m => m.sender === 'client' && !m.text?.includes('[Chatbot]'))
  // Resposta do bot
  const botGreeting = msgs.find(m => m.sender === 'system' && (m.text?.includes('Bem-vindo') || m.text?.includes('central de atendimento')))
  // Escolha do departamento / entrada na fila
  const queueEntry = msgs.find(m => m.text?.includes('[Chatbot] Cliente escolheu:') || m.text?.includes('Você selecionou'))
  // Atendimento assumido
  const assumed = msgs.find(m => m.text?.includes('Atendimento assumido por'))
  // 1ª resposta humana do atendente
  const agentFirst = msgs.find(m => m.sender === 'agent')

  return {
    clientFirstTime: clientFirst?.time || props.ticket?.time || '--',
    botGreetingTime: botGreeting?.time || clientFirst?.time || props.ticket?.time || '--',
    queueEntryTime: queueEntry?.time || props.ticket?.time || '--',
    assumedTime: assumed?.time || (props.ticket?.assumed ? props.ticket?.time : null),
    agentFirstTime: agentFirst?.time || null
  }
})

// Lista de transferências ocorridas no ticket
const transferEvents = computed(() => {
  const msgs = props.ticket?.messages || []
  return msgs
    .filter(m => m.text?.includes('🔄 Atendimento transferido'))
    .map(m => ({
      time: m.time,
      text: m.text
    }))
})

// Tempo de espera na fila (TME)
const waitTimeStr = computed(() => {
  if (props.ticket?.status === 'em_atendimento' || props.ticket?.assumed) {
    return 'Atendimento iniciado'
  }
  return 'Em espera na fila'
})
</script>
