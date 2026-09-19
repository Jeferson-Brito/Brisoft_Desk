<template>
  <header class="topbar-bitrix" id="appTopNavigation" ref="topbarRef">
    <!-- Hambúrguer (visível apenas em mobile) -->
    <button
      class="topbar-hamburger"
      title="Abrir menu"
      aria-label="Abrir menu lateral"
      @click="sidebar.toggle()"
    >
      <i class="fa-solid fa-bars"></i>
    </button>

    <!-- Trilho de Navegação de Abas (Estilo Bitrix24) -->
    <div class="topbar-tabs-track">

      <!-- ================================================================= -->
      <!-- 1. MÓDULO: ATENDIMENTOS (/atendimentos)                          -->
      <!-- ================================================================= -->
      <template v-if="currentModule === 'atendimentos'">
        <!-- Aba: Fila Geral / Todos -->
        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.atendimentosTab === 'todos' && !nav.atendimentosDept }"
          @click="selectAtendimentosTab('todos')"
        >
          <i class="fa-solid fa-inbox"></i>
          <span>Fila Geral</span>
        </button>

        <!-- Aba: Aguardando -->
        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.atendimentosTab === 'aguardando' }"
          @click="selectAtendimentosTab('aguardando')"
        >
          <span>Aguardando</span>
          <span
            class="topbar-tab-badge"
            :class="{ 'badge-alert': waitingCount > 0, 'active': nav.atendimentosTab === 'aguardando' }"
          >
            {{ waitingCount }}
          </span>
        </button>

        <!-- Aba: Em Atendimento -->
        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.atendimentosTab === 'em_atendimento' }"
          @click="selectAtendimentosTab('em_atendimento')"
        >
          <span>Em atendimento</span>
          <span
            class="topbar-tab-badge"
            :class="{ 'active': nav.atendimentosTab === 'em_atendimento' }"
          >
            {{ inProgressCount }}
          </span>
        </button>

        <!-- Aba: Grupos WhatsApp -->
        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.atendimentosTab === 'grupos' }"
          @click="selectAtendimentosTab('grupos')"
        >
          <span>Grupos</span>
          <span
            class="topbar-tab-badge"
            :class="{ 'active': nav.atendimentosTab === 'grupos' }"
          >
            {{ groupCount }}
          </span>
        </button>

        <!-- Aba: Meus Atendimentos -->
        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.atendimentosTab === 'meus' }"
          @click="selectAtendimentosTab('meus')"
        >
          <i class="fa-solid fa-user-check"></i>
          <span>Meus</span>
        </button>

        <!-- Dropdown: Departamentos -->
        <div class="topbar-dropdown-wrapper" ref="deptDropdownRef">
          <button
            type="button"
            class="topbar-nav-tab tab-has-dropdown"
            :class="{ active: Boolean(nav.atendimentosDept), open: activeDropdown === 'atendimentos_dept' }"
            @click="toggleDropdown('atendimentos_dept')"
          >
            <i class="fa-solid fa-building-user"></i>
            <span>{{ nav.atendimentosDept ? `Setor: ${nav.atendimentosDept}` : 'Departamentos' }}</span>
            <i class="fa-solid fa-chevron-down caret-icon"></i>
          </button>

          <Transition name="dropdown-pop">
            <div v-if="activeDropdown === 'atendimentos_dept'" class="topbar-dropdown-menu">
              <div
                class="dropdown-menu-item"
                :class="{ active: !nav.atendimentosDept }"
                @click="selectAtendimentosDept('')"
              >
                <i class="fa-solid fa-layer-group"></i>
                <span>Todos os setores</span>
              </div>
              <div
                v-for="d in allowedDepartments"
                :key="d.id"
                class="dropdown-menu-item"
                :class="{ active: nav.atendimentosDept === d.name }"
                @click="selectAtendimentosDept(d.name)"
              >
                <span class="dept-dot" :style="{ background: d.color || '#2563eb' }"></span>
                <span>{{ d.name }}</span>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Dropdown: Mais Ações -->
        <div class="topbar-dropdown-wrapper" ref="moreActionsRef">
          <button
            type="button"
            class="topbar-nav-tab tab-has-dropdown"
            :class="{ open: activeDropdown === 'atendimentos_more' }"
            @click="toggleDropdown('atendimentos_more')"
          >
            <span>Ações</span>
            <i class="fa-solid fa-chevron-down caret-icon"></i>
          </button>

          <Transition name="dropdown-pop">
            <div v-if="activeDropdown === 'atendimentos_more'" class="topbar-dropdown-menu">
              <div class="dropdown-menu-item" @click="handleAtendimentosAction('new_conversation')">
                <i class="fa-solid fa-plus text-primary"></i>
                <span>Nova conversa</span>
              </div>
              <div class="dropdown-menu-item" @click="handleAtendimentosAction('refresh')">
                <i class="fa-solid fa-rotate"></i>
                <span>Atualizar fila</span>
              </div>
              <div class="dropdown-divider"></div>
              <a href="/painel-tv" target="_blank" rel="noopener" class="dropdown-menu-item" @click="closeDropdowns">
                <i class="fa-solid fa-tv"></i>
                <span>Abrir Painel TV ↗</span>
              </a>
            </div>
          </Transition>
        </div>
      </template>

      <!-- ================================================================= -->
      <!-- 2. MÓDULO: CONVERSAS / HISTÓRICO (/historico)                    -->
      <!-- ================================================================= -->
      <template v-else-if="currentModule === 'historico'">
        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.historicoTab === 'todos' }"
          @click="selectHistoricoTab('todos')"
        >
          <i class="fa-regular fa-comments"></i>
          <span>Todas as Conversas</span>
        </button>

        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.historicoTab === 'meus' }"
          @click="selectHistoricoTab('meus')"
        >
          <i class="fa-solid fa-user-check"></i>
          <span>Meus Atendimentos</span>
        </button>

        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.historicoTab === 'avaliados' }"
          @click="selectHistoricoTab('avaliados')"
        >
          <i class="fa-regular fa-star"></i>
          <span>Com Avaliação</span>
        </button>

        <!-- Dropdown Departamentos Histórico -->
        <div class="topbar-dropdown-wrapper">
          <button
            type="button"
            class="topbar-nav-tab tab-has-dropdown"
            :class="{ active: Boolean(nav.historicoDept), open: activeDropdown === 'historico_dept' }"
            @click="toggleDropdown('historico_dept')"
          >
            <i class="fa-solid fa-building-user"></i>
            <span>{{ nav.historicoDept ? `Setor: ${nav.historicoDept}` : 'Filtrar por Setor' }}</span>
            <i class="fa-solid fa-chevron-down caret-icon"></i>
          </button>

          <Transition name="dropdown-pop">
            <div v-if="activeDropdown === 'historico_dept'" class="topbar-dropdown-menu">
              <div
                class="dropdown-menu-item"
                :class="{ active: !nav.historicoDept }"
                @click="selectHistoricoDept('')"
              >
                <i class="fa-solid fa-layer-group"></i>
                <span>Todos os setores</span>
              </div>
              <div
                v-for="d in allowedDepartments"
                :key="d.id"
                class="dropdown-menu-item"
                :class="{ active: nav.historicoDept === d.name }"
                @click="selectHistoricoDept(d.name)"
              >
                <span class="dept-dot" :style="{ background: d.color || '#2563eb' }"></span>
                <span>{{ d.name }}</span>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Ações do Histórico -->
        <div class="topbar-dropdown-wrapper">
          <button
            type="button"
            class="topbar-nav-tab tab-has-dropdown"
            :class="{ open: activeDropdown === 'historico_more' }"
            @click="toggleDropdown('historico_more')"
          >
            <span>Ações</span>
            <i class="fa-solid fa-chevron-down caret-icon"></i>
          </button>

          <Transition name="dropdown-pop">
            <div v-if="activeDropdown === 'historico_more'" class="topbar-dropdown-menu">
              <div class="dropdown-menu-item" @click="handleHistoricoAction('export_csv')">
                <i class="fa-solid fa-file-csv"></i>
                <span>Exportar CSV</span>
              </div>
              <div class="dropdown-menu-item" @click="handleHistoricoAction('clear_filters')">
                <i class="fa-solid fa-filter-circle-xmark"></i>
                <span>Limpar filtros</span>
              </div>
            </div>
          </Transition>
        </div>
      </template>

      <!-- ================================================================= -->
      <!-- 3. MÓDULO: CONTATOS (/clientes)                                   -->
      <!-- ================================================================= -->
      <template v-else-if="currentModule === 'clientes'">
        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.clientesTab === 'customers' }"
          @click="selectClientesTab('customers')"
        >
          <i class="fa-solid fa-user-group"></i>
          <span>Clientes</span>
        </button>

        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.clientesTab === 'employees' }"
          @click="selectClientesTab('employees')"
        >
          <i class="fa-solid fa-id-badge"></i>
          <span>Funcionários</span>
        </button>

        <!-- Ações de Importação -->
        <div class="topbar-dropdown-wrapper" v-if="auth.canManageTeam">
          <button
            type="button"
            class="topbar-nav-tab tab-has-dropdown"
            :class="{ open: activeDropdown === 'clientes_more' }"
            @click="toggleDropdown('clientes_more')"
          >
            <i class="fa-solid fa-file-excel"></i>
            <span>Planilha</span>
            <i class="fa-solid fa-chevron-down caret-icon"></i>
          </button>

          <Transition name="dropdown-pop">
            <div v-if="activeDropdown === 'clientes_more'" class="topbar-dropdown-menu">
              <div class="dropdown-menu-item" @click="handleClientesAction('import')">
                <i class="fa-solid fa-file-import"></i>
                <span>Importar contatos</span>
              </div>
              <div class="dropdown-menu-item" @click="handleClientesAction('template')">
                <i class="fa-solid fa-download"></i>
                <span>Baixar modelo de planilha</span>
              </div>
            </div>
          </Transition>
        </div>

        <button
          type="button"
          class="topbar-cta-btn"
          @click="handleClientesAction('new_contact')"
        >
          <i class="fa-solid fa-plus"></i>
          <span>Novo Contato</span>
        </button>
      </template>

      <!-- ================================================================= -->
      <!-- 4. MÓDULO: MENSAGENS RÁPIDAS (/mensagens-rapidas)                 -->
      <!-- ================================================================= -->
      <template v-else-if="currentModule === 'mensagens_rapidas'">
        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.mensagensTab === 'todas' }"
          @click="nav.mensagensTab = 'todas'"
        >
          <i class="fa-solid fa-bolt"></i>
          <span>Todas as Mensagens</span>
        </button>

        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.mensagensTab === 'gerais' }"
          @click="nav.mensagensTab = 'gerais'"
        >
          <i class="fa-solid fa-globe"></i>
          <span>Gerais / Empresa</span>
        </button>

        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.mensagensTab === 'minhas' }"
          @click="nav.mensagensTab = 'minhas'"
        >
          <i class="fa-solid fa-user"></i>
          <span>Minhas Mensagens</span>
        </button>

        <button
          type="button"
          class="topbar-cta-btn"
          @click="handleMensagensAction('new_message')"
        >
          <i class="fa-solid fa-plus"></i>
          <span>Nova Mensagem</span>
        </button>
      </template>

      <!-- ================================================================= -->
      <!-- 5. MÓDULO: DESEMPENHO (/desempenho)                               -->
      <!-- ================================================================= -->
      <template v-else-if="currentModule === 'desempenho'">
        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.desempenhoTab === 'visao_geral' }"
          @click="nav.desempenhoTab = 'visao_geral'"
        >
          <i class="fa-solid fa-chart-line"></i>
          <span>Visão Geral</span>
        </button>

        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.desempenhoTab === 'atendentes' }"
          @click="nav.desempenhoTab = 'atendentes'"
        >
          <i class="fa-solid fa-users"></i>
          <span>Atendentes</span>
        </button>

        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.desempenhoTab === 'avaliacoes' }"
          @click="nav.desempenhoTab = 'avaliacoes'"
        >
          <i class="fa-regular fa-star"></i>
          <span>Satisfação & CSAT</span>
        </button>

        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.desempenhoTab === 'sla' }"
          @click="nav.desempenhoTab = 'sla'"
        >
          <i class="fa-solid fa-gauge-high"></i>
          <span>SLA & Tempos</span>
        </button>
      </template>

      <!-- ================================================================= -->
      <!-- 6. MÓDULO: CONFIGURAÇÕES E ADMINISTRAÇÃO                          -->
      <!-- ================================================================= -->
      <template v-else-if="currentModule === 'configuracoes'">
        <!-- Conexões WhatsApp -->
        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: route.name === 'configuracoes' && (!route.query.tab || route.query.tab === 'conexoes') }"
          @click="goToSettingsTab('conexoes')"
        >
          <i class="fa-brands fa-whatsapp text-success"></i>
          <span>Conexões WhatsApp</span>
        </button>

        <!-- Informações da Empresa -->
        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: route.name === 'configuracoes' && route.query.tab === 'geral' }"
          @click="goToSettingsTab('geral')"
        >
          <i class="fa-solid fa-sliders"></i>
          <span>Empresa & Geral</span>
        </button>

        <!-- Departamentos -->
        <button
          v-if="auth.isAdmin"
          type="button"
          class="topbar-nav-tab"
          :class="{ active: route.name === 'configuracoes' && route.query.tab === 'departamentos' }"
          @click="goToSettingsTab('departamentos')"
        >
          <i class="fa-solid fa-building"></i>
          <span>Departamentos</span>
        </button>

        <!-- Usuários & Equipe -->
        <button
          v-if="auth.isAdmin"
          type="button"
          class="topbar-nav-tab"
          :class="{ active: route.name === 'usuarios' }"
          @click="router.push('/usuarios')"
        >
          <i class="fa-solid fa-users-gear"></i>
          <span>Usuários</span>
        </button>

        <!-- Dropdown Chatbot & IA -->
        <div class="topbar-dropdown-wrapper" v-if="auth.isAdmin">
          <button
            type="button"
            class="topbar-nav-tab tab-has-dropdown"
            :class="{ active: route.name === 'configuracao_ia', open: activeDropdown === 'config_ia' }"
            @click="toggleDropdown('config_ia')"
          >
            <i class="fa-solid fa-robot"></i>
            <span>Chatbot & IA</span>
            <i class="fa-solid fa-chevron-down caret-icon"></i>
          </button>

          <Transition name="dropdown-pop">
            <div v-if="activeDropdown === 'config_ia'" class="topbar-dropdown-menu">
              <div class="dropdown-menu-item" @click="router.push('/configuracao-ia'); closeDropdowns()">
                <i class="fa-solid fa-brain"></i>
                <span>Configuração do Bot</span>
              </div>
              <div class="dropdown-menu-item" @click="goToSettingsTab('bot_regras')">
                <i class="fa-solid fa-clock"></i>
                <span>Regras de Inatividade</span>
              </div>
            </div>
          </Transition>
        </div>
      </template>

      <!-- ================================================================= -->
      <!-- 7. MÓDULO: DASHBOARD (/)                                          -->
      <!-- ================================================================= -->
      <template v-else-if="currentModule === 'dashboard'">
        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.dashboardTab === 'visao_geral' }"
          @click="nav.dashboardTab = 'visao_geral'"
        >
          <i class="fa-solid fa-chart-pie"></i>
          <span>Visão Geral</span>
        </button>

        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.dashboardTab === 'tempo_real' }"
          @click="nav.dashboardTab = 'tempo_real'"
        >
          <i class="fa-solid fa-bolt text-warning"></i>
          <span>Filas em Tempo Real</span>
        </button>

        <button
          type="button"
          class="topbar-nav-tab"
          :class="{ active: nav.dashboardTab === 'metricas' }"
          @click="nav.dashboardTab = 'metricas'"
        >
          <i class="fa-solid fa-calendar-days"></i>
          <span>Métricas do Mês</span>
        </button>

        <a href="/painel-tv" target="_blank" rel="noopener" class="topbar-nav-tab">
          <i class="fa-solid fa-tv"></i>
          <span>Painel TV ↗</span>
        </a>
      </template>

      <!-- Fallback / Outras Telas (ex: Meu Perfil) -->
      <template v-else>
        <span class="topbar-fallback-title">{{ fallbackPageTitle }}</span>
      </template>

    </div>

    <!-- Área Direita: Indicadores de Status e Ações Globais -->
    <div class="topbar-right">
      <div class="system-status-indicator" title="Sistema conectado ao servidor em tempo real">
        <span class="status-live-dot"></span>
        <span class="status-live-text">Ao Vivo</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useSidebarStore } from '@/stores/sidebar.store'
import { useTicketStore } from '@/stores/tickets.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useNavigationStore } from '@/stores/navigation.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const sidebar = useSidebarStore()
const ticketStore = useTicketStore()
const settingsStore = useSettingsStore()
const nav = useNavigationStore()

const topbarRef = ref(null)
const activeDropdown = ref(null) // string | null

// ─── Identificação do Módulo Ativo ──────────────────────────────────────────
const currentModule = computed(() => {
  const path = route.path
  if (path.startsWith('/atendimentos')) return 'atendimentos'
  if (path.startsWith('/historico')) return 'historico'
  if (path.startsWith('/clientes')) return 'clientes'
  if (path.startsWith('/mensagens-rapidas')) return 'mensagens_rapidas'
  if (path.startsWith('/desempenho') || path.startsWith('/avaliacoes')) return 'desempenho'
  if (path.startsWith('/configuracoes') || path.startsWith('/usuarios') || path.startsWith('/configuracao-ia')) return 'configuracoes'
  if (path === '/' || path === '/dashboard') return 'dashboard'
  return 'outro'
})

const fallbackPageTitle = computed(() => {
  if (route.path.startsWith('/perfil')) return 'Meu Perfil'
  return 'Brisoft Desk'
})

// ─── Contadores em Tempo Real para Atendimentos ─────────────────────────────
const waitingCount = computed(() => ticketStore.waitingTickets?.length || 0)
const inProgressCount = computed(() => ticketStore.inProgressTickets?.length || 0)
const groupCount = computed(() => ticketStore.groupTickets?.length || 0)

// ─── Departamentos Permitidos ──────────────────────────────────────────────
const allowedDepartments = computed(() => {
  if (auth.isAdmin) return settingsStore.departments
  if (auth.isSupervisor) {
    const supervisorDepts = (auth.departmentIds || []).map(String)
    return settingsStore.departments.filter(d => supervisorDepts.includes(String(d.id)))
  }
  return settingsStore.departments
})

// ─── Funções de Controle de Dropdown ───────────────────────────────────────
function toggleDropdown(name) {
  activeDropdown.value = activeDropdown.value === name ? null : name
}

function closeDropdowns() {
  activeDropdown.value = null
}

function handleDocumentClick(e) {
  if (topbarRef.value && !topbarRef.value.contains(e.target)) {
    closeDropdowns()
  }
}

function handleEscKey(e) {
  if (e.key === 'Escape') {
    closeDropdowns()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleEscKey)
  if (settingsStore.departments.length === 0) {
    settingsStore.fetchDepartments()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleEscKey)
})

// ─── Ações de Atendimentos ──────────────────────────────────────────────────
function selectAtendimentosTab(tab) {
  nav.atendimentosTab = tab
  closeDropdowns()
}

function selectAtendimentosDept(dept) {
  nav.atendimentosDept = dept
  closeDropdowns()
}

function handleAtendimentosAction(action) {
  closeDropdowns()
  if (action === 'refresh') {
    ticketStore.fetchQueue()
  } else {
    nav.triggerAtendimentosAction(action)
  }
}

// ─── Ações de Histórico ─────────────────────────────────────────────────────
function selectHistoricoTab(tab) {
  nav.historicoTab = tab
  closeDropdowns()
}

function selectHistoricoDept(dept) {
  nav.historicoDept = dept
  closeDropdowns()
}

function handleHistoricoAction(action) {
  closeDropdowns()
  nav.triggerHistoricoAction(action)
}

// ─── Ações de Clientes ──────────────────────────────────────────────────────
function selectClientesTab(tab) {
  nav.clientesTab = tab
  closeDropdowns()
}

function handleClientesAction(action) {
  closeDropdowns()
  nav.triggerClientesAction(action)
}

// ─── Ações de Mensagens Rápidas ─────────────────────────────────────────────
function handleMensagensAction(action) {
  closeDropdowns()
  nav.triggerMensagensAction(action)
}

// ─── Ações de Configurações ─────────────────────────────────────────────────
function goToSettingsTab(tab) {
  closeDropdowns()
  if (route.name !== 'configuracoes') {
    router.push({ path: '/configuracoes', query: { tab } })
  } else {
    router.replace({ query: { ...route.query, tab } })
    nav.configuracoesTab = tab
  }
}
</script>

<style scoped>
/* ─── Barra Superior Estilo Bitrix24 ─────────────────────────────────────── */
.topbar-bitrix {
  height: 48px;
  min-height: 48px;
  max-height: 48px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  box-sizing: border-box;
  position: relative;
  z-index: 50;
  user-select: none;
}

/* Hambúrguer Mobile */
.topbar-hamburger {
  display: none;
  background: none;
  border: none;
  font-size: 16px;
  color: #475569;
  cursor: pointer;
  padding: 6px;
  margin-right: 8px;
}

/* Trilho de Abas Horizontal com Scroll Invisível */
.topbar-tabs-track {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  min-width: 0;
  flex: 1;
}

.topbar-tabs-track::-webkit-scrollbar {
  display: none;
}

/* ─── Botão / Pílula de Aba ──────────────────────────────────────────────── */
.topbar-nav-tab {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 500;
  color: #475569;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  box-sizing: border-box;
}

.topbar-nav-tab:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.topbar-nav-tab.active {
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
  border-color: #bfdbfe;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.06);
}

.topbar-nav-tab.tab-has-dropdown {
  padding-right: 9px;
}

.topbar-nav-tab.tab-has-dropdown.open {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

.caret-icon {
  font-size: 9px;
  color: #94a3b8;
  transition: transform 0.2s ease;
}

.topbar-nav-tab.open .caret-icon {
  transform: rotate(180deg);
  color: #2563eb;
}

/* Badge de Contagem na Aba */
.topbar-tab-badge {
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  background: #e2e8f0;
  color: #475569;
  line-height: 1.4;
  min-width: 14px;
  text-align: center;
}

.topbar-tab-badge.active {
  background: #dbeafe;
  color: #1e40af;
}

.topbar-tab-badge.badge-alert {
  background: #fee2e2;
  color: #dc2626;
}

/* Botão de Ação Primária no Header */
.topbar-cta-btn {
  height: 30px;
  padding: 0 12px;
  border-radius: 7px;
  background: #2563eb;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  box-shadow: 0 2px 5px rgba(37, 99, 235, 0.22);
  transition: all 0.16s ease;
  margin-left: 4px;
}

.topbar-cta-btn:hover {
  background: #1d4ed8;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.32);
}

/* ─── Menus Suspensos / Dropdown Popovers ─────────────────────────────────── */
.topbar-dropdown-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.topbar-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.15), 0 4px 10px rgba(15, 23, 42, 0.05);
  border: 1px solid #e2e8f0;
  min-width: 200px;
  max-width: 280px;
  max-height: 340px;
  overflow-y: auto;
  padding: 6px;
  z-index: 1000;
  box-sizing: border-box;
}

.dropdown-menu-item {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  color: #334155;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background-color 0.14s ease, color 0.14s ease;
  text-decoration: none;
}

.dropdown-menu-item:hover {
  background: #f8fafc;
  color: #0f172a;
}

.dropdown-menu-item.active {
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
}

.dropdown-divider {
  height: 1px;
  background: #f1f5f9;
  margin: 4px 0;
}

.dept-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Transições do Dropdown */
.dropdown-pop-enter-active,
.dropdown-pop-leave-active {
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.dropdown-pop-enter-from,
.dropdown-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

/* ─── Área Direita: Live Status ─────────────────────────────────────────── */
.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 14px;
  flex-shrink: 0;
}

.system-status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

.status-live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
  animation: liveDotPulse 2s infinite ease-in-out;
}

@keyframes liveDotPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.topbar-fallback-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

/* Cores de Destaque */
.text-primary {
  color: #2563eb;
}

.text-success {
  color: #22c55e;
}

.text-warning {
  color: #f59e0b;
}

@media (max-width: 768px) {
  .topbar-hamburger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
