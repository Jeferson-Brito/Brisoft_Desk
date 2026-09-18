<template>
  <aside
    class="sidebar"
    id="mainSidebar"
    :class="{ 'mobile-open': mobileOpen, 'is-expanded': isExpanded }"
  >
    <!-- Botão Balão de Expandir / Recolher na borda do menu -->
    <button
      type="button"
      class="sidebar-toggle-bubble"
      :title="isExpanded ? 'Recolher menu (<)' : 'Expandir menu (>)'"
      :aria-label="isExpanded ? 'Recolher menu' : 'Expandir menu'"
      @click="toggleExpanded"
    >
      <i class="fa-solid" :class="isExpanded ? 'fa-chevron-left' : 'fa-chevron-right'"></i>
    </button>

    <!-- Brand Logo Header -->
    <div class="sidebar-header">
      <RouterLink to="/atendimentos" class="brand-logo-container" title="Brisoft Desk">
        <!-- Quando expandido: exibe logo horizontal completa com nome Brisoft Desk -->
        <img v-if="isExpanded" :src="logoUrl" alt="Brisoft Desk" class="brand-logo-full" />
        <!-- Quando recolhido: exibe ícone/logo atual -->
        <img v-else :src="iconUrl" alt="Brisoft Desk" class="brand-logo-symbol" />
      </RouterLink>
    </div>

    <!-- Navigation Links (Column 1 Icons / Labels) -->
    <nav class="sidebar-nav">
      <!-- Dashboard (Visível apenas para Administradores) -->
      <RouterLink v-if="auth.isAdmin" class="nav-item" to="/" exact-active-class="active" title="Dashboard">
        <i class="fa-solid fa-chart-pie"></i>
        <span class="nav-label">Dashboard</span>
      </RouterLink>

      <!-- Atendimentos / Inbox (Principal) -->
      <RouterLink class="nav-item" to="/atendimentos" active-class="active" title="Atendimentos / Inbox">
        <i class="fa-solid fa-inbox"></i>
        <span class="nav-label">Atendimentos</span>
        <span v-if="waitingCount > 0" class="nav-badge" :title="`${waitingCount} aguardando`">
          {{ waitingCount > 99 ? '99+' : waitingCount }}
        </span>
      </RouterLink>

      <!-- Conversas / Histórico -->
      <RouterLink class="nav-item" to="/historico" active-class="active" title="Conversas e Histórico">
        <i class="fa-regular fa-comments"></i>
        <span class="nav-label">Conversas</span>
      </RouterLink>

      <!-- Contatos / Clientes -->
      <RouterLink class="nav-item" to="/clientes" active-class="active" title="Contatos e Clientes">
        <i class="fa-regular fa-address-book"></i>
        <span class="nav-label">Contatos</span>
      </RouterLink>

      <!-- Mensagens Rápidas -->
      <RouterLink class="nav-item" to="/mensagens-rapidas" active-class="active" title="Respostas Prontas">
        <i class="fa-solid fa-bolt"></i>
        <span class="nav-label">Mensagens Rápidas</span>
      </RouterLink>

      <!-- Desempenho / SLA -->
      <RouterLink class="nav-item" to="/desempenho" active-class="active" title="Desempenho e Indicadores">
        <i class="fa-solid fa-chart-line"></i>
        <span class="nav-label">Desempenho</span>
      </RouterLink>
    </nav>

    <!-- Seção Inferior: Painel TV e Configurações (acima do perfil) -->
    <div class="sidebar-nav-footer">
      <!-- Painel TV -->
      <RouterLink class="nav-item" to="/painel-tv" target="_blank" rel="noopener noreferrer" title="Abrir Painel TV em nova guia" @click="closeMobile">
        <i class="fa-solid fa-tv"></i>
        <span class="nav-label">Painel TV</span>
      </RouterLink>

      <!-- Configurações -->
      <RouterLink v-if="auth.canManageTeam" class="nav-item" to="/configuracoes" active-class="active" id="settingsNavUsuarios" :title="auth.isAdmin ? 'Configurações' : 'Equipe'">
        <i class="fa-solid fa-gear"></i>
        <span class="nav-label">Configurações</span>
      </RouterLink>
    </div>

    <!-- Sidebar Bottom: User Profile Avatar -->
    <div class="sidebar-bottom">
      <div ref="userMenuRef" class="user-menu-wrapper" style="position:relative; width: 100%; display: flex; justify-content: center;">
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
          <div v-if="isExpanded" class="user-info-expanded">
            <span class="user-name-expanded">{{ displayUserName }}</span>
            <span class="user-role-expanded">{{ roleLabel }}</span>
          </div>
          <i v-if="isExpanded" class="fa-solid fa-ellipsis-vertical user-more-icon"></i>
        </button>

        <!-- Dropdown Popup -->
        <div v-if="showUserDropdown" class="user-popup-menu" :class="{ 'expanded-popup': isExpanded }" @click.stop>
          <button type="button" class="user-popup-profile" @click="goTo('/perfil')">
            <span class="popup-avatar"><img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" alt="" /><b v-else>{{ userInitials }}</b></span>
            <span class="user-popup-header"><strong>{{ displayUserName }}</strong><small>{{ roleLabel }}</small><span>{{ departmentLabel }}</span></span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <div v-if="auth.isAdmin" class="admin-shortcuts">
            <button type="button" @click="goTo('/usuarios')"><i class="fa-solid fa-user-group"></i><span>Usuários</span></button>
            <button type="button" @click="goTo('/configuracao-ia')"><i class="fa-solid fa-robot"></i><span>Config. IA</span></button>
          </div>
          <div class="appearance-row"><i class="fa-regular fa-moon"></i><span>Aparência: <strong>Claro</strong></span><i class="fa-solid fa-display"></i></div>
          <div class="user-popup-divider"></div>
          <button type="button" class="user-popup-item" @click="handleLogout">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
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
import iconUrl from '@/assets/img/icon.png'
import logoUrl from '@/assets/img/logo.png'
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

function closeMobile() { sidebar.close() }

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
onMounted(() => document.addEventListener('click', closeOnOutside))
onUnmounted(() => document.removeEventListener('click', closeOnOutside))

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.sidebar {
  width: 60px;
  min-width: 60px;
  max-width: 60px;
  background-color: #f3f4f6;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100vh;
  padding: 10px 0 14px;
  box-sizing: border-box;
  flex-shrink: 0;
  z-index: 60;
  user-select: none;
  position: relative;
  transition: width 0.22s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.22s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.22s cubic-bezier(0.4, 0, 0.2, 1), padding 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Sidebar expandido */
.sidebar.is-expanded {
  width: 220px;
  min-width: 220px;
  max-width: 220px;
  padding: 10px 8px 14px;
}

/* Botão Balão na borda para Expandir / Recolher */
.sidebar-toggle-bubble {
  position: absolute;
  top: 18px;
  right: -12px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  box-shadow: 0 2px 6px -1px rgba(0, 0, 0, 0.12), 0 1px 3px -1px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 80;
  color: #64748b;
  font-size: 10px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  outline: none;
  padding: 0;
}

.sidebar-toggle-bubble:hover {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
  transform: scale(1.15);
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.35);
}

.sidebar-toggle-bubble:active {
  transform: scale(0.95);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding-bottom: 10px;
  border-bottom: 1px solid #e5e7eb;
  height: 48px;
  box-sizing: border-box;
}

.sidebar.is-expanded .sidebar-header {
  justify-content: center;
  padding: 0 10px 10px;
}

.brand-logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  height: 100%;
  width: 100%;
}

.brand-logo-symbol {
  width: 34px;
  height: 34px;
  object-fit: contain;
}

.brand-logo-full {
  height: 32px;
  max-width: 165px;
  object-fit: contain;
  margin: 0 auto;
}

.sidebar-nav-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: 100%;
  padding-top: 8px;
  margin-top: auto;
  border-top: 1px solid #e5e7eb;
}

.sidebar.is-expanded .sidebar-nav-footer {
  align-items: stretch;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding-top: 10px;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar.is-expanded .sidebar-nav {
  align-items: stretch;
}

.nav-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #64748b;
  text-decoration: none;
  position: relative;
  transition: all 0.15s ease;
  cursor: pointer;
  flex-shrink: 0;
}

.sidebar.is-expanded .nav-item {
  width: 100%;
  padding: 0 12px;
  justify-content: flex-start;
  gap: 12px;
  box-sizing: border-box;
}

.nav-item i {
  font-size: 16px;
  transition: color 0.15s ease;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.nav-label {
  display: none;
}

.sidebar.is-expanded .nav-label {
  display: inline-block;
  font-size: 13px;
  font-weight: 500;
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-item:hover {
  background-color: #e5e7eb;
  color: #1e293b;
}

.nav-item.active {
  background-color: #ffffff;
  color: #1f62d0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.nav-item.active i {
  color: #1f62d0;
}

.nav-badge {
  position: absolute;
  top: 3px;
  right: 3px;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: 999px;
  background-color: #ef4444;
  color: #ffffff;
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  box-shadow: 0 0 0 2px #f3f4f6;
}

.sidebar.is-expanded .nav-badge {
  position: static;
  margin-left: auto;
  box-shadow: none;
}

.sidebar-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding-top: 10px;
  border-top: 1px solid #e5e7eb;
}

.sidebar.is-expanded .sidebar-bottom {
  align-items: stretch;
}

.user-avatar-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #1f62d0;
  color: #ffffff;
  font-weight: 700;
  font-size: 11.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  border: none;
  outline: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  padding: 0;
  transition: all 0.2s ease;
}

.user-avatar-circle {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.user-avatar-circle img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

/* Quando expandido */
.user-avatar-btn.expanded-user-btn {
  width: 100%;
  height: 44px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-start;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.user-avatar-btn.expanded-user-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.user-avatar-btn.expanded-user-btn .user-avatar-circle {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.user-info-expanded {
  display: flex;
  flex-direction: column;
  text-align: left;
  min-width: 0;
  flex: 1;
  line-height: 1.25;
}

.user-name-expanded {
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role-expanded {
  font-size: 10.5px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-more-icon {
  font-size: 11px;
  color: #94a3b8;
  margin-left: auto;
}

.user-status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #16a34a;
  box-shadow: 0 0 0 2px #ffffff;
}

.user-popup-menu {
  position: absolute;
  bottom: 0;
  left: 48px;
  width: 292px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05);
  padding: 14px;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.user-popup-menu.expanded-popup {
  left: 0;
  bottom: 52px;
  width: 260px;
}

.user-popup-profile{width:100%;border:0;background:transparent;display:grid;grid-template-columns:46px 1fr 12px;align-items:center;gap:10px;padding:0;text-align:left;cursor:pointer;color:#334155}.popup-avatar{width:46px;height:46px;border-radius:50%;background:#dbeafe;color:#1d4ed8;display:grid;place-items:center;overflow:hidden}.popup-avatar img{width:100%;height:100%;object-fit:cover}.user-popup-profile>i{font-size:11px;color:#94a3b8}
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

.sidebar-overlay {
  display: none;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -260px;
    width: 220px;
    min-width: 220px;
    max-width: 220px;
    align-items: flex-start;
    padding: 16px;
    transition: left 0.25s ease;
  }
  .sidebar.mobile-open {
    left: 0;
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
    background: rgba(15, 23, 42, 0.4);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;
    z-index: 55;
  }
  .sidebar-overlay.visible {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
