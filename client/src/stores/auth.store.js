import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth.api'

const TOKEN_KEY = 'brifdesk_token'

export const useAuthStore = defineStore('auth', () => {
  // ─── State ──────────────────────────────────────────────────────────────────
  const token = ref(sessionStorage.getItem(TOKEN_KEY) || null)
  const user  = ref(null)
  const initialized = ref(false)

  // ─── Getters ─────────────────────────────────────────────────────────────────
  const isAuthenticated = computed(() => !!token.value)
  const isAdmin         = computed(() => user.value?.role === 'Administrador')
  const isSupervisor    = computed(() => user.value?.role === 'Supervisor')
  const canManageTeam   = computed(() => isAdmin.value || isSupervisor.value)
  const isTemporary     = computed(() => user.value?.is_temporary === true)
  const departmentId    = computed(() => user.value?.department_id ?? null)
  const departmentName  = computed(() => user.value?.department_name ?? null)

  // ─── Actions ─────────────────────────────────────────────────────────────────

  function setSession(newToken, newUser) {
    token.value = newToken
    user.value  = newUser
    sessionStorage.setItem(TOKEN_KEY, newToken)
  }

  function clearSession() {
    token.value = null
    user.value  = null
    sessionStorage.removeItem(TOKEN_KEY)
  }

  async function login(email, password) {
    const { data } = await authApi.login(email, password)
    if (data.success && data.token) {
      setSession(data.token, data.user)
      return { success: true }
    }
    return { success: false, error: data.error || 'Credenciais inválidas' }
  }

  async function logout() {
    authApi.logout().catch(() => {})
    clearSession()
  }

  // Valida sessão existente ao carregar o app
  async function initAuth() {
    if (!token.value) {
      initialized.value = true
      return false
    }
    try {
      const { data } = await authApi.me()
      if (data.success && data.user) {
        user.value = data.user
        initialized.value = true
        return true
      }
    } catch {
      // Token inválido ou servidor offline
    }
    clearSession()
    initialized.value = true
    return false
  }

  return {
    // state
    token, user, initialized,
    // getters
    isAuthenticated, isAdmin, isSupervisor, canManageTeam, isTemporary, departmentId, departmentName,
    // actions
    login, logout, initAuth, setSession, clearSession
  }
})
