import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import AppLayout from '@/components/layout/AppLayout.vue'

// Lazy loading — cada view só carrega quando o usuário navega até ela
const LoginView             = () => import('@/views/LoginView.vue')
const DashboardView         = () => import('@/views/DashboardView.vue')
const AtendimentosView      = () => import('@/views/AtendimentosView.vue')
const HistoricoView         = () => import('@/views/HistoricoView.vue')
const KanbanView            = () => import('@/views/KanbanView.vue')
const RelatoriosView        = () => import('@/views/RelatoriosView.vue')
const AvaliacoesView        = () => import('@/views/AvaliacoesView.vue')
const ClientesView          = () => import('@/views/ClientesView.vue')
const ContatosView          = () => import('@/views/ContatosView.vue')
const MensagensRapidasView  = () => import('@/views/MensagensRapidasView.vue')
const ConfiguracoesView     = () => import('@/views/ConfiguracoesView.vue')

const routes = [
  // Rota pública
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },

  // Rotas autenticadas — envolvidas pelo AppLayout (Sidebar + Topbar)
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '',                  name: 'dashboard',         component: DashboardView        },
      { path: 'atendimentos',      name: 'atendimentos',      component: AtendimentosView      },
      { path: 'historico',         name: 'historico',         component: HistoricoView         },
      { path: 'kanban',            name: 'kanban',            component: KanbanView            },
      { path: 'relatorios',        name: 'relatorios',        component: RelatoriosView        },
      { path: 'avaliacoes',        name: 'avaliacoes',        component: AvaliacoesView        },
      { path: 'clientes',          name: 'clientes',          component: ClientesView          },
      { path: 'contatos',          name: 'contatos',          component: ContatosView          },
      { path: 'mensagens-rapidas', name: 'mensagens_rapidas', component: MensagensRapidasView  },
      {
        path: 'configuracoes',
        name: 'configuracoes',
        component: ConfiguracoesView,
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
  const auth = useAuthStore()

  // Aguarda inicialização do auth na primeira navegação
  if (!auth.initialized) {
    await auth.initAuth()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'dashboard' }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

export default router

