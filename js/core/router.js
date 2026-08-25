// ==========================================================================
// CORE - SPA ROUTER & NAVIGATION
// ==========================================================================

let currentActiveView = 'dashboard';

const VIEW_METADATA = {
  dashboard: { title: 'Dashboard', subtitle: 'Visão geral dos atendimentos' },
  atendimentos: { title: 'Atendimentos', subtitle: '' },
  historico: { title: 'Histórico de atendimentos', subtitle: 'Consulte e acompanhe conversas antigas ou em andamento.' },
  clientes: { title: 'Clientes', subtitle: 'Gerencie e visualize informações dos seus clientes.' },
  contatos: { title: 'Contatos', subtitle: 'Gerencie e visualize os contatos dos seus clientes.' },
  kanban: { title: 'Kanban', subtitle: 'Visualize e gerencie os atendimentos em andamento.' },
  mensagens_rapidas: { title: 'Mensagens rápidas', subtitle: 'Crie, organize e gerencie mensagens prontas para utilizar nos atendimentos.' },
  relatorios: { title: 'Relatórios', subtitle: 'Acompanhe indicadores, desempenho e produtividade da sua operação.' },
  avaliacoes: { title: 'Avaliações', subtitle: 'Acompanhe a satisfação dos clientes e o desempenho da equipe.' },
  configuracoes: { title: 'Configurações', subtitle: 'Gerencie as configurações gerais da plataforma.' },
  ajuda: { title: 'Central de Ajuda', subtitle: 'Documentação e suporte ao usuário.' }
};

function switchView(viewName) {
  currentActiveView = viewName;
  try {
    sessionStorage.setItem('activeView', viewName);
  } catch (e) {}

  // 1. Atualiza classes ativas na Sidebar
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // 2. Atualiza Título e Subtítulo no Topbar
  const titleEl = document.getElementById('pageTitle');
  const subtitleEl = document.getElementById('pageSubtitle');

  const meta = VIEW_METADATA[viewName] || { title: 'Central de Atendimento', subtitle: '' };
  if (titleEl) titleEl.innerText = meta.title;
  
  if (subtitleEl) {
    if (meta.subtitle) {
      subtitleEl.innerText = meta.subtitle;
      subtitleEl.style.display = 'block';
    } else {
      subtitleEl.style.display = 'none';
    }
  }

  // 3. Alterna a visibilidade da seção no container principal
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active-view');
  });

  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) {
    targetView.classList.add('active-view');
  }

  // 4. Re-renderiza views dinâmicas caso necessário
  if (viewName === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
  if (viewName === 'atendimentos' && typeof renderActiveChat === 'function') renderActiveChat();
  if (viewName === 'kanban' && typeof renderKanbanBoard === 'function') renderKanbanBoard();
  if (viewName === 'relatorios' && typeof renderReports === 'function') renderReports();
  if (viewName === 'avaliacoes' && typeof renderEvaluations === 'function') renderEvaluations();
}

// Restaura última aba aberta ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  try {
    const saved = sessionStorage.getItem('activeView');
    if (saved && saved !== 'dashboard') {
      switchView(saved);
    }
  } catch (e) {}
});
