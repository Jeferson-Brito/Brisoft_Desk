<template>
  <nav v-if="!ui.isMobileChatOpen" class="mobile-bottom-nav" aria-label="Navegação inferior mobile">
    <div class="mobile-nav-container">
      <template v-for="tab in visibleTabs" :key="tab.id">
        <!-- Aba Central com Destaque: Atendimentos -->
        <RouterLink
          v-if="tab.isProminent"
          :to="tab.path"
          class="mobile-nav-tab prominent-tab"
          active-class="active"
        >
          <div class="prominent-icon-box">
            <i :class="tab.icon"></i>
            <span v-if="tab.badge > 0" class="prominent-badge">
              {{ tab.badge > 99 ? '99+' : tab.badge }}
            </span>
          </div>
          <span class="nav-tab-label">{{ tab.label }}</span>
        </RouterLink>

        <!-- Abas Convencionais (Conversas, Dashboard, Desempenho) -->
        <RouterLink
          v-else
          :to="tab.path"
          class="mobile-nav-tab standard-tab"
          active-class="active"
        >
          <div class="standard-icon-box">
            <i :class="tab.icon"></i>
            <span v-if="tab.badge > 0" class="standard-badge">
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

  // 1. Aba à Esquerda: Conversas
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
    icon: 'ri-customer-service-2-line',
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
    height: calc(58px + env(safe-area-inset-bottom, 0px));
    padding-bottom: max(4px, env(safe-area-inset-bottom, 4px));
    padding-top: 4px;
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
    padding: 3px 0;
    transition: color 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }

  /* ─── Abas Padrão (Conversas, Dashboard, Desempenho) ─── */
  .standard-icon-box {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 28px;
    border-radius: 14px;
    transition: all 0.16s ease;
  }

  .standard-icon-box i {
    font-size: 21px;
    line-height: 1;
    color: inherit;
    transition: transform 0.15s ease;
  }

  .standard-badge {
    position: absolute;
    top: -2px;
    right: 2px;
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
    border: 1.5px solid #ffffff;
  }

  /* Estado Ativo das Abas Padrão */
  .standard-tab.active {
    color: #059669;
  }

  .standard-tab.active .standard-icon-box {
    background: #ecfdf5;
  }

  .standard-tab.active .standard-icon-box i {
    color: #059669;
    transform: scale(1.05);
  }

  .standard-tab.active .nav-tab-label {
    font-weight: 700;
    color: #059669;
  }

  /* ─── Aba Central com Destaque: Atendimentos ─── */
  .prominent-icon-box {
    position: relative;
    width: 42px;
    height: 30px;
    border-radius: 15px;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    color: #059669;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.18s ease;
  }

  .prominent-icon-box i {
    font-size: 20px;
    line-height: 1;
  }

  .prominent-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: #ef4444;
    color: #ffffff;
    font-size: 9.5px;
    font-weight: 700;
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid #ffffff;
    box-shadow: 0 1px 3px rgba(239, 68, 68, 0.35);
  }

  .prominent-tab .nav-tab-label {
    color: #059669;
    font-weight: 600;
  }

  /* Quando Atendimentos está ativa: botão fica sólido verde com ícone branco */
  .prominent-tab.active .prominent-icon-box {
    background: #059669;
    border-color: #059669;
    color: #ffffff;
    box-shadow: 0 3px 8px rgba(5, 150, 105, 0.28);
  }

  .prominent-tab.active .prominent-icon-box i {
    color: #ffffff;
    transform: scale(1.04);
  }

  .prominent-tab.active .nav-tab-label {
    font-weight: 700;
    color: #047857;
  }

  /* ─── Tipografia dos Rótulos (Alinhados na mesma linha de base) ─── */
  .nav-tab-label {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 10.5px;
    font-weight: 500;
    line-height: 1.15;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    letter-spacing: -0.01em;
  }
}
</style>
