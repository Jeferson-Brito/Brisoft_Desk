<template>
  <aside class="sidebar" id="mainSidebar" :class="{ collapsed }">

    <!-- Brand Logo Header -->
    <div class="sidebar-header">
      <RouterLink to="/" class="brand-logo-container" title="Brisoft Desk">
        <img :src="logoUrl" alt="Brisoft Desk" class="brand-logo-full" />
        <img :src="iconUrl" alt="Brisoft Desk" class="brand-logo-icon-only" />
      </RouterLink>
    </div>

    <!-- Navigation Links -->
    <nav class="sidebar-nav">
      <RouterLink class="nav-item" to="/" exact-active-class="active">
        <i class="fa-solid fa-table-columns"></i>
        <span>Dashboard</span>
      </RouterLink>
      <RouterLink class="nav-item" to="/atendimentos" active-class="active">
        <i class="fa-regular fa-comment-dots"></i>
        <span>Atendimentos</span>
        <span v-if="waitingCount > 0" class="nav-badge">{{ waitingCount }}</span>
      </RouterLink>
      <RouterLink class="nav-item" to="/historico" active-class="active">
        <i class="fa-solid fa-clock-rotate-left"></i>
        <span>Histórico</span>
      </RouterLink>
      <RouterLink class="nav-item" to="/clientes" active-class="active">
        <i class="fa-solid fa-user-group"></i>
        <span>Clientes</span>
      </RouterLink>
      <RouterLink class="nav-item" to="/contatos" active-class="active">
        <i class="fa-solid fa-address-book"></i>
        <span>Contatos</span>
      </RouterLink>
      <RouterLink class="nav-item" to="/kanban" active-class="active">
        <i class="fa-solid fa-border-all"></i>
        <span>Kanban</span>
      </RouterLink>
      <RouterLink class="nav-item" to="/mensagens-rapidas" active-class="active">
        <i class="fa-regular fa-comments"></i>
        <span>Mensagens rápidas</span>
      </RouterLink>
      <RouterLink class="nav-item" to="/relatorios" active-class="active">
        <i class="fa-solid fa-chart-simple"></i>
        <span>Relatórios</span>
      </RouterLink>
      <RouterLink class="nav-item" to="/avaliacoes" active-class="active">
        <i class="fa-regular fa-star"></i>
        <span>Avaliações</span>
      </RouterLink>
      <RouterLink v-if="auth.isAdmin" class="nav-item" to="/configuracoes" active-class="active" id="settingsNavUsuarios">
        <i class="fa-solid fa-gear"></i>
        <span>Configurações</span>
      </RouterLink>
    </nav>

    <!-- Sidebar Bottom Action -->
    <div class="sidebar-bottom">
      <button class="collapse-sidebar-btn" @click="collapsed = !collapsed" title="Recolher menu lateral">
        <i class="fa-solid fa-chevron-left" :class="{ 'fa-rotate-180': collapsed }"></i>
        <span class="sidebar-footer-text">Recolher menu</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore }   from '@/stores/auth.store'
import { useTicketStore } from '@/stores/tickets.store'
import logoUrl from '@/assets/img/logo.png'
import iconUrl from '@/assets/img/icon.png'

const auth    = useAuthStore()
const tickets = useTicketStore()

// Recupera o estado salvo no localStorage
const savedState = localStorage.getItem('sidebar_collapsed') === 'true'
const collapsed = ref(savedState)

// Persiste qualquer alteração no localStorage
watch(collapsed, (val) => {
  try {
    localStorage.setItem('sidebar_collapsed', String(val))
  } catch (e) {}
})

const waitingCount = computed(() => tickets.waitingTickets.length)
</script>

<style scoped>
.nav-badge {
  margin-left: auto;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 20px;
  min-width: 18px;
  text-align: center;
}
</style>
