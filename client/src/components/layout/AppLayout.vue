<template>
  <!-- Layout padrão para todas as rotas autenticadas -->
  <div class="app-container">
    <AppSidebar />
    <main class="main-wrapper">
      <AppTopbar />
      <div class="views-container">
        <RouterView />
      </div>
    </main>
    <ToolsSidebar />
  </div>
</template>

<script setup>
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar  from '@/components/layout/AppTopbar.vue'
import ToolsSidebar from '@/components/layout/ToolsSidebar.vue'
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

.views-container {
  flex: 1;
  height: calc(100vh - 48px);
  min-height: 0;
  overflow: hidden;
  display: flex;
  position: relative;
  z-index: 1;
}
</style>
