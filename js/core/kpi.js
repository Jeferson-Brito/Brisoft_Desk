// ==========================================================================
// CORE - KPI POLLING (dados reais do Supabase via backend)
// ==========================================================================

const KPI_POLL_INTERVAL = 30000; // 30 segundos
let _kpiPollTimer = null;

async function fetchAndUpdateKpis() {
  try {
    const res = await fetch('http://localhost:3000/api/dashboard/kpis');
    const data = await res.json();
    if (!data.success || !data.kpis) return;
    const k = data.kpis;

    // Atualiza os elementos da topbar
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('kpiAtendimentosHoje', k.atendimentosHoje);
    set('kpiTma', k.tma);
    set('kpiTme', k.tme);
    set('kpiSla', '--');   // Calculado futuramente
    set('kpiEmAtendimento', k.emAtendimento);

    // Média de avaliacao com estrela
    const avgEl = document.getElementById('kpiMediaAvaliacao');
    if (avgEl) {
      avgEl.textContent = k.mediaAvaliacao !== '--'
        ? `${k.mediaAvaliacao} ★ (${k.totalAvaliacoes})`
        : '--';
    }
  } catch (e) {
    // Silencioso: servidor pode estar reiniciando
  }
}

function initKpiPolling() {
  fetchAndUpdateKpis(); // Carrega imediatamente
  if (_kpiPollTimer) clearInterval(_kpiPollTimer);
  _kpiPollTimer = setInterval(fetchAndUpdateKpis, KPI_POLL_INTERVAL);
}

// Reage ao evento do servidor quando tickets sao atualizados
// (chamado internamente pelo api.js apos receber 'kpis_updated' via socket)
function onKpisUpdated() {
  fetchAndUpdateKpis();
}
