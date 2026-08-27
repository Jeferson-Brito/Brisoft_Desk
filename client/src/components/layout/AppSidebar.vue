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
      <RouterLink class="nav-item" to="/" exact-active-class="active" title="Dashboard">
        <i class="fa-solid fa-table-columns"></i>
        <span class="nav-label">Dashboard</span>
      </RouterLink>
      <RouterLink class="nav-item" to="/atendimentos" active-class="active" title="Atendimentos">
        <i class="fa-regular fa-comment-dots"></i>
        <span class="nav-label">Atendimentos</span>
        <span v-if="waitingCount > 0" class="nav-badge" :title="`${waitingCount} atendimento(s) aguardando`">
          {{ waitingCount > 99 ? '99+' : waitingCount }}
        </span>
      </RouterLink>
      <RouterLink class="nav-item" to="/historico" active-class="active" title="Conversas">
        <i class="fa-solid fa-clock-rotate-left"></i>
        <span class="nav-label">Conversas</span>
      </RouterLink>
      <RouterLink class="nav-item" to="/clientes" active-class="active" title="Clientes">
        <i class="fa-solid fa-user-group"></i>
        <span class="nav-label">Clientes</span>
      </RouterLink>
      <div class="nav-item nav-item-disabled" title="Kanban — em desenvolvimento" aria-disabled="true">
        <i class="fa-solid fa-border-all"></i>
        <span class="nav-label">Kanban</span>
        <span class="development-badge">Em breve</span>
      </div>
      <RouterLink class="nav-item" to="/mensagens-rapidas" active-class="active" title="Mensagens rápidas">
        <i class="fa-regular fa-comments"></i>
        <span class="nav-label">Mensagens rápidas</span>
      </RouterLink>
      <div class="nav-item nav-item-disabled" title="Relatórios — em desenvolvimento" aria-disabled="true">
        <i class="fa-solid fa-chart-simple"></i>
        <span class="nav-label">Relatórios</span>
        <span class="development-badge">Em breve</span>
      </div>
      <RouterLink class="nav-item" to="/avaliacoes" active-class="active" title="Avaliações">
        <i class="fa-regular fa-star"></i>
        <span class="nav-label">Avaliações</span>
      </RouterLink>
      <RouterLink v-if="auth.isAdmin" class="nav-item" to="/configuracoes" active-class="active" id="settingsNavUsuarios" title="Configurações">
        <i class="fa-solid fa-gear"></i>
        <span class="nav-label">Configurações</span>
      </RouterLink>
    </nav>

    <!-- Sidebar Bottom Action -->
    <div class="sidebar-bottom">
      <button class="collapse-sidebar-btn" @click="collapsed = !collapsed" title="Recolher menu lateral">
        <i class="fa-solid fa-chevron-left" :class="{ 'fa-rotate-180': collapsed }"></i>
        <span class="sidebar-footer-text">{{ collapsed ? 'Expandir' : 'Recolher menu' }}</span>
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
.nav-item {
  position: relative;
}

.nav-item-disabled {
  color: #64748b;
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-item-disabled:hover {
  background: transparent;
  color: #64748b;
}

.development-badge {
  margin-left: auto;
  padding: 2px 6px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 999px;
  color: #94a3b8;
  font-size: 8.5px;
  font-weight: 700;
  line-height: 1;
  text-transform: uppercase;
}

.sidebar.collapsed .development-badge {
  display: none;
}

.nav-badge {
  margin-left: auto;
  background: #ef4444;
  color: #fff;
  font-size: 10.5px;
  font-weight: 700;
  padding: 1.5px 6px;
  border-radius: 20px;
  min-width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

:deep(.sidebar.collapsed) .nav-badge,
.sidebar.collapsed .nav-badge {
  display: flex !important;
  position: absolute;
  top: 4px;
  right: 6px;
  margin-left: 0;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 9px;
  border-radius: 8px;
  box-shadow: 0 0 0 2px #0f172a;
  z-index: 10;
}
</style>
