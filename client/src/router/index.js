import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore }   from '@/stores/ui.store'
import AppLayout from '@/components/layout/AppLayout.vue'

/**
 * Wrapper de import dinâmico com retry automático e recuperação inteligente de falhas de chunk.
 * Evita que falhas transitórias de rede ou atualizações de build travem a navegação e obriguem F5.
 */
function lazyWithRetry(componentImport, retriesLeft = 2, interval = 350) {
  return () =>
    new Promise((resolve, reject) => {
      componentImport()
        .then(resolve)
        .catch((error) => {
          const isChunkError = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|loading chunk/i.test(
            error?.message || ''
          )
          if (retriesLeft <= 0) {
            if (isChunkError && typeof window !== 'undefined') {
              const reloadKey = 'brifdesk_chunk_retry_' + (error?.message || '').slice(0, 30)
              if (!sessionStorage.getItem(reloadKey)) {
                sessionStorage.setItem(reloadKey, '1')
                window.location.reload()
                return
              }
            }
            reject(error)
            return
          }
          setTimeout(() => {
            lazyWithRetry(componentImport, retriesLeft - 1, interval)()
              .then(resolve)
              .catch(reject)
          }, interval)
        })
    })
}

// Lazy loading resiliente com retry automático
const LoginView             = lazyWithRetry(() => import('@/views/LoginView.vue'))
const DashboardView         = lazyWithRetry(() => import('@/views/DashboardView.vue'))
const AtendimentosView      = lazyWithRetry(() => import('@/views/AtendimentosView.vue'))
const HistoricoView         = lazyWithRetry(() => import('@/views/HistoricoView.vue'))
const AvaliacoesView        = lazyWithRetry(() => import('@/views/AvaliacoesView.vue'))
const ClientesView          = lazyWithRetry(() => import('@/views/ClientesView.vue'))
const MensagensRapidasView  = lazyWithRetry(() => import('@/views/MensagensRapidasView.vue'))
const ConfiguracoesView     = lazyWithRetry(() => import('@/views/ConfiguracoesView.vue'))
const PainelTvView          = lazyWithRetry(() => import('@/views/PainelTvView.vue'))
const UsuariosView          = lazyWithRetry(() => import('@/views/UsuariosView.vue'))
const PerfilView            = lazyWithRetry(() => import('@/views/PerfilView.vue'))

// Mapa de pré-carregamento direto para hover rápido
const viewLoaders = {
  '/dashboard':         () => import('@/views/DashboardView.vue'),
  '/atendimentos':      () => import('@/views/AtendimentosView.vue'),
  '/historico':         () => import('@/views/HistoricoView.vue'),
  '/desempenho':        () => import('@/views/AvaliacoesView.vue'),
  '/clientes':          () => import('@/views/ClientesView.vue'),
  '/mensagens-rapidas': () => import('@/views/MensagensRapidasView.vue'),
  '/perfil':            () => import('@/views/PerfilView.vue'),
  '/configuracoes':     () => import('@/views/ConfiguracoesView.vue'),
  '/usuarios':          () => import('@/views/UsuariosView.vue'),
  '/configuracao-ia':   () => import('@/views/ConfiguracoesView.vue'),
  '/painel-tv':         () => import('@/views/PainelTvView.vue')
}

/**
 * Dispara prefetch sob demanda no hover de qualquer link de menu
 */
export function prefetchRoute(path) {
  const normalized = String(path || '').split('?')[0]
  const loader = viewLoaders[normalized]
  if (loader) {
    try { loader().catch(() => {}) } catch (_) {}
  }
}

/**
 * Pré-carrega todas as rotas principais em background logo após o app iniciar (em momento ocioso do browser)
 */
export function prefetchCoreViews() {
  if (typeof window === 'undefined') return
  const trigger = () => {
    Object.values(viewLoaders).forEach((loader) => {
      try { loader().catch(() => {}) } catch (_) {}
    })
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(trigger, { timeout: 3000 })
  } else {
    setTimeout(trigger, 1200)
  }
}

const routes = [
  // Rota pública
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
  { path: '/painel-tv', name: 'painel_tv', component: PainelTvView, meta: { requiresAuth: true } },

  // Rotas autenticadas — envolvidas pelo AppLayout (Sidebar + Topbar)
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardView,
        meta: { requiresAdmin: true }
      },
      {
        path: '',
        redirect: () => {
          const auth = useAuthStore()
          return auth.isAdmin ? '/dashboard' : '/atendimentos'
        }
      },
      { path: 'atendimentos',      name: 'atendimentos',      component: AtendimentosView      },
      { path: 'historico',         name: 'historico',         component: HistoricoView         },
      { path: 'desempenho',        name: 'desempenho',        component: AvaliacoesView        },
      { path: 'avaliacoes',        redirect: { name: 'desempenho' } },
      { path: 'clientes',          name: 'clientes',          component: ClientesView          },
      { path: 'mensagens-rapidas', name: 'mensagens_rapidas', component: MensagensRapidasView  },
      { path: 'perfil',            name: 'perfil',            component: PerfilView            },
      {
        path: 'configuracoes',
        name: 'configuracoes',
        component: ConfiguracoesView,
        meta: { requiresManager: true }
      },
      {
        path: 'usuarios',
        name: 'usuarios',
        component: UsuariosView,
        meta: { requiresAdmin: true }
      },
      {
        path: 'configuracao-ia',
        name: 'configuracao_ia',
        component: ConfiguracoesView,
        props: { initialTab: 'bot', standalone: true },
        meta: { requiresAdmin: true }
      }
    ]
  },

  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard — proteção de rotas por autenticação e papel
router.beforeEach(async (to) => {
  const ui = useUiStore()
  ui.setNavigating(true)

  const auth = useAuthStore()

  // Aguarda inicialização do auth na primeira navegação (deduplicado)
  if (!auth.initialized) {
    await auth.initAuth()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'atendimentos' }
  }

  if (to.meta.requiresManager && !auth.canManageTeam) {
    return { name: 'atendimentos' }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    const redirect = String(to.query.redirect || '')
    const defaultRoute = auth.isAdmin ? { name: 'dashboard' } : { name: 'atendimentos' }
    return redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : defaultRoute
  }
})

router.afterEach(() => {
  const ui = useUiStore()
  ui.setNavigating(false)
})

// Tratamento global de erros de navegação (como falhas de chunk do Vite)
router.onError((error, to) => {
  const ui = useUiStore()
  ui.setNavigating(false)

  const isChunkError = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|loading chunk/i.test(
    error?.message || ''
  )
  if (isChunkError && to?.fullPath && typeof window !== 'undefined') {
    // Redireciona diretamente para a rota pretendida, permitindo que o navegador carregue o novo asset
    window.location.assign(to.fullPath)
  }
})

export default router
