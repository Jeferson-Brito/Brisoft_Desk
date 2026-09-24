<template>
  <header class="topbar-bitrix" id="appTopNavigation" ref="topbarRef">
    <!-- Hambúrguer (desktop/tablet) -->
    <button
      class="topbar-hamburger"
      title="Abrir menu"
      aria-label="Abrir menu lateral"
      @click="sidebar.toggle()"
    >
      <span class="topbar-icon-box"><i class="ri-menu-line"></i></span>
    </button>

    <!-- Logo Oficial no topo Mobile (substitui o hambúrguer no celular) -->
    <RouterLink to="/atendimentos" class="topbar-mobile-brand" title="Brisoft Desk">
      <img :src="logoUrl" alt="Brisoft Desk" class="topbar-mobile-logo" />
    </RouterLink>

    <!-- Trilho de Navegação de Abas (Exibido exclusivamente no módulo de Atendimentos) -->
    <div v-if="currentModule === 'atendimentos'" class="topbar-tabs-track" aria-label="Navegação do módulo">
      <!-- Aba: Atendimentos (Central de WhatsApp) -->
      <div
        class="topbar-nav-pill"
        :class="{ active: ui.activeChatModuleTab === 'atendimentos' }"
        title="Fila de Atendimento do WhatsApp"
        @click="ui.setChatModuleTab('atendimentos')"
      >
        <span class="pill-icon-box"><i class="ri-customer-service-2-line"></i></span>
        <span class="pill-label">Atendimentos</span>
        <span class="pill-count-badge">{{ waitingCount || totalTicketsCount || 0 }}</span>
      </div>

      <!-- Aba: Conversas Internas (Chat da Equipe) -->
      <div
        class="topbar-nav-pill"
        :class="{ active: ui.activeChatModuleTab === 'conversas_internas' }"
        title="Chat Interno da Equipe (Conversas internas)"
        @click="ui.setChatModuleTab('conversas_internas')"
      >
        <span class="pill-icon-box"><i class="ri-chat-3-line"></i></span>
        <span>Conversas internas</span>
        <span v-if="internalChat.totalUnreadCount > 0" class="pill-count-badge unread-internal-badge">
          {{ internalChat.totalUnreadCount }}
        </span>
      </div>

      <!-- Aba: Chatbot -->
      <div class="topbar-nav-pill disabled-pill" title="Assistente Virtual / Chatbot">
        <span class="pill-icon-box"><i class="ri-robot-line"></i></span>
        <span>Chatbot</span>
      </div>

      <!-- Aba: Campanhas -->
      <div class="topbar-nav-pill disabled-pill" title="Campanhas e Disparos">
        <span class="pill-icon-box"><i class="ri-megaphone-line"></i></span>
        <span>Campanhas</span>
      </div>
    </div>

    <!-- Área Direita: Indicador de Usuários Online com Avatar Stack + Botão Novo Atendimento -->
    <div class="topbar-right">
      <!-- Indicador com Stack de Avatares -->
      <div class="online-users-wrapper" ref="onlineUsersDropdownRef">
        <button
          type="button"
          class="online-users-pill-btn"
          :class="{ open: showOnlineUsersList }"
          @click="toggleOnlineUsersList"
          :title="`${onlineCount} usuário(s) conectado(s). Clique para ver detalhes.`"
        >
          <!-- Stack de mini-avatares sobrepostos -->
          <div class="avatar-stack-container">
            <div
              v-for="(u, idx) in previewAvatars"
              :key="u.id || idx"
              class="avatar-stack-circle"
              :style="{ zIndex: 3 - idx, ...getAvatarStyle(u) }"
            >
              <img v-if="u.avatar_url" :src="u.avatar_url" :alt="u.name" />
              <span v-else>{{ getInitials(u.name) }}</span>
            </div>
          </div>

          <span class="online-status-dot-static"></span>
          <span class="online-label-text">{{ onlineCount }} online</span>
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
                  <span class="online-user-role">{{ user.cargo || formatRole(user.role) }}</span>
                </div>
              </div>

              <div v-if="activeUsersList.length === 0" class="online-empty-msg">
                <span>Nenhum usuário detectado</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Botão + Novo atendimento (Exibido exclusivamente na aba de Atendimentos com clientes) -->
      <button
        v-if="currentModule === 'atendimentos' && ui.activeChatModuleTab === 'atendimentos'"
        type="button"
        class="btn-new-attendance-cta"
        title="Iniciar novo atendimento"
        @click="ui.openModal('new_conversation')"
      >
        <span class="btn-icon-box"><i class="ri-add-line"></i></span>
        <span class="btn-cta-text">Novo atendimento</span>
      </button>

      <!-- Perfil do Usuário (Avatar com Popover de Perfil, Senha e Logout) -->
      <div class="user-menu-wrapper" ref="userMenuDropdownRef">
        <button
          type="button"
          class="topbar-user-avatar-btn"
          :class="{ active: showUserMenu }"
          @click="toggleUserMenu"
          title="Minha Conta"
          aria-label="Menu da conta"
        >
          <div
            class="topbar-user-avatar"
            :style="!auth.user?.avatar_url || avatarLoadFailed[auth.user?.id || 'me'] ? getAvatarStyle(auth.user || { name: auth.userName }) : {}"
          >
            <img
              v-if="auth.user?.avatar_url && !avatarLoadFailed[auth.user?.id || 'me']"
              :src="auth.user.avatar_url"
              :alt="auth.userName"
              referrerpolicy="no-referrer"
              @error="avatarLoadFailed[auth.user?.id || 'me'] = true"
            />
            <span v-else>{{ userInitials }}</span>
            <span class="avatar-online-badge"></span>
          </div>
        </button>

        <!-- Popover do Menu do Usuário -->
        <Transition name="dropdown-pop">
          <div v-if="showUserMenu" class="user-profile-popover">
            <!-- Informações do Usuário -->
            <div class="user-popover-header">
              <div
                class="user-popover-avatar"
                :style="!auth.user?.avatar_url || avatarLoadFailed[auth.user?.id || 'me'] ? getAvatarStyle(auth.user || { name: auth.userName }) : {}"
              >
                <img
                  v-if="auth.user?.avatar_url && !avatarLoadFailed[auth.user?.id || 'me']"
                  :src="auth.user.avatar_url"
                  :alt="auth.userName"
                />
                <span v-else>{{ userInitials }}</span>
              </div>
              <div class="user-popover-info">
                <span class="user-popover-name">{{ auth.userName || 'Usuário' }}</span>
                <span class="user-popover-role">{{ auth.user?.cargo || formatRole(auth.user?.role) }}</span>
                <span v-if="auth.user?.email" class="user-popover-email">{{ auth.user.email }}</span>
              </div>
            </div>

            <div class="user-popover-divider"></div>

            <!-- Opções do Menu -->
            <div class="user-popover-menu">
              <button
                type="button"
                class="user-popover-item"
                @click="goTo('/perfil')"
                @mouseenter="prefetchRoute('/perfil')"
                @focus="prefetchRoute('/perfil')"
              >
                <i class="ri-user-settings-line"></i>
                <span>Meu Perfil & Senha</span>
              </button>

              <button
                v-if="auth.isAdmin"
                type="button"
                class="user-popover-item"
                @click="goTo('/configuracoes')"
                @mouseenter="prefetchRoute('/configuracoes')"
                @focus="prefetchRoute('/configuracoes')"
              >
                <i class="ri-settings-3-line"></i>
                <span>Configurações</span>
              </button>

              <div class="user-popover-divider"></div>

              <button type="button" class="user-popover-item logout-item" @click="handleLogout">
                <i class="ri-logout-box-r-line"></i>
                <span>Sair do Sistema</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { useSidebarStore } from '@/stores/sidebar.store'
import { useTicketStore } from '@/stores/tickets.store'
import { useInternalChatStore } from '@/stores/internal-chat.store'
import { prefetchRoute } from '@/router'
import logoUrl from '@/assets/img/logo_tema_claro.png'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()
const sidebar = useSidebarStore()
const ticketStore = useTicketStore()
const internalChat = useInternalChatStore()

const topbarRef = ref(null)
const onlineUsersDropdownRef = ref(null)
const userMenuDropdownRef = ref(null)
const showOnlineUsersList = ref(false)
const showUserMenu = ref(false)

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
    const cargo = (isMe && auth.user?.cargo) ? auth.user.cargo : (u.cargo || null)
    const avatar = (isMe && auth.user?.avatar_url) ? auth.user.avatar_url : (u.avatar_url || null)
    return {
      id: u.id || (isMe ? auth.user?.id : 'u_' + Math.random()),
      name: u.name || (isMe ? auth.user?.name : 'Usuário'),
      role,
      cargo,
      avatar_url: avatar
    }
  })
})

const onlineCount = computed(() => {
  const socketCount = Number(ui.onlineUsersCount) || 0
  const listCount = activeUsersList.value.length
  return Math.max(socketCount, listCount, 1)
})

const totalTicketsCount = computed(() => {
  return (ticketStore.visibleTickets || []).filter(t => t.status !== 'finalizado').length
})

const previewAvatars = computed(() => {
  return activeUsersList.value.slice(0, 3)
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

const userInitials = computed(() => {
  return getInitials(auth.userName || auth.user?.name || 'U')
})

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
  if (showUserMenu.value) {
    showOnlineUsersList.value = false
  }
}

function goTo(path) {
  showUserMenu.value = false
  router.push(path)
}

async function handleLogout() {
  showUserMenu.value = false
  await auth.logout()
  router.push('/login')
}

// Fechar popover ao clicar fora ou pressionar Escape
function handleDocumentClick(e) {
  if (onlineUsersDropdownRef.value && !onlineUsersDropdownRef.value.contains(e.target)) {
    showOnlineUsersList.value = false
  }
  if (userMenuDropdownRef.value && !userMenuDropdownRef.value.contains(e.target)) {
    showUserMenu.value = false
  }
}

function handleEscKey(e) {
  if (e.key === 'Escape') {
    showOnlineUsersList.value = false
    showUserMenu.value = false
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

/* ─── Pílula de Navegação (Estilo da Imagem) ─────────────────────────── */
.topbar-nav-pill {
  height: 32px;
  padding: 0 14px;
  border-radius: 20px;
  font-size: 12.5px;
  font-weight: 500;
  color: #64748b;
  background: transparent;
  border: 1px solid transparent;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.topbar-nav-pill:hover {
  color: #0f172a;
  background: #f8fafc;
}

.topbar-nav-pill.active {
  background: #ecfdf5 !important;
  color: #059669 !important;
  border-color: #a7f3d0 !important;
  font-weight: 600;
}

.pill-count-badge {
  background: #d1fae5;
  color: #065f46;
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
  margin-left: 2px;
}

.unread-internal-badge {
  background: #ef4444 !important;
  color: #ffffff !important;
  animation: pulse-badge 2s infinite ease-in-out;
}

@keyframes pulse-badge {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.disabled-pill {
  opacity: 0.6;
  cursor: default;
}

.pill-icon-box {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pill-icon-box i {
  font-size: 15px;
  line-height: 1;
}

.btn-icon-box {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-icon-box i {
  font-size: 16px;
  line-height: 1;
}

.topbar-icon-box {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.topbar-icon-box i {
  font-size: 18px;
  line-height: 1;
}

.topbar-fallback-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

/* ─── Área Direita: Avatar Stack + Botão Novo Atendimento ────────────────── */
.topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-left: auto; /* Garante que fique SEMPRE alinhado na extrema direita */
  flex-shrink: 0;
}

.online-users-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.online-users-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 8px;
  transition: background 0.14s ease;
}

.online-users-pill-btn:hover {
  background: #f8fafc;
}

.avatar-stack-container {
  display: flex;
  align-items: center;
}

.avatar-stack-circle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  margin-left: -6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8.5px;
  font-weight: 700;
  flex-shrink: 0;
  position: relative;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.avatar-stack-circle:first-child {
  margin-left: 0;
}

.avatar-stack-circle img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.online-status-dot-static {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  flex-shrink: 0;
}

.online-label-text {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

/* Botão + Novo atendimento */
.btn-new-attendance-cta {
  height: 34px;
  padding: 0 16px;
  border-radius: 8px;
  background: #059669;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  box-shadow: 0 1px 3px rgba(5, 150, 105, 0.25);
  transition: all 0.16s ease;
  white-space: nowrap;
}

.btn-new-attendance-cta:hover {
  background: #047857;
  box-shadow: 0 2px 6px rgba(5, 150, 105, 0.35);
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
  color: #059669;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
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

.topbar-mobile-brand {
  display: none;
}

@media (max-width: 768px) {
  .topbar-bitrix {
    padding-left: max(12px, env(safe-area-inset-left, 12px));
    padding-right: max(12px, env(safe-area-inset-right, 12px));
    padding-top: env(safe-area-inset-top, 0px);
    height: calc(48px + env(safe-area-inset-top, 0px));
    min-height: calc(48px + env(safe-area-inset-top, 0px));
    max-height: calc(48px + env(safe-area-inset-top, 0px));
  }
  /* Ocultar hambúrguer no mobile (navegação agora é inferior) */
  .topbar-hamburger {
    display: none !important;
  }
  /* Logo da Brisoft no canto superior esquerdo */
  .topbar-mobile-brand {
    display: flex;
    align-items: center;
    text-decoration: none;
    flex-shrink: 0;
  }
  .topbar-mobile-logo {
    height: 28px;
    max-width: 130px;
    object-fit: contain;
    display: block;
  }
  /* Ocultar abas superiores no mobile (Fila, Chatbot, Conversas, Campanhas) */
  .topbar-tabs-track {
    display: none !important;
  }
  .btn-new-attendance-cta {
    padding: 0;
    width: 32px;
    height: 32px;
    min-width: 32px;
    border-radius: 8px;
    justify-content: center;
    gap: 0;
  }
  .btn-new-attendance-cta .btn-cta-text {
    display: none !important;
  }
  .topbar-right-area {
    gap: 8px;
  }
  .online-indicator-btn {
    padding: 3px 8px;
  }
  .online-label-text {
    font-size: 11px;
  }
  .topbar-right {
    gap: 8px;
    margin-left: auto;
  }
  .topbar-user-avatar {
    width: 32px;
    height: 32px;
    font-size: 11px;
  }
  .user-profile-popover {
    width: 240px;
    right: 0;
  }
}

/* ─── Perfil do Usuário na Topbar (Apenas Mobile - No Desktop já existe no Sidebar) ─── */
.user-menu-wrapper {
  display: none;
}

@media (max-width: 768px) {
  .user-menu-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
  }
}

.topbar-user-avatar-btn {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  outline: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.topbar-user-avatar-btn:hover,
.topbar-user-avatar-btn.active {
  box-shadow: 0 0 0 2px #059669;
}

.topbar-user-avatar {
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  background: #059669;
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.topbar-user-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

/* Popover do Perfil */
.user-profile-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 260px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.18), 0 3px 10px rgba(15, 23, 42, 0.08);
  border: 1px solid #e2e8f0;
  z-index: 2650;
  box-sizing: border-box;
  overflow: hidden;
  padding: 12px;
}

.user-popover-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 8px;
}

.user-popover-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #059669;
  color: #ffffff;
  overflow: hidden;
}

.user-popover-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.user-popover-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.user-popover-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-popover-role {
  font-size: 11px;
  font-weight: 600;
  color: #059669;
}

.user-popover-email {
  font-size: 10.5px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-popover-divider {
  height: 1px;
  background: #f1f5f9;
  margin: 6px 0;
}

.user-popover-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-popover-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #334155;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease, color 0.12s ease;
}

.user-popover-item i {
  font-size: 16px;
  color: #64748b;
  flex-shrink: 0;
}

.user-popover-item:hover {
  background: #f8fafc;
  color: #0f172a;
}

.user-popover-item:hover i {
  color: #059669;
}

.user-popover-item.logout-item {
  color: #ef4444;
}

.user-popover-item.logout-item i {
  color: #ef4444;
}

.user-popover-item.logout-item:hover {
  background: #fef2f2;
  color: #dc2626;
}
</style>
