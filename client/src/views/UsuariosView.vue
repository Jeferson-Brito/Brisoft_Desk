<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">Usuários & Acesso</h2>
      <button class="btn-primary" @click="openNewUserModal">
        <i class="fa-solid fa-user-plus"></i> Novo Usuário
      </button>
    </div>

    <div class="settings-section-card">
      <table class="data-table" style="width:100%;">
        <thead>
          <tr>
            <th>Usuário</th>
            <th>E-mail</th>
            <th>Perfil</th>
            <th>Departamento</th>
            <th>Status</th>
            <th style="text-align:right;">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="usersList.length === 0">
            <td colspan="6" style="text-align:center;padding:24px;color:#94a3b8;">
              Nenhum usuário cadastrado.
            </td>
          </tr>
          <tr v-for="u in usersList" :key="u.id">
            <td>
              <div style="display:flex;align-items:center;gap:10px;">
                <div
                  style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden;"
                  :style="{ background: u.role === 'Administrador' ? '#059669' : '#7c3aed' }"
                >
                  <img
                    v-if="u.avatar_url"
                    :src="u.avatar_url"
                    :alt="u.name"
                    style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;"
                  />
                  <span v-else>{{ getUserInitials(u.name) }}</span>
                </div>
                <div>
                  <span style="font-weight:600;font-size:12.5px;">{{ normalizePersonName(u.name) || '—' }}</span>
                  <span v-if="u.id === authStore.user?.id" style="margin-left:6px;background:#ecfdf5;color:#047857;border-radius:20px;font-size:9px;font-weight:700;padding:1px 6px;">VOCÊ</span>
                </div>
              </div>
            </td>
            <td style="font-size:12px;color:#64748b;">{{ u.email }}</td>
            <td>
              <span
                class="badge"
                :style="{
                  background: u.role === 'Administrador' ? '#ecfdf5' : '#f5f3ff',
                  color: u.role === 'Administrador' ? '#059669' : '#7c3aed',
                  border: `1px solid ${u.role === 'Administrador' ? '#a7f3d0' : '#ddd6fe'}`
                }"
              >
                {{ u.role || 'Analista' }}
              </span>
            </td>
            <td style="font-size:12px;color:#64748b;">
              {{ userDepartmentLabel(u) }}
            </td>
            <td>
              <span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;">
                <i class="fa-solid fa-circle" style="font-size:7px;" :style="{ color: u.is_active !== false ? '#22c55e' : '#ef4444' }"></i>
                {{ u.is_active !== false ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td style="text-align:right;">
              <button class="btn-icon" style="color:#059669;margin-right:4px;" title="Editar" @click="editUser(u)">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn-icon" style="color:#ef4444;" title="Excluir" @click="deleteUser(u)">
                <i class="fa-solid fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <ModalUsuario
      v-if="showModalUser"
      :editing-user="selectedUserForEdit"
      @close="showModalUser = false"
      @saved="loadUsers"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { usersApi } from '@/api/users.api'
import ModalUsuario from '@/components/modals/ModalUsuario.vue'
import { normalizePersonName } from '@/utils/person-display'

const authStore = useAuthStore()
const ui = useUiStore()

const usersList = ref([])
const showModalUser = ref(false)
const selectedUserForEdit = ref(null)

function getUserInitials(name) {
  return (name || 'U').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function userDepartmentLabel(user) {
  if (user.role === 'Supervisor' && user.supervised_departments?.length) return user.supervised_departments.map(item => item.name).join(', ')
  return user.departments?.name || user.department_name || '—'
}

async function loadUsers() {
  try {
    const { data } = await usersApi.list()
    if (data.success) {
      usersList.value = data.users || []
    }
  } catch (e) {
    console.error('Erro ao carregar usuários:', e)
  }
}

function openNewUserModal() {
  selectedUserForEdit.value = null
  showModalUser.value = true
}

function editUser(u) {
  selectedUserForEdit.value = u
  showModalUser.value = true
}

async function deleteUser(u) {
  if (!confirm(`Deseja realmente excluir o usuário ${u.name}?`)) return
  try {
    const { data } = await usersApi.remove(u.id)
    if (data.success) {
      ui.showToast('Usuário excluído com sucesso!')
      await loadUsers()
    } else {
      ui.showToast(`⚠️ ${data.error}`, 'error')
    }
  } catch (e) {
    ui.showToast(e.response?.data?.error || 'Erro ao excluir usuário', 'error')
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.page-container {
  padding: 16px 20px 32px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}
.page-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
}
.settings-section-card {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  padding: 16px;
  box-shadow: none;
  overflow-x: auto;
  margin-bottom: 24px;
}
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  font-size: 10.5px;
  font-weight: 600;
  border-radius: 4px;
}
</style>
