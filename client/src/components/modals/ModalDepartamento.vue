<template>
  <Teleport to="body">
    <div class="modal-overlay active" id="modalNovoDepartamento" @click.self="$emit('close')">
      <div class="modal-container" style="max-width:440px;">
        <div class="modal-header">
          <span class="modal-title">{{ isEditing ? 'Editar departamento' : 'Novo departamento' }}</span>
          <button type="button" class="btn-icon" @click="$emit('close')">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="modal-body">
            <div class="form-group">
              <label>Nome do Departamento *</label>
              <input v-model="name" type="text" required placeholder="Ex: Suporte Técnico" class="form-control" />
            </div>

            <div class="form-group">
              <label>Cor de Identificação</label>
              <div style="display:flex;align-items:center;gap:10px;">
                <input v-model="color" type="color" style="width:40px;height:36px;border:none;cursor:pointer;border-radius:4px;" />
                <input v-model="color" type="text" class="form-control" style="flex:1;font-family:monospace;" />
              </div>
            </div>

            <div class="form-group">
              <label>Descrição (opcional)</label>
              <textarea v-model="description" placeholder="Objetivo ou escopo de atendimento..." rows="2" class="form-control" style="resize:none;"></textarea>
            </div>

            <div class="form-group">
              <label>Meta de SLA (minutos)</label>
              <input v-model.number="slaTargetMinutes" type="number" min="1" max="1440" class="form-control" />
              <small>Tempo esperado para o primeiro atendimento deste departamento.</small>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="$emit('close')">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="loading">
              <i class="fa-solid" :class="loading ? 'fa-spinner fa-spin' : 'fa-check'"></i> {{ loading ? 'Salvando...' : (isEditing ? 'Salvar alterações' : 'Criar departamento') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings.store'
import { useUiStore } from '@/stores/ui.store'

const emit = defineEmits(['close', 'saved'])
const props = defineProps({ department: { type: Object, default: null } })

const settingsStore = useSettingsStore()
const ui = useUiStore()

const isEditing = computed(() => Boolean(props.department?.id))
const name = ref(props.department?.name || '')
const color = ref(props.department?.color || '#2563eb')
const description = ref(props.department?.description || '')
const slaTargetMinutes = ref(Number(props.department?.sla_target_minutes) || 15)
const loading = ref(false)

async function handleSubmit() {
  if (!name.value.trim()) return
  loading.value = true
  try {
    const res = await settingsStore.saveDepartment({
      ...(props.department?.id ? { id: props.department.id } : {}),
      name: name.value.trim(),
      color: color.value,
      description: description.value.trim(),
      sla_target_minutes: slaTargetMinutes.value,
      ...(props.department?.sort_order ? { sort_order: props.department.sort_order } : {})
    })
    if (res.success) {
      ui.showToast(isEditing.value ? 'Departamento atualizado com sucesso!' : 'Departamento criado com sucesso!')
      emit('saved')
      emit('close')
    } else {
      ui.showToast(`⚠️ ${res.error}`, 'error')
    }
  } finally {
    loading.value = false
  }
}
</script>
