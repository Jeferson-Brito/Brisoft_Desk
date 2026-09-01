<template>
  <div class="settings-view-grid" :class="{ standalone }" style="width:100%;">
    <!-- Coluna 1: Menu de Navegação das Configurações -->
    <div v-if="!standalone" class="settings-nav-sidebar">
      <div
        v-if="authStore.isAdmin"
        class="settings-nav-item"
        :class="{ active: activeTab === 'conexoes' }"
        @click="activeTab = 'conexoes'"
      >
        <i class="fa-solid fa-plug"></i>
        <div class="settings-nav-meta">
          <span class="settings-nav-title">Conexões</span>
          <span class="settings-nav-desc">Servidor e contas do WhatsApp</span>
        </div>
      </div>

      <div
        v-if="authStore.isAdmin"
        class="settings-nav-item"
        :class="{ active: activeTab === 'geral' }"
        @click="activeTab = 'geral'"
      >
        <i class="fa-solid fa-sliders"></i>
        <div class="settings-nav-meta">
          <span class="settings-nav-title">Geral & Empresa</span>
          <span class="settings-nav-desc">Dados da empresa e preferências</span>
        </div>
      </div>

      <div
        v-if="authStore.isAdmin"
        class="settings-nav-item"
        :class="{ active: activeTab === 'departamentos' }"
        @click="activeTab = 'departamentos'"
      >
        <i class="fa-solid fa-building"></i>
        <div class="settings-nav-meta">
          <span class="settings-nav-title">Departamentos</span>
          <span class="settings-nav-desc">Filas de atendimento e cores</span>
        </div>
      </div>

    </div>

    <!-- Coluna 2: Área Principal de Configurações -->
    <div class="settings-main-form-area">
      <!-- ABA: CONEXÕES -->
      <div v-if="activeTab === 'conexoes'" class="settings-section-card">
        <div class="settings-section-header">
          <div>
            <span class="settings-section-heading">Conexões e diagnóstico</span>
            <div style="font-size:11px;color:#64748b;margin-top:3px;">Gerencie o servidor e todos os números de WhatsApp da empresa.</div>
          </div>
        </div>
        <ConnectionsSettings />
      </div>

      <!-- ABA 1: GERAL -->
      <div v-else-if="activeTab === 'geral'" class="settings-section-card">
        <div class="settings-section-header">
          <span class="settings-section-heading">Informações da Empresa</span>
          <button class="btn-primary" @click="saveGeneralSettings">
            <i class="fa-solid fa-floppy-disk"></i> Salvar Alterações
          </button>
        </div>

        <div class="settings-form-grid-2">
          <div>
            <label style="font-size:11.5px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Nome da Empresa</label>
            <input v-model="formGeneral.company_name" type="text" style="width:100%;font-size:12.5px;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;" />
          </div>
          <div>
            <label style="font-size:11.5px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">CNPJ Principal</label>
            <input v-model="formGeneral.cnpj" type="text" style="width:100%;font-size:12.5px;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;" />
          </div>
        </div>
      </div>

      <!-- ABA 2: DEPARTAMENTOS -->
      <div v-else-if="activeTab === 'departamentos'" class="settings-section-card">
        <div class="settings-section-header">
          <span class="settings-section-heading">Departamentos de Atendimento</span>
          <button class="btn-primary" @click="showModalDept = true">
            <i class="fa-solid fa-plus"></i> Novo Departamento
          </button>
        </div>

        <table class="data-table" style="width:100%;">
          <thead>
            <tr>
              <th>Departamento</th>
              <th>Cor de Identificação</th>
              <th>Descrição</th>
              <th style="text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in settingsStore.departments" :key="d.id">
              <td style="font-weight:600;">{{ d.name }}</td>
              <td>
                <span style="display:inline-flex;align-items:center;gap:6px;font-size:11px;">
                  <span style="width:14px;height:14px;border-radius:50%;" :style="{ backgroundColor: d.color || '#2563eb' }"></span>
                  <code>{{ d.color || '#2563eb' }}</code>
                </span>
              </td>
              <td style="font-size:12px;color:#64748b;">{{ d.description || '—' }}</td>
              <td style="text-align:right;">
                <button class="btn-icon" style="color:#ef4444;" title="Excluir" @click="deleteDept(d)">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ABA 3: CHATBOT -->
      <div v-else-if="activeTab === 'bot'" class="settings-section-card">
        <div class="settings-section-header">
          <div>
            <span class="settings-section-heading">Chatbot do WhatsApp</span>
            <div style="font-size:11px;color:#64748b;margin-top:3px;">Defina o comportamento, o roteamento e todas as mensagens automáticas.</div>
          </div>
          <button class="btn-primary" :disabled="savingBot" @click="saveBotSettings">
            <i class="fa-solid fa-floppy-disk"></i> {{ savingBot ? 'Salvando...' : 'Salvar configurações' }}
          </button>
        </div>

        <div style="display:flex;flex-direction:column;gap:18px;">
          <div style="padding:14px;border:1px solid #dbeafe;background:#f8fbff;border-radius:8px;display:flex;justify-content:space-between;align-items:center;gap:16px;">
            <div>
              <strong style="display:block;font-size:13px;color:#1e293b;">Bot automático</strong>
              <span style="font-size:11.5px;color:#64748b;">Quando desligado, novos contatos vão diretamente para o departamento padrão.</span>
            </div>
            <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;cursor:pointer;">
              <input v-model="botConfig.enabled" type="checkbox" />
              {{ botConfig.enabled ? 'Ativado' : 'Desativado' }}
            </label>
          </div>

          <div class="settings-form-grid-2">
            <div>
              <label class="bot-field-label">Departamento padrão</label>
              <select v-model="botConfig.default_department_id" class="bot-field-control">
                <option :value="null">Selecione um departamento</option>
                <option v-for="department in settingsStore.departments" :key="department.id" :value="department.id">{{ department.name }}</option>
              </select>
              <span class="bot-field-help">Último recurso: usado quando a conta do WhatsApp não possui departamento dedicado nem padrão individual.</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div>
                <label class="bot-field-label">Retomar por até (horas)</label>
                <input v-model.number="botConfig.resume_window_hours" class="bot-field-control" type="number" min="1" max="168" />
              </div>
              <div>
                <label class="bot-field-label">Janela da avaliação (min.)</label>
                <input v-model.number="botConfig.rating_window_minutes" class="bot-field-control" type="number" min="5" max="1440" />
              </div>
            </div>
          </div>

          <div>
            <div class="bot-field-label" style="margin-bottom:8px;">Regras e rotinas</div>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 18px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
              <label v-for="option in botBehaviorOptions" :key="option.key" style="display:flex;gap:8px;align-items:flex-start;font-size:12px;color:#334155;cursor:pointer;">
                <input v-model="botConfig[option.key]" type="checkbox" style="margin-top:2px;" />
                <span><strong style="display:block;">{{ option.label }}</strong><small style="color:#64748b;">{{ option.help }}</small></span>
              </label>
            </div>
          </div>

          <div class="inactivity-settings-card">
            <div class="inactivity-settings-header">
              <div class="inactivity-settings-icon"><i class="fa-regular fa-clock"></i></div>
              <div class="inactivity-settings-title">
                <strong>Inatividade nos atendimentos pelo WhatsApp</strong>
                <span>Controla conversas em andamento atendidas diretamente pelo celular, fora da plataforma.</span>
              </div>
              <label class="inactivity-toggle">
                <input v-model="botConfig.auto_close_external_service" type="checkbox" />
                <span>{{ botConfig.auto_close_external_service ? 'Ativada' : 'Desativada' }}</span>
              </label>
            </div>

            <div v-if="botConfig.auto_close_external_service" class="inactivity-settings-body">
              <div>
                <label class="bot-field-label">Encerrar após quanto tempo sem mensagens?</label>
                <div class="inactivity-time-input">
                  <input v-model.number="botConfig.external_service_idle_minutes" class="bot-field-control" type="number" min="5" max="1440" />
                  <span>minutos</span>
                </div>
                <span class="bot-field-help">Aceita de 5 minutos a 24 horas. O tempo reinicia sempre que o cliente ou atendente envia uma mensagem.</span>
              </div>

              <label class="inactivity-action-option">
                <input v-model="botConfig.send_rating_on_external_inactivity" type="checkbox" />
                <span>
                  <strong>Enviar pesquisa de satisfação ao encerrar</strong>
                  <small>Aplica-se somente a clientes. Funcionários nunca recebem pesquisa de satisfação.</small>
                </span>
              </label>

              <div class="inactivity-result-note">
                <i class="fa-solid fa-arrow-rotate-right"></i>
                <span>Depois do encerramento, uma nova mensagem do cliente inicia normalmente um novo fluxo no bot.</span>
              </div>
            </div>

            <div v-else class="inactivity-disabled-note">
              Os atendimentos feitos pelo celular permanecerão em andamento até serem encerrados manualmente ou até o cliente pedir um novo atendimento.
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,260px));gap:12px;">
            <div v-if="botConfig.auto_route_after_invalid">
              <label class="bot-field-label">Tentativas inválidas antes de encaminhar</label>
              <input v-model.number="botConfig.invalid_attempt_limit" class="bot-field-control" type="number" min="1" max="10" />
            </div>
            <div>
              <label class="bot-field-label">Proteção para mensagens rápidas (seg.)</label>
              <input v-model.number="botConfig.rapid_message_grace_seconds" class="bot-field-control" type="number" min="0" max="15" />
              <span class="bot-field-help">Evita considerar como erro uma mensagem enviada antes de o menu aparecer. Use 0 para desativar.</span>
            </div>
          </div>

          <div v-if="botConfig.collect_customer_name" style="max-width:260px;">
            <label class="bot-field-label">Tentativas para informar o nome</label>
            <input v-model.number="botConfig.customer_name_attempt_limit" class="bot-field-control" type="number" min="1" max="5" />
            <span class="bot-field-help">Após esse limite, o atendimento continua sem salvar um nome.</span>
          </div>

          <div class="settings-form-grid-3" style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;">
            <div>
              <label class="bot-field-label">Palavras para reabrir o menu</label>
              <input v-model="botConfig.menu_keywords" class="bot-field-control" type="text" />
              <span class="bot-field-help">Separe por vírgulas. Exemplo: menu, ajuda, início.</span>
            </div>
            <div>
              <label class="bot-field-label">Palavras para falar com um humano</label>
              <input v-model="botConfig.human_handoff_keywords" class="bot-field-control" type="text" :disabled="!botConfig.human_handoff_enabled" />
              <span class="bot-field-help">Encaminha imediatamente ao departamento padrão.</span>
            </div>
            <div>
              <label class="bot-field-label">Palavras para cancelar atendimento</label>
              <input v-model="botConfig.cancel_keywords" class="bot-field-control" type="text" :disabled="!botConfig.allow_customer_cancel" />
              <span class="bot-field-help">Encerra o chamado no bot. Ex: cancelar, sair, 0.</span>
            </div>
            <div>
              <label class="bot-field-label">Palavras para iniciar outro atendimento</label>
              <input v-model="botConfig.restart_service_keywords" class="bot-field-control" type="text" />
              <span class="bot-field-help">Durante atendimento pelo celular, encerra a conversa atual e reabre o menu do bot.</span>
            </div>
          </div>

          <div>
            <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:10px;gap:12px;">
              <div>
                <div class="bot-field-label">Mensagens automáticas</div>
                <span class="bot-field-help">Variáveis: <code>{nome}</code>, <code>{departamento}</code>, <code>{opcoes}</code>, <code>{atendente}</code>, <code>{tentativa}</code>, <code>{limite}</code> e <code>{estrelas}</code>. Formatação do WhatsApp: <code>*negrito*</code>, <code>_itálico_</code> e <code>~riscado~</code>.</span>
              </div>
              <button class="btn-secondary" type="button" @click="restoreBotDefaults">Restaurar textos padrão</button>
            </div>

            <div style="display:flex;flex-direction:column;gap:12px;">
              <div v-for="field in botMessageFields" :key="field.key">
                <label class="bot-field-label">{{ field.label }}</label>
                <textarea v-model="botConfig[field.key]" :rows="field.rows || 3" maxlength="4000" class="bot-field-control" style="resize:vertical;line-height:1.45;"></textarea>
                <span class="bot-field-help">{{ field.help }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>

    <!-- Modais -->
    <!-- Modais -->

    <ModalDepartamento
      v-if="showModalDept"
      @close="showModalDept = false"
      @saved="settingsStore.fetchDepartments"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings.store'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import ModalDepartamento from '@/components/modals/ModalDepartamento.vue'
import ConnectionsSettings from '@/components/settings/ConnectionsSettings.vue'

const settingsStore = useSettingsStore()
const authStore = useAuthStore()
const ui = useUiStore()

const props = defineProps({
  initialTab: { type: String, default: 'geral' },
  standalone: { type: Boolean, default: false }
})
const activeTab = ref(props.initialTab)
const savingBot = ref(false)

const showModalDept = ref(false)

const formGeneral = ref({
  company_name: 'Grupo Combate',
  cnpj: '12.345.678/0001-99'
})

const defaultBotMessages = {
  greeting_message: 'Olá, *{nome}*! 👋\n\nBem-vindo ao atendimento do *Grupo Combate*.\n\n🏢 *Com qual departamento deseja falar?*\n\n{opcoes}\n\n_Responda com o número ou o nome do departamento._',
  disabled_routing_message: 'Olá, *{nome}*! 👋\n\n📩 Recebemos sua mensagem e encaminhamos seu atendimento para *{departamento}*.\n\n_Aguarde um momento. Um de nossos atendentes responderá em breve._',
  fallback_routing_message: '🔄 *Atendimento encaminhado*\n\n{nome}, para agilizar seu atendimento, direcionamos sua conversa para *{departamento}*.\n\n_Um atendente responderá em breve._',
  human_handoff_message: '👤 *Atendimento humano solicitado*\n\nEntendido, {nome}! Encaminhamos sua conversa para *{departamento}*.\n\n_Um atendente continuará o atendimento._',
  customer_cancel_message: '🚫 *Atendimento encerrado*\n\n{nome}, seu atendimento foi cancelado conforme solicitado.\n\nSe precisar de ajuda novamente no futuro, basta nos enviar uma nova mensagem! Tenha um ótimo dia! 👋',
  ask_customer_name_message: 'Olá! 👋\n\nAntes de continuarmos, *qual é o seu nome?*\n\n_Digite apenas seu nome, por favor._',
  invalid_customer_name_message: '⚠️ *Não consegui identificar um nome válido.*\n\nDigite apenas seu nome, sem números ou outras informações.\n\n_Tentativa {tentativa} de {limite}._',
  confirm_customer_name_message: 'Só para confirmar: seu nome é *{nome}*?\n\n1️⃣  Sim\n2️⃣  Corrigir\n\n_Responda com 1 ou 2._',
  customer_name_saved_message: '✅ Obrigado, *{nome}*! Seu nome foi confirmado.',
  customer_name_skipped_message: 'Tudo bem! 👍\n\nVamos continuar sem salvar seu nome.',
  resume_message: 'Olá, *{nome}*! 👋\n\nVocê foi atendido recentemente pelo setor *{departamento}*. Deseja continuar por lá?\n\n1️⃣  Continuar com {departamento}\n2️⃣  Escolher outro departamento\n\n_Responda com 1 ou 2._',
  invalid_option_message: '⚠️ *Não consegui identificar o departamento.*\n\nEscolha uma das opções abaixo:\n\n{opcoes}\n\n_Tentativa {tentativa} de {limite}._',
  media_during_routing_message: '📎 Recebi seu arquivo. Antes de continuar, preciso saber o departamento desejado:\n\n{opcoes}\n\n_Responda com o número ou o nome do departamento._',
  queue_confirmation_message: '✅ *Atendimento encaminhado*\n\n{nome}, sua conversa foi direcionada para *{departamento}*.\n\n_Aguarde um momento. Um de nossos especialistas responderá em breve._',
  transfer_message: '🔄 *Atendimento transferido*\n\n{nome}, sua conversa foi direcionada para *{departamento}*.\n\n_Um atendente continuará o atendimento em breve._',
  rating_request_message: '✅ *Atendimento encerrado*\n\n{nome}, como você avalia o atendimento recebido?\n\n1️⃣  Muito insatisfeito\n2️⃣  Insatisfeito\n3️⃣  Regular\n4️⃣  Satisfeito\n5️⃣  Muito satisfeito\n\n_Responda apenas com um número de 1 a 5._',
  rating_thank_you_message: 'Obrigado pela sua avaliação, *{nome}*! {estrelas}\n\n_Sua opinião é muito importante para melhorarmos nosso atendimento._'
}

const botConfig = ref({
  enabled: true,
  default_department_id: null,
  show_department_menu: true,
  accept_department_name: true,
  resume_recent_enabled: true,
  resume_window_hours: 24,
  rating_window_minutes: 45,
  invalid_attempt_limit: 3,
  rapid_message_grace_seconds: 3,
  auto_close_external_service: true,
  external_service_idle_minutes: 60,
  send_rating_on_external_inactivity: true,
  auto_route_after_invalid: true,
  send_queue_confirmation: true,
  send_transfer_notice: true,
  send_rating_request: true,
  accept_media_during_routing: true,
  human_handoff_enabled: true,
  allow_customer_cancel: true,
  collect_customer_name: true,
  require_customer_last_name: false,
  customer_name_attempt_limit: 3,
  menu_keywords: 'oi,olá,ola,bom dia,boa tarde,boa noite,menu,início,inicio,ajuda',
  human_handoff_keywords: 'atendente,humano,pessoa,falar com alguém,falar com alguem',
  cancel_keywords: 'cancelar,encerrar,sair,parar,desistir,finalizar,0,cancelar atendimento,encerrar atendimento',
  restart_service_keywords: 'menu,novo atendimento,outro departamento,mudar departamento,falar com outro setor,falar com outro departamento',
  ...defaultBotMessages
})

const botBehaviorOptions = [
  { key: 'show_department_menu', label: 'Exibir menu de departamentos', help: 'Preenche a variável {opcoes} com as filas disponíveis.' },
  { key: 'accept_department_name', label: 'Aceitar o nome do departamento', help: 'Além do número, reconhece nomes e palavras relacionadas.' },
  { key: 'resume_recent_enabled', label: 'Oferecer retomada recente', help: 'Permite retornar ao setor do último atendimento.' },
  { key: 'auto_route_after_invalid', label: 'Encaminhar após erros', help: 'Evita que o cliente fique preso no menu.' },
  { key: 'accept_media_during_routing', label: 'Aceitar mídia durante o menu', help: 'Permite imagens, áudios e arquivos antes da escolha.' },
  { key: 'human_handoff_enabled', label: 'Permitir pedir atendimento humano', help: 'Reconhece palavras configuradas e encaminha para a fila padrão.' },
  { key: 'allow_customer_cancel', label: 'Permitir que o cliente cancele o atendimento', help: 'Encerra o chamado e tira da fila quando o cliente digita palavras como cancelar, sair ou 0.' },
  { key: 'collect_customer_name', label: 'Perguntar o nome de clientes desconhecidos', help: 'Solicita e confirma o nome antes do menu; desligue para pular esta etapa.' },
  { key: 'require_customer_last_name', label: 'Exigir nome e sobrenome', help: 'Reduz cadastros imprecisos exigindo pelo menos duas palavras.' },
  { key: 'send_queue_confirmation', label: 'Confirmar entrada na fila', help: 'Envia uma mensagem após escolher o departamento.' },
  { key: 'send_transfer_notice', label: 'Avisar sobre transferências', help: 'Notifica o cliente quando o setor for alterado.' },
  { key: 'send_rating_request', label: 'Solicitar avaliação', help: 'Envia a pesquisa ao encerrar atendimentos manualmente.' }
]

const botMessageFields = [
  { key: 'greeting_message', label: 'Saudação e menu inicial', rows: 6, help: 'Use {opcoes} onde deseja inserir a lista de departamentos.' },
  { key: 'disabled_routing_message', label: 'Bot desativado — encaminhamento automático', help: 'Enviada quando o contato é direcionado ao departamento padrão.' },
  { key: 'fallback_routing_message', label: 'Encaminhamento após tentativas inválidas', help: 'Enviada quando o limite de respostas não reconhecidas é atingido.' },
  { key: 'human_handoff_message', label: 'Encaminhamento solicitado para humano', help: 'Enviada quando o cliente pede atendimento humano.' },
  { key: 'customer_cancel_message', label: 'Mensagem de cancelamento pelo cliente', rows: 4, help: 'Enviada quando o cliente solicita cancelar ou encerrar o atendimento.' },
  { key: 'ask_customer_name_message', label: 'Pergunta do nome do cliente', help: 'Enviada apenas para números que ainda não possuem um contato cadastrado.' },
  { key: 'invalid_customer_name_message', label: 'Nome não reconhecido', help: 'Pode usar {tentativa} e {limite}.' },
  { key: 'confirm_customer_name_message', label: 'Confirmação do nome', rows: 4, help: 'Use {nome}. O nome só é salvo após o cliente confirmar.' },
  { key: 'customer_name_saved_message', label: 'Nome salvo com sucesso', help: 'Use {nome} para personalizar o agradecimento.' },
  { key: 'customer_name_skipped_message', label: 'Coleta de nome ignorada', help: 'Enviada quando o limite de tentativas é atingido.' },
  { key: 'resume_message', label: 'Retomada de atendimento recente', rows: 5, help: 'Use {departamento} para informar a última fila.' },
  { key: 'invalid_option_message', label: 'Opção inválida', rows: 4, help: 'Pode usar {tentativa}, {limite} e {opcoes}.' },
  { key: 'media_during_routing_message', label: 'Mídia não permitida durante o menu', help: 'Usada somente quando a opção de aceitar mídia estiver desligada.' },
  { key: 'queue_confirmation_message', label: 'Confirmação de entrada na fila', help: 'Enviada após o departamento ser escolhido.' },
  { key: 'transfer_message', label: 'Aviso de transferência', help: 'Pode usar {departamento} e {atendente}.' },
  { key: 'rating_request_message', label: 'Pedido de avaliação', help: 'Oriente o cliente a responder de 1 a 5.' },
  { key: 'rating_thank_you_message', label: 'Agradecimento pela avaliação', help: 'Use {estrelas} para mostrar a nota recebida.' }
]





async function deleteDept(d) {
  if (!confirm(`Deseja realmente excluir o departamento ${d.name}?`)) return
  try {
    const res = await settingsStore.deleteDepartment(d.id)
    if (res.success) {
      ui.showToast('Departamento excluído com sucesso!')
    } else {
      ui.showToast(`⚠️ ${res.error}`, 'error')
    }
  } catch (error) {
    ui.showToast(error.response?.data?.error || 'Erro ao excluir departamento.', 'error')
  }
}

async function saveGeneralSettings() {
  try {
    await settingsStore.saveSetting('company_info', formGeneral.value)
    ui.showToast('Configurações salvas com sucesso!')
  } catch (error) {
    ui.showToast(error.response?.data?.error || 'Erro ao salvar configurações', 'error')
  }
}

async function loadSavedSettings() {
  try {
    await settingsStore.fetchSettings()
    if (settingsStore.settings.company_info) formGeneral.value = { ...formGeneral.value, ...settingsStore.settings.company_info }
    if (settingsStore.settings.bot_config) botConfig.value = { ...botConfig.value, ...settingsStore.settings.bot_config }
  } catch (error) {
    ui.showToast('Não foi possível carregar as configurações do bot.', 'error')
  }
}

async function saveBotSettings() {
  if ((!botConfig.value.enabled || botConfig.value.auto_route_after_invalid || botConfig.value.human_handoff_enabled) && !botConfig.value.default_department_id) {
    ui.showToast('Selecione o departamento padrão para o roteamento automático.', 'error')
    return
  }
  if (botConfig.value.auto_close_external_service) {
    const idleMinutes = Number(botConfig.value.external_service_idle_minutes)
    if (!Number.isInteger(idleMinutes) || idleMinutes < 5 || idleMinutes > 1440) {
      ui.showToast('Defina a inatividade entre 5 e 1440 minutos.', 'error')
      return
    }
  }
  savingBot.value = true
  try {
    const data = await settingsStore.saveSetting('bot_config', botConfig.value)
    if (data.success) {
      if (data.value) botConfig.value = { ...botConfig.value, ...data.value }
      ui.showToast('Configurações do bot salvas com sucesso!')
    }
  } catch (error) {
    ui.showToast(error.response?.data?.error || 'Erro ao salvar configurações do bot.', 'error')
  } finally {
    savingBot.value = false
  }
}

function restoreBotDefaults() {
  botConfig.value = { ...botConfig.value, ...defaultBotMessages }
  ui.showToast('Textos padrão restaurados. Clique em salvar para confirmar.')
}

onMounted(async () => {
  const tasks = [settingsStore.fetchDepartments()]
  if (authStore.isAdmin) tasks.push(loadSavedSettings())
  await Promise.all(tasks)
})
</script>

<style scoped>
.bot-field-label { font-size:11.5px;font-weight:700;color:#475569;display:block;margin-bottom:5px; }
.bot-field-control { width:100%;font-size:12.5px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#1e293b; }
.bot-field-control:focus { outline:none;border-color:#2563eb;box-shadow:0 0 0 2px rgba(37,99,235,.1); }
.bot-field-help { font-size:10.5px;color:#94a3b8;margin-top:4px;display:block;line-height:1.4; }
button:disabled { opacity:.55;cursor:not-allowed; }
.inactivity-settings-card { border:1px solid #dbeafe;border-radius:10px;background:#f8fbff;overflow:hidden; }
.inactivity-settings-header { display:flex;align-items:center;gap:10px;padding:14px; }
.inactivity-settings-icon { width:34px;height:34px;border-radius:8px;background:#e0edff;color:#2563eb;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
.inactivity-settings-title { display:flex;flex-direction:column;gap:2px;flex:1;min-width:0; }
.inactivity-settings-title strong { color:#1e293b;font-size:13px; }
.inactivity-settings-title span { color:#64748b;font-size:11px;line-height:1.35; }
.inactivity-toggle { display:flex;align-items:center;gap:7px;color:#334155;font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap; }
.inactivity-settings-body { display:grid;grid-template-columns:minmax(220px,1fr) minmax(240px,1fr);gap:14px;padding:14px;border-top:1px solid #dbeafe;background:#fff; }
.inactivity-time-input { display:flex;align-items:center;gap:8px; }
.inactivity-time-input .bot-field-control { max-width:130px; }
.inactivity-time-input span { color:#64748b;font-size:11.5px;font-weight:600; }
.inactivity-action-option { display:flex;align-items:flex-start;gap:8px;padding:10px;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer; }
.inactivity-action-option input { margin-top:2px; }
.inactivity-action-option span { display:flex;flex-direction:column;gap:3px; }
.inactivity-action-option strong { color:#334155;font-size:11.5px; }
.inactivity-action-option small { color:#64748b;font-size:10.5px;line-height:1.35; }
.inactivity-result-note { grid-column:1 / -1;display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:7px;background:#f0fdf4;color:#166534;font-size:10.5px; }
.inactivity-disabled-note { padding:11px 14px;border-top:1px solid #dbeafe;color:#64748b;font-size:10.5px;background:#fff; }
@media (max-width: 800px) { .inactivity-settings-body { grid-template-columns:1fr; } .inactivity-result-note { grid-column:auto; } .inactivity-settings-header { align-items:flex-start;flex-wrap:wrap; } .inactivity-toggle { margin-left:44px; } }
</style>
