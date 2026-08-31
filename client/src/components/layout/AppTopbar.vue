<template>
  <header class="topbar">
    <!-- Hambúrguer (visível apenas em mobile via CSS) -->
    <button
      class="topbar-hamburger"
      style="display:none;"
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
      <div class="topbar-user-dropdown" ref="userMenuRef" @click="toggleUserMenu" style="position:relative; cursor:pointer; display:flex; align-items:center;">
        <span
          v-if="auth.isTemporary"
          title="Admin temporário — crie seu perfil definitivo"
          style="position:absolute;top:-6px;left:-6px;background:#f59e0b;color:#fff;border-radius:20px;font-size:9px;font-weight:700;padding:2px 7px;white-space:nowrap;z-index:1;"
        >TEMPORÁRIO</span>
        <img :src="userAvatar" :alt="auth.user?.name" class="topbar-user-avatar" id="topbarUserAvatar" />
        <span class="topbar-user-name" id="topbarUserName" style="margin-left: 12px; font-weight: 500; color: #1e293b; font-size: 15px;">{{ auth.user?.name || 'Carregando...' }}</span>
        <i class="fa-solid fa-chevron-down" style="font-size:10px;color:#94a3b8;margin-left:8px;"></i>

        <!-- Popup Menu -->
        <div v-if="isUserMenuOpen" class="user-popup-menu" @click.stop>
          <div class="user-popup-header">
            <img :src="userAvatar" :alt="auth.user?.name" class="popup-avatar" />
            <div class="popup-user-meta">
              <div class="popup-name">{{ auth.user?.name || 'Carregando...' }} <i class="fa-solid fa-chevron-right" style="font-size:10px;color:#94a3b8;margin-left:4px;"></i></div>
              <div class="popup-role">{{ roleLabel }}</div>
            </div>
          </div>

          <div class="popup-grid">
            <button v-if="auth.isAdmin" class="popup-grid-btn" @click="() => { isUserMenuOpen = false; router.push('/usuarios') }">
              <div class="popup-grid-icon"><i class="fa-solid fa-user-group"></i></div>
              <span>Usuários</span>
            </button>
            <button class="popup-grid-btn" @click="() => { isUserMenuOpen = false; router.push('/configuracoes') }">
              <div class="popup-grid-icon"><i class="fa-solid fa-robot"></i></div>
              <span>Config. IA</span>
            </button>
          </div>

          <button class="popup-theme-btn" @click="toggleTheme">
            <div style="display:flex; align-items:center; gap:8px;">
              <i class="fa-regular fa-moon" style="font-size:14px;"></i>
              <span>Aparência: &nbsp;<b>{{ isDarkTheme ? 'Escuro' : 'Claro' }}</b></span>
            </div>
            <i class="fa-solid fa-lightbulb" style="font-size:18px; color:#64748b;"></i>
          </button>

          <button class="popup-logout-btn" @click="doLogout">
            <i class="fa-solid fa-right-from-bracket"></i>
            <span>Sair</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore }    from '@/stores/auth.store'
import { useUiStore }      from '@/stores/ui.store'
import { useSidebarStore } from '@/stores/sidebar.store'
import { useSocket }       from '@/composables/useSocket'

const auth    = useAuthStore()
const ui      = useUiStore()
const sidebar = useSidebarStore()
const router  = useRouter()
const route   = useRoute()
const socket  = useSocket()

const isOnline = ref(true)
const isUserMenuOpen = ref(false)
const userMenuRef = ref(null)
const isDarkTheme = ref(false)

function toggleUserMenu() {
  isUserMenuOpen.value = !isUserMenuOpen.value
}

function toggleTheme() {
  isDarkTheme.value = !isDarkTheme.value
}

function closeUserMenu(e) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target)) {
    isUserMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeUserMenu)
})
onUnmounted(() => {
  document.removeEventListener('click', closeUserMenu)
})

// Metadados das rotas para title/subtitle
const VIEW_META = {
  dashboard:         { title: 'Dashboard',               subtitle: 'Visão geral dos atendimentos' },
  atendimentos:      { title: 'Atendimentos',            subtitle: '' },
  historico:         { title: 'Conversas',                subtitle: 'Consulte e acompanhe conversas anteriores.' },
  clientes:          { title: 'Contatos',                subtitle: 'Cadastre clientes e identifique funcionários da empresa.' },
  mensagens_rapidas: { title: 'Mensagens rápidas',       subtitle: 'Crie e gerencie mensagens prontas.' },
  desempenho:        { title: 'Desempenho',              subtitle: 'Indicadores mensais dos atendentes e departamentos.' },
  configuracoes:     { title: 'Configurações',           subtitle: 'Gerencie as configurações gerais da plataforma.' }
}

const pageTitle    = computed(() => VIEW_META[route.name]?.title    || 'Central de Atendimento')
const pageSubtitle = computed(() => VIEW_META[route.name]?.subtitle || '')

const roleLabel = computed(() => {
  if (!auth.user) return '—'
  if (auth.isAdmin) return 'Administrador'
  return auth.departmentName ? `Analista · ${auth.departmentName}` : auth.user.role || 'Analista'
})

const userAvatar = computed(() => {
  if (auth.user?.avatar_url) return auth.user.avatar_url
  // Gera avatar com iniciais via canvas
  const name     = auth.user?.name || 'U'
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  const colors   = auth.isAdmin ? ['#2563eb', '#1d4ed8'] : ['#7c3aed', '#6d28d9']
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

function toggleStatus() {
  isOnline.value = !isOnline.value
  ui.showToast(`Status alterado para: ${isOnline.value ? 'Online' : 'Ausente'}`)
}

async function doLogout() {
  socket.disconnect()
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.topbar-right {
  display: flex;
  align-items: center;
}
.user-popup-menu {
  position: absolute;
  top: calc(100% + 16px);
  right: 0;
  width: 280px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  padding: 20px;
  z-index: 100;
  cursor: default;
}
.user-popup-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}
.popup-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
}
.popup-user-meta {
  display: flex;
  flex-direction: column;
}
.popup-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.popup-role {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
}
.popup-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}
.popup-grid-btn {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
}
.popup-grid-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}
.popup-grid-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #475569;
}
.popup-theme-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s;
  color: #475569;
  font-size: 14px;
  margin-bottom: 20px;
}
.popup-theme-btn:hover {
  background: #f8fafc;
}
.popup-logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #ef4444;
  font-size: 15px;
  font-weight: 600;
  padding: 8px 0 0 0;
  transition: color 0.2s;
}
.popup-logout-btn:hover {
  color: #dc2626;
}
</style>
