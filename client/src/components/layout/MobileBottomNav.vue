<template>
  <nav v-if="!ui.isMobileChatOpen" class="mobile-bottom-nav" aria-label="Navegação inferior mobile">
    <div class="mobile-nav-container">
      <template v-for="tab in visibleTabs" :key="tab.id">
        <!-- Aba Central Destacada: Atendimentos -->
        <RouterLink
          v-if="tab.isProminent"
          :to="tab.path"
          class="mobile-nav-tab prominent-tab"
          active-class="active"
        >
          <div class="prominent-action-btn">
            <i :class="tab.icon"></i>
            <span v-if="tab.badge > 0" class="prominent-badge">
              {{ tab.badge > 99 ? '99+' : tab.badge }}
            </span>
          </div>
          <span class="nav-tab-label">{{ tab.label }}</span>
        </RouterLink>

        <!-- Abas Padrão (Conversas, Dashboard, Desempenho) -->
        <RouterLink
          v-else
          :to="tab.path"
          class="mobile-nav-tab standard-tab"
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
      </template>
    </div>
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

const waitingCount = computed(() => tickets.waitingTickets?.length || 0)

const visibleTabs = computed(() => {
  const tabs = []

  // 1. Aba à Esquerda: Conversas (Histórico)
  tabs.push({
    id: 'conversas',
    label: 'Conversas',
    path: '/historico',
    icon: 'ri-chat-3-line',
    isProminent: false
  })

  // 2. Aba Central: Atendimentos (Destacada no Meio)
  tabs.push({
    id: 'atendimentos',
    label: 'Atendimentos',
    path: '/atendimentos',
    icon: 'ri-inbox-archive-line',
    badge: waitingCount.value,
    isProminent: true
  })

  // 3. Aba à Direita:
  // - Administrador: Dashboard (desempenho removido conforme solicitado)
  // - Supervisor: Desempenho (dashboard não aparece para supervisor)
  // - Analista: Sem 3ª aba
  if (auth.isAdmin) {
    tabs.push({
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'ri-pie-chart-2-line',
      isProminent: false
    })
  } else if (auth.isSupervisor) {
    tabs.push({
      id: 'desempenho',
      label: 'Desempenho',
      path: '/desempenho',
      icon: 'ri-line-chart-line',
      isProminent: false
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
    padding-bottom: max(4px, env(safe-area-inset-bottom, 4px));
    padding-top: 2px;
    padding-left: max(16px, env(safe-area-inset-left, 16px));
    padding-right: max(16px, env(safe-area-inset-right, 16px));
    background: #ffffff;
    border-top: 1px solid #e2e8f0;
    box-shadow: 0 -2px 14px rgba(15, 23, 42, 0.07);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2400;
    box-sizing: border-box;
    user-select: none;
  }

  .mobile-nav-container {
    width: 100%;
    max-width: 480px;
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
    gap: 2px;
    height: 100%;
    min-width: 0;
    text-decoration: none;
    color: #64748b;
    position: relative;
    padding: 2px;
    transition: all 0.16s ease;
    -webkit-tap-highlight-color: transparent;
  }

  /* ─── Abas Padrão ─── */
  .standard-tab .nav-tab-icon-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 24px;
  }

  .standard-tab .nav-tab-icon-wrap i {
    font-size: 21px;
    line-height: 1;
    transition: transform 0.16s ease;
  }

  .nav-tab-label {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 10.5px;
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
    box-shadow: 0 1px 3px rgba(239, 68, 68, 0.4);
    border: 1.5px solid #ffffff;
  }

  /* Estado Ativo das Abas Padrão */
  .standard-tab.active {
    color: #059669;
  }

  .standard-tab.active .nav-tab-icon-wrap i {
    transform: scale(1.1);
  }

  .standard-tab.active .nav-tab-label {
    font-weight: 700;
    color: #059669;
  }

  /* ─── Aba Central Destacada (Atendimentos) ─── */
  .prominent-tab {
    position: relative;
    top: -6px;
    overflow: visible;
  }

  .prominent-action-btn {
    position: relative;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(5, 150, 105, 0.38), 0 2px 4px rgba(5, 150, 105, 0.2);
    border: 2.5px solid #ffffff;
    transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.18s ease;
  }

  .prominent-action-btn i {
    font-size: 22px;
    line-height: 1;
  }

  .prominent-badge {
    position: absolute;
    top: -3px;
    right: -5px;
    background: #ef4444;
    color: #ffffff;
    font-size: 9.5px;
    font-weight: 800;
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(239, 68, 68, 0.45);
    border: 1.5px solid #ffffff;
    z-index: 2;
  }

  .prominent-tab .nav-tab-label {
    font-size: 11px;
    font-weight: 600;
    color: #059669;
    margin-top: 1px;
  }

  .prominent-tab:active .prominent-action-btn {
    transform: scale(0.94);
  }

  .prominent-tab.active .prominent-action-btn {
    box-shadow: 0 6px 16px rgba(5, 150, 105, 0.5), 0 0 0 3px rgba(16, 185, 129, 0.25);
    transform: scale(1.05);
  }

  .prominent-tab.active .nav-tab-label {
    font-weight: 700;
    color: #047857;
  }
}
</style>
