// ==========================================================================
// GRUPO COMBATE - CENTRAL DE ATENDIMENTO
// Application Bootstrap (Entry Point)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Inicialização do WebSocket Realtime
  if (typeof initRealtimeConnection === 'function') {
    initRealtimeConnection();
  }

  // Inicia polling de KPIs em tempo real
  if (typeof initKpiPolling === 'function') {
    initKpiPolling();
  }

  // Inicialização e pré-renderização dos componentes
  renderDashboard();
  renderQueueList();
  renderActiveChat();
  renderHistoryList();
  renderActiveHistory();
  // Carrega histórico real do servidor (tickets finalizados)
  if (typeof fetchHistory === 'function') fetchHistory();
  renderContactsTable();
  renderOnlineAgents();
  renderKanbanBoard();
  renderClientsTable();
  renderQuickMessages();
  renderReports();
  renderEvaluations();
}
