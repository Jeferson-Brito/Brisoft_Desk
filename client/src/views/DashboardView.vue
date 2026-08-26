<template>
  <div class="content-dashboard-grid">
    <!-- Toolbar de Filtros do Dashboard -->
    <div class="filter-toolbar" style="background:transparent;border:none;padding:0;">
      <div class="filter-input-group">
        <i class="fa-regular fa-calendar"></i>
        <input type="text" value="12/05/2024 - 18/05/2024" style="width:140px;" />
        <i class="fa-solid fa-chevron-down" style="font-size:9px;"></i>
      </div>

      <div class="filter-input-group">
        <select v-model="selectedDept">
          <option value="todos">Todos os departamentos</option>
          <option v-for="d in settingsStore.departments" :key="d.id" :value="d.name">
            {{ d.name }}
          </option>
        </select>
      </div>

      <button class="btn-secondary" @click="ui.showToast('Filtros do Dashboard aplicados')">
        <i class="fa-solid fa-sliders"></i> Filtros
      </button>

      <button class="btn-secondary" style="margin-left:auto;" @click="loadDashboard(true)">
        <i class="fa-solid fa-rotate-right" :class="{ 'fa-spin': loading }"></i> Atualizar
      </button>
    </div>

    <!-- 6 KPI Top Cards -->
    <div class="kpi-row-6" id="dashKpiContainer">
      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#eff6ff;color:#2563eb;"><i class="fa-regular fa-comment-dots"></i></div>
          <span class="kpi-compact-label">Atendimentos totais</span>
        </div>
        <div class="kpi-compact-val">{{ kpis.total?.val || '0' }}</div>
        <div class="kpi-compact-growth"><i class="fa-solid fa-arrow-trend-up"></i> {{ kpis.total?.growth || '0%' }} <span class="kpi-compact-vs">{{ kpis.total?.vs || 'vs semana anterior' }}</span></div>
      </div>

      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#ecfdf5;color:#10b981;"><i class="fa-regular fa-circle-check"></i></div>
          <span class="kpi-compact-label">Concluídos</span>
        </div>
        <div class="kpi-compact-val">{{ kpis.concluidos?.val || '0' }}</div>
        <div class="kpi-compact-growth"><i class="fa-solid fa-arrow-trend-up"></i> {{ kpis.concluidos?.growth || '0%' }} <span class="kpi-compact-vs">{{ kpis.concluidos?.vs || 'vs semana anterior' }}</span></div>
      </div>

      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#fff7ed;color:#f97316;"><i class="fa-regular fa-clock"></i></div>
          <span class="kpi-compact-label">Em atendimento</span>
        </div>
        <div class="kpi-compact-val">{{ kpis.em_atendimento?.val || '0' }}</div>
        <div class="kpi-compact-growth"><i class="fa-solid fa-arrow-trend-up"></i> {{ kpis.em_atendimento?.growth || '0%' }} <span class="kpi-compact-vs">{{ kpis.em_atendimento?.vs || 'vs semana anterior' }}</span></div>
      </div>

      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#fee2e2;color:#ef4444;"><i class="fa-solid fa-hourglass-half"></i></div>
          <span class="kpi-compact-label">Aguardando</span>
        </div>
        <div class="kpi-compact-val">{{ kpis.aguardando?.val || '0' }}</div>
        <div class="kpi-compact-growth neg"><i class="fa-solid fa-arrow-trend-up"></i> {{ kpis.aguardando?.growth || '0%' }} <span class="kpi-compact-vs">{{ kpis.aguardando?.vs || 'vs semana anterior' }}</span></div>
      </div>

      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#ecfdf5;color:#10b981;"><i class="fa-solid fa-shield-halved"></i></div>
          <span class="kpi-compact-label">SLA cumprido</span>
        </div>
        <div class="kpi-compact-val">{{ kpis.sla?.val || '100%' }}</div>
        <div class="kpi-compact-growth"><i class="fa-solid fa-arrow-trend-up"></i> {{ kpis.sla?.growth || '0%' }} <span class="kpi-compact-vs">{{ kpis.sla?.vs || 'vs semana anterior' }}</span></div>
      </div>

      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#eff6ff;color:#2563eb;"><i class="fa-regular fa-clock"></i></div>
          <span class="kpi-compact-label">Tempo médio de resposta</span>
        </div>
        <div class="kpi-compact-val">{{ kpis.tempo_resposta?.val || '00:00' }}</div>
        <div class="kpi-compact-growth"><i class="fa-solid fa-arrow-trend-down"></i> {{ kpis.tempo_resposta?.growth || '00:00' }} <span class="kpi-compact-vs">{{ kpis.tempo_resposta?.vs || 'vs semana anterior' }}</span></div>
      </div>
    </div>

    <!-- Middle Row: 3 Columns -->
    <div class="dash-middle-grid">
      <!-- Col 1: Atendimentos por dia -->
      <div class="card-box">
        <div class="card-box-header">
          <span class="card-box-title">Atendimentos por dia <i class="fa-solid fa-circle-info info-icon" title="Volume diário"></i></span>
          <select style="border:none;background:#f8fafc;padding:3px 8px;border-radius:4px;font-size:11px;color:#64748b;outline:none;">
            <option>Total de atendimentos</option>
          </select>
        </div>
        <div style="position:relative;height:180px;width:100%;margin-top:10px;">
          <svg viewBox="0 0 400 160" style="width:100%;height:100%;overflow:visible;">
            <line x1="30" y1="10" x2="390" y2="10" stroke="#f1f5f9" stroke-width="1"/>
            <line x1="30" y1="45" x2="390" y2="45" stroke="#f1f5f9" stroke-width="1"/>
            <line x1="30" y1="80" x2="390" y2="80" stroke="#f1f5f9" stroke-width="1"/>
            <line x1="30" y1="115" x2="390" y2="115" stroke="#f1f5f9" stroke-width="1"/>
            <line x1="30" y1="150" x2="390" y2="150" stroke="#e2e8f0" stroke-width="1"/>
            <text x="5" y="14" font-size="9" fill="#94a3b8">400</text>
            <text x="5" y="49" font-size="9" fill="#94a3b8">300</text>
            <text x="5" y="84" font-size="9" fill="#94a3b8">200</text>
            <text x="5" y="119" font-size="9" fill="#94a3b8">100</text>
            <text x="15" y="154" font-size="9" fill="#94a3b8">0</text>
            <defs>
              <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0"/>
              </linearGradient>
            </defs>
            <path d="M 45 100 C 70 80, 85 55, 105 55 C 125 55, 140 75, 160 75 C 180 75, 195 30, 215 30 C 235 30, 250 72, 270 72 C 290 72, 305 45, 325 45 C 345 45, 360 30, 380 30 L 380 150 L 45 150 Z" fill="url(#blueGradient)"/>
            <path d="M 45 100 C 70 80, 85 55, 105 55 C 125 55, 140 75, 160 75 C 180 75, 195 30, 215 30 C 235 30, 250 72, 270 72 C 290 72, 305 45, 325 45 C 345 45, 360 30, 380 30" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
            <circle cx="45" cy="100" r="4" fill="#2563eb" stroke="#fff" stroke-width="2"/>
            <circle cx="105" cy="55" r="4" fill="#2563eb" stroke="#fff" stroke-width="2"/>
            <circle cx="160" cy="75" r="4" fill="#2563eb" stroke="#fff" stroke-width="2"/>
            <circle cx="215" cy="30" r="4" fill="#2563eb" stroke="#fff" stroke-width="2"/>
            <circle cx="270" cy="72" r="4" fill="#2563eb" stroke="#fff" stroke-width="2"/>
            <circle cx="325" cy="45" r="4" fill="#2563eb" stroke="#fff" stroke-width="2"/>
            <circle cx="380" cy="30" r="4" fill="#2563eb" stroke="#fff" stroke-width="2"/>
            <text x="35" y="168" font-size="9" fill="#94a3b8">12/05</text>
            <text x="95" y="168" font-size="9" fill="#94a3b8">13/05</text>
            <text x="150" y="168" font-size="9" fill="#94a3b8">14/05</text>
            <text x="205" y="168" font-size="9" fill="#94a3b8">15/05</text>
            <text x="260" y="168" font-size="9" fill="#94a3b8">16/05</text>
            <text x="315" y="168" font-size="9" fill="#94a3b8">17/05</text>
            <text x="370" y="168" font-size="9" fill="#94a3b8">18/05</text>
          </svg>
        </div>
      </div>

      <!-- Col 2: Atendimentos por departamento -->
      <div class="card-box">
        <div class="card-box-header">
          <span class="card-box-title">Atendimentos por departamento <i class="fa-solid fa-circle-info info-icon"></i></span>
        </div>
        <div style="display:flex;align-items:center;gap:14px;flex:1;">
          <div style="position:relative;width:120px;height:120px;flex-shrink:0;">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="45" fill="none" stroke="#2563eb" stroke-width="18" stroke-dasharray="98 282" stroke-dashoffset="0"/>
              <circle cx="60" cy="60" r="45" fill="none" stroke="#0d9488" stroke-width="18" stroke-dasharray="70 282" stroke-dashoffset="-98"/>
              <circle cx="60" cy="60" r="45" fill="none" stroke="#166534" stroke-width="18" stroke-dasharray="56 282" stroke-dashoffset="-168"/>
              <circle cx="60" cy="60" r="45" fill="none" stroke="#f97316" stroke-width="18" stroke-dasharray="34 282" stroke-dashoffset="-224"/>
              <circle cx="60" cy="60" r="45" fill="none" stroke="#dc2626" stroke-width="18" stroke-dasharray="24 282" stroke-dashoffset="-258"/>
            </svg>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;font-size:11px;flex:1;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="display:flex;align-items:center;gap:5px;"><span class="dot-green" style="background:#2563eb;width:7px;height:7px;"></span> Financeiro</span>
              <strong>35% <span style="font-weight:normal;color:#94a3b8;">(437)</span></strong>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="display:flex;align-items:center;gap:5px;"><span class="dot-green" style="background:#0d9488;width:7px;height:7px;"></span> Operacional</span>
              <strong>25% <span style="font-weight:normal;color:#94a3b8;">(312)</span></strong>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="display:flex;align-items:center;gap:5px;"><span class="dot-green" style="background:#166534;width:7px;height:7px;"></span> Comercial</span>
              <strong>20% <span style="font-weight:normal;color:#94a3b8;">(249)</span></strong>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="display:flex;align-items:center;gap:5px;"><span class="dot-green" style="background:#f97316;width:7px;height:7px;"></span> Suporte</span>
              <strong>12% <span style="font-weight:normal;color:#94a3b8;">(149)</span></strong>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="display:flex;align-items:center;gap:5px;"><span class="dot-green" style="background:#dc2626;width:7px;height:7px;"></span> RH</span>
              <strong>8% <span style="font-weight:normal;color:#94a3b8;">(101)</span></strong>
            </div>
          </div>
        </div>
        <div style="margin-top:10px;padding-top:8px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;font-size:11.5px;">
          <span style="color:#64748b;">Total</span>
          <strong style="font-size:13px;">1.248</strong>
        </div>
      </div>

      <!-- Col 3: Atividade em tempo real -->
      <div class="card-box">
        <div class="card-box-header">
          <span class="card-box-title">Atividade em tempo real</span>
          <span class="badge badge-ativo" style="font-size:10px;padding:2px 7px;">
            <span class="pulse-dot" style="margin-right:3px;"></span> Ao vivo
          </span>
        </div>
        <div class="live-activity-list" id="dashLiveActivityList">
          <div v-for="(item, idx) in liveActivity" :key="idx" class="live-activity-item">
            <div class="live-activity-icon-box" :style="{ background: `${item.color}15`, color: item.color }">
              <i :class="item.icon"></i>
            </div>
            <div class="live-activity-content">
              <span class="live-activity-title">{{ item.title }}</span>
              <span class="live-activity-sub">{{ item.sub }}</span>
            </div>
            <span class="live-activity-time">{{ item.time }}</span>
          </div>
        </div>
        <a href="#" class="details-link" style="margin-top:auto;padding-top:6px;text-align:center;" @click.prevent="ui.showToast('Carregando mais logs ao vivo...')">
          Ver mais atividades
        </a>
      </div>
    </div>

    <!-- Lower Row: 3 Columns -->
    <div class="dash-lower-grid">
      <!-- Widget 1: SLA por departamento -->
      <div class="card-box">
        <div class="card-box-header">
          <span class="card-box-title">SLA por departamento <i class="fa-solid fa-circle-info info-icon"></i></span>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:4px;" id="dashSlaDeptList">
          <div v-for="(s, idx) in slaPorDept" :key="idx" class="subject-progress-item" style="margin-bottom:4px;">
            <div class="subject-progress-header">
              <span>{{ s.name }}</span>
              <div style="display:flex;gap:16px;">
                <strong :style="{ color: s.color }">{{ s.sla }}%</strong>
                <span style="color:#94a3b8;">{{ s.target }}%</span>
              </div>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: `${s.sla}%`, background: s.color }"></div>
            </div>
          </div>
        </div>
        <RouterLink to="/relatorios" class="details-link" style="margin-top:auto;padding-top:8px;text-align:center;">
          Ver relatório completo
        </RouterLink>
      </div>

      <!-- Widget 2: Tempo médio de atendimento -->
      <div class="card-box">
        <div class="card-box-header">
          <span class="card-box-title">Tempo médio de atendimento <i class="fa-solid fa-circle-info info-icon"></i></span>
          <select style="border:none;background:#f8fafc;padding:3px 8px;border-radius:4px;font-size:11px;color:#64748b;outline:none;">
            <option>Média geral</option>
          </select>
        </div>
        <div style="display:flex;align-items:baseline;gap:8px;">
          <span style="font-size:22px;font-weight:800;color:var(--text-main);">15:42</span>
          <span style="font-size:10.5px;color:#16a34a;font-weight:600;"><i class="fa-solid fa-arrow-trend-down"></i> 2:15 vs semana anterior</span>
        </div>
        <div style="position:relative;height:120px;width:100%;margin-top:10px;">
          <svg viewBox="0 0 360 100" style="width:100%;height:100%;">
            <line x1="20" y1="20" x2="350" y2="20" stroke="#f1f5f9"/>
            <line x1="20" y1="50" x2="350" y2="50" stroke="#f1f5f9"/>
            <line x1="20" y1="80" x2="350" y2="80" stroke="#f1f5f9"/>
            <path d="M 30 50 C 60 45, 90 65, 120 65 C 150 65, 170 45, 200 45 C 230 45, 250 60, 280 60 C 310 60, 330 50, 350 55" fill="none" stroke="#9333ea" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="30" cy="50" r="3.5" fill="#9333ea"/>
            <circle cx="120" cy="65" r="3.5" fill="#9333ea"/>
            <circle cx="200" cy="45" r="3.5" fill="#9333ea"/>
            <circle cx="280" cy="60" r="3.5" fill="#9333ea"/>
            <circle cx="350" cy="55" r="3.5" fill="#9333ea"/>
            <text x="25" y="98" font-size="8" fill="#94a3b8">12/05</text>
            <text x="78" y="98" font-size="8" fill="#94a3b8">13/05</text>
            <text x="135" y="98" font-size="8" fill="#94a3b8">14/05</text>
            <text x="190" y="98" font-size="8" fill="#94a3b8">15/05</text>
            <text x="245" y="98" font-size="8" fill="#94a3b8">16/05</text>
            <text x="295" y="98" font-size="8" fill="#94a3b8">17/05</text>
            <text x="340" y="98" font-size="8" fill="#94a3b8">18/05</text>
          </svg>
        </div>
      </div>

      <!-- Widget 3: Ranking de atendentes -->
      <div class="card-box">
        <div class="card-box-header">
          <span class="card-box-title">Ranking de atendentes</span>
          <select style="border:none;background:#f8fafc;padding:3px 8px;border-radius:4px;font-size:11px;color:#64748b;outline:none;">
            <option>Concluídos</option>
          </select>
        </div>
        <div class="ranking-list" id="dashRankingList">
          <div v-for="(r, idx) in rankingAtendentes" :key="idx" class="ranking-item">
            <span class="ranking-pos">{{ r.rank }}</span>
            <img :src="r.avatar" class="ranking-avatar" :alt="r.name" />
            <span class="ranking-name">{{ r.name }}</span>
            <span class="ranking-count">{{ r.count }}</span>
            <span class="ranking-growth"><i class="fa-solid fa-arrow-trend-up"></i> {{ r.growth }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUiStore } from '@/stores/ui.store'
import { useSettingsStore } from '@/stores/settings.store'
import { ticketsApi } from '@/api/tickets.api'

const ui = useUiStore()
const settingsStore = useSettingsStore()

const loading = ref(false)
const selectedDept = ref('todos')

const kpis = ref({
  total: { val: "0", growth: "0%", vs: "vs semana anterior" },
  concluidos: { val: "0", growth: "0%", vs: "vs semana anterior" },
  em_atendimento: { val: "0", growth: "0%", vs: "vs semana anterior" },
  aguardando: { val: "0", growth: "0%", vs: "vs semana anterior" },
  sla: { val: "100%", growth: "0%", vs: "vs semana anterior" },
  tempo_resposta: { val: "00:00", growth: "00:00", vs: "vs semana anterior" }
})

const liveActivity = ref([])

const slaPorDept = ref([])

const rankingAtendentes = ref([])

async function loadDashboard(showToastFeedback = false) {
  loading.value = true
  try {
    const { data } = await ticketsApi.kpis()
    if (data.success && data.kpis) {
      if (data.kpis.kpis) kpis.value = data.kpis.kpis
      if (data.kpis.liveActivity) liveActivity.value = data.kpis.liveActivity
      if (data.kpis.slaPorDept) slaPorDept.value = data.kpis.slaPorDept
      if (data.kpis.rankingAtendentes) rankingAtendentes.value = data.kpis.rankingAtendentes
    }
    if (showToastFeedback) ui.showToast('Dashboard atualizado com sucesso!')
  } catch (e) {
    console.error('Erro ao buscar dados do dashboard:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  settingsStore.fetchDepartments()
  loadDashboard()
})
</script>
