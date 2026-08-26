<template>
  <div id="brisoft-app">
    <!-- Shell principal: renderiza layout ou tela de login via router -->
    <RouterView v-if="ready" />
    <div v-else class="app-loading">
      <div class="app-loading-content">
        <span class="app-loading-spinner"></span>
        <span class="app-loading-text">Carregando Brisoft Desk...</span>
      </div>
    </div>

    <!-- Toast notifications globais -->
    <AppToast />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore }  from '@/stores/auth.store'
import { useSocket }     from '@/composables/useSocket'
import AppToast          from '@/components/common/AppToast.vue'

const auth   = useAuthStore()
const socket = useSocket()
const ready  = ref(false)

onMounted(async () => {
  await auth.initAuth()
  if (auth.isAuthenticated) {
    socket.connect()
  }
  ready.value = true
})
</script>

<style>
.app-loading {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  z-index: 99999;
}

.app-loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.app-loading-spinner {
  width: 44px;
  height: 44px;
  border: 3px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.app-loading-text {
  color: #64748b;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
