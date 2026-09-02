import axios from 'axios'
import { useAuthStore } from '@/stores/auth.store'

const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

// Interceptor de request: injeta JWT em toda chamada à API
http.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})

// Interceptor de response: redireciona para login se token expirou
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const auth = useAuthStore()
      auth.clearSession()
      import('@/composables/useSocket').then(({ useSocket }) => useSocket().disconnect())
      if (window.location.pathname !== '/login') {
        const destination = `${window.location.pathname}${window.location.search}${window.location.hash}`
        window.location.assign(`/login?redirect=${encodeURIComponent(destination)}`)
      }
    }
    return Promise.reject(error)
  }
)

export default http
