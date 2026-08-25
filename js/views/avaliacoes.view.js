// ==========================================================================
// VIEW CONTROLLER - AVALIAÇÕES
// ==========================================================================

function renderEvaluations() {
  const av = MOCK_DATA.avaliacoes;
  if (!av || !av.kpis) return;

  // 1. KPI Top Cards
  const kpiContainer = document.getElementById('evaluationsKpiContainer');
  if (kpiContainer) {
    kpiContainer.innerHTML = `
      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#ecfdf5;color:#16a34a;"><i class="fa-regular fa-star"></i></div>
          <span class="kpi-compact-label">Avaliação média (geral)</span>
        </div>
        <div class="kpi-compact-val" style="color:#16a34a;">${av.kpis.mediaGeral.val} <span style="font-size:12px;color:#94a3b8;">${av.kpis.mediaGeral.scale}</span></div>
        <div class="kpi-compact-growth"><i class="fa-solid fa-arrow-trend-up"></i> ${av.kpis.mediaGeral.growth}</div>
      </div>
      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#eff6ff;color:#2563eb;"><i class="fa-regular fa-comment-dots"></i></div>
          <span class="kpi-compact-label">Total de avaliações</span>
        </div>
        <div class="kpi-compact-val">${av.kpis.total.val}</div>
        <div class="kpi-compact-growth"><i class="fa-solid fa-arrow-trend-up"></i> ${av.kpis.total.growth}</div>
      </div>
      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#ecfdf5;color:#16a34a;"><i class="fa-regular fa-face-smile"></i></div>
          <span class="kpi-compact-label">Avaliações positivas (4 e 5)</span>
        </div>
        <div class="kpi-compact-val">${av.kpis.positivas.val}</div>
        <div class="kpi-compact-growth"><i class="fa-solid fa-arrow-trend-up"></i> ${av.kpis.positivas.growth}</div>
      </div>
      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#fefce8;color:#ca8a04;"><i class="fa-regular fa-face-meh"></i></div>
          <span class="kpi-compact-label">Avaliações neutras (3)</span>
        </div>
        <div class="kpi-compact-val">${av.kpis.neutras.val}</div>
        <div class="kpi-compact-growth neg"><i class="fa-solid fa-arrow-trend-down"></i> ${av.kpis.neutras.growth}</div>
      </div>
      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#fee2e2;color:#ef4444;"><i class="fa-regular fa-face-frown"></i></div>
          <span class="kpi-compact-label">Avaliações negativas (1 e 2)</span>
        </div>
        <div class="kpi-compact-val">${av.kpis.negativas.val}</div>
        <div class="kpi-compact-growth neg"><i class="fa-solid fa-arrow-trend-down"></i> ${av.kpis.negativas.growth}</div>
      </div>
    `;
  }

  // 2. Star Distribution
  const distEl = document.getElementById('evalStarDistribution');
  if (distEl) {
    distEl.innerHTML = av.distribuicao.map(d => `
      <div class="eval-star-bar-row">
        <span class="eval-star-label">${d.stars} estrelas</span>
        <div class="eval-bar-track">
          <div class="eval-bar-fill" style="width:${d.percentage}%;background:${d.color};"></div>
        </div>
        <span class="eval-star-percent">${d.percentage}% <span style="font-weight:normal;color:#94a3b8;">(${d.count})</span></span>
      </div>
    `).join('');
  }

  // 3. Dept Scores
  const deptEl = document.getElementById('evalDeptScores');
  if (deptEl) {
    deptEl.innerHTML = av.mediaDept.map(d => `
      <div style="display:flex;justify-content:space-between;">
        <span>${d.name}</span>
        <strong>${d.score} <i class="fa-solid fa-star" style="color:#16a34a;font-size:10px;"></i></strong>
      </div>
    `).join('');
  }

  // 4. Table
  renderEvaluationsTable();

  // 5. Top Atendentes
  const topAtendentesEl = document.getElementById('evalTopAtendentes');
  if (topAtendentesEl) {
    topAtendentesEl.innerHTML = av.topAtendentes.map((a, idx) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;font-size:11.5px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-weight:700;color:#94a3b8;width:12px;">${idx + 1}</span>
          <img src="${a.avatar}" style="width:20px;height:20px;border-radius:50%;" alt="${a.name}">
          <span>${a.name}</span>
        </div>
        <strong>${a.score} <i class="fa-solid fa-star" style="color:#16a34a;font-size:10px;"></i></strong>
      </div>
    `).join('');
  }

  // 6. Recent Comments
  const commentsEl = document.getElementById('evalRecentComments');
  if (commentsEl) {
    commentsEl.innerHTML = av.recentes.slice(0, 3).map(c => {
      const iconWrapClass = c.score >= 4 ? 'sentiment-icon-green' : c.score === 3 ? 'sentiment-icon-yellow' : 'sentiment-icon-red';
      const iconName = c.score >= 4 ? 'fa-regular fa-face-smile' : c.score === 3 ? 'fa-regular fa-face-meh' : 'fa-regular fa-face-frown';
      const badgeClass = c.dept === 'Financeiro' ? 'badge-financeiro' : 'badge-comercial';

      return `
        <div class="sentiment-comment-box">
          <div class="sentiment-icon-wrap ${iconWrapClass}"><i class="${iconName}"></i></div>
          <div style="flex:1;overflow:hidden;">
            <div style="font-size:11px;font-weight:600;color:#1e293b;">"${c.comment}"</div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:2px;font-size:9.5px;color:#94a3b8;">
              <span>${c.client} • ${c.date.split(' ')[0]}</span>
              <span class="badge ${badgeClass}" style="font-size:8.5px;padding:0 5px;">${c.dept}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

function renderEvaluationsTable() {
  const tbody = document.getElementById('evaluationsTableBody');
  if (!tbody) return;

  const search = (document.getElementById('evalSearchInput')?.value || '').toLowerCase();
  const dept = document.getElementById('evalFilterDept')?.value || 'todos';
  const score = document.getElementById('evalFilterScore')?.value || 'todas';

  const list = MOCK_DATA.avaliacoes.recentes.filter(item => {
    const matchSearch = item.client.toLowerCase().includes(search) || item.comment.toLowerCase().includes(search);
    const matchDept = dept === 'todos' || item.dept === dept;
    const matchScore = score === 'todas' || item.score.toString() === score;
    return matchSearch && matchDept && matchScore;
  });

  tbody.innerHTML = list.map(item => {
    const starsColor = item.score >= 4 ? '#16a34a' : item.score === 3 ? '#eab308' : '#ef4444';
    const deptClass = item.dept === 'Financeiro' ? 'badge-financeiro' : item.dept === 'Comercial' ? 'badge-comercial' : 'badge-suporte';

    return `
      <tr>
        <td>
          <div class="contact-cell">
            <div class="initial-avatar" style="background:${item.avatarColor};width:28px;height:28px;font-size:10px;">${item.initials}</div>
            <div class="contact-cell-meta">
              <span class="contact-cell-name">${item.client}</span>
              <span class="contact-cell-sub">${item.cnpj}</span>
            </div>
          </div>
        </td>
        <td>${item.subject}</td>
        <td>${item.agent}</td>
        <td><span class="badge ${deptClass}">${item.dept}</span></td>
        <td><i class="fa-solid fa-star" style="color:${starsColor};"></i></td>
        <td><span style="font-size:11px;color:#334155;">"${item.comment}"</span></td>
        <td>${item.date}</td>
        <td>
          <button class="btn-icon" onclick="showToast('Ver detalhes da avaliação')"><i class="fa-regular fa-eye" style="font-size:11px;"></i></button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterEvaluationsTable() {
  renderEvaluationsTable();
}
