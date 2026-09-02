<template>
  <div id="loginScreen">
    <div class="login-bg"></div>
    <div class="login-orb login-orb-1"></div>
    <div class="login-orb login-orb-2"></div>
    <div class="login-orb login-orb-3"></div>

    <div class="login-container">
      <div class="login-card">

        <!-- Logo -->
        <div class="login-logo-wrap">
          <img :src="logoUrl" alt="Grupo Combate" class="login-logo" @error="e => e.target.style.display='none'" />
          <div class="login-brand-tag">
            <span class="login-brand-dot"></span>
            Central de Atendimento
            <span class="login-brand-dot"></span>
          </div>
        </div>

        <h1 class="login-title">Bem-vindo de volta</h1>
        <p class="login-subtitle">Acesse sua conta para continuar</p>

        <!-- Formulário -->
        <form class="login-form" id="loginForm" @submit.prevent="handleSubmit">

          <!-- Campo E-mail -->
          <div class="login-field-group">
            <label class="login-field-label" for="loginEmail">E-mail</label>
            <div class="login-field-wrap">
              <i class="fa-solid fa-envelope login-field-icon"></i>
              <input
                v-model="email"
                type="email"
                id="loginEmail"
                class="login-field-input"
                placeholder="seu@email.com.br"
                autocomplete="email"
                required
              />
            </div>
          </div>

          <!-- Campo Senha -->
          <div class="login-field-group">
            <label class="login-field-label" for="loginPassword">Senha</label>
            <div class="login-field-wrap">
              <i class="fa-solid fa-lock login-field-icon"></i>
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                id="loginPassword"
                class="login-field-input"
                placeholder="••••••••"
                autocomplete="current-password"
                required
              />
              <button type="button" class="login-pwd-toggle" @click="showPassword = !showPassword" tabindex="-1">
                <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
              </button>
            </div>
          </div>

          <!-- Mensagem de erro -->
          <Transition name="fade">
            <div v-if="errorMsg" class="login-error visible">
              <i class="fa-solid fa-circle-exclamation"></i>
              <span>{{ errorMsg }}</span>
            </div>
          </Transition>

          <!-- Botão de login -->
          <button type="submit" class="login-btn" id="loginSubmitBtn" :disabled="loading" :class="{ loading }">
            <div class="login-btn-spinner"></div>
            <span class="login-btn-text">
              <i class="fa-solid fa-arrow-right-to-bracket"></i>
              Entrar
            </span>
          </button>

        </form>

        <div class="login-footer">
          Central de Atendimento &mdash; Grupo Combate
        </div>
      </div>

      <div class="login-page-footer">
        © 2024 Grupo Combate · Todos os direitos reservados
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useSocket }    from '@/composables/useSocket'
import logoUrl from '@/assets/img/logo.png'

const router   = useRouter()
const route    = useRoute()
const auth     = useAuthStore()
const socket   = useSocket()

const email        = ref('')
const password     = ref('')
const showPassword = ref(false)
const loading      = ref(false)
const errorMsg     = ref('')

async function handleSubmit() {
  if (!email.value || !password.value) {
    errorMsg.value = 'Preencha seu e-mail e senha para continuar.'
    return
  }

  errorMsg.value = ''
  loading.value  = true

  try {
    const result = await auth.login(email.value.trim(), password.value)
    if (result.success) {
      socket.connect()
      const redirect = String(route.query.redirect || '')
      await router.replace(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : { name: 'dashboard' })
    } else {
      errorMsg.value = result.error || 'Credenciais inválidas. Tente novamente.'
    }
  } catch {
    errorMsg.value = 'Erro de conexão. Verifique se o servidor está online.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
