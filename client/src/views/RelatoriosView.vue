<template>
  <div class="table-view-layout" style="width:100%;">
    <div class="table-toolbar">
      <div>
        <h2 style="font-size:15px;font-weight:700;margin:0;color:#1e293b;">Relatórios Operacionais & SLA</h2>
        <p style="font-size:12px;color:#64748b;margin:2px 0 0 0;">Indicadores de desempenho por departamento e canal de atendimento.</p>
      </div>
      <button class="btn-primary" @click="ui.showToast('Exportando relatório em PDF/Excel...')">
        <i class="fa-solid fa-download"></i> Exportar Dados
      </button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="card-box" style="padding:18px;">
        <span class="card-box-title" style="margin-bottom:14px;display:block;">Desempenho de SLA por Departamento</span>
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div v-for="d in settingsStore.departments" :key="d.id" class="subject-progress-item">
            <div class="subject-progress-header">
              <span>{{ d.name }}</span>
              <strong :style="{ color: d.color || '#2563eb' }">98% SLA</strong>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:98%;" :style="{ background: d.color || '#2563eb' }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="card-box" style="padding:18px;">
        <span class="card-box-title" style="margin-bottom:14px;display:block;">Canais de Atendimento</span>
        <div style="display:flex;align-items:center;gap:16px;padding:24px 0;">
          <div style="width:52px;height:52px;border-radius:50%;background:#ecfdf5;color:#10b981;display:flex;align-items:center;justify-content:center;font-size:24px;">
            <i class="fa-brands fa-whatsapp"></i>
          </div>
          <div>
            <strong style="font-size:14px;display:block;color:#1e293b;">WhatsApp Oficial</strong>
            <span style="font-size:12px;color:#64748b;">100% dos chamados integrados e roteados em tempo real</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings.store'
import { useUiStore } from '@/stores/ui.store'

const settingsStore = useSettingsStore()
const ui = useUiStore()

onMounted(() => {
  settingsStore.fetchDepartments()
})
</script>
