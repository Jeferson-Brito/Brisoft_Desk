// ==========================================================================
// VIEW CONTROLLER - DASHBOARD
// ==========================================================================

window.onKpisUpdated = () => {
  if (document.getElementById('tabDashboard').classList.contains('active')) {
    renderDashboard();
  }
};

async function renderDashboard() {
  try {
    const res = await fetch(`${API_CONFIG.baseUrl}/api/dashboard/kpis`);
    const data = await res.json();
    if (data.success && data.kpis) {
      MOCK_DATA.dashboard = data.kpis;
    }
  } catch (e) {
    console.error('Erro ao buscar dados do dashboard:', e);
  }

  const d = MOCK_DATA.dashboard;
  if (!d) return;

  // 1. KPI Top Cards
  const kpiContainer = document.getElementById('dashKpiContainer');
  if (kpiContainer) {
    kpiContainer.innerHTML = `
      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#eff6ff;color:#2563eb;"><i class="fa-regular fa-comment-dots"></i></div>
          <span class="kpi-compact-label">Atendimentos totais</span>
        </div>
        <div class="kpi-compact-val">${d.kpis.total.val}</div>
        <div class="kpi-compact-growth"><i class="fa-solid fa-arrow-trend-up"></i> ${d.kpis.total.growth} <span class="kpi-compact-vs">${d.kpis.total.vs}</span></div>
      </div>
      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#ecfdf5;color:#10b981;"><i class="fa-regular fa-circle-check"></i></div>
          <span class="kpi-compact-label">Concluídos</span>
        </div>
        <div class="kpi-compact-val">${d.kpis.concluidos.val}</div>
        <div class="kpi-compact-growth"><i class="fa-solid fa-arrow-trend-up"></i> ${d.kpis.concluidos.growth} <span class="kpi-compact-vs">${d.kpis.concluidos.vs}</span></div>
      </div>
      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#fff7ed;color:#f97316;"><i class="fa-regular fa-clock"></i></div>
          <span class="kpi-compact-label">Em atendimento</span>
        </div>
        <div class="kpi-compact-val">${d.kpis.em_atendimento.val}</div>
        <div class="kpi-compact-growth"><i class="fa-solid fa-arrow-trend-up"></i> ${d.kpis.em_atendimento.growth} <span class="kpi-compact-vs">${d.kpis.em_atendimento.vs}</span></div>
      </div>
      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#fee2e2;color:#ef4444;"><i class="fa-solid fa-hourglass-half"></i></div>
          <span class="kpi-compact-label">Aguardando</span>
        </div>
        <div class="kpi-compact-val">${d.kpis.aguardando.val}</div>
        <div class="kpi-compact-growth neg"><i class="fa-solid fa-arrow-trend-up"></i> ${d.kpis.aguardando.growth} <span class="kpi-compact-vs">${d.kpis.aguardando.vs}</span></div>
      </div>
      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#ecfdf5;color:#10b981;"><i class="fa-solid fa-shield-halved"></i></div>
          <span class="kpi-compact-label">SLA cumprido</span>
        </div>
        <div class="kpi-compact-val">${d.kpis.sla.val}</div>
        <div class="kpi-compact-growth"><i class="fa-solid fa-arrow-trend-up"></i> ${d.kpis.sla.growth} <span class="kpi-compact-vs">${d.kpis.sla.vs}</span></div>
      </div>
      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#eff6ff;color:#2563eb;"><i class="fa-regular fa-clock"></i></div>
          <span class="kpi-compact-label">Tempo médio de resposta</span>
        </div>
        <div class="kpi-compact-val">${d.kpis.tempo_resposta.val}</div>
        <div class="kpi-compact-growth"><i class="fa-solid fa-arrow-trend-down"></i> ${d.kpis.tempo_resposta.growth} <span class="kpi-compact-vs">${d.kpis.tempo_resposta.vs}</span></div>
      </div>
    `;
  }

  // 2. Live Activity List
  const liveList = document.getElementById('dashLiveActivityList');
  if (liveList) {
    liveList.innerHTML = d.liveActivity.map(item => `
      <div class="live-activity-item">
        <div class="live-activity-icon-box" style="background:${item.color}15;color:${item.color};">
          <i class="${item.icon}"></i>
        </div>
        <div class="live-activity-content">
          <span class="live-activity-title">${item.title}</span>
          <span class="live-activity-sub">${item.sub}</span>
        </div>
        <span class="live-activity-time">${item.time}</span>
      </div>
    `).join('');
  }

  // 3. SLA por Departamento
  const slaList = document.getElementById('dashSlaDeptList');
  if (slaList) {
    slaList.innerHTML = d.slaPorDept.map(s => `
      <div class="subject-progress-item" style="margin-bottom:4px;">
        <div class="subject-progress-header">
          <span>${s.name}</span>
          <div style="display:flex;gap:16px;">
            <strong style="color:${s.color};">${s.sla}%</strong>
            <span style="color:#94a3b8;">${s.target}%</span>
          </div>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${s.sla}%;background:${s.color};"></div>
        </div>
      </div>
    `).join('');
  }

  // 4. Ranking de Atendentes
  const rankingList = document.getElementById('dashRankingList');
  if (rankingList) {
    rankingList.innerHTML = d.rankingAtendentes.map(r => `
      <div class="ranking-item">
        <span class="ranking-pos">${r.rank}</span>
        <img src="${r.avatar}" class="ranking-avatar" alt="${r.name}">
        <span class="ranking-name">${r.name}</span>
        <span class="ranking-count">${r.count}</span>
        <span class="ranking-growth"><i class="fa-solid fa-arrow-trend-up"></i> ${r.growth}</span>
      </div>
    `).join('');
  }
}
