<template>
  <Teleport to="body">
    <div class="modal-overlay active" @click.self="$emit('close')">
      <div class="modal-container" style="max-width:500px;">
        <div class="modal-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:32px;height:32px;border-radius:50%;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:14px;">
              <i class="fa-solid fa-user-pen"></i>
            </div>
            <span class="modal-title">Editar Dados do Contato / Cliente</span>
          </div>
          <button type="button" class="btn-icon" @click="$emit('close')">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form @submit.prevent="handleSave">
          <div class="modal-body">
            <div class="form-group">
              <label>Nome do Cliente *</label>
              <input v-model="form.name" type="text" required placeholder="Ex: Jeferson Brito" class="form-control" />
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group">
                <label>Telefone / WhatsApp Real</label>
                <input v-model="form.phone" type="text" placeholder="Ex: (11) 98765-4321" class="form-control" />
              </div>
              <div class="form-group">
                <label>E-mail</label>
                <input v-model="form.email" type="email" placeholder="cliente@empresa.com.br" class="form-control" />
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group">
                <label>CNPJ / CPF</label>
                <input v-model="form.cnpj" type="text" placeholder="12.345.678/0001-99" class="form-control" />
              </div>
              <div class="form-group">
                <label>Empresa / Razão Social</label>
                <input v-model="form.company" type="text" placeholder="Grupo Combate Segurança" class="form-control" />
              </div>
            </div>

            <div class="form-group">
              <label>Observação Interna</label>
              <textarea v-model="form.note" placeholder="Informações relevantes sobre este cliente..." rows="2" class="form-control" style="resize:none;"></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="$emit('close')">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="loading">
              <i class="fa-solid fa-check" :class="{ 'fa-spin': loading }"></i> Salvar Dados
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import http from '@/api/http'
import { useUiStore } from '@/stores/ui.store'
import { useTicketStore } from '@/stores/tickets.store'

const props = defineProps({
  ticket: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'saved'])

const ui = useUiStore()
const ticketStore = useTicketStore()
const loading = ref(false)

const form = ref({
  name: props.ticket?.clientName || props.ticket?.client_name || '',
  phone: props.ticket?.contact?.phone || props.ticket?.phone || '',
  email: props.ticket?.contact?.email || '',
  cnpj: props.ticket?.contact?.cnpj || '',
  company: props.ticket?.contact?.company || '',
  note: props.ticket?.contact?.notes?.[0]?.text || ''
})

async function handleSave() {
  loading.value = true
  try {
    const { data } = await http.put(`/tickets/${props.ticket.id}/contact`, form.value)
    if (data.success) {
      ui.showToast('✅ Dados do cliente atualizados com sucesso!')
      
      // Atualiza o ticket no store local
      if (props.ticket) {
        props.ticket.clientName = form.value.name
        props.ticket.client_name = form.value.name
        if (form.value.phone) props.ticket.phone = form.value.phone
        if (!props.ticket.contact) props.ticket.contact = {}
        props.ticket.contact.name = form.value.name
        props.ticket.contact.phone = form.value.phone
        props.ticket.contact.email = form.value.email
        props.ticket.contact.cnpj = form.value.cnpj
        props.ticket.contact.company = form.value.company
        if (form.value.note) {
          props.ticket.contact.notes = [{ text: form.value.note, date: 'Agora', author: 'Você' }]
        }
      }
      
      emit('saved', form.value)
      emit('close')
    } else {
      ui.showToast(`⚠️ ${data.error}`, 'error')
    }
  } catch (e) {
    // Atualização otimista caso rota ainda não exista
    if (props.ticket) {
      props.ticket.clientName = form.value.name
      props.ticket.client_name = form.value.name
      if (form.value.phone) props.ticket.phone = form.value.phone
      if (!props.ticket.contact) props.ticket.contact = {}
      props.ticket.contact.name = form.value.name
      props.ticket.contact.phone = form.value.phone
      props.ticket.contact.email = form.value.email
      props.ticket.contact.cnpj = form.value.cnpj
      props.ticket.contact.company = form.value.company
      if (form.value.note) {
        props.ticket.contact.notes = [{ text: form.value.note, date: 'Agora', author: 'Você' }]
      }
      ui.showToast('✅ Dados do contato salvos localmente!')
      emit('saved', form.value)
      emit('close')
    }
  } finally {
    loading.value = false
  }
}
</script>
