// ==========================================================================
// VIEW CONTROLLER - CONTATOS
// ==========================================================================

let selectedContactId = 'ct-1';

function renderContactsTable() {
  const tbody = document.getElementById('contactsTableBody');
  if (!tbody) return;

  const search = (document.getElementById('contactSearchInput')?.value || '').toLowerCase();
  const list = MOCK_DATA.contatos.filter(item => item.name.toLowerCase().includes(search) || item.client.toLowerCase().includes(search));

  tbody.innerHTML = list.map(item => `
    <tr class="${item.id === selectedContactId ? 'selected' : ''}" onclick="selectContact('${item.id}')" style="cursor:pointer;">
      <td>
        <div class="contact-cell">
          <div class="initial-avatar" style="background:${item.avatarColor};width:32px;height:32px;font-size:11px;">${item.initials}</div>
          <div class="contact-cell-meta"><span class="contact-cell-name">${item.name}</span><span class="contact-cell-sub">${item.phone || item.email}</span></div>
        </div>
      </td>
      <td><strong style="font-size:12px;">${item.client}</strong></td>
      <td><i class="fa-brands fa-whatsapp" style="color:#22c55e;"></i></td>
      <td>${item.role}</td>
      <td>${item.lastContact}</td>
      <td><span class="badge ${item.status === 'Ativo' ? 'badge-ativo' : 'badge-inativo'}">${item.status}</span></td>
      <td>
        <div class="table-actions-cell" onclick="event.stopPropagation();">
          <button class="btn-icon" onclick="selectContact('${item.id}'); toggleContactDrawer(true);"><i class="fa-regular fa-eye" style="font-size:11px;"></i></button>
          <button class="btn-icon" onclick="openModalNovoContato()"><i class="fa-solid fa-pen" style="font-size:11px;"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterContactsTable() {
  renderContactsTable();
}

function selectContact(id) {
  selectedContactId = id;
  renderContactsTable();
  const c = MOCK_DATA.contatos.find(ct => ct.id === id);
  if (!c) return;

  const drwName = document.getElementById('drwContactName');
  const drwRole = document.getElementById('drwContactRoleCompany');
  const drwPhone = document.getElementById('drwContactPhone');
  const drwEmail = document.getElementById('drwContactEmail');
  const drwCompany = document.getElementById('drwContactCompany');

  if (drwName) drwName.innerText = c.name;
  if (drwRole) drwRole.innerText = `${c.role} - ${c.client}`;
  if (drwPhone) drwPhone.innerText = c.phone;
  if (drwEmail) drwEmail.innerText = c.email;
  if (drwCompany) drwCompany.innerText = c.client;

  toggleContactDrawer(true);
}

function toggleContactDrawer(open) {
  const drawer = document.getElementById('contactDetailsDrawer');
  if (drawer) drawer.style.display = open ? 'flex' : 'none';
}

function openModalNovoContato() {
  openModal('modalNovoContato');
}

function openModalNovaNota() {
  openModal('modalNovaNota');
}

function salvarNovoContato() {
  const name = document.getElementById('modalContactName')?.value;
  const company = document.getElementById('modalContactCompany')?.value;
  const phone = document.getElementById('modalContactPhone')?.value;
  const role = document.getElementById('modalContactRole')?.value;
  const email = document.getElementById('modalContactEmail')?.value;

  if (!name) {
    showToast('Informe o nome do contato');
    return;
  }

  MOCK_DATA.contatos.unshift({
    id: `ct-${Date.now()}`,
    name,
    initials: name.substring(0, 2).toUpperCase(),
    avatarColor: "#9333ea",
    client: company || "Não informado",
    role: role || "Responsável",
    phone: phone || "(11) 99999-0000",
    email: email || "contato@empresa.com.br",
    lastContact: "Hoje - 10:00",
    channel: "WhatsApp",
    status: "Ativo"
  });

  closeModal('modalNovoContato');
  renderContactsTable();
  showToast('Novo contato cadastrado com sucesso!');
}

function salvarNovaNota() {
  const text = document.getElementById('modalNoteText')?.value;
  if (!text) {
    showToast('Digite o conteúdo da nota');
    return;
  }

  const current = MOCK_DATA.atendimentos.find(a => a.id === selectedAtendimentoId);
  if (current) {
    current.contact.notes.unshift({
      text,
      date: new Date().toLocaleDateString('pt-BR'),
      author: MOCK_DATA.currentUser.name
    });
    renderActiveChat();
  }

  closeModal('modalNovaNota');
  showToast('Nota adicionada com sucesso!');
}
