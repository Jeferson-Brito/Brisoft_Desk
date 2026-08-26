<template>
  <Teleport to="body">
    <div class="modal-overlay active" id="modalEncerrarAtendimento" @click.self="$emit('close')">
      <div class="modal-container" style="max-width:440px;">
        <div class="modal-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:32px;height:32px;border-radius:50%;background:#fee2e2;color:#ef4444;display:flex;align-items:center;justify-content:center;font-size:14px;">
              <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <span class="modal-title">Encerrar Atendimento</span>
          </div>
          <button type="button" class="btn-icon" @click="$emit('close')">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="modal-body">
          <p style="font-size:13px;color:#475569;margin:0 0 16px 0;line-height:1.5;">
            Deseja realmente encerrar o atendimento de <strong>{{ ticket?.clientName || ticket?.client_name || 'Cliente' }}</strong>?
            A pesquisa de satisfação será enviada automaticamente via WhatsApp.
          </p>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:6px;font-size:12px;">
            <div style="display:flex;justify-content:space-between;">
              <span style="color:#64748b;">Departamento:</span>
              <strong>{{ ticket?.department || 'Geral' }}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:#64748b;">Protocolo:</span>
              <span style="font-family:monospace;">{{ ticket?.id }}</span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="$emit('close')">Cancelar</button>
          <button
            type="button"
            class="btn-primary"
            style="background:#ef4444;border-color:#ef4444;"
            :disabled="loading"
            @click="confirmClose"
          >
            <i class="fa-solid fa-check" :class="{ 'fa-spin': loading }"></i> Confirmar Encerramento
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { useTicketStore } from '@/stores/tickets.store'
import { useUiStore } from '@/stores/ui.store'

const props = defineProps({
  ticket: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

const ticketStore = useTicketStore()
const ui = useUiStore()
const loading = ref(false)

async function confirmClose() {
  if (!props.ticket) return
  loading.value = true
  try {
    const clientName = props.ticket.clientName || 'Cliente'
    const res = await ticketStore.close(props.ticket.id)
    if (res.success) {
      ui.showToast(`✅ Atendimento de ${clientName} encerrado com sucesso!`)
      emit('close')
    } else {
      ui.showToast(`⚠️ ${res.error}`, 'error')
    }
  } finally {
    loading.value = false
  }
}
</script>
