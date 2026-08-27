<template>
  <div class="table-view-layout" style="width:100%;">
    <div class="table-toolbar">
      <div>
        <h2 style="font-size:15px;font-weight:700;margin:0;color:#1e293b;">Avaliações de Clientes (CSAT)</h2>
        <p style="font-size:12px;color:#64748b;margin:2px 0 0 0;">Pesquisas de satisfação recebidas automaticamente via WhatsApp após o encerramento.</p>
      </div>
      <button class="btn-secondary" @click="fetchRatings">
        <i class="fa-solid fa-rotate-right" :class="{ 'fa-spin': loading }"></i> Atualizar
      </button>
    </div>

    <!-- 4 KPI Cards -->
    <div class="kpi-row-6" style="grid-template-columns: repeat(4, 1fr);">
      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#fef9c3;color:#ca8a04;"><i class="fa-solid fa-star"></i></div>
          <span class="kpi-compact-label">Nota Média</span>
        </div>
        <div class="kpi-compact-val">{{ averageScore }} ★</div>
      </div>
      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#ecfdf5;color:#10b981;"><i class="fa-regular fa-face-smile"></i></div>
          <span class="kpi-compact-label">Satisfeitos (4-5★)</span>
        </div>
        <div class="kpi-compact-val">{{ satisfiedCount }}</div>
      </div>
      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#fff7ed;color:#ea580c;"><i class="fa-regular fa-face-meh"></i></div>
          <span class="kpi-compact-label">Neutros (3★)</span>
        </div>
        <div class="kpi-compact-val">{{ neutralCount }}</div>
      </div>
      <div class="kpi-card-compact">
        <div class="kpi-compact-top">
          <div class="kpi-compact-icon" style="background:#fee2e2;color:#dc2626;"><i class="fa-regular fa-face-frown"></i></div>
          <span class="kpi-compact-label">Insatisfeitos (1-2★)</span>
        </div>
        <div class="kpi-compact-val">{{ unsatisfiedCount }}</div>
      </div>
    </div>

    <!-- Tabela de Avaliações Full Width -->
    <div class="table-content-area">
      <div class="table-card-container">
        <div class="table-scroll-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Cliente / WhatsApp</th>
                <th>Atendente</th>
                <th>Nota</th>
                <th>Data e Hora</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="ratings.length === 0">
                <td colspan="4" style="text-align:center;padding:24px;color:#94a3b8;">
                  Nenhuma avaliação registrada ainda.
                </td>
              </tr>
              <tr v-for="r in ratings" :key="r.id">
                <td style="font-weight:600;">
                  <i class="fa-brands fa-whatsapp" style="color:#22c55e;margin-right:4px;"></i>
                  {{ formatPhone(r.phone) }}
                </td>
                <td style="color:#64748b;">{{ r.agent_name || 'Atendente' }}</td>
                <td>
                  <span style="color:#f59e0b;font-weight:700;display:inline-flex;align-items:center;gap:3px;">
                    <i class="fa-solid fa-star" style="font-size:11px;"></i>
                    {{ r.score }} estrelas
                  </span>
                </td>
                <td style="font-size:12px;color:#64748b;">
                  {{ new Date(r.created_at).toLocaleString('pt-BR') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import http from '@/api/http'
import { formatPhone } from '@/utils/formatters'

const ratings = ref([])
const loading = ref(false)

const averageScore = computed(() => {
  if (ratings.value.length === 0) return '5.0'
  const sum = ratings.value.reduce((acc, r) => acc + (r.score || 5), 0)
  return (sum / ratings.value.length).toFixed(1)
})

const satisfiedCount = computed(() => ratings.value.filter(r => r.score >= 4).length)
const neutralCount = computed(() => ratings.value.filter(r => r.score === 3).length)
const unsatisfiedCount = computed(() => ratings.value.filter(r => r.score <= 2).length)

async function fetchRatings() {
  loading.value = true
  try {
    const { data } = await http.get('/tickets/history')
    if (data.success && Array.isArray(data.history)) {
      ratings.value = data.history.filter(h => h.rating).map(h => ({
        id: h.id,
        phone: h.phone,
        agent_name: h.agent,
        score: h.rating,
        created_at: h.closed_at || new Date().toISOString()
      }))
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchRatings()
})
</script>
