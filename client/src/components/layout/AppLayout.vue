<template>
  <!-- Layout padrão para todas as rotas autenticadas -->
  <div class="app-container">
    <AppSidebar />
    <main class="main-wrapper" :class="{ 'is-inbox-view': isInboxView }">
      <AppTopbar v-if="!isInboxView" />
      <div class="views-container" :class="{ 'no-topbar': isInboxView }">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar  from '@/components/layout/AppTopbar.vue'

const route = useRoute()
const isInboxView = computed(() => route.path.startsWith('/atendimentos'))
</script>

<style scoped>
.app-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #ffffff;
}

.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-width: 0;
  overflow: hidden;
}

.main-wrapper.is-inbox-view {
  height: 100vh;
}

.views-container {
  flex: 1;
  height: calc(100vh - 58px);
  min-height: 0;
  overflow: hidden;
  display: flex;
}

.views-container.no-topbar {
  height: 100vh;
}
</style>
