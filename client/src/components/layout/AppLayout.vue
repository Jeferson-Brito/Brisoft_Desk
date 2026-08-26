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
  </div>
</template>

<script setup>
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar  from '@/components/layout/AppTopbar.vue'
</script>
