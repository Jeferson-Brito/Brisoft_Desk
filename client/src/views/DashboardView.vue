<template>
  <main class="executive-dashboard">
    <section class="executive-toolbar">
      <div class="executive-heading">
        <span class="executive-eyebrow"><i class="fa-solid fa-chart-pie"></i> Visão executiva</span>
        <h2>Saúde da operação</h2>
        <p>Indicadores reais para acompanhar volume, agilidade, qualidade e capacidade da equipe.</p>
      </div>

      <div class="executive-filters">
        <label>
          <span>Período</span>
          <input v-model="filters.month" type="month" :max="currentMonth" @change="fetchDashboard" />
        </label>
        <label v-if="auth.canManageTeam">
          <span>Departamento</span>
          <select v-model="filters.departmentId" @change="fetchDashboard">
            <option value="">{{ auth.isAdmin ? 'Empresa inteira' : 'Todos sob minha gestão' }}</option>
            <option v-for="department in departmentOptions" :key="department.id" :value="department.id">
              {{ department.name }}
            </option>
          </select>
        </label>
        <button class="executive-refresh" :disabled="loading" title="Atualizar indicadores" @click="fetchDashboard(true)">
          <i class="fa-solid fa-rotate-right" :class="{ 'fa-spin': loading }"></i>
          Atualizar
        </button>
      </div>
    </section>

    <div v-if="error" class="executive-error">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <span>{{ error }}</span>
      <button @click="fetchDashboard">Tentar novamente</button>
    </div>

    <section class="health-hero" :class="`health-${health.level}`">
      <div class="health-identity">
        <span class="health-icon"><i :class="health.icon"></i></span>
        <div>
          <small>{{ scopeLabel }} · {{ selectedMonthLabel }}</small>
          <strong>{{ health.label }}</strong>
          <p>{{ health.description }}</p>
        </div>
      </div>
      <div class="health-score" :style="{ '--health-angle': `${health.score * 3.6}deg` }">
        <div><strong>{{ health.hasData ? health.score : '—' }}</strong><span>{{ health.hasData ? 'de 100' : 'sem dados' }}</span></div>
      </div>
      <div class="health-context">
        <div><span>Escopo analisado</span><strong>{{ scopeLabel }}</strong></div>
        <div><span>Última atualização</span><strong>{{ lastUpdatedLabel }}</strong></div>
        <div><span>Atualização automática</span><strong class="live-state"><i></i> Ativa</strong></div>
      </div>
    </section>

    <section class="executive-kpis" :class="{ 'is-loading': loading }">
      <article v-for="card in primaryCards" :key="card.key" class="executive-kpi">
        <div class="executive-kpi-head">
          <span class="executive-kpi-icon" :style="{ color: card.color, background: card.background }"><i :class="card.icon"></i></span>
          <span v-if="card.change != null" class="executive-change" :class="comparisonClass(card.change)">
            <i :class="comparisonIcon(card.change)"></i> {{ comparisonText(card.change, card.unit) }}
          </span>
          <span v-else class="executive-now">agora</span>
        </div>
        <strong>{{ card.value }}</strong>
        <span>{{ card.label }}</span>
        <small>{{ card.help }}</small>
      </article>
    </section>

    <section class="executive-main-grid">
      <article class="executive-panel trend-panel">
        <header class="executive-panel-head">
          <div><h3>Movimento diário</h3><p>Chats recebidos e atendimentos concluídos no período.</p></div>
          <div class="chart-legend"><span><i class="received"></i> Recebidos</span><span><i class="completed"></i> Concluídos</span></div>
        </header>
        <div v-if="hasTrendActivity" class="executive-chart">
          <div v-for="point in trend" :key="point.day" class="executive-chart-day" :title="`Dia ${point.day}: ${point.created} recebido(s), ${point.completed} concluído(s)`">
            <div class="executive-bars">
              <i class="received" :style="{ height: barHeight(point.created) }"></i>
              <i class="completed" :style="{ height: barHeight(point.completed) }"></i>
            </div>
            <span>{{ point.day }}</span>
          </div>
        </div>
        <div v-else class="executive-empty"><i class="fa-regular fa-chart-bar"></i><span>Sem movimento registrado neste período.</span></div>
      </article>

      <article class="executive-panel attention-panel">
        <header class="executive-panel-head"><div><h3>Pontos de atenção</h3><p>O que merece acompanhamento da gestão agora.</p></div><span class="attention-count">{{ insights.length }}</span></header>
        <div class="insight-list">
          <div v-for="insight in insights" :key="insight.key" class="insight-item" :class="insight.level">
            <span><i :class="insight.icon"></i></span>
            <div><strong>{{ insight.title }}</strong><p>{{ insight.text }}</p></div>
          </div>
        </div>
      </article>
    </section>

    <section class="executive-secondary-stats">
      <article><span><i class="fa-regular fa-clock"></i> TMA</span><strong>{{ metrics.tma }}</strong><small>Tempo médio do atendimento</small></article>
      <article><span><i class="fa-solid fa-bolt"></i> Produtividade</span><strong>{{ formatNumber(metrics.productivityPerDay) }}</strong><small>Conclusões por dia no período</small></article>
      <article><span><i class="fa-solid fa-calendar-check"></i> Mesmo dia</span><strong>{{ formatPercent(metrics.resolutionPercent) }}</strong><small>Resolvidos no dia em que chegaram</small></article>
      <article><span><i class="fa-regular fa-star"></i> Avaliação média</span><strong>{{ ratingLabel }}</strong><small>{{ metrics.ratingCount }} avaliação(ões) recebida(s)</small></article>
    </section>

    <section class="executive-panel management-panel">
      <header class="executive-panel-head management-head">
        <div>
          <h3>{{ filters.departmentId ? 'Desempenho da equipe' : 'Desempenho por departamento' }}</h3>
          <p>{{ filters.departmentId ? `Todos os membros de ${selectedDepartmentName} no período selecionado.` : 'Compare os setores e identifique rapidamente onde agir.' }}</p>
        </div>
        <span class="management-count">{{ filters.departmentId ? agents.length : departments.length }} {{ filters.departmentId ? 'membro(s)' : 'departamento(s)' }}</span>
      </header>

      <div class="management-table-wrap">
        <table v-if="!filters.departmentId" class="management-table">
          <thead><tr><th>Departamento</th><th>Equipe</th><th>Recebidos</th><th>Concluídos</th><th>Fila agora</th><th>TME</th><th>SLA</th><th>Avaliação</th><th></th></tr></thead>
          <tbody>
            <tr v-if="!departments.length"><td colspan="9" class="management-empty">Nenhum departamento com dados no período.</td></tr>
            <tr v-for="department in departments" :key="department.id" class="clickable-row" @click="selectDepartment(department.id)">
              <td><div class="department-cell"><i :style="{ background: department.color || '#2563eb' }"></i><div><strong>{{ department.name }}</strong><small>{{ formatNumber(department.averagePerAgent) }} conclusão(ões) por atendente</small></div></div></td>
              <td>{{ department.headcount }}</td><td>{{ department.total }}</td><td><strong>{{ department.completed }}</strong></td><td>{{ department.waiting + department.active }}</td><td>{{ shortDuration(department.tme) }}</td>
              <td><span class="status-pill" :class="slaClass(department.slaPercent)">{{ formatPercent(department.slaPercent) }}</span></td>
              <td>{{ department.ratingAverage == null ? '—' : `${department.ratingAverage} ★` }}</td><td><i class="fa-solid fa-chevron-right row-arrow"></i></td>
            </tr>
          </tbody>
        </table>

        <table v-else class="management-table">
          <thead><tr><th>#</th><th>Atendente</th><th>Concluídos</th><th>Em atendimento</th><th>TME</th><th>TMA</th><th>SLA</th><th>Avaliação</th><th>Satisfação</th></tr></thead>
          <tbody>
            <tr v-if="!agents.length"><td colspan="9" class="management-empty">Nenhum atendente encontrado neste departamento.</td></tr>
            <tr v-for="(agent, index) in agents" :key="agent.id">
              <td><span class="rank-number">{{ index + 1 }}</span></td>
              <td><div class="agent-cell"><span class="agent-avatar">{{ initials(agent.name) }}</span><div><strong>{{ normalizePersonName(agent.name) }}</strong><small>{{ agent.role }} · {{ selectedDepartmentName }}</small></div></div></td>
              <td><strong>{{ agent.completed }}</strong></td><td>{{ agent.active }}</td><td>{{ shortDuration(agent.tme) }}</td><td>{{ shortDuration(agent.tma) }}</td>
              <td><span class="status-pill" :class="slaClass(agent.slaPercent)">{{ formatPercent(agent.slaPercent) }}</span></td>
              <td>{{ agent.ratingAverage == null ? '—' : `${agent.ratingAverage} ★` }}</td><td>{{ formatPercent(agent.satisfactionPercent) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <footer class="executive-footnote">
      <i class="fa-solid fa-circle-info"></i>
      <span>Funcionários não entram nos indicadores de clientes. TME considera a entrada real na fila; TMA considera o período entre assumir e encerrar o atendimento. Comparações usam o mês anterior.</span>
    </footer>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ticketsApi } from '@/api/tickets.api'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { useSocket } from '@/composables/useSocket'
import { normalizePersonName } from '@/utils/person-display'

const auth = useAuthStore()
const ui = useUiStore()
const { getSocket } = useSocket()
const now = new Date()
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const filters = ref({ month: currentMonth, departmentId: '' })
const performance = ref(null)
const loading = ref(false)
const error = ref('')
const lastUpdated = ref(null)
let refreshTimer = null
let socketRefreshTimer = null

const emptyMetrics = { total: 0, completed: 0, active: 0, waiting: 0, tma: '00:00:00', tmaSeconds: 0, tme: '00:00:00', tmeSeconds: 0, slaPercent: 0, ratingAverage: null, ratingCount: 0, satisfactionPercent: 0, resolutionPercent: 0, productivityPerDay: 0 }
const metrics = computed(() => performance.value?.metrics || emptyMetrics)
const comparison = computed(() => performance.value?.comparison || {})
const departments = computed(() => performance.value?.departments || [])
const agents = computed(() => performance.value?.agents || [])
const trend = computed(() => performance.value?.trend || [])
const departmentOptions = computed(() => performance.value?.filters?.departments || [])
const selectedDepartment = computed(() => departmentOptions.value.find(item => String(item.id) === String(filters.value.departmentId)))
const selectedDepartmentName = computed(() => selectedDepartment.value?.name || 'Departamento')
const scopeLabel = computed(() => filters.value.departmentId ? selectedDepartmentName.value : (auth.isAdmin ? 'Empresa inteira' : auth.isSupervisor ? 'Departamentos supervisionados' : auth.userName))
const selectedMonthLabel = computed(() => monthLabel(filters.value.month))
const lastUpdatedLabel = computed(() => lastUpdated.value ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(lastUpdated.value) : 'Aguardando dados')
const ratingLabel = computed(() => metrics.value.ratingAverage == null ? 'Sem avaliações' : `${metrics.value.ratingAverage} de 5`)
const maxTrend = computed(() => Math.max(1, ...trend.value.flatMap(point => [Number(point.created) || 0, Number(point.completed) || 0])))
const hasTrendActivity = computed(() => trend.value.some(point => Number(point.created) > 0 || Number(point.completed) > 0))

const health = computed(() => {
  const m = metrics.value
  const hasData = (m.total + m.completed + m.active + m.waiting) > 0
  if (!hasData) return { hasData: false, score: 0, level: 'neutral', label: 'Sem dados no período', description: 'Ainda não há atendimentos suficientes para avaliar a saúde da operação.', icon: 'fa-regular fa-chart-bar' }
  const completion = m.total ? Math.min(100, (m.completed / m.total) * 100) : 100
  const queueScore = Math.max(0, 100 - (m.waiting * 12) - (m.active * 2))
  const components = [{ value: queueScore, weight: 15 }]
  if (m.total) components.push({ value: completion, weight: 25 })
  if (m.completed) components.push({ value: m.slaPercent, weight: 40 })
  if (m.ratingCount) components.push({ value: m.satisfactionPercent, weight: 20 })
  const weight = components.reduce((sum, component) => sum + component.weight, 0)
  const score = Math.round(components.reduce((sum, component) => sum + (component.value * component.weight), 0) / weight)
  if (score >= 85) return { hasData, score, level: 'good', label: 'Operação saudável', description: 'Os principais indicadores estão em uma faixa positiva. Continue acompanhando a fila e a qualidade.', icon: 'fa-solid fa-circle-check' }
  if (score >= 70) return { hasData, score, level: 'warning', label: 'Operação requer atenção', description: 'Há indicadores que merecem acompanhamento para evitar impacto no atendimento.', icon: 'fa-solid fa-triangle-exclamation' }
  return { hasData, score, level: 'critical', label: 'Operação em estado crítico', description: 'A gestão deve priorizar os pontos de atenção destacados abaixo.', icon: 'fa-solid fa-shield-halved' }
})

const primaryCards = computed(() => [
  { key: 'received', label: 'Chats recebidos', value: metrics.value.total, change: comparison.value.total, help: 'Novos atendimentos no mês', icon: 'fa-regular fa-comments', color: '#2563eb', background: '#eff6ff' },
  { key: 'completed', label: 'Concluídos', value: metrics.value.completed, change: comparison.value.completed, help: 'Finalizados durante o mês', icon: 'fa-solid fa-circle-check', color: '#059669', background: '#ecfdf5' },
  { key: 'queue', label: 'Fila atual', value: metrics.value.waiting, change: null, help: 'Clientes aguardando atendimento', icon: 'fa-solid fa-hourglass-half', color: '#dc2626', background: '#fef2f2' },
  { key: 'tme', label: 'Tempo médio de espera', value: shortDuration(metrics.value.tme), change: comparison.value.tme, help: 'Da entrada na fila à resposta', icon: 'fa-regular fa-clock', color: '#ea580c', background: '#fff7ed' },
  { key: 'sla', label: 'SLA cumprido', value: formatPercent(metrics.value.slaPercent), change: comparison.value.sla, unit: 'pp', help: 'Meta de resposta respeitada', icon: 'fa-solid fa-gauge-high', color: '#0891b2', background: '#ecfeff' },
  { key: 'satisfaction', label: 'Clientes satisfeitos', value: metrics.value.ratingCount ? formatPercent(metrics.value.satisfactionPercent) : '—', change: metrics.value.ratingCount ? comparison.value.satisfaction : null, unit: 'pp', help: metrics.value.ratingCount ? 'Notas 4 e 5 nas avaliações' : 'Sem avaliações no período', icon: 'fa-solid fa-face-smile', color: '#ca8a04', background: '#fefce8' }
])

const insights = computed(() => {
  const m = metrics.value
  const rows = []
  if (m.waiting > 0) rows.push({ key: 'queue', level: m.waiting >= 5 ? 'critical' : 'warning', icon: 'fa-solid fa-user-clock', title: `${m.waiting} cliente(s) aguardando`, text: m.waiting >= 5 ? 'A fila está acumulando. Avalie redistribuir a equipe.' : 'Acompanhe o tempo de espera para manter o SLA.' })
  if (m.slaPercent < 90 && m.completed > 0) rows.push({ key: 'sla', level: m.slaPercent < 75 ? 'critical' : 'warning', icon: 'fa-solid fa-gauge-high', title: `SLA em ${formatPercent(m.slaPercent)}`, text: 'A referência gerencial usada nesta tela é de pelo menos 90%.' })
  if (m.ratingCount && m.ratingAverage < 4) rows.push({ key: 'rating', level: m.ratingAverage < 3 ? 'critical' : 'warning', icon: 'fa-regular fa-star', title: `Avaliação média de ${m.ratingAverage}`, text: 'Revise as avaliações recentes para identificar causas recorrentes.' })
  if (m.active > 0) rows.push({ key: 'active', level: 'info', icon: 'fa-solid fa-headset', title: `${m.active} atendimento(s) em andamento`, text: 'Carga ativa da equipe neste momento.' })
  if (!m.ratingCount && (m.completed > 0 || m.total > 0)) rows.push({ key: 'no-rating', level: 'info', icon: 'fa-regular fa-star', title: 'Sem avaliações no período', text: 'Ainda não há respostas suficientes para medir satisfação.' })
  if (!rows.length) rows.push({ key: 'healthy', level: 'good', icon: 'fa-solid fa-check', title: 'Nenhum alerta operacional', text: 'Fila, SLA e satisfação estão dentro de uma leitura saudável.' })
  return rows.slice(0, 4)
})

function monthLabel(value) {
  if (!value) return 'Período atual'
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}
function formatNumber(value) { return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(Number(value) || 0) }
function formatPercent(value) { return `${formatNumber(value)}%` }
function shortDuration(value) {
  const parts = String(value || '00:00:00').split(':').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return '00:00'
  const [hours, minutes, seconds] = parts
  return hours > 0 ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
function comparisonClass(value) { return Number(value) > 0 ? 'positive' : Number(value) < 0 ? 'negative' : 'neutral' }
function comparisonIcon(value) { return Number(value) > 0 ? 'fa-solid fa-arrow-trend-up' : Number(value) < 0 ? 'fa-solid fa-arrow-trend-down' : 'fa-solid fa-minus' }
function comparisonText(value, unit = '%') { return `${Math.abs(Number(value) || 0).toFixed(1)}${unit}` }
function barHeight(value) { return `${Math.max(Number(value) ? 7 : 2, (Number(value) / maxTrend.value) * 100)}%` }
function initials(name = '') { return String(name).trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'AT' }
function slaClass(value) { return Number(value) >= 90 ? 'good' : Number(value) >= 75 ? 'warning' : 'critical' }
function selectDepartment(id) { if (!auth.canManageTeam) return; filters.value.departmentId = String(id); fetchDashboard() }

async function fetchDashboard(showFeedback = false) {
  loading.value = true
  error.value = ''
  try {
    const params = Object.fromEntries(Object.entries(filters.value).filter(([, value]) => value))
    const { data } = await ticketsApi.performance(params)
    if (!data.success || !data.performance) throw new Error(data.error || 'Não foi possível carregar os indicadores.')
    performance.value = data.performance
    lastUpdated.value = new Date()
    if (showFeedback) ui.showToast('Dashboard atualizado com dados reais.')
  } catch (requestError) {
    error.value = requestError.response?.data?.error || requestError.message || 'Não foi possível carregar o Dashboard.'
  } finally {
    loading.value = false
  }
}

function scheduleSocketRefresh() {
  clearTimeout(socketRefreshTimer)
  socketRefreshTimer = setTimeout(() => fetchDashboard(false), 700)
}
function bindSocket() {
  const socket = getSocket()
  if (!socket) return
  socket.on('ticket_created', scheduleSocketRefresh)
  socket.on('ticket_updated', scheduleSocketRefresh)
  socket.on('queue_updated', scheduleSocketRefresh)
  socket.on('rating_received', scheduleSocketRefresh)
  socket.on('kpis_updated', scheduleSocketRefresh)
}
function unbindSocket() {
  const socket = getSocket()
  if (!socket) return
  socket.off('ticket_created', scheduleSocketRefresh)
  socket.off('ticket_updated', scheduleSocketRefresh)
  socket.off('queue_updated', scheduleSocketRefresh)
  socket.off('rating_received', scheduleSocketRefresh)
  socket.off('kpis_updated', scheduleSocketRefresh)
}

onMounted(async () => {
  await fetchDashboard()
  bindSocket()
  refreshTimer = setInterval(() => { if (document.visibilityState === 'visible') fetchDashboard(false) }, 30000)
})
onBeforeUnmount(() => {
  unbindSocket()
  clearInterval(refreshTimer)
  clearTimeout(socketRefreshTimer)
})
</script>

<style scoped>
.executive-dashboard { width:100%;height:100%;box-sizing:border-box;overflow-y:auto;padding:18px 20px 28px;background:#f7f9fc;color:#172033;display:flex;flex-direction:column;gap:14px; }
.executive-toolbar { display:flex;align-items:flex-end;justify-content:space-between;gap:20px; }
.executive-heading h2 { margin:4px 0 3px;font-size:21px;font-weight:680;letter-spacing:-.02em; }
.executive-heading p { margin:0;color:#64748b;font-size:12px; }
.executive-eyebrow { color:#2563eb;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em; }
.executive-eyebrow i { margin-right:5px; }
.executive-filters { display:flex;align-items:flex-end;gap:8px; }
.executive-filters label { display:flex;flex-direction:column;gap:5px;color:#64748b;font-size:10px;font-weight:650; }
.executive-filters input,.executive-filters select { height:37px;min-width:155px;box-sizing:border-box;padding:0 11px;border:1px solid #dbe2ea;border-radius:9px;background:#fff;color:#263247;font-size:11.5px;outline:none; }
.executive-filters select { min-width:210px; }
.executive-filters input:focus,.executive-filters select:focus { border-color:#60a5fa;box-shadow:0 0 0 3px rgba(37,99,235,.09); }
.executive-refresh { height:37px;padding:0 13px;border:1px solid #dbe2ea;border-radius:9px;background:#fff;color:#475569;font-size:11px;font-weight:650;cursor:pointer; }
.executive-refresh i { margin-right:5px; }.executive-refresh:disabled { opacity:.6;cursor:wait; }
.executive-error { display:flex;align-items:center;gap:9px;padding:10px 13px;border:1px solid #fecaca;border-radius:10px;background:#fff5f5;color:#b42318;font-size:11.5px; }
.executive-error span { flex:1; }.executive-error button { border:0;background:none;color:#b42318;font-weight:700;cursor:pointer; }
.health-hero { --health-color:#64748b;display:grid;grid-template-columns:minmax(300px,1.5fr) auto minmax(240px,.7fr);align-items:center;gap:22px;padding:18px 20px;border:1px solid #e2e8f0;border-left:4px solid var(--health-color);border-radius:14px;background:linear-gradient(115deg,#fff 55%,color-mix(in srgb,var(--health-color) 5%,#fff));box-shadow:0 3px 14px rgba(15,23,42,.035); }
.health-hero.health-good { --health-color:#059669; }.health-hero.health-warning { --health-color:#d97706; }.health-hero.health-critical { --health-color:#dc2626; }
.health-identity { display:flex;align-items:center;gap:13px;min-width:0; }.health-icon { width:46px;height:46px;border-radius:12px;flex:none;display:grid;place-items:center;background:color-mix(in srgb,var(--health-color) 11%,#fff);color:var(--health-color);font-size:19px; }
.health-identity div { min-width:0;display:flex;flex-direction:column; }.health-identity small { color:#64748b;font-size:10px;text-transform:capitalize; }.health-identity strong { margin-top:3px;color:var(--health-color);font-size:20px;font-weight:720; }.health-identity p { margin:3px 0 0;color:#64748b;font-size:11px;line-height:1.4; }
.health-score { --health-angle:0deg;width:78px;height:78px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--health-color) var(--health-angle),#edf1f5 0);position:relative; }.health-score:before { content:"";position:absolute;inset:7px;border-radius:50%;background:#fff; }.health-score div { position:relative;display:flex;flex-direction:column;align-items:center; }.health-score strong { font-size:20px;line-height:1; }.health-score span { margin-top:3px;color:#94a3b8;font-size:8.5px; }
.health-context { display:grid;gap:7px;padding-left:19px;border-left:1px solid #e5e9ef; }.health-context div { display:flex;justify-content:space-between;gap:14px;font-size:10.5px; }.health-context span { color:#94a3b8; }.health-context strong { color:#475569;font-weight:650;text-align:right; }.live-state { color:#059669!important; }.live-state i { display:inline-block;width:6px;height:6px;margin-right:4px;border-radius:50%;background:#10b981; }
.executive-kpis { display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;transition:opacity .2s; }.executive-kpis.is-loading { opacity:.58; }
.executive-kpi { min-width:0;padding:13px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.025);display:flex;flex-direction:column; }.executive-kpi-head { display:flex;align-items:center;justify-content:space-between;margin-bottom:9px; }.executive-kpi-icon { width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-size:12px; }.executive-change,.executive-now { font-size:9px;font-weight:650; }.executive-change.positive { color:#059669; }.executive-change.negative { color:#dc2626; }.executive-change.neutral,.executive-now { color:#94a3b8; }.executive-kpi>strong { font-size:21px;line-height:1.15;font-weight:720;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }.executive-kpi>span { margin-top:4px;color:#475569;font-size:10.5px;font-weight:650; }.executive-kpi>small { margin-top:3px;color:#94a3b8;font-size:8.8px;line-height:1.3; }
.executive-main-grid { display:grid;grid-template-columns:minmax(0,1.7fr) minmax(280px,.8fr);gap:12px; }
.executive-panel { padding:16px;border:1px solid #e2e8f0;border-radius:13px;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.025); }
.executive-panel-head { display:flex;align-items:flex-start;justify-content:space-between;gap:14px; }.executive-panel-head h3 { margin:0;color:#273248;font-size:13px;font-weight:680; }.executive-panel-head p { margin:3px 0 0;color:#94a3b8;font-size:9.5px; }
.chart-legend { display:flex;align-items:center;gap:10px;color:#64748b;font-size:9px; }.chart-legend span { display:flex;align-items:center;gap:4px; }.chart-legend i { width:7px;height:7px;border-radius:2px; }.received { background:#3b82f6; }.completed { background:#10b981; }
.executive-chart { height:170px;min-width:0;display:flex;align-items:flex-end;gap:4px;margin-top:16px;padding:0 3px 2px;border-bottom:1px solid #e9edf2;overflow-x:auto;overflow-y:hidden; }.executive-chart-day { height:100%;min-width:11px;flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:5px; }.executive-bars { width:100%;height:142px;display:flex;align-items:flex-end;justify-content:center;gap:2px; }.executive-bars i { width:min(8px,42%);min-height:2px;border-radius:4px 4px 1px 1px;transition:height .35s ease; }.executive-chart-day>span { color:#94a3b8;font-size:7.5px; }
.attention-count,.management-count { padding:3px 7px;border-radius:7px;background:#f1f5f9;color:#64748b;font-size:9px;font-weight:700; }.insight-list { display:flex;flex-direction:column;gap:7px;margin-top:12px; }.insight-item { display:flex;align-items:flex-start;gap:9px;padding:9px;border-radius:9px;background:#f8fafc; }.insight-item>span { width:26px;height:26px;flex:none;border-radius:8px;display:grid;place-items:center;background:#eaf1fb;color:#2563eb;font-size:10px; }.insight-item div { min-width:0; }.insight-item strong { display:block;color:#334155;font-size:10.5px; }.insight-item p { margin:2px 0 0;color:#7b899d;font-size:9px;line-height:1.35; }.insight-item.warning>span { background:#fff7ed;color:#d97706; }.insight-item.critical>span { background:#fef2f2;color:#dc2626; }.insight-item.good>span { background:#ecfdf5;color:#059669; }
.executive-secondary-stats { display:grid;grid-template-columns:repeat(4,1fr);gap:10px; }.executive-secondary-stats article { padding:12px 14px;border:1px solid #e2e8f0;border-radius:11px;background:#fff;display:grid;grid-template-columns:1fr auto;align-items:center; }.executive-secondary-stats span { color:#64748b;font-size:9.5px; }.executive-secondary-stats span i { width:17px;color:#2563eb; }.executive-secondary-stats strong { grid-row:1/3;grid-column:2;color:#273248;font-size:16px; }.executive-secondary-stats small { margin-top:2px;color:#94a3b8;font-size:8.5px; }
.management-panel { padding:0;overflow:hidden; }.management-head { padding:15px 16px 12px;border-bottom:1px solid #edf0f4; }.management-table-wrap { width:100%;overflow-x:auto; }.management-table { width:100%;border-collapse:collapse;font-size:10.5px; }.management-table th { padding:9px 12px;background:#f8fafc;color:#7b899d;text-align:left;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap; }.management-table td { padding:10px 12px;border-top:1px solid #edf0f4;color:#475569;white-space:nowrap; }.management-table tbody tr:first-child td { border-top:0; }.clickable-row { cursor:pointer;transition:background .15s; }.clickable-row:hover { background:#f8fbff; }.department-cell,.agent-cell { display:flex;align-items:center;gap:9px;min-width:175px; }.department-cell>i { width:8px;height:34px;border-radius:5px;flex:none; }.department-cell div,.agent-cell div { display:flex;flex-direction:column; }.department-cell strong,.agent-cell strong { color:#273248;font-size:10.5px;font-weight:650; }.department-cell small,.agent-cell small { margin-top:2px;color:#94a3b8;font-size:8.5px; }.agent-avatar { width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:#eaf1ff;color:#2563eb;font-size:9px;font-weight:750; }.rank-number { width:22px;height:22px;border-radius:7px;display:grid;place-items:center;background:#f1f5f9;color:#64748b;font-size:9px;font-weight:700; }.status-pill { display:inline-flex;padding:3px 7px;border-radius:20px;font-size:9px;font-weight:700; }.status-pill.good { background:#ecfdf5;color:#047857; }.status-pill.warning { background:#fff7ed;color:#c2410c; }.status-pill.critical { background:#fef2f2;color:#dc2626; }.row-arrow { color:#b6c0ce;font-size:9px; }.management-empty { padding:28px!important;text-align:center;color:#94a3b8!important; }
.executive-empty { height:170px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:7px;color:#94a3b8;font-size:10px; }.executive-empty i { font-size:24px;color:#cbd5e1; }
.executive-footnote { display:flex;align-items:flex-start;gap:7px;padding:0 3px;color:#94a3b8;font-size:9px;line-height:1.4; }.executive-footnote i { margin-top:2px;color:#64748b; }
@media (max-width:1180px) { .executive-kpis { grid-template-columns:repeat(3,1fr); }.health-hero { grid-template-columns:1fr auto; }.health-context { grid-column:1/-1;grid-template-columns:repeat(3,1fr);padding:11px 0 0;border-left:0;border-top:1px solid #e5e9ef; }.health-context div { flex-direction:column;gap:2px; }.health-context strong { text-align:left; } }
@media (max-width:820px) { .executive-dashboard { padding:13px; }.executive-toolbar { align-items:stretch;flex-direction:column; }.executive-filters { display:grid;grid-template-columns:1fr 1fr; }.executive-filters label,.executive-filters input,.executive-filters select { width:100%;min-width:0; }.executive-refresh { align-self:end; }.executive-main-grid { grid-template-columns:1fr; }.executive-secondary-stats { grid-template-columns:repeat(2,1fr); } }
@media (max-width:560px) { .executive-dashboard { padding:10px; }.executive-filters { grid-template-columns:1fr; }.executive-refresh { width:100%; }.health-hero { grid-template-columns:1fr;padding:15px; }.health-score { display:none; }.health-context { grid-template-columns:1fr; }.health-context div { flex-direction:row; }.executive-kpis { grid-template-columns:repeat(2,1fr); }.executive-secondary-stats { grid-template-columns:1fr; }.chart-legend { display:none; } }
</style>
