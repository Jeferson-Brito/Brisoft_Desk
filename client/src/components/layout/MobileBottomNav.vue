<template>
  <nav v-if="!ui.isMobileChatOpen" class="mobile-bottom-nav" aria-label="Navegação inferior mobile">
    <RouterLink
      v-for="tab in visibleTabs"
      :key="tab.id"
      :to="tab.path"
      class="mobile-nav-tab"
      active-class="active"
    >
      <div class="nav-tab-icon-wrap">
        <i :class="tab.icon"></i>
        <span v-if="tab.badge > 0" class="nav-tab-badge">
          {{ tab.badge > 99 ? '99+' : tab.badge }}
        </span>
      </div>
      <span class="nav-tab-label">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useTicketStore } from '@/stores/tickets.store'
import { useUiStore } from '@/stores/ui.store'

const auth = useAuthStore()
const tickets = useTicketStore()
const ui = useUiStore()

const waitingCount = computed(() => tickets.waitingTickets.length)

const visibleTabs = computed(() => {
  const tabs = [
    {
      id: 'atendimentos',
      label: 'Atendimentos',
      path: '/atendimentos',
      icon: 'ri-inbox-archive-line',
      badge: waitingCount.value
    },
    {
      id: 'conversas',
      label: 'Conversas',
      path: '/historico',
      icon: 'ri-chat-3-line'
    },
    {
      id: 'contatos',
      label: 'Contatos',
      path: '/clientes',
      icon: 'ri-contacts-book-line'
    },
    {
      id: 'mensagens-rapidas',
      label: 'Mensagens',
      path: '/mensagens-rapidas',
      icon: 'ri-flashlight-line'
    }
  ]

  // Supervisor e Administrador têm a aba Desempenho
  if (auth.isAdmin || auth.isSupervisor) {
    tabs.push({
      id: 'desempenho',
      label: 'Desempenho',
      path: '/desempenho',
      icon: 'ri-line-chart-line'
    })
  }

  // Apenas Administrador tem a aba Dashboard (supervisor NÃO deve ver)
  if (auth.isAdmin) {
    tabs.push({
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'ri-pie-chart-2-line'
    })
  }

  return tabs
})
</script>

<style scoped>
.mobile-bottom-nav {
  display: none;
}

@media (max-width: 768px) {
  .mobile-bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(54px + env(safe-area-inset-bottom, 0px));
    padding-bottom: max(4px, env(safe-area-inset-bottom, 4px));
    padding-top: 4px;
    padding-left: max(4px, env(safe-area-inset-left, 4px));
    padding-right: max(4px, env(safe-area-inset-right, 4px));
    background: #ffffff;
    border-top: 1px solid #e2e8f0;
    box-shadow: 0 -2px 10px rgba(15, 23, 42, 0.05);
    display: flex;
    align-items: center;
    justify-content: space-around;
    z-index: 2400;
    box-sizing: border-box;
    user-select: none;
  }

  .mobile-nav-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    height: 100%;
    min-width: 0;
    text-decoration: none;
    color: #64748b;
    position: relative;
    padding: 2px 2px;
    transition: color 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .nav-tab-icon-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 24px;
  }

  .nav-tab-icon-wrap i {
    font-size: 20px;
    line-height: 1;
    transition: transform 0.15s ease;
  }

  .nav-tab-label {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 10px;
    font-weight: 500;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .nav-tab-badge {
    position: absolute;
    top: -4px;
    right: -7px;
    background: #ef4444;
    color: #ffffff;
    font-size: 9px;
    font-weight: 700;
    min-width: 15px;
    height: 15px;
    padding: 0 3.5px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 2px rgba(239, 68, 68, 0.35);
    border: 1.5px solid #ffffff;
  }

  /* Estado Ativo (Verde Padrão Brisoft Desk) */
  .mobile-nav-tab.active {
    color: #059669;
  }

  .mobile-nav-tab.active .nav-tab-icon-wrap i {
    transform: scale(1.08);
  }

  .mobile-nav-tab.active .nav-tab-label {
    font-weight: 700;
  }
}
</style>
