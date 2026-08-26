<template>
  <div class="table-view-layout" style="width:100%;">
    <div class="table-toolbar">
      <div class="table-toolbar-left">
        <div class="search-input-wrap" style="width:280px;">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="searchTerm" type="text" placeholder="Buscar contatos por nome ou telefone..." />
        </div>
      </div>
      <button class="btn-primary" disabled title="Cadastro de contatos ainda não integrado ao servidor">
        <i class="fa-solid fa-user-plus"></i> Novo Contato
      </button>
    </div>

    <div class="table-content-area">
      <div class="table-card-container">
        <div class="table-scroll-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>WhatsApp / Telefone</th>
                <th>Empresa</th>
                <th>Tags</th>
                <th style="text-align:right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredContacts.length === 0">
                <td colspan="5" style="text-align:center;color:#64748b;padding:32px;">Nenhum contato cadastrado.</td>
              </tr>
              <tr v-for="(c, idx) in filteredContacts" :key="idx">
                <td>
                  <div class="contact-cell">
                    <div class="initial-avatar" style="background:#0d9488;width:32px;height:32px;font-size:11px;">
                      {{ c.name.substring(0, 2).toUpperCase() }}
                    </div>
                    <div class="contact-cell-meta">
                      <span class="contact-cell-name">{{ c.name }}</span>
                    </div>
                  </div>
                </td>
                <td style="font-weight:500;">
                  <i class="fa-brands fa-whatsapp" style="color:#22c55e;margin-right:4px;"></i>
                  {{ c.phone }}
                </td>
                <td style="color:#64748b;">{{ c.company }}</td>
                <td>
                  <span class="tag-pill tag-blue">{{ c.tag }}</span>
                </td>
                <td style="text-align:right;">
                  <div class="table-actions-cell" style="justify-content:flex-end;">
                    <button class="btn-icon" title="Edição ainda não integrada ao servidor" disabled>
                      <i class="fa-solid fa-pen"></i>
                    </button>
                  </div>
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
import { ref, computed } from 'vue'
const searchTerm = ref('')

const contacts = ref([])

const filteredContacts = computed(() => {
  if (!searchTerm.value.trim()) return contacts.value
  const t = searchTerm.value.toLowerCase()
  return contacts.value.filter(c => c.name.toLowerCase().includes(t) || c.phone.includes(t) || c.company.toLowerCase().includes(t))
})
</script>
