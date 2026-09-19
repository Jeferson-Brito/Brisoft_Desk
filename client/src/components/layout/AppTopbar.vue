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

    <!-- Trilho de Navegação de Abas (Estilo Bitrix24 - Desativadas/Informativas no momento) -->
    <div class="topbar-tabs-track" aria-label="Navegação do módulo">

      <!-- ================================================================= -->
      <!-- 1. MÓDULO: ATENDIMENTOS (/atendimentos)                          -->
      <!-- ================================================================= -->
      <template v-if="currentModule === 'atendimentos'">
        <div class="topbar-nav-tab is-disabled active">
          <i class="fa-solid fa-inbox"></i>
          <span>Fila Geral</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <span>Aguardando</span>
          <span
            v-if="waitingCount > 0"
            class="topbar-tab-badge badge-alert"
          >
            {{ waitingCount }}
          </span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <span>Em atendimento</span>
          <span
            v-if="inProgressCount > 0"
            class="topbar-tab-badge"
          >
            {{ inProgressCount }}
          </span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <span>Grupos</span>
          <span
            v-if="groupCount > 0"
            class="topbar-tab-badge"
          >
            {{ groupCount }}
          </span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-solid fa-user-check"></i>
          <span>Meus Atendimentos</span>
        </div>
      </template>

      <!-- ================================================================= -->
      <!-- 2. MÓDULO: CONVERSAS / HISTÓRICO (/historico)                    -->
      <!-- ================================================================= -->
      <template v-else-if="currentModule === 'historico'">
        <div class="topbar-nav-tab is-disabled active">
          <i class="fa-regular fa-comments"></i>
          <span>Todas as Conversas</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-solid fa-user-check"></i>
          <span>Meus Atendimentos</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-solid fa-check-double"></i>
          <span>Finalizados</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-regular fa-star"></i>
          <span>Com Avaliação</span>
        </div>
      </template>

      <!-- ================================================================= -->
      <!-- 3. MÓDULO: CONTATOS (/clientes)                                   -->
      <!-- ================================================================= -->
      <template v-else-if="currentModule === 'clientes'">
        <div class="topbar-nav-tab is-disabled active">
          <i class="fa-solid fa-user-group"></i>
          <span>Clientes</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-solid fa-id-badge"></i>
          <span>Funcionários</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-solid fa-building"></i>
          <span>Empresas</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-solid fa-tags"></i>
          <span>Etiquetas</span>
        </div>
      </template>

      <!-- ================================================================= -->
      <!-- 4. MÓDULO: MENSAGENS RÁPIDAS (/mensagens-rapidas)                 -->
      <!-- ================================================================= -->
      <template v-else-if="currentModule === 'mensagens_rapidas'">
        <div class="topbar-nav-tab is-disabled active">
          <i class="fa-solid fa-bolt"></i>
          <span>Todas as Mensagens</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-solid fa-globe"></i>
          <span>Gerais / Empresa</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-solid fa-user"></i>
          <span>Minhas Mensagens</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-solid fa-folder-tree"></i>
          <span>Categorias</span>
        </div>
      </template>

      <!-- ================================================================= -->
      <!-- 5. MÓDULO: DESEMPENHO (/desempenho)                               -->
      <!-- ================================================================= -->
      <template v-else-if="currentModule === 'desempenho'">
        <div class="topbar-nav-tab is-disabled active">
          <i class="fa-solid fa-chart-line"></i>
          <span>Visão Geral</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-solid fa-users"></i>
          <span>Atendentes</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-regular fa-star"></i>
          <span>Satisfação & CSAT</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-solid fa-gauge-high"></i>
          <span>SLA & Tempos</span>
        </div>
      </template>

      <!-- ================================================================= -->
      <!-- 6. MÓDULO: CONFIGURAÇÕES E ADMINISTRAÇÃO                          -->
      <!-- ================================================================= -->
      <template v-else-if="currentModule === 'configuracoes'">
        <div class="topbar-nav-tab is-disabled active">
          <i class="fa-brands fa-whatsapp text-success"></i>
          <span>Conexões WhatsApp</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-solid fa-sliders"></i>
          <span>Empresa & Geral</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-solid fa-building"></i>
          <span>Departamentos</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-solid fa-users-gear"></i>
          <span>Usuários</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-solid fa-robot"></i>
          <span>Chatbot & IA</span>
        </div>
      </template>

      <!-- ================================================================= -->
      <!-- 7. MÓDULO: DASHBOARD (/)                                          -->
      <!-- ================================================================= -->
      <template v-else-if="currentModule === 'dashboard'">
        <div class="topbar-nav-tab is-disabled active">
          <i class="fa-solid fa-chart-pie"></i>
          <span>Visão Geral</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-solid fa-bolt text-warning"></i>
          <span>Filas em Tempo Real</span>
        </div>

        <div class="topbar-nav-tab is-disabled">
          <i class="fa-solid fa-calendar-days"></i>
          <span>Métricas do Mês</span>
        </div>
      </template>

      <!-- Fallback / Outras Telas (ex: Meu Perfil) -->
      <template v-else>
        <span class="topbar-fallback-title">{{ fallbackPageTitle }}</span>
      </template>

    </div>

    <!-- Área Direita: Indicador de Usuários Online (com popover de detalhes) -->
    <div class="topbar-right">
      <div class="online-users-wrapper" ref="onlineUsersDropdownRef">
        <button
          type="button"
          class="online-users-badge"
          :class="{ open: showOnlineUsersList }"
          @click="toggleOnlineUsersList"
          :title="`${onlineCount} usuário(s) conectado(s) no momento. Clique para ver quem está online.`"
        >
          <span class="online-pulse-dot"></span>
          <i class="fa-solid fa-users"></i>
          <span class="online-users-count">{{ onlineCount }}</span>
          <span class="online-users-label">{{ onlineCount === 1 ? 'online' : 'online' }}</span>
          <i class="fa-solid fa-chevron-down caret-mini" :class="{ rotated: showOnlineUsersList }"></i>
        </button>

        <!-- Dropdown com lista detalhada de usuários online -->
        <Transition name="dropdown-pop">
          <div v-if="showOnlineUsersList" class="online-users-popover">
            <div class="online-popover-header">
              <div class="popover-title-row">
                <span class="status-live-dot-mini"></span>
                <span class="popover-title">Usuários Online</span>
              </div>
              <span class="online-count-pill">{{ onlineCount }} conectado{{ onlineCount === 1 ? '' : 's' }}</span>
            </div>

            <div class="online-users-list-scroll">
              <div
                v-for="user in activeUsersList"
                :key="user.id || user.name"
                class="online-user-item"
              >
                <div
                  class="online-user-avatar"
                  :style="!user.avatar_url || avatarLoadFailed[user.id || user.name] ? getAvatarStyle(user) : {}"
                >
                  <img
                    v-if="user.avatar_url && !avatarLoadFailed[user.id || user.name]"
                    :src="user.avatar_url"
                    :alt="user.name"
                    referrerpolicy="no-referrer"
                    @error="avatarLoadFailed[user.id || user.name] = true"
                  />
                  <span v-else class="avatar-initials">{{ getInitials(user.name) }}</span>
                  <span class="avatar-online-badge"></span>
                </div>
                <div class="online-user-details">
                  <div class="online-user-name-row">
                    <span class="online-user-name">{{ user.name }}</span>
                    <span v-if="user.id === auth.user?.id" class="you-chip">Você</span>
                  </div>
                  <span class="online-user-role">{{ formatRole(user.role) }}</span>
                </div>
              </div>

              <div v-if="activeUsersList.length === 0" class="online-empty-msg">
                <span>Nenhum usuário detectado</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { useSidebarStore } from '@/stores/sidebar.store'
import { useTicketStore } from '@/stores/tickets.store'

const route = useRoute()
const auth = useAuthStore()
const ui = useUiStore()
const sidebar = useSidebarStore()
const ticketStore = useTicketStore()

const topbarRef = ref(null)
const onlineUsersDropdownRef = ref(null)
const showOnlineUsersList = ref(false)

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

// ─── Usuários Online ────────────────────────────────────────────────────────
const avatarLoadFailed = ref({})

const activeUsersList = computed(() => {
  let list = []
  if (Array.isArray(ui.onlineUsersList) && ui.onlineUsersList.length > 0) {
    list = ui.onlineUsersList
  } else if (auth.user) {
    list = [auth.user]
  }

  // Mapeia e garante dados atualizados do usuário autenticado e perfis reais
  return list.map(u => {
    const isMe = auth.user && (String(u.id) === String(auth.user.id) || u.name === auth.user.name)
    const role = (isMe && auth.user?.role) ? auth.user.role : (u.role || 'Analista')
    const avatar = (isMe && auth.user?.avatar_url) ? auth.user.avatar_url : (u.avatar_url || null)
    return {
      id: u.id || (isMe ? auth.user?.id : 'u_' + Math.random()),
      name: u.name || (isMe ? auth.user?.name : 'Usuário'),
      role,
      avatar_url: avatar
    }
  })
})

const onlineCount = computed(() => {
  const socketCount = Number(ui.onlineUsersCount) || 0
  const listCount = activeUsersList.value.length
  return Math.max(socketCount, listCount, 1)
})

function toggleOnlineUsersList() {
  showOnlineUsersList.value = !showOnlineUsersList.value
}

function formatRole(role) {
  if (!role) return 'Atendente'
  const str = String(role).trim()
  const lower = str.toLowerCase()
  if (lower === 'admin' || lower === 'administrador') return 'Administrador'
  if (lower === 'supervisor') return 'Supervisor'
  if (lower === 'analista') return 'Analista'
  return str
}

function getAvatarStyle(user) {
  const palettes = [
    { bg: '#eff6ff', color: '#2563eb' },
    { bg: '#fef3c7', color: '#d97706' },
    { bg: '#ccfbf1', color: '#0d9488' },
    { bg: '#ffe4e6', color: '#e11d48' },
    { bg: '#f3e8ff', color: '#7c3aed' },
    { bg: '#e0f2fe', color: '#0284c7' }
  ]
  const str = user.name || 'U'
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  const idx = Math.abs(hash) % palettes.length
  return {
    backgroundColor: palettes[idx].bg,
    color: palettes[idx].color
  }
}

function getInitials(name) {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Fechar popover ao clicar fora ou pressionar Escape
function handleDocumentClick(e) {
  if (onlineUsersDropdownRef.value && !onlineUsersDropdownRef.value.contains(e.target)) {
    showOnlineUsersList.value = false
  }
}

function handleEscKey(e) {
  if (e.key === 'Escape') {
    showOnlineUsersList.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleEscKey)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleEscKey)
})
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
  z-index: 2500;
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

/* ─── Pílula de Aba (Visual Bitrix24, Desativada para cliques) ───────────── */
.topbar-nav-tab {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 500;
  color: #64748b;
  background: transparent;
  border: 1px solid transparent;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  text-decoration: none;
  box-sizing: border-box;
}

/* Desativada: sem clique, cursor padrão */
.topbar-nav-tab.is-disabled {
  cursor: default !important;
  pointer-events: none !important;
  user-select: none;
}

.topbar-nav-tab.active {
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
  border-color: #bfdbfe;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.06);
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

.topbar-tab-badge.badge-alert {
  background: #fee2e2;
  color: #dc2626;
}

.topbar-fallback-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

/* Cores de Destaque */
.text-success {
  color: #22c55e;
}

.text-warning {
  color: #f59e0b;
}

/* ─── Área Direita: Usuários Online ─────────────────────────────────────── */
.topbar-right {
  display: flex;
  align-items: center;
  margin-left: 14px;
  flex-shrink: 0;
}

.online-users-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.online-users-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  color: #334155;
  cursor: pointer;
  transition: all 0.16s ease;
  user-select: none;
}

.online-users-badge:hover,
.online-users-badge.open {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.online-pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
  animation: pulseGreen 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
  flex-shrink: 0;
}

@keyframes pulseGreen {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
  }
}

.online-users-badge i.fa-users {
  font-size: 12px;
  color: #64748b;
}

.online-users-count {
  font-weight: 700;
  color: #0f172a;
}

.online-users-label {
  font-weight: 500;
  color: #64748b;
  font-size: 11.5px;
}

.caret-mini {
  font-size: 9px;
  color: #94a3b8;
  margin-left: 2px;
  transition: transform 0.2s ease;
}

.caret-mini.rotated {
  transform: rotate(180deg);
  color: #2563eb;
}

/* Popover Lista de Usuários Online */
.online-users-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 275px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.18), 0 3px 10px rgba(15, 23, 42, 0.08);
  border: 1px solid #e2e8f0;
  z-index: 2600;
  box-sizing: border-box;
  overflow: hidden;
}

.online-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
}

.popover-title-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.status-live-dot-mini {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
}

.popover-title {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
}

.online-count-pill {
  font-size: 10.5px;
  font-weight: 600;
  color: #15803d;
  background: #dcfce7;
  padding: 2px 7px;
  border-radius: 12px;
}

.online-users-list-scroll {
  max-height: 250px;
  overflow-y: auto;
  padding: 6px;
}

.online-user-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  transition: background-color 0.12s ease;
}

.online-user-item:hover {
  background: #f8fafc;
}

.online-user-avatar {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-weight: 700;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  overflow: visible;
}

.online-user-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.avatar-online-badge {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #22c55e;
  border: 2px solid #ffffff;
  z-index: 2;
}

.online-user-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.online-user-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.online-user-name {
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.you-chip {
  font-size: 9.5px;
  font-weight: 600;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 0 4px;
  border-radius: 4px;
  line-height: 1.3;
}

.online-user-role {
  font-size: 11px;
  color: #64748b;
  line-height: 1.2;
}

.online-empty-msg {
  padding: 16px;
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
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

@media (max-width: 768px) {
  .topbar-hamburger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
