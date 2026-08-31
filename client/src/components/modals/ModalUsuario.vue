<template>
  <Teleport to="body">
    <div class="modal-overlay active" id="modalNovoUsuario" @click.self="$emit('close')">
      <div class="modal-container" style="max-width:520px;">
        <div class="modal-header">
          <span class="modal-title">{{ editingUser ? 'Editar Usuário' : 'Novo Usuário' }}</span>
          <button type="button" class="btn-icon" @click="$emit('close')">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="modal-body">
            <!-- Avatar Preview -->
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:4px;">
              <div
                style="width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;flex-shrink:0;"
                :style="{ background: formData.role === 'Administrador' ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)' }"
              >
                {{ initials }}
              </div>
              <div style="flex:1;">
                <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">URL da Foto de Perfil (opcional)</label>
                <input v-model="formData.avatar_url" type="url" placeholder="https://exemplo.com/foto.jpg" class="form-control" style="width:100%;font-size:12px;padding:6px 10px;" />
              </div>
            </div>

            <!-- Nome + E-mail -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group">
                <label>Nome Completo *</label>
                <input v-model="formData.name" type="text" required placeholder="João Silva" class="form-control" />
              </div>
              <div class="form-group">
                <label>E-mail de Acesso *</label>
                <input v-model="formData.email" type="email" required placeholder="joao@combate.com.br" class="form-control" />
              </div>
            </div>

            <!-- Senha -->
            <div class="form-group">
              <label>
                {{ editingUser ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha de Acesso *' }}
              </label>
              <input v-model="formData.password" type="password" :required="!editingUser" placeholder="••••••••" class="form-control" />
            </div>

            <!-- Perfil + Departamento -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group">
                <label>Papel / Perfil *</label>
                <select v-model="formData.role" required class="form-control" :disabled="!auth.isAdmin">
                  <option value="Administrador">Administrador (acesso total)</option>
                  <option value="Supervisor">Supervisor de departamento</option>
                  <option value="Analista">Analista / Atendente</option>
                </select>
              </div>
              <div class="form-group">
                <label>Departamento</label>
                <select v-model="formData.department_id" class="form-control">
                  <option :value="null">Nenhum / Geral</option>
                  <option v-for="d in settingsStore.departments" :key="d.id" :value="d.id">
                    {{ d.name }}
                  </option>
                </select>
              </div>
            </div>

            <div v-if="formData.role === 'Supervisor'" class="form-group">
              <label>Departamentos supervisionados *</label>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:10px;border:1px solid #cbd5e1;border-radius:7px;">
                <label v-for="d in settingsStore.departments" :key="d.id" style="display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;">
                  <input v-model="formData.department_ids" type="checkbox" :value="d.id" /> {{ d.name }}
                </label>
              </div>
              <small style="display:block;margin-top:5px;color:#64748b;">O supervisor verá e administrará somente os setores selecionados.</small>
            </div>

            <!-- Telefone + Status -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group">
                <label>Telefone / WhatsApp</label>
                <input v-model="formData.phone" type="text" placeholder="(11) 99999-9999" class="form-control" />
              </div>
              <div class="form-group">
                <label>Status da Conta</label>
                <select v-model="formData.is_active" class="form-control">
                  <option :value="true">Ativo</option>
                  <option :value="false">Inativo</option>
                </select>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="$emit('close')">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="loading">
              <i class="fa-solid fa-check" :class="{ 'fa-spin': loading }"></i>
              {{ editingUser ? 'Salvar Alterações' : 'Criar Usuário' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSettingsStore } from '@/stores/settings.store'
import { usersApi } from '@/api/users.api'
import { useUiStore } from '@/stores/ui.store'
import { useAuthStore } from '@/stores/auth.store'

const props = defineProps({
  editingUser: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

const settingsStore = useSettingsStore()
const ui = useUiStore()
const auth = useAuthStore()
const loading = ref(false)

const formData = ref({
  name: props.editingUser?.name || '',
  email: props.editingUser?.email || '',
  password: '',
  role: props.editingUser?.role || 'Analista',
  department_id: props.editingUser?.department_id || null,
  department_ids: props.editingUser?.department_ids || [props.editingUser?.department_id].filter(Boolean),
  phone: props.editingUser?.phone || '',
  avatar_url: props.editingUser?.avatar_url || '',
  is_active: props.editingUser ? props.editingUser.is_active !== false : true
})

const initials = computed(() => {
  const name = formData.value.name || 'U'
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
})

async function handleSubmit() {
  loading.value = true
  try {
    const payload = { ...formData.value }
    if (payload.role === 'Supervisor') {
      if (!payload.department_ids.length) return ui.showToast('Selecione ao menos um departamento para o supervisor.', 'error')
      payload.department_id = payload.department_ids[0]
    } else {
      payload.department_ids = []
    }
    if (!payload.password) delete payload.password

    let res
    if (props.editingUser) {
      res = await usersApi.update(props.editingUser.id, payload)
    } else {
      res = await usersApi.create(payload)
    }

    if (res.data.success) {
      ui.showToast(props.editingUser ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!')
      emit('saved')
      emit('close')
    } else {
      ui.showToast(`⚠️ ${res.data.error}`, 'error')
    }
  } catch (e) {
    ui.showToast(e.response?.data?.error || 'Erro ao salvar usuário', 'error')
  } finally {
    loading.value = false
  }
}
</script>
