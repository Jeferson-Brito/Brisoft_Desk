<template>
  <Teleport to="body">
    <div class="modal-overlay active" id="modalNovoDepartamento" @click.self="$emit('close')">
      <div class="modal-container" style="max-width:440px;">
        <div class="modal-header">
          <span class="modal-title">Novo Departamento</span>
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
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="$emit('close')">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="loading">
              <i class="fa-solid fa-check" :class="{ 'fa-spin': loading }"></i> Criar Departamento
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { useSettingsStore } from '@/stores/settings.store'
import { useUiStore } from '@/stores/ui.store'

const emit = defineEmits(['close', 'saved'])

const settingsStore = useSettingsStore()
const ui = useUiStore()

const name = ref('')
const color = ref('#2563eb')
const description = ref('')
const loading = ref(false)

async function handleSubmit() {
  if (!name.value.trim()) return
  loading.value = true
  try {
    const res = await settingsStore.saveDepartment({
      name: name.value.trim(),
      color: color.value,
      description: description.value.trim()
    })
    if (res.success) {
      ui.showToast('Departamento criado com sucesso!')
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
