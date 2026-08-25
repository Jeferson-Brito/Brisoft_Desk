// ==========================================================================
// VIEW CONTROLLER - KANBAN
// ==========================================================================

function renderOnlineAgents() {
  const container = document.getElementById('onlineAgentsContainer');
  if (!container) return;
  const agents = MOCK_DATA.onlineAgents || [];
  container.innerHTML = agents.map(ag => `
    <div class="agent-mini-item">
      <img src="${ag.avatar}" class="agent-mini-avatar" alt="${ag.name}">
      <div class="agent-mini-meta"><span class="agent-mini-name">${ag.name}</span><span class="agent-mini-status">${ag.status}</span></div>
    </div>
  `).join('');
}

function renderKanbanBoard() {
  const container = document.getElementById('kanbanColumnsContainer');
  if (!container) return;
  const columns = MOCK_DATA.kanbanColumns || [];
  container.innerHTML = columns.map(col => `
    <div class="kanban-column">
      <div class="kanban-column-header" style="border-top:3px solid ${col.headerColor};">
        <div class="kanban-column-title-wrap"><span class="kanban-column-title" style="color:${col.headerColor}">${col.title}</span><span class="kanban-column-count">${col.count}</span></div>
        <i class="fa-solid fa-plus" style="font-size:11px;cursor:pointer;" onclick="showToast('Adicionar em ${col.title}')"></i>
      </div>
      <div class="kanban-cards-list">
        ${col.cards.map(c => `
          <div class="kanban-card">
            <div class="kanban-card-top"><span class="kanban-card-client"><i class="fa-brands fa-whatsapp"></i> ${c.client}</span><span class="kanban-card-time">${c.time}</span></div>
            <div class="kanban-card-subject">${c.subject}</div>
            <div class="kanban-card-footer"><span class="badge badge-comercial">${c.dept}</span></div>
          </div>
        `).join('')}
        <div class="kanban-more-btn">+ Ver mais atendimentos</div>
      </div>
    </div>
  `).join('');
}

function filterKanbanBoard() {
  renderKanbanBoard();
}
