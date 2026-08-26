<template>
  <Teleport to="body">
    <div class="modal-overlay active" style="z-index:9999;" @click.self="$emit('close')">
      <div class="modal" style="max-width:480px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);">
        <!-- Modal Header -->
        <div class="modal-header" style="background:#ffffff;border-bottom:1px solid #e2e8f0;padding:16px 20px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;border-radius:8px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:16px;">
              <i class="fa-solid fa-arrow-right-arrow-left"></i>
            </div>
            <div>
              <h3 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">Transferir Atendimento</h3>
              <span style="font-size:12px;color:#64748b;">
                Cliente: <strong>{{ ticket?.clientName || ticket?.client_name || 'Cliente' }}</strong>
              </span>
            </div>
          </div>
          <button type="button" class="btn-icon" @click="$emit('close')">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="modal-body" style="padding:20px;display:flex;flex-direction:column;gap:16px;background:#ffffff;">
          <!-- Informação Atual -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;font-size:12px;">
            <span style="color:#64748b;">Departamento atual:</span>
            <span class="badge" style="background:#e0e7ff;color:#4338ca;font-weight:600;">
              {{ ticket?.department || ticket?.deptInitial || 'Geral' }}
            </span>
          </div>

          <!-- Seleção do Novo Departamento -->
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:12.5px;font-weight:600;color:#334155;margin-bottom:6px;display:block;">
              Novo Departamento <span style="color:#ef4444;">*</span>
            </label>
            <select
              v-model="selectedDeptId"
              class="form-control"
              style="width:100%;height:38px;font-size:13px;border-radius:6px;"
              required
              @change="onDeptChange"
            >
              <option value="" disabled>Selecione o departamento de destino...</option>
              <option
                v-for="dept in availableDepartments"
                :key="dept.id"
                :value="dept.id"
              >
                {{ dept.name }}
              </option>
            </select>
          </div>

          <!-- Seleção do Atendente (Opcional) -->
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:12.5px;font-weight:600;color:#334155;margin-bottom:6px;display:block;">
              Atendente Destino <span style="font-size:11px;color:#94a3b8;font-weight:normal;">(Opcional)</span>
            </label>
            <select
              v-model="selectedUserId"
              class="form-control"
              style="width:100%;height:38px;font-size:13px;border-radius:6px;"
            >
              <option value="">Fila Geral do Departamento (Qualquer Atendente)</option>
              <option
                v-for="user in departmentUsers"
                :key="user.id"
                :value="user.id"
              >
                {{ user.name }} ({{ user.role === 'admin' ? 'Administrador' : 'Atendente' }})
              </option>
            </select>
            <span style="font-size:11px;color:#94a3b8;margin-top:4px;display:block;">
              Se não escolher um atendente específico, o chamado ficará na fila aguardando.
            </span>
          </div>

          <!-- Motivo / Observação -->
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:12.5px;font-weight:600;color:#334155;margin-bottom:6px;display:block;">
              Motivo da Transferência <span style="font-size:11px;color:#94a3b8;font-weight:normal;">(Opcional)</span>
            </label>
            <textarea
              v-model="transferNote"
              class="form-control"
              rows="3"
              placeholder="Ex: Cliente solicita suporte de hardware..."
              style="width:100%;resize:none;font-size:12.5px;border-radius:6px;padding:8px 10px;"
            ></textarea>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="modal-footer" style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 20px;display:flex;justify-content:flex-end;gap:10px;">
          <button
            type="button"
            class="btn-secondary"
            :disabled="loading"
            @click="$emit('close')"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn-primary"
            :disabled="loading || !selectedDeptId"
            style="gap:6px;"
            @click="handleConfirmTransfer"
          >
            <i v-if="loading" class="fa-solid fa-spinner fa-spin"></i>
            <i v-else class="fa-solid fa-check"></i>
            {{ loading ? 'Transferindo...' : 'Confirmar Transferência' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings.store'
import { useTicketStore } from '@/stores/tickets.store'
import { useUiStore } from '@/stores/ui.store'
import { ticketsApi } from '@/api/tickets.api'
import { usersApi } from '@/api/users.api'

const props = defineProps({
  ticket: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'transferred'])

const settingsStore = useSettingsStore()
const ticketStore = useTicketStore()
const ui = useUiStore()

const loading = ref(false)
const usersList = ref([])
const selectedDeptId = ref('')
const selectedDeptName = ref('')
const selectedUserId = ref('')
const transferNote = ref('')

const fallbackDepartments = [
  { id: '1', name: 'B3 Eletrônica', color: '#2563eb' },
  { id: '2', name: 'Comercial', color: '#10b981' },
  { id: '3', name: 'Comercial eletrônica', color: '#06b6d4' },
  { id: '4', name: 'Financeiro', color: '#f59e0b' },
  { id: '5', name: 'Operacional', color: '#8b5cf6' },
  { id: '6', name: 'Recursos Humanos', color: '#ec4899' },
  { id: '7', name: 'Suporte Técnico', color: '#ea580c' },
  { id: '8', name: 'Suprimentos', color: '#64748b' }
]

onMounted(async () => {
  try {
    if (!settingsStore.departments || settingsStore.departments.length === 0) {
      await settingsStore.fetchDepartments()
    }
  } catch (errDept) {
    console.warn('Erro ao carregar departamentos:', errDept)
  }

  try {
    const { data } = await usersApi.list()
    if (data?.success) {
      usersList.value = data.users || []
    }
  } catch (errUsers) {
    console.warn('Erro ao carregar lista de atendentes:', errUsers)
  }
})

const availableDepartments = computed(() => {
  if (settingsStore.departments && settingsStore.departments.length > 0) {
    return settingsStore.departments
  }
  return fallbackDepartments
})

const departmentUsers = computed(() => {
  const list = usersList.value || []
  if (!selectedDeptId.value) return list
  return list.filter(u => !u.department_id || String(u.department_id) === String(selectedDeptId.value) || u.role === 'admin')
})

function onDeptChange() {
  const d = availableDepartments.value.find(x => x.id === selectedDeptId.value)
  if (d) {
    selectedDeptName.value = d.name
  }
}

async function handleConfirmTransfer() {
  if (!selectedDeptId.value) {
    ui.showToast('Selecione o departamento de destino.', 'warning')
    return
  }

  const d = availableDepartments.value.find(x => x.id === selectedDeptId.value)
  const targetDeptName = d?.name || selectedDeptName.value || 'Novo Departamento'
  const targetUser = (usersList.value || []).find(u => u.id === selectedUserId.value)

  loading.value = true
  try {
    const res = await ticketsApi.transfer(props.ticket.id, {
      departmentId: selectedDeptId.value,
      departmentName: targetDeptName,
      targetUserId: targetUser?.id || null,
      targetUserName: targetUser?.name || null,
      note: transferNote.value
    })

    if (res.data?.success) {
      ui.showToast(`Atendimento transferido com sucesso para ${targetDeptName}!`, 'success')
      await ticketStore.fetchQueue()
      emit('transferred', res.data.result?.ticket)
      emit('close')
    } else {
      ui.showToast(res.data?.error || 'Erro ao transferir atendimento.', 'error')
    }
  } catch (err) {
    ui.showToast(err.response?.data?.error || err.message || 'Erro ao transferir atendimento.', 'error')
  } finally {
    loading.value = false
  }
}
</script>
