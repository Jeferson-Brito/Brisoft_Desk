<template>
  <header class="topbar">
    <!-- Hambúrguer (visível apenas em mobile) -->
    <button
      class="topbar-hamburger"
      title="Abrir menu"
      aria-label="Abrir menu lateral"
      @click="sidebar.toggle()"
    >
      <i class="fa-solid fa-bars"></i>
    </button>

    <div class="topbar-left">
      <h1 class="page-title" id="pageTitle">{{ pageTitle }}</h1>
      <p v-if="pageSubtitle" class="page-subtitle" id="pageSubtitle">{{ pageSubtitle }}</p>
    </div>

    <div class="topbar-right">
      <!-- Topbar User Profile (Dropdown Trigger) -->
      <div
        class="topbar-user-dropdown"
        ref="userMenuRef"
        @click="toggleUserMenu"
        title="Menu do usuário"
      >
        <span
          v-if="auth.isTemporary"
          class="temp-admin-badge"
          title="Admin temporário — crie seu perfil definitivo"
        >TEMPORÁRIO</span>
        <img :src="userAvatar" :alt="auth.user?.name" class="topbar-user-avatar" id="topbarUserAvatar" />
        <span class="topbar-user-name" id="topbarUserName">{{ auth.user?.name || 'Carregando...' }}</span>
        <i class="fa-solid fa-chevron-down dropdown-arrow" :class="{ open: isUserMenuOpen }"></i>

        <!-- Popup Menu -->
        <div v-if="isUserMenuOpen" class="user-popup-menu" @click.stop>
          <div class="user-popup-header">
            <img :src="userAvatar" :alt="auth.user?.name" class="popup-avatar" />
            <div class="popup-user-meta">
              <div class="popup-name">{{ auth.user?.name || 'Carregando...' }}</div>
              <div class="popup-role">{{ roleLabel }}</div>
            </div>
          </div>

          <div class="popup-menu-links">
            <button
              v-if="auth.isAdmin"
              type="button"
              class="popup-menu-item"
              @click="navigateAndClose('/usuarios')"
            >
              <i class="fa-solid fa-user-group"></i>
              <span>Gerenciar Usuários</span>
            </button>

            <button
              v-if="auth.canManageTeam"
              type="button"
              class="popup-menu-item"
              @click="navigateAndClose('/configuracoes')"
            >
              <i class="fa-solid fa-robot"></i>
              <span>Configurações & IA</span>
            </button>
          </div>

          <div class="popup-footer">
            <button type="button" class="popup-logout-btn" @click="doLogout">
              <i class="fa-solid fa-right-from-bracket"></i>
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore }    from '@/stores/auth.store'
import { useSidebarStore } from '@/stores/sidebar.store'
import { useSocket }       from '@/composables/useSocket'

const auth    = useAuthStore()
const sidebar = useSidebarStore()
const router  = useRouter()
const route   = useRoute()
const socket  = useSocket()

const isUserMenuOpen = ref(false)
const userMenuRef = ref(null)

function toggleUserMenu() {
  isUserMenuOpen.value = !isUserMenuOpen.value
}

function closeUserMenu(e) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target)) {
    isUserMenuOpen.value = false
  }
}

function navigateAndClose(path) {
  isUserMenuOpen.value = false
  router.push(path)
}

onMounted(() => {
  document.addEventListener('click', closeUserMenu)
})
onUnmounted(() => {
  document.removeEventListener('click', closeUserMenu)
})

const VIEW_META = {
  dashboard:         { title: 'Dashboard',               subtitle: 'Visão geral dos atendimentos e métricas operacionais.' },
  atendimentos:      { title: 'Atendimentos',            subtitle: '' },
  historico:         { title: 'Conversas',                subtitle: 'Consulte e acompanhe conversas anteriores.' },
  clientes:          { title: 'Contatos',                subtitle: 'Cadastre clientes e identifique funcionários da empresa.' },
  mensagens_rapidas: { title: 'Mensagens rápidas',       subtitle: 'Crie e gerencie mensagens prontas para agilizar respostas.' },
  desempenho:        { title: 'Desempenho',              subtitle: 'Indicadores mensais dos atendentes e departamentos.' },
  configuracoes:     { title: 'Configurações',           subtitle: 'Gerencie integrações e configurações gerais da plataforma.' },
  usuarios:          { title: 'Usuários',                subtitle: 'Gerencie atendentes, supervisores e administradores.' }
}

const pageTitle    = computed(() => VIEW_META[route.name]?.title    || 'Central de Atendimento')
const pageSubtitle = computed(() => VIEW_META[route.name]?.subtitle || '')

const roleLabel = computed(() => {
  if (!auth.user) return '—'
  if (auth.isAdmin) return 'Administrador'
  if (auth.isSupervisor) return auth.departmentName ? `Supervisor · ${auth.departmentName}` : 'Supervisor'
  return auth.departmentName ? `Analista · ${auth.departmentName}` : auth.user.role || 'Analista'
})

const userAvatar = computed(() => {
  if (auth.user?.avatar_url) return auth.user.avatar_url
  const name     = auth.user?.name || 'U'
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  const colors   = auth.isAdmin ? ['#1f62d0', '#174ea6'] : ['#7c3aed', '#6d28d9']
  const canvas   = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, 64, 64)
  grad.addColorStop(0, colors[0]); grad.addColorStop(1, colors[1])
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64)
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Inter, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(initials, 32, 32)
  return canvas.toDataURL()
})

async function doLogout() {
  isUserMenuOpen.value = false
  socket.disconnect()
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  position: relative;
  z-index: 40;
}

.topbar-hamburger {
  display: none;
  background: none;
  border: none;
  font-size: 17px;
  color: #475569;
  cursor: pointer;
  padding: 6px 10px 6px 0;
  margin-right: 8px;
}

.topbar-left {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.topbar-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.topbar-user-dropdown {
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  user-select: none;
}

.temp-admin-badge {
  position: absolute;
  top: -6px;
  left: -6px;
  background: #f59e0b;
  color: #ffffff;
  border-radius: 20px;
  font-size: 8.5px;
  font-weight: 700;
  padding: 1.5px 6px;
  white-space: nowrap;
  z-index: 1;
}

.dropdown-arrow {
  font-size: 9.5px;
  color: #94a3b8;
  transition: transform 0.15s ease;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.user-popup-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 240px;
  background: #ffffff;
  border-radius: 9px;
  box-shadow: 0 10px 30px rgba(16, 24, 40, 0.1);
  border: 1px solid #e3e6ea;
  padding: 12px;
  z-index: 1000;
  cursor: default;
}

.user-popup-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #edf0f3;
  margin-bottom: 8px;
}

.popup-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.popup-user-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.popup-name {
  font-weight: 650;
  color: #172033;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.popup-role {
  font-size: 11px;
  color: #667085;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.popup-menu-links {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.popup-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #334155;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.popup-menu-item:hover {
  background: #f1f3f6;
  color: #172033;
}

.popup-menu-item i {
  font-size: 13.5px;
  color: #64748b;
  width: 16px;
  text-align: center;
}

.popup-footer {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #edf0f3;
}

.popup-logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #d92d20;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.popup-logout-btn:hover {
  background: #fef2f2;
}

@media (max-width: 768px) {
  .topbar-hamburger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
