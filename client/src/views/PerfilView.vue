<template>
  <div class="profile-page">
    <form class="profile-card" @submit.prevent="save">
      <div class="profile-heading">
        <div class="photo-wrap">
          <img v-if="form.avatar_url" :src="form.avatar_url" alt="Foto do perfil" />
          <span v-else>{{ initials }}</span>
        </div>
        <div>
          <h2>Meu perfil</h2>
          <p>Atualize seus dados pessoais e sua foto.</p>
          <div class="photo-actions">
            <label class="btn-secondary">Escolher foto<input type="file" accept="image/jpeg,image/png,image/webp" hidden @change="choosePhoto" /></label>
            <button v-if="form.avatar_url" type="button" class="link-danger" @click="form.avatar_url = null">Remover</button>
          </div>
        </div>
      </div>

      <div class="grid">
        <label>Nome e sobrenome<input v-model="form.name" class="form-control" required /></label>
        <label>E-mail de login<input :value="auth.user?.email" class="form-control locked" disabled /><small>O e-mail de acesso não pode ser alterado.</small></label>
        <label>Telefone<input v-model="form.phone" class="form-control" placeholder="(00) 00000-0000" /></label>
        <label>Departamento<input :value="auth.departmentName || 'Geral'" class="form-control locked" disabled /></label>
      </div>

      <div class="password-box">
        <h3>Alterar senha</h3>
        <p>Deixe os campos abaixo vazios para manter a senha atual.</p>
        <div class="grid three">
          <label>Senha atual<input v-model="form.current_password" type="password" class="form-control" autocomplete="current-password" /></label>
          <label>Nova senha<input v-model="form.new_password" type="password" class="form-control" autocomplete="new-password" /></label>
          <label>Confirmar nova senha<input v-model="confirmPassword" type="password" class="form-control" autocomplete="new-password" /></label>
        </div>
      </div>

      <div class="actions"><button class="btn-primary" :disabled="saving">{{ saving ? 'Salvando...' : 'Salvar alterações' }}</button></div>
    </form>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { authApi } from '@/api/auth.api'
import { prepareAvatar } from '@/utils/avatar-upload'

const auth = useAuthStore()
const ui = useUiStore()
const saving = ref(false)
const confirmPassword = ref('')
const form = reactive({ name: auth.user?.name || '', phone: auth.user?.phone || '', avatar_url: auth.user?.avatar_url || null, current_password: '', new_password: '' })
const initials = computed(() => (form.name || 'U').split(' ').slice(0, 2).map(v => v[0]).join('').toUpperCase())

async function choosePhoto(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try { form.avatar_url = await prepareAvatar(file) } catch (error) { ui.showToast(error.message, 'error') }
}

async function save() {
  if (form.new_password !== confirmPassword.value) return ui.showToast('A confirmação da nova senha não confere.', 'error')
  saving.value = true
  try {
    const { data } = await authApi.updateProfile({ ...form })
    if (!data.success) throw new Error(data.error)
    auth.setSession(data.token, data.user)
    form.current_password = ''
    form.new_password = ''
    confirmPassword.value = ''
    ui.showToast('Perfil atualizado com sucesso!')
  } catch (error) { ui.showToast(error.response?.data?.error || error.message || 'Não foi possível atualizar o perfil.', 'error') }
  finally { saving.value = false }
}
</script>

<style scoped>
.profile-page{padding:20px;max-width:980px;margin:0 auto;width:100%;box-sizing:border-box}.profile-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;box-shadow:0 1px 2px rgba(15,23,42,.04)}.profile-heading{display:flex;align-items:center;gap:18px;padding-bottom:22px;border-bottom:1px solid #e2e8f0}.profile-heading h2{margin:0;color:#0f172a;font-size:20px}.profile-heading p,.password-box p{margin:4px 0 10px;color:#64748b;font-size:12px}.photo-wrap{width:82px;height:82px;border-radius:50%;overflow:hidden;background:#e8f0ff;color:#1f62d0;display:grid;place-items:center;font-size:22px;font-weight:800}.photo-wrap img{width:100%;height:100%;object-fit:cover}.photo-actions{display:flex;align-items:center;gap:12px}.photo-actions .btn-secondary{cursor:pointer;padding:7px 11px;font-size:12px}.link-danger{border:0;background:none;color:#dc2626;cursor:pointer;font-size:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:22px}.grid.three{grid-template-columns:repeat(3,1fr);margin-top:14px}.grid label{font-size:12px;font-weight:650;color:#334155}.form-control{display:block;width:100%;box-sizing:border-box;margin-top:6px}.form-control.locked{background:#f8fafc;color:#64748b}.grid small{display:block;color:#94a3b8;font-weight:400;margin-top:5px}.password-box{margin-top:24px;padding:18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px}.password-box h3{margin:0;font-size:14px;color:#0f172a}.actions{display:flex;justify-content:flex-end;margin-top:20px}@media(max-width:760px){.grid,.grid.three{grid-template-columns:1fr}.profile-page{padding:12px}.profile-card{padding:16px}}
</style>
