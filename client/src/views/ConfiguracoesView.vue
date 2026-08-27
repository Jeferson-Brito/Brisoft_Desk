<template>
  <div class="settings-view-grid" style="width:100%;">
    <!-- Coluna 1: Menu de Navegação das Configurações -->
    <div class="settings-nav-sidebar">
      <div
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

      <div
        class="settings-nav-item"
        :class="{ active: activeTab === 'bot' }"
        @click="activeTab = 'bot'"
      >
        <i class="fa-solid fa-robot"></i>
        <div class="settings-nav-meta">
          <span class="settings-nav-title">Chatbot & Roteamento</span>
          <span class="settings-nav-desc">Menu de opções e saudação</span>
        </div>
      </div>

      <div
        class="settings-nav-item"
        :class="{ active: activeTab === 'usuarios' }"
        @click="activeTab = 'usuarios'"
      >
        <i class="fa-solid fa-users-gear"></i>
        <div class="settings-nav-meta">
          <span class="settings-nav-title">Usuários & Acesso</span>
          <span class="settings-nav-desc">Atendentes, administradores e senhas</span>
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
              <span class="bot-field-help">Usado quando o bot está desligado ou excede o limite de tentativas.</span>
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

          <div v-if="botConfig.auto_route_after_invalid" style="max-width:260px;">
            <label class="bot-field-label">Tentativas inválidas antes de encaminhar</label>
            <input v-model.number="botConfig.invalid_attempt_limit" class="bot-field-control" type="number" min="1" max="10" />
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

      <!-- ABA 4: USUÁRIOS -->
      <div v-else-if="activeTab === 'usuarios'" class="settings-section-card">
        <div class="settings-section-header">
          <span class="settings-section-heading">Usuários & Atendentes</span>
          <button class="btn-primary" @click="openNewUserModal">
            <i class="fa-solid fa-user-plus"></i> Novo Usuário
          </button>
        </div>

        <table class="data-table" style="width:100%;">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Departamento</th>
              <th>Status</th>
              <th style="text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="usersList.length === 0">
              <td colspan="6" style="text-align:center;padding:24px;color:#94a3b8;">
                Nenhum usuário cadastrado.
              </td>
            </tr>
            <tr v-for="u in usersList" :key="u.id">
              <td>
                <div style="display:flex;align-items:center;gap:10px;">
                  <div
                    style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;"
                    :style="{ background: u.role === 'Administrador' ? '#2563eb' : '#7c3aed' }"
                  >
                    {{ getUserInitials(u.name) }}
                  </div>
                  <div>
                    <span style="font-weight:600;font-size:12.5px;">{{ u.name || '—' }}</span>
                    <span v-if="u.id === authStore.user?.id" style="margin-left:6px;background:#e0f2fe;color:#0369a1;border-radius:20px;font-size:9px;font-weight:700;padding:1px 6px;">VOCÊ</span>
                  </div>
                </div>
              </td>
              <td style="font-size:12px;color:#64748b;">{{ u.email }}</td>
              <td>
                <span
                  class="badge"
                  :style="{
                    background: u.role === 'Administrador' ? '#eff6ff' : '#f5f3ff',
                    color: u.role === 'Administrador' ? '#2563eb' : '#7c3aed',
                    border: `1px solid ${u.role === 'Administrador' ? '#bfdbfe' : '#ddd6fe'}`
                  }"
                >
                  {{ u.role || 'Analista' }}
                </span>
              </td>
              <td style="font-size:12px;color:#64748b;">
                {{ u.departments ? u.departments.name : (u.department_name || '—') }}
              </td>
              <td>
                <span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;">
                  <i class="fa-solid fa-circle" style="font-size:7px;" :style="{ color: u.is_active !== false ? '#22c55e' : '#ef4444' }"></i>
                  {{ u.is_active !== false ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td style="text-align:right;">
                <button class="btn-icon" style="color:#2563eb;margin-right:4px;" title="Editar" @click="editUser(u)">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn-icon" style="color:#ef4444;" title="Excluir" @click="deleteUser(u)">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modais -->
    <ModalUsuario
      v-if="showModalUser"
      :editing-user="selectedUserForEdit"
      @close="showModalUser = false"
      @saved="loadUsers"
    />

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
import { usersApi } from '@/api/users.api'
import ModalUsuario from '@/components/modals/ModalUsuario.vue'
import ModalDepartamento from '@/components/modals/ModalDepartamento.vue'
import ConnectionsSettings from '@/components/settings/ConnectionsSettings.vue'

const settingsStore = useSettingsStore()
const authStore = useAuthStore()
const ui = useUiStore()

const activeTab = ref('geral')
const usersList = ref([])
const savingBot = ref(false)

const showModalUser = ref(false)
const showModalDept = ref(false)
const selectedUserForEdit = ref(null)

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
  { key: 'send_rating_request', label: 'Solicitar avaliação', help: 'Envia a pesquisa ao encerrar o atendimento.' }
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

function getUserInitials(name) {
  return (name || 'U').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

async function loadUsers() {
  try {
    const { data } = await usersApi.list()
    if (data.success) {
      usersList.value = data.users || []
    }
  } catch (e) {
    console.error('Erro ao carregar usuários:', e)
  }
}

function openNewUserModal() {
  selectedUserForEdit.value = null
  showModalUser.value = true
}

function editUser(u) {
  selectedUserForEdit.value = u
  showModalUser.value = true
}

async function deleteUser(u) {
  if (!confirm(`Deseja realmente excluir o usuário ${u.name}?`)) return
  try {
    const { data } = await usersApi.remove(u.id)
    if (data.success) {
      ui.showToast('Usuário excluído com sucesso!')
      await loadUsers()
    } else {
      ui.showToast(`⚠️ ${data.error}`, 'error')
    }
  } catch (e) {
    ui.showToast(e.response?.data?.error || 'Erro ao excluir usuário', 'error')
  }
}

async function deleteDept(d) {
  if (!confirm(`Deseja realmente excluir o departamento ${d.name}?`)) return
  const res = await settingsStore.deleteDepartment(d.id)
  if (res.success) {
    ui.showToast('Departamento excluído com sucesso!')
  } else {
    ui.showToast(`⚠️ ${res.error}`, 'error')
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
  await Promise.all([settingsStore.fetchDepartments(), loadUsers(), loadSavedSettings()])
})
</script>

<style scoped>
.bot-field-label { font-size:11.5px;font-weight:700;color:#475569;display:block;margin-bottom:5px; }
.bot-field-control { width:100%;font-size:12.5px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#1e293b; }
.bot-field-control:focus { outline:none;border-color:#2563eb;box-shadow:0 0 0 2px rgba(37,99,235,.1); }
.bot-field-help { font-size:10.5px;color:#94a3b8;margin-top:4px;display:block;line-height:1.4; }
button:disabled { opacity:.55;cursor:not-allowed; }
</style>
