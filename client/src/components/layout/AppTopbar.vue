<template>
  <header class="topbar">
    <div class="topbar-left">
      <h1 class="page-title" id="pageTitle">{{ pageTitle }}</h1>
      <p v-if="pageSubtitle" class="page-subtitle" id="pageSubtitle">{{ pageSubtitle }}</p>
    </div>

    <div class="topbar-right">
      <!-- Status Pill (Online / Ausente) -->
      <div class="status-badge-toggle" @click="toggleStatus">
        <span class="dot-green" id="headerStatusDot" :style="{ backgroundColor: isOnline ? '#22c55e' : '#f59e0b' }"></span>
        <span id="headerStatusText">{{ isOnline ? 'Online' : 'Ausente' }}</span>
        <i class="fa-solid fa-chevron-down" style="font-size:10px;color:#94a3b8;"></i>
      </div>

      <!-- Topbar User Profile -->
      <div class="topbar-user" style="position:relative;">
        <span
          v-if="auth.isTemporary"
          title="Admin temporário — crie seu perfil definitivo"
          style="position:absolute;top:-6px;left:-6px;background:#f59e0b;color:#fff;border-radius:20px;font-size:9px;font-weight:700;padding:2px 7px;white-space:nowrap;"
        >TEMPORÁRIO</span>
        <img :src="userAvatar" :alt="auth.user?.name" class="topbar-user-avatar" id="topbarUserAvatar" />
        <div class="topbar-user-meta">
          <span class="topbar-user-name" id="topbarUserName">{{ auth.user?.name || 'Carregando...' }}</span>
          <span class="topbar-user-role" id="topbarUserRole">{{ roleLabel }}</span>
        </div>
      </div>

      <!-- Logout Button -->
      <button id="topbarLogoutBtn" class="btn-icon" title="Sair do sistema" @click="doLogout"
        style="color:#ef4444;border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:7px 10px;margin-left:4px;">
        <i class="fa-solid fa-right-from-bracket"></i>
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore }  from '@/stores/auth.store'
import { useUiStore }    from '@/stores/ui.store'
import { useSocket }     from '@/composables/useSocket'

const auth   = useAuthStore()
const ui     = useUiStore()
const router = useRouter()
const route  = useRoute()
const socket = useSocket()

const isOnline = ref(true)

// Metadados das rotas para title/subtitle
const VIEW_META = {
  dashboard:         { title: 'Dashboard',               subtitle: 'Visão geral dos atendimentos' },
  atendimentos:      { title: 'Atendimentos',            subtitle: '' },
  historico:         { title: 'Histórico de atendimentos', subtitle: 'Consulte e acompanhe conversas antigas.' },
  clientes:          { title: 'Clientes',                subtitle: 'Gerencie e visualize informações dos seus clientes.' },
  contatos:          { title: 'Contatos',                subtitle: 'Gerencie e visualize os contatos.' },
  kanban:            { title: 'Kanban',                  subtitle: 'Visualize e gerencie os atendimentos em andamento.' },
  mensagens_rapidas: { title: 'Mensagens rápidas',       subtitle: 'Crie e gerencie mensagens prontas.' },
  relatorios:        { title: 'Relatórios',              subtitle: 'Indicadores, desempenho e produtividade.' },
  avaliacoes:        { title: 'Avaliações',              subtitle: 'Satisfação dos clientes e desempenho da equipe.' },
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
