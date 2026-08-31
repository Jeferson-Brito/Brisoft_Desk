<template>
  <aside
    class="sidebar"
    id="mainSidebar"
    :class="{ 'mobile-open': mobileOpen }"
  >
    <!-- Brand Logo Header -->
    <div class="sidebar-header">
      <RouterLink to="/" class="brand-logo-container" title="Brisoft Desk">
        <img :src="iconUrl" alt="Brisoft Desk" class="brand-logo-symbol" />
        <span class="brand-wordmark"><strong>Brisoft</strong><small>DESK</small></span>
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
      <RouterLink class="nav-item" to="/clientes" active-class="active" title="Contatos">
        <i class="fa-solid fa-user-group"></i>
        <span class="nav-label">Contatos</span>
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
      <RouterLink class="nav-item" to="/desempenho" active-class="active" title="Desempenho">
        <i class="fa-solid fa-chart-line"></i>
        <span class="nav-label">Desempenho</span>
      </RouterLink>
      <RouterLink class="nav-item" to="/painel-tv" active-class="active" title="Painel TV">
        <i class="fa-solid fa-tv"></i>
        <span class="nav-label">Painel TV</span>
      </RouterLink>
      <RouterLink v-if="auth.canManageTeam" class="nav-item" to="/configuracoes" active-class="active" id="settingsNavUsuarios" :title="auth.isAdmin ? 'Configurações' : 'Equipe do setor'">
        <i :class="auth.isAdmin ? 'fa-solid fa-gear' : 'fa-solid fa-users-gear'"></i>
        <span class="nav-label">{{ auth.isAdmin ? 'Configurações' : 'Equipe' }}</span>
      </RouterLink>
    </nav>
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
import { computed, watch } from 'vue'
import { useRoute }          from 'vue-router'
import { useAuthStore }      from '@/stores/auth.store'
import { useTicketStore }    from '@/stores/tickets.store'
import { useSidebarStore }   from '@/stores/sidebar.store'
import iconUrl from '@/assets/img/icon.png'

const auth    = useAuthStore()
const tickets = useTicketStore()
const route   = useRoute()
const sidebar = useSidebarStore()

const mobileOpen = computed(() => sidebar.mobileOpen)
function closeMobile() { sidebar.close() }

watch(() => route.path, () => { sidebar.close() })

const waitingCount = computed(() => tickets.waitingTickets.length)
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
  z-index: 50;
  box-sizing: border-box;
}

.brand-logo-container {
  display: flex;
  align-items: center;
  text-decoration: none;
}

.brand-logo-symbol {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  object-fit: contain;
}

.brand-wordmark {
  display: none;
  flex-direction: column;
  margin-left: 10px;
  line-height: 1;
}

.brand-wordmark strong {
  font-size: 16px;
  letter-spacing: -0.02em;
  color: #172033;
}

.brand-wordmark small {
  margin-top: 3px;
  color: var(--brand-primary);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.2em;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  box-sizing: border-box;
}

.nav-item {
  text-decoration: none;
  box-sizing: border-box;
}

.nav-item-disabled {
  cursor: not-allowed;
}

.development-badge {
  display: none;
}

.sidebar-overlay {
  display: none;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -260px;
    top: 0;
    bottom: 0;
    transition: left 0.25s ease;
    z-index: 1000;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
  }

  .sidebar.mobile-open {
    left: 0;
  }

  .brand-wordmark {
    display: flex;
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.4);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;
    z-index: 999;
  }

  .sidebar-overlay.visible {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
