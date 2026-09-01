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
      <!-- Ações adicionais globais no header caso necessário -->
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSidebarStore } from '@/stores/sidebar.store'

const sidebar = useSidebarStore()
const route   = useRoute()

const VIEW_META = {
  dashboard:         { title: 'Dashboard',               subtitle: 'Saúde da empresa, departamentos e desempenho das equipes.' },
  atendimentos:      { title: 'Atendimentos',            subtitle: '' },
  historico:         { title: 'Conversas',                subtitle: 'Consulte e acompanhe conversas anteriores.' },
  clientes:          { title: 'Contatos',                subtitle: 'Cadastre clientes e identifique funcionários da empresa.' },
  mensagens_rapidas: { title: 'Mensagens rápidas',       subtitle: 'Crie e gerencie mensagens prontas para agilizar respostas.' },
  desempenho:        { title: 'Desempenho',              subtitle: 'Indicadores mensais dos atendentes e departamentos.' },
  configuracoes:     { title: 'Configurações',           subtitle: 'Gerencie integrações e configurações gerais da plataforma.' },
  usuarios:          { title: 'Usuários',                subtitle: 'Gerencie atendentes, supervisores e administradores.' },
  configuracao_ia:   { title: 'Configuração da IA',      subtitle: 'Configure o chatbot, automações e regras de inatividade.' },
  perfil:            { title: 'Meu perfil',              subtitle: 'Atualize seus dados pessoais e sua segurança.' }
}

const pageTitle    = computed(() => VIEW_META[route.name]?.title    || 'Central de Atendimento')
const pageSubtitle = computed(() => VIEW_META[route.name]?.subtitle || '')
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

@media (max-width: 768px) {
  .topbar-hamburger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
