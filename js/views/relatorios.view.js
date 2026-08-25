// ==========================================================================
// VIEW CONTROLLER - RELATÓRIOS
// ==========================================================================

function switchReportsTab(el) {
  document.querySelectorAll('.reports-tab-link').forEach(link => link.classList.remove('active'));
  if (el) el.classList.add('active');
  showToast(`Filtrando relatório por: ${el.innerText}`);
}

function renderReports() {
  const r = MOCK_DATA.relatorios;
  if (!r) return;

  // 1. KPI Row with dynamic Mini SVG Sparklines
  const kpiContainer = document.getElementById('reportsKpiContainer');
  if (kpiContainer) {
    const kpiList = [
      { label: "Total de atendimentos", data: r.kpis.total, icon: "fa-regular fa-comment-dots", color: "#2563eb", stroke: "#2563eb" },
      { label: "Atendimentos concluídos", data: r.kpis.concluidos, icon: "fa-regular fa-circle-check", color: "#16a34a", stroke: "#16a34a" },
      { label: "Tempo médio de resposta", data: r.kpis.tempoResposta, icon: "fa-regular fa-clock", color: "#f97316", stroke: "#f97316" },
      { label: "Tempo médio de resolução", data: r.kpis.tempoResolucao, icon: "fa-regular fa-hourglass-half", color: "#9333ea", stroke: "#9333ea" },
      { label: "SLA cumprido", data: r.kpis.sla, icon: "fa-regular fa-star", color: "#0d9488", stroke: "#0d9488" },
      { label: "Atendimentos perdidos", data: r.kpis.perdidos, icon: "fa-regular fa-face-frown", color: "#ef4444", stroke: "#ef4444" }
    ];

    kpiContainer.innerHTML = kpiList.map(k => `
      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:${k.color}15;color:${k.color};"><i class="${k.icon}"></i></div>
          <span class="kpi-compact-label">${k.label}</span>
        </div>
        <div class="kpi-compact-val">${k.data.val}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span class="kpi-compact-growth ${k.data.growth.includes('-') && k.label.includes('perdidos') ? 'neg' : ''}">
            ${k.data.growth}
          </span>
          <svg width="45" height="18" viewBox="0 0 45 18">
            <path d="M 2 14 Q 15 4, 25 10 T 43 2" fill="none" stroke="${k.stroke}" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
    `).join('');
  }

  // 2. Top Assuntos
  const topAssuntosEl = document.getElementById('reportsTopAssuntos');
  if (topAssuntosEl) {
    topAssuntosEl.innerHTML = r.topAssuntos.map(a => `
      <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #f8fafc;">
        <span><strong>${a.rank}</strong> ${a.name}</span>
        <strong>${a.count} <span style="font-weight:normal;color:#94a3b8;">(${a.percentage}%)</span></strong>
      </div>
    `).join('');
  }

  // 3. Desempenho por Departamento Table
  const deptTable = document.getElementById('reportsDeptPerformanceBody');
  if (deptTable) {
    deptTable.innerHTML = r.desempenhoDept.map(d => `
      <tr>
        <td><strong>${d.dept}</strong></td>
        <td>${d.total}</td>
        <td>${d.concluidos}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;">
            <div class="progress-track" style="width:50px;height:5px;"><div class="progress-fill" style="width:${d.sla}%;"></div></div>
            <strong>${d.sla}%</strong>
          </div>
        </td>
        <td>${d.tResp}</td>
        <td>${d.tReso}</td>
      </tr>
    `).join('') + `
      <tr style="background:#f8fafc;font-weight:700;">
        <td>Total geral</td>
        <td>1.248</td>
        <td>1.087</td>
        <td>92%</td>
        <td>02:48</td>
        <td>18:32</td>
      </tr>
    `;
  }

  // 4. Ranking de Atendentes Table
  const rankingTable = document.getElementById('reportsRankingBody');
  if (rankingTable) {
    rankingTable.innerHTML = r.rankingAtendentes.map(a => `
      <tr>
        <td><strong>${a.rank}</strong></td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;">
            <img src="${a.avatar}" style="width:20px;height:20px;border-radius:50%;" alt="${a.name}">
            <span>${a.name}</span>
          </div>
        </td>
        <td>${a.atendimentos}</td>
        <td>${a.concluidos}</td>
        <td><strong style="color:#16a34a;">${a.sla}</strong></td>
        <td>${a.tResp}</td>
        <td>${a.tReso}</td>
      </tr>
    `).join('');
  }

  // 5. Insights
  const insightsEl = document.getElementById('reportsInsightsContainer');
  if (insightsEl) {
    insightsEl.innerHTML = r.insights.map(i => `
      <div class="insights-card-item ${i.type}">
        <i class="${i.type === 'positive' ? 'fa-solid fa-arrow-trend-up' : 'fa-solid fa-arrow-trend-down'}" style="color:${i.type === 'positive' ? '#16a34a' : '#ef4444'};"></i>
        <span>${i.text}</span>
      </div>
    `).join('');
  }
}
