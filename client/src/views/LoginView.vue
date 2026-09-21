<template>
  <div class="login-split-page">
    <!-- ─── 1. Coluna da Esquerda: Painel de Branding & Marketing ─────────── -->
    <div class="login-brand-panel">
      <!-- Camadas de fundo com malha e ondas 3D sutis -->
      <div class="brand-mesh-bg"></div>
      <div class="brand-curves-bg"></div>
      <div class="brand-particles-overlay"></div>

      <div class="brand-panel-content">
        <!-- Logo Oficial BriSoft -->
        <div class="brand-header-box">
          <img :src="logoDarkUrl" alt="BriSoft Desk" class="brand-logo-img" />
        </div>

        <!-- Área Central de Conteúdo e Valor Comercial -->
        <div class="brand-hero-section">
          <!-- Pílula de Status Operacional -->
          <div class="brand-status-pill">
            <span class="status-pulse-dot"></span>
            <span class="status-pill-text">Central de Atendimento Corporativa</span>
          </div>

          <!-- Título Principal de Alto Impacto -->
          <h1 class="brand-headline">
            O WhatsApp da sua empresa.<br />
            <span class="headline-emerald">Em escala de alta performance.</span>
          </h1>

          <!-- Subtítulo Persuasivo -->
          <p class="brand-description">
            Elimine o caos das conversas, atenda múltiplos clientes no mesmo número e transforme seu WhatsApp em uma máquina de produtividade e vendas.
          </p>

          <!-- 3 Destaques Comerciais de Alto Impacto -->
          <div class="brand-features-list">
            <div class="feature-item">
              <div class="feature-icon-box">
                <i class="ri-whatsapp-line"></i>
              </div>
              <div class="feature-copy">
                <strong class="feature-title">Múltiplos analistas em 1 só WhatsApp</strong>
                <span class="feature-subtitle">Fim do celular de mão em mão. Toda a equipe atendendo no mesmo número oficial com distribuição automática.</span>
              </div>
            </div>

            <div class="feature-item">
              <div class="feature-icon-box">
                <i class="ri-tv-2-line"></i>
              </div>
              <div class="feature-copy">
                <strong class="feature-title">Gestão à vista com Painel TV ao vivo</strong>
                <span class="feature-subtitle">Supervisão total da operação em telão: fila de espera, tempo de atendimento (TMA) e alertas sonoros instantâneos.</span>
              </div>
            </div>

            <div class="feature-item">
              <div class="feature-icon-box">
                <i class="ri-flashlight-line"></i>
              </div>
              <div class="feature-copy">
                <strong class="feature-title">Triagem inteligente & Zero espera (24/7)</strong>
                <span class="feature-subtitle">Chatbot que qualifica o cliente na hora e mensagens rápidas em 1 clique para fechar negócios com agilidade máxima.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Rodapé do Painel Esquerdo -->
        <div class="brand-panel-footer">
          <span>© {{ currentYear }} BriSoft · Todos os direitos reservados</span>
        </div>
      </div>
    </div>

    <!-- ─── 2. Coluna da Direita: Formulário de Autenticação ────────────────── -->
    <div class="login-auth-panel">
      <!-- Logo Compacta visível apenas no Mobile -->
      <div class="mobile-brand-header">
        <img :src="logoLightUrl" alt="BriSoft Desk" class="mobile-logo-img" />
      </div>

      <div class="auth-form-card">
        <h2 class="auth-card-title">Bem-vindo de volta</h2>
        <p class="auth-card-subtitle">Acesse sua conta para continuar no painel de atendimento.</p>

        <!-- Formulário de Login -->
        <form class="auth-form" id="loginForm" @submit.prevent="handleSubmit">
          <!-- Campo E-mail -->
          <div class="form-field-group">
            <label class="form-field-label" for="loginEmail">E-mail</label>
            <div class="form-input-wrap">
              <span class="input-icon-box"><i class="ri-mail-line"></i></span>
              <input
                v-model="email"
                type="email"
                id="loginEmail"
                class="form-input"
                placeholder="seu@email.com.br"
                autocomplete="email"
                required
              />
            </div>
          </div>

          <!-- Campo Senha -->
          <div class="form-field-group">
            <label class="form-field-label" for="loginPassword">Senha</label>
            <div class="form-input-wrap">
              <span class="input-icon-box"><i class="ri-lock-2-line"></i></span>
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                id="loginPassword"
                class="form-input"
                placeholder="••••••••••••"
                autocomplete="current-password"
                required
              />
              <button
                type="button"
                class="pwd-toggle-btn"
                :title="showPassword ? 'Ocultar senha' : 'Exibir senha'"
                @click="showPassword = !showPassword"
                tabindex="-1"
              >
                <i :class="showPassword ? 'ri-eye-off-line' : 'ri-eye-line'"></i>
              </button>
            </div>
          </div>

          <!-- Opções: Lembrar de mim e Esqueci minha senha -->
          <div class="form-options-row">
            <label class="remember-checkbox-label">
              <input
                v-model="rememberMe"
                type="checkbox"
                class="remember-checkbox"
              />
              <span class="custom-checkbox-box">
                <i class="ri-check-line"></i>
              </span>
              <span class="remember-text">Lembrar de mim</span>
            </label>

            <button
              type="button"
              class="forgot-pwd-link"
              @click="handleForgotPassword"
            >
              Esqueci minha senha
            </button>
          </div>

          <!-- Mensagem de erro / feedback -->
          <Transition name="auth-error-slide">
            <div v-if="errorMsg" class="auth-error-banner" role="alert">
              <i class="ri-error-warning-line"></i>
              <span>{{ errorMsg }}</span>
            </div>
          </Transition>

          <!-- Botão Entrar -->
          <button
            type="submit"
            class="btn-login-submit"
            id="loginSubmitBtn"
            :disabled="loading"
            :class="{ loading }"
          >
            <span v-if="loading" class="login-spinner"></span>
            <span v-else class="login-btn-inner">
              <i class="ri-login-box-line"></i>
              <span>Entrar</span>
            </span>
          </button>
        </form>

        <!-- Rodapé do Card -->
        <div class="auth-card-footer">
          <span>Ainda não tem acesso? </span>
          <button type="button" class="support-link" @click="handleSupport">
            Fale com o suporte
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useSocket }    from '@/composables/useSocket'
import logoDarkUrl from '@/assets/img/logo_tema_escuro.png'
import logoLightUrl from '@/assets/img/logo_tema_claro.png'

const router   = useRouter()
const route    = useRoute()
const auth     = useAuthStore()
const socket   = useSocket()

const email        = ref('')
const password     = ref('')
const rememberMe   = ref(true)
const showPassword = ref(false)
const loading      = ref(false)
const errorMsg     = ref('')
const currentYear  = new Date().getFullYear()

onMounted(() => {
  try {
    const savedEmail = localStorage.getItem('brisoft_saved_email')
    if (savedEmail) {
      email.value = savedEmail
      rememberMe.value = true
    }
  } catch (_) {}
})

async function handleSubmit() {
  if (!email.value || !password.value) {
    errorMsg.value = 'Preencha seu e-mail e senha para continuar.'
    return
  }

  errorMsg.value = ''
  loading.value  = true

  try {
    const cleanEmail = email.value.trim()
    const result = await auth.login(cleanEmail, password.value)

    if (result.success) {
      // Salvar ou limpar e-mail lembrado
      try {
        if (rememberMe.value) {
          localStorage.setItem('brisoft_saved_email', cleanEmail)
        } else {
          localStorage.removeItem('brisoft_saved_email')
        }
      } catch (_) {}

      socket.connect()
      const redirect = String(route.query.redirect || '')
      const defaultDest = auth.isAdmin ? { name: 'dashboard' } : { name: 'atendimentos' }
      await router.replace(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : defaultDest)
    } else {
      errorMsg.value = result.error || 'E-mail ou senha incorretos. Tente novamente.'
    }
  } catch (err) {
    errorMsg.value = err.response?.data?.error || err.message || 'Erro de conexão. Verifique se o servidor está online.'
  } finally {
    loading.value = false
  }
}

function handleForgotPassword() {
  alert('Para redefinir sua senha, solicite ao administrador do sistema ou entre em contato com o suporte da BriSoft.')
}

function handleSupport() {
  const supportText = encodeURIComponent('Olá, preciso de suporte para acessar minha conta no BriSoft Desk.')
  window.open(`https://wa.me/?text=${supportText}`, '_blank')
}
</script>

