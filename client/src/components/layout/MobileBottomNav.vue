<template>
  <nav v-if="!ui.isMobileChatOpen" class="mobile-bottom-nav" aria-label="Navegação inferior mobile">
    <div class="mobile-nav-container">
      <RouterLink
        v-for="tab in visibleTabs"
        :key="tab.id"
        :to="tab.path"
        class="mobile-nav-tab"
        :class="{ active: isTabActive(tab) }"
      >
        <div class="nav-tab-icon-box">
          <i :class="tab.icon"></i>
          <span v-if="tab.badge > 0" class="nav-tab-badge">
            {{ tab.badge > 99 ? '99+' : tab.badge }}
          </span>
        </div>
        <span class="nav-tab-label">{{ tab.label }}</span>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useTicketStore } from '@/stores/tickets.store'
import { useUiStore } from '@/stores/ui.store'

const auth = useAuthStore()
const tickets = useTicketStore()
const ui = useUiStore()
const route = useRoute()

const waitingCount = computed(() => tickets.waitingTickets?.length || 0)

function isTabActive(tab) {
  if (tab.id === 'dashboard') {
    return route.name === 'dashboard' || route.path === '/dashboard'
  }
  return route.path.startsWith(tab.path)
}

const visibleTabs = computed(() => {
  const tabs = []

  // 1. Aba à Esquerda: Conversas
  tabs.push({
    id: 'conversas',
    label: 'Conversas',
    path: '/historico',
    icon: 'ri-chat-3-line'
  })

  // 2. Aba Central: Atendimentos (Sem destaque visual exclusivo, padrão uniforme)
  tabs.push({
    id: 'atendimentos',
    label: 'Atendimentos',
    path: '/atendimentos',
    icon: 'ri-customer-service-2-line',
    badge: waitingCount.value
  })

  // 3. Aba à Direita:
  // - Administrador: Dashboard
  // - Supervisor: Desempenho
  // - Analista: Sem 3ª aba
  if (auth.isAdmin) {
    tabs.push({
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'ri-pie-chart-2-line'
    })
  } else if (auth.isSupervisor) {
    tabs.push({
      id: 'desempenho',
      label: 'Desempenho',
      path: '/desempenho',
      icon: 'ri-line-chart-line'
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
    height: calc(56px + env(safe-area-inset-bottom, 0px));
    padding-bottom: max(3px, env(safe-area-inset-bottom, 3px));
    padding-top: 3px;
    padding-left: max(16px, env(safe-area-inset-left, 16px));
    padding-right: max(16px, env(safe-area-inset-right, 16px));
    background: #ffffff;
    border-top: 1px solid #eef2f6;
    box-shadow: 0 -2px 10px rgba(15, 23, 42, 0.04);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2400;
    box-sizing: border-box;
    user-select: none;
  }

  .mobile-nav-container {
    width: 100%;
    max-width: 440px;
    display: flex;
    align-items: center;
    justify-content: space-around;
    height: 100%;
  }

  .mobile-nav-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    height: 100%;
    min-width: 0;
    text-decoration: none;
    color: #64748b;
    position: relative;
    padding: 2px 0;
    transition: color 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .nav-tab-icon-box {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 28px;
    border-radius: 14px;
    background: transparent;
    transition: all 0.18s ease;
  }

  .nav-tab-icon-box i {
    font-size: 21px;
    line-height: 1;
    color: inherit;
    transition: transform 0.15s ease;
  }

  .nav-tab-badge {
    position: absolute;
    top: -3px;
    right: 3px;
    background: #ef4444;
    color: #ffffff;
    font-size: 9.5px;
    font-weight: 700;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid #ffffff;
    box-shadow: 0 1px 3px rgba(239, 68, 68, 0.25);
  }

  .nav-tab-label {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 10.5px;
    font-weight: 500;
    line-height: 1.15;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    letter-spacing: -0.01em;
    transition: color 0.15s ease, font-weight 0.15s ease;
  }

  /* ─── Estado Ativo (Uniforme para todas as abas) ─── */
  .mobile-nav-tab.active {
    color: #059669;
  }

  .mobile-nav-tab.active .nav-tab-icon-box {
    background: #ecfdf5;
  }

  .mobile-nav-tab.active .nav-tab-icon-box i {
    color: #059669;
    transform: scale(1.05);
  }

  .mobile-nav-tab.active .nav-tab-label {
    font-weight: 700;
    color: #059669;
  }
}
</style>
