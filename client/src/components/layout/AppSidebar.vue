<template>
  <aside
    class="sidebar"
    id="mainSidebar"
    :class="{ 'mobile-open': mobileOpen, 'is-expanded': isExpanded }"
  >
    <!-- Brand Logo Header com Botão de Alternar no Topo -->
    <div class="sidebar-header">
      <RouterLink to="/atendimentos" class="brand-logo-container" title="Brisoft Desk">
        <!-- Ambas as logos ficam no DOM para evitar decode e lag ao alternar -->
        <img :src="logoUrl" alt="Brisoft Desk" class="brand-logo-full" />
        <img :src="iconUrl" alt="Brisoft Desk" class="brand-logo-symbol" />
      </RouterLink>

      <!-- Botão de alternar recolher / expandir no topo ao lado da logo e sobre a linha -->
      <button
        type="button"
        class="sidebar-toggle-btn"
        :title="isExpanded ? 'Recolher menu' : 'Expandir menu'"
        :aria-label="isExpanded ? 'Recolher menu' : 'Expandir menu'"
        @click.stop="toggleExpanded"
      >
        <i :class="isExpanded ? 'ri-arrow-left-s-line' : 'ri-arrow-right-s-line'"></i>
      </button>

      <button
        v-if="mobileOpen"
        type="button"
        class="mobile-sidebar-close-btn"
        title="Fechar menu lateral"
        aria-label="Fechar menu lateral"
        @click="closeMobile"
      >
        <i class="ri-close-line"></i>
      </button>
    </div>

    <!-- Navigation Links -->
    <nav class="sidebar-nav">
      <!-- Dashboard (Visível apenas para Administradores) -->
      <RouterLink
        v-if="auth.isAdmin"
        class="nav-item"
        to="/dashboard"
        exact-active-class="active"
        title="Dashboard"
        @mouseenter="prefetchRoute('/dashboard')"
        @focus="prefetchRoute('/dashboard')"
      >
        <span class="nav-icon-box"><i class="ri-pie-chart-2-line"></i></span>
        <span class="nav-label">Dashboard</span>
      </RouterLink>

      <!-- Atendimentos (Inbox/Caixa) -->
      <RouterLink
        class="nav-item nav-item-atendimentos"
        to="/atendimentos"
        active-class="active"
        title="Atendimentos"
        @mouseenter="prefetchRoute('/atendimentos')"
        @focus="prefetchRoute('/atendimentos')"
      >
        <span class="nav-icon-box"><i class="ri-inbox-archive-line"></i></span>
        <span class="nav-label">Atendimentos</span>
        <span v-if="waitingCount > 0" class="nav-badge" :title="`${waitingCount} aguardando`">
          {{ waitingCount > 99 ? '99+' : waitingCount }}
        </span>
      </RouterLink>

      <!-- Conversas -->
      <RouterLink
        class="nav-item"
        to="/historico"
        active-class="active"
        title="Conversas e Histórico"
        @mouseenter="prefetchRoute('/historico')"
        @focus="prefetchRoute('/historico')"
      >
        <span class="nav-icon-box"><i class="ri-chat-3-line"></i></span>
        <span class="nav-label">Conversas</span>
      </RouterLink>

      <!-- Contatos -->
      <RouterLink
        class="nav-item"
        to="/clientes"
        active-class="active"
        title="Contatos e Clientes"
        @mouseenter="prefetchRoute('/clientes')"
        @focus="prefetchRoute('/clientes')"
      >
        <span class="nav-icon-box"><i class="ri-contacts-book-line"></i></span>
        <span class="nav-label">Contatos</span>
      </RouterLink>

      <!-- Mensagens Rápidas -->
      <RouterLink
        class="nav-item"
        to="/mensagens-rapidas"
        active-class="active"
        title="Respostas Prontas"
        @mouseenter="prefetchRoute('/mensagens-rapidas')"
        @focus="prefetchRoute('/mensagens-rapidas')"
      >
        <span class="nav-icon-box"><i class="ri-flashlight-line"></i></span>
        <span class="nav-label">Mensagens Rápidas</span>
      </RouterLink>

      <!-- Desempenho -->
      <RouterLink
        class="nav-item"
        to="/desempenho"
        active-class="active"
        title="Desempenho e Indicadores"
        @mouseenter="prefetchRoute('/desempenho')"
        @focus="prefetchRoute('/desempenho')"
      >
        <span class="nav-icon-box"><i class="ri-line-chart-line"></i></span>
        <span class="nav-label">Desempenho</span>
      </RouterLink>
    </nav>

    <!-- Seção Inferior: Configurações -->
    <div class="sidebar-nav-footer">
      <!-- Configurações -->
      <RouterLink
        v-if="auth.canManageTeam"
        class="nav-item"
        to="/configuracoes"
        active-class="active"
        id="settingsNavUsuarios"
        :title="auth.isAdmin ? 'Configurações' : 'Equipe'"
        @mouseenter="prefetchRoute('/configuracoes')"
        @focus="prefetchRoute('/configuracoes')"
      >
        <span class="nav-icon-box"><i class="ri-settings-3-line"></i></span>
        <span class="nav-label">Configurações</span>
      </RouterLink>
    </div>

    <!-- Sidebar Bottom: User Profile Avatar -->
    <div class="sidebar-bottom">
      <div ref="userMenuRef" class="user-menu-wrapper" style="position:relative; width: 100%;">
        <button
          type="button"
          class="user-avatar-btn"
          :class="{ 'expanded-user-btn': isExpanded }"
          :title="`${displayUserName} (${roleLabel})`"
          @click.stop="showUserDropdown = !showUserDropdown"
        >
          <div class="user-avatar-circle">
            <img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" alt="Foto do perfil" />
            <span v-else>{{ userInitials }}</span>
            <span class="user-status-dot"></span>
          </div>
          <div class="user-info-expanded">
            <span class="user-name-expanded">{{ displayUserName }}</span>
            <span class="user-role-expanded">{{ roleLabel }}</span>
          </div>
          <span class="user-more-box nav-icon-box" style="margin-left: auto;">
            <i class="ri-more-2-line user-more-icon"></i>
          </span>
        </button>

        <!-- Dropdown Popup -->
        <div v-if="showUserDropdown" class="user-popup-menu" :class="{ 'expanded-popup': isExpanded }" @click.stop>
          <button
            type="button"
            class="user-popup-profile"
            @click="goTo('/perfil')"
            @mouseenter="prefetchRoute('/perfil')"
            @focus="prefetchRoute('/perfil')"
          >
            <span class="popup-avatar"><img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" alt="" /><b v-else>{{ userInitials }}</b></span>
            <span class="user-popup-header"><strong>{{ displayUserName }}</strong><small>{{ roleLabel }}</small><span>{{ departmentLabel }}</span></span>
            <i class="ri-arrow-right-s-line"></i>
          </button>
          <div v-if="auth.isAdmin" class="admin-shortcuts">
            <button
              type="button"
              @click="goTo('/usuarios')"
              @mouseenter="prefetchRoute('/usuarios')"
              @focus="prefetchRoute('/usuarios')"
            >
              <i class="ri-group-line"></i><span>Usuários</span>
            </button>
            <button
              type="button"
              @click="goTo('/configuracao-ia')"
              @mouseenter="prefetchRoute('/configuracao-ia')"
              @focus="prefetchRoute('/configuracao-ia')"
            >
              <i class="ri-robot-line"></i><span>Config. IA</span>
            </button>
          </div>
          <div class="appearance-row"><i class="ri-moon-line"></i><span>Aparência: <strong>Claro</strong></span><i class="ri-computer-line"></i></div>
          <div class="user-popup-divider"></div>
          <button type="button" class="user-popup-item" @click="handleLogout">
            <i class="ri-logout-box-r-line"></i>
            <span>Sair do sistema</span>
          </button>
        </div>
      </div>
    </div>
  </aside>

  <!-- Overlay mobile -->
  <div
    class="sidebar-overlay"
    :class="{ visible: mobileOpen }"
    @click="closeMobile"
    aria-hidden="true"
  ></div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore }      from '@/stores/auth.store'
import { useTicketStore }    from '@/stores/tickets.store'
import { useSidebarStore }   from '@/stores/sidebar.store'
import { prefetchRoute }     from '@/router'
import iconUrl from '@/assets/img/icon.png'
import logoUrl from '@/assets/img/logo_tema_claro.png'
import { normalizePersonName } from '@/utils/person-display'

const auth    = useAuthStore()
const tickets = useTicketStore()
const route   = useRoute()
const router  = useRouter()
const sidebar = useSidebarStore()

const showUserDropdown = ref(false)
const userMenuRef = ref(null)
const mobileOpen = computed(() => sidebar.mobileOpen)
const isExpanded = computed(() => sidebar.isExpanded)

function toggleExpanded() {
  sidebar.toggleExpanded()
}

function closeMobile() {
  if (typeof window !== 'undefined' && window.history.state?.mobileSidebar) {
    window.history.back()
  } else {
    sidebar.close()
  }
}

watch(() => sidebar.mobileOpen, (open) => {
  if (open && typeof window !== 'undefined' && window.innerWidth <= 768) {
    if (!window.history.state?.mobileSidebar) {
      window.history.pushState({ ...window.history.state, mobileSidebar: true }, '')
    }
  }
})

function handleSidebarPopState() {
  if (sidebar.mobileOpen) {
    sidebar.close()
  }
}

watch(() => route.path, () => {
  sidebar.close()
  showUserDropdown.value = false
})

const waitingCount = computed(() => tickets.waitingTickets.length)
const displayUserName = computed(() => normalizePersonName(auth.userName || 'Usuário'))

const userInitials = computed(() => {
  const name = auth.userName || 'U'
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
})

const roleLabel = computed(() => {
  if (auth.isAdmin) return 'Administrador'
  if (auth.isSupervisor) return 'Supervisor'
  return 'Analista'
})
const departmentLabel = computed(() => auth.departmentName || (auth.isAdmin ? 'Todos os departamentos' : 'Geral'))

function goTo(path) { showUserDropdown.value = false; router.push(path) }
function closeOnOutside(event) { if (showUserDropdown.value && !userMenuRef.value?.contains(event.target)) showUserDropdown.value = false }
onMounted(() => {
  document.addEventListener('click', closeOnOutside)
  window.addEventListener('popstate', handleSidebarPopState)
})
onUnmounted(() => {
  document.removeEventListener('click', closeOnOutside)
  window.removeEventListener('popstate', handleSidebarPopState)
})

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.sidebar {
  width: 64px;
  min-width: 64px;
  max-width: 64px;
  background-color: #ffffff;
  border-right: 1px solid #e2e8f0;
  box-shadow: 1px 0 4px rgba(15, 23, 42, 0.03);
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
  flex-shrink: 0;
  z-index: 700;
  user-select: none;
  position: relative;
  will-change: width, min-width, max-width;
  transition: width 0.14s cubic-bezier(0.16, 1, 0.3, 1),
              min-width 0.14s cubic-bezier(0.16, 1, 0.3, 1),
              max-width 0.14s cubic-bezier(0.16, 1, 0.3, 1);
}

.sidebar.is-expanded {
  width: 220px !important;
  min-width: 220px !important;
  max-width: 220px !important;
}

/* ─── 1. Header com Logo 100% Centralizada e Botão Circular na Linha ──────── */
.sidebar-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  min-height: 48px;
  max-height: 48px;
  padding: 4px 14px;
  border-bottom: 1px solid #f1f5f9;
  box-sizing: border-box;
}

.brand-logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  width: 100%;
  height: 100%;
  margin: 0 auto;
}

.brand-logo-full {
  display: none;
  height: 34px;
  max-width: 155px;
  object-fit: contain;
  margin: 0 auto;
}

.brand-logo-symbol {
  display: block;
  width: 32px;
  height: 32px;
  object-fit: contain;
  margin: 0 auto;
}

.sidebar.is-expanded .brand-logo-full,
.sidebar.mobile-open .brand-logo-full {
  display: block;
}

.sidebar.is-expanded .brand-logo-symbol,
.sidebar.mobile-open .brand-logo-symbol {
  display: none;
}

/* Botão Circular de Alternar Posicionado Exatamente sobre a Linha da Borda */
.sidebar-toggle-btn {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  min-width: 24px;
  border-radius: 50%;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  padding: 0;
  z-index: 50;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12), 0 1px 2px rgba(15, 23, 42, 0.06);
  transition: all 0.15s ease;
}

.sidebar-toggle-btn:hover {
  background: #f8fafc;
  color: #059669;
  border-color: #059669;
  transform: translateY(-50%) scale(1.12);
  box-shadow: 0 3px 8px rgba(5, 150, 105, 0.22);
}

.sidebar-toggle-btn i {
  font-size: 14px;
  line-height: 1;
  color: inherit;
}

/* ─── 2. Navegação Principal ─────────────────────────────────────────────── */
.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 10px;
  width: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar.is-expanded .sidebar-nav {
  align-items: stretch;
  padding: 12px 14px;
  gap: 6px;
}

.nav-item {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: #54656f;
  text-decoration: none;
  position: relative;
  transition: all 0.15s ease;
  cursor: pointer;
  flex-shrink: 0;
  box-sizing: border-box;
}

.sidebar.is-expanded .nav-item {
  width: 100%;
  height: 42px;
  padding: 0 14px;
  justify-content: flex-start;
  gap: 12px;
}

.nav-item i {
  font-size: 17px;
  transition: color 0.15s ease;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
  color: inherit;
}

.nav-label {
  display: none;
}

.sidebar.is-expanded .nav-label {
  display: inline-block;
  font-size: 13.5px;
  font-weight: 500;
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-item:hover {
  background-color: #f8fafc;
  color: #0f172a;
}

.nav-item:active {
  transform: scale(0.94);
  transition: transform 0.08s ease;
  background-color: #f1f5f9;
}

/* Item Ativo (Cápsula Verde Suave + Indicador Vertical na Margem Esquerda) */
.nav-item.active {
  background-color: #dcfce7 !important;
  color: #059669 !important;
}

.nav-item.active i {
  color: #059669 !important;
}

.sidebar.is-expanded .nav-item.active .nav-label {
  color: #059669 !important;
  font-weight: 600;
}

/* Indicador verde vertical na borda esquerda da tela */
.nav-item.active::before {
  content: '';
  position: absolute;
  left: -10px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  background-color: #059669;
  border-radius: 0 4px 4px 0;
  pointer-events: none;
}

.sidebar.is-expanded .nav-item.active::before {
  left: -14px;
  height: 26px;
}

/* Badge Numérico Laranja */
.nav-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background-color: #ea580c;
  color: #ffffff;
  font-size: 9.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  border: 2px solid #ffffff;
}

.sidebar.is-expanded .nav-badge {
  position: static;
  margin-left: auto;
  border: none;
  font-size: 10.5px;
  padding: 2px 7px;
  min-width: 20px;
  height: 18px;
}

/* ─── 3. Rodapé de Navegação (Painel TV & Configurações) ─────────────────── */
.sidebar-nav-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 10px 0;
  margin-top: auto;
  border-top: 1px solid #f1f5f9;
  box-sizing: border-box;
}

.sidebar.is-expanded .sidebar-nav-footer {
  align-items: stretch;
  padding: 10px 14px 0;
  gap: 6px;
}

/* ─── 4. Card do Usuário ─────────────────────────────────────────────────── */
.sidebar-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 8px 10px;
  border-top: 1px solid #f1f5f9;
  box-sizing: border-box;
}

.sidebar.is-expanded .sidebar-bottom {
  align-items: stretch;
  padding: 8px 12px;
}

.user-avatar-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  border: none;
  outline: none;
  padding: 0;
  transition: all 0.15s ease;
}

.user-avatar-btn:hover {
  background: #f8fafc;
}

.user-avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: #059669;
  color: #ffffff;
  font-weight: 700;
  font-size: 12px;
}

.user-avatar-circle img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.user-status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #10b981;
  border: 2px solid #ffffff;
}

/* Quando expandido */
.user-avatar-btn.expanded-user-btn {
  width: 100%;
  height: 44px;
  border-radius: 8px;
  background: transparent;
  padding: 2px 4px;
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-start;
}

.user-info-expanded {
  display: none;
  flex-direction: column;
  text-align: left;
  min-width: 0;
  flex: 1;
  line-height: 1.25;
}

.sidebar.is-expanded .user-info-expanded {
  display: flex;
}

.user-more-box {
  display: none;
}

.sidebar.is-expanded .user-more-box {
  display: flex;
}

.user-name-expanded {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role-expanded {
  font-size: 11px;
  font-weight: 400;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.user-more-icon {
  font-size: 12px;
  color: #94a3b8;
  margin-left: auto;
  padding-right: 2px;
}


.user-popup-menu {
  position: absolute;
  bottom: 0;
  left: 54px;
  width: 270px;
  max-width: calc(100vw - 32px);
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.12), 0 4px 10px -2px rgba(15, 23, 42, 0.06);
  padding: 14px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.user-popup-menu.expanded-popup {
  left: 0;
  bottom: calc(100% + 8px);
  width: 260px;
}

.user-popup-profile{width:100%;border:0;background:transparent;display:grid;grid-template-columns:46px 1fr 12px;align-items:center;gap:10px;padding:0;text-align:left;cursor:pointer;color:#334155}.popup-avatar{width:46px;height:46px;border-radius:50%;background:#ecfdf5;color:#059669;display:grid;place-items:center;overflow:hidden}.popup-avatar img{width:100%;height:100%;object-fit:cover}.user-popup-profile>i{font-size:11px;color:#94a3b8}
.user-popup-header {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-popup-header strong {
  font-size: 12.5px;
  color: #0f172a;
}

.user-popup-header small {
  font-size: 10.5px;
  color: #64748b;
}
.user-popup-header span{font-size:10.5px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.admin-shortcuts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.admin-shortcuts button{height:76px;border:1px solid #dbe1e8;border-radius:10px;background:#fff;color:#334155;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-size:11.5px}.admin-shortcuts button:hover{background:#f8fafc;border-color:#bfdbfe}.admin-shortcuts i{width:31px;height:31px;border:1px solid #e2e8f0;border-radius:50%;display:grid;place-items:center;font-size:13px}.appearance-row{display:flex;align-items:center;gap:8px;margin-top:12px;padding:10px;border:1px solid #dbe1e8;border-radius:9px;background:#f8fafc;color:#475569;font-size:11.5px}.appearance-row span{flex:1}.appearance-row>i:last-child{color:#64748b}

.user-popup-email {
  font-size: 10px;
  color: #94a3b8;
}

.user-popup-divider {
  height: 1px;
  background: #edf0f3;
  margin: 6px 0;
}

.user-popup-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: #ef4444;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  justify-content:center;
  transition: background 0.15s ease;
}

.user-popup-item:hover {
  background: #fef2f2;
}

.mobile-sidebar-close-btn {
  display: none;
}

.sidebar-overlay {
  display: none;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: -280px;
    width: 250px;
    min-width: 250px;
    max-width: 260px;
    height: 100vh;
    height: 100dvh;
    z-index: 3100 !important;
    background: #ffffff;
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
    align-items: flex-start;
    padding: max(14px, env(safe-area-inset-top, 14px)) 16px max(14px, env(safe-area-inset-bottom, 14px));
    transition: left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .sidebar.mobile-open {
    left: 0;
  }
  .sidebar-header {
    width: 100%;
    justify-content: space-between;
    padding: 0 0 12px 0;
    margin-bottom: 8px;
    border-bottom: 1px solid #f1f5f9;
  }
  .brand-logo-full {
    height: 32px;
    max-width: 140px;
    margin: 0;
  }
  .mobile-sidebar-close-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: #f1f5f9;
    color: #475569;
    border-radius: 8px;
    cursor: pointer;
    font-size: 18px;
    flex-shrink: 0;
  }
  .sidebar-toggle-btn {
    display: none !important;
  }
  .sidebar-toggle-bubble {
    display: none;
  }
  .nav-label {
    display: block;
    margin-left: 12px;
    font-size: 13px;
    font-weight: 600;
  }
  .nav-item {
    width: 100%;
    justify-content: flex-start;
    padding: 10px 14px;
  }
  .sidebar-nav-footer {
    width: 100%;
    align-items: stretch;
  }
  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(2px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;
    z-index: 3050 !important;
  }
  .sidebar-overlay.visible {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
