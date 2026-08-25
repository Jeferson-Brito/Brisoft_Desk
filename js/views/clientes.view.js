// ==========================================================================
// VIEW CONTROLLER - CLIENTES
// ==========================================================================

let selectedClientId = 'cl-1';

function renderClientsTable() {
  const tbody = document.getElementById('clientsTableBody');
  if (!tbody) return;

  const search = (document.getElementById('clientSearchInput')?.value || '').toLowerCase();
  const status = document.getElementById('clientFilterStatus')?.value || 'todos';
  const segment = document.getElementById('clientFilterSegment')?.value || 'todos';

  const list = MOCK_DATA.clientes.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search) || item.cnpj.includes(search) || item.contactName.toLowerCase().includes(search);
    const matchStatus = status === 'todos' || item.status === status;
    const matchSegment = segment === 'todos' || item.segment === segment;
    return matchSearch && matchStatus && matchSegment;
  });

  tbody.innerHTML = list.map(item => `
    <tr class="${item.id === selectedClientId ? 'selected' : ''}" onclick="selectClient('${item.id}')" style="cursor:pointer;">
      <td>
        <div class="contact-cell">
          <div class="initial-avatar" style="background:${item.avatarColor};width:32px;height:32px;font-size:11px;">${item.initials}</div>
          <div class="contact-cell-meta"><span class="contact-cell-name">${item.name}</span><span class="contact-cell-sub">${item.cnpj}</span></div>
        </div>
      </td>
      <td><strong>${item.contactName}</strong></td>
      <td><span class="badge badge-corp">${item.segment}</span></td>
      <td><span class="badge ${item.status === 'Ativo' ? 'badge-ativo' : 'badge-inativo'}">${item.status}</span></td>
      <td>${item.lastService}</td>
      <td><strong>${item.totalServices}</strong></td>
      <td>
        <div class="table-actions-cell" onclick="event.stopPropagation();">
          <button class="btn-icon" onclick="selectClient('${item.id}'); toggleClientDrawer(true);"><i class="fa-regular fa-eye" style="font-size:11px;"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterClientsTable() {
  renderClientsTable();
}

function selectClient(id) {
  selectedClientId = id;
  renderClientsTable();
  const c = MOCK_DATA.clientes.find(cl => cl.id === id);
  if (!c) return;

  const drwName = document.getElementById('drwClientName');
  const drwCnpj = document.getElementById('drwClientCnpj');
  const drwPhone = document.getElementById('drwClientPhone');
  const drwEmail = document.getElementById('drwClientEmail');

  if (drwName) drwName.innerText = c.name;
  if (drwCnpj) drwCnpj.innerText = `CNPJ: ${c.cnpj}`;
  if (drwPhone) drwPhone.innerText = c.phone || '(11) 98765-4321';
  if (drwEmail) drwEmail.innerText = c.email || 'contato@empresa.com.br';

  toggleClientDrawer(true);
}

function toggleClientDrawer(open) {
  const drawer = document.getElementById('clientDetailsDrawer');
  if (drawer) drawer.style.display = open ? 'flex' : 'none';
}

function openModalNovoCliente() {
  openModal('modalNovoCliente');
}

function salvarNovoCliente() {
  const name = document.getElementById('modalClientName')?.value;
  const cnpj = document.getElementById('modalClientCnpj')?.value;
  const segment = document.getElementById('modalClientSegment')?.value;
  const contact = document.getElementById('modalClientContact')?.value;

  if (!name || !cnpj) {
    showToast('Preencha os campos obrigatórios do cliente');
    return;
  }

  MOCK_DATA.clientes.unshift({
    id: `cl-${Date.now()}`,
    name,
    initials: name.substring(0, 2).toUpperCase(),
    avatarColor: "#2563eb",
    cnpj,
    contactName: contact || "Não informado",
    phone: "(11) 99999-8888",
    email: "contato@cliente.com.br",
    segment: segment || "Corporativo",
    status: "Ativo",
    lastService: "Hoje - 10:00",
    totalServices: 1,
    sla: 100
  });

  closeModal('modalNovoCliente');
  renderClientsTable();
  showToast('Novo cliente cadastrado com sucesso!');
}
