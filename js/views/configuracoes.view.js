// ==========================================================================
// VIEW CONTROLLER - CONFIGURAÇÕES
// ==========================================================================

function switchSettingsNav(el, tabKey) {
  document.querySelectorAll('.settings-nav-item').forEach(item => item.classList.remove('active'));
  if (el) el.classList.add('active');
  const title = el?.querySelector('.settings-nav-title')?.innerText || tabKey;
  
  // Esconde todas as abas e mostra a selecionada
  document.querySelectorAll('.settings-tab-content').forEach(tab => tab.style.display = 'none');
  const activeTab = document.getElementById(`settings-tab-${tabKey}`);
  if (activeTab) {
      activeTab.style.display = 'block';
  }
  
  // Se for departamentos, carrega os dados
  if (tabKey === 'departamentos') {
      fetchDepartments();
  }
  
  if (tabKey === 'respostas') {
      fetchBotSettings();
  }
  
  showToast(`Configurações: Seção "${title}" carregada.`);
}

function salvarConfiguracoes() {
  showToast('Configurações salvas com sucesso!');
}

// ==========================================
// DEPARTAMENTOS CRUD
// ==========================================
let currentDepartments = [];

async function fetchDepartments() {
  const tbody = document.getElementById('departmentsTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;">Carregando departamentos...</td></tr>';
  
  try {
    const res = await fetch(`${API_CONFIG.baseUrl}/api/departments`);
    const data = await res.json();
    if (data.success) {
      currentDepartments = data.departments || [];
      renderDepartments();
    } else {
      showToast('Erro ao carregar departamentos', 'error');
    }
  } catch (err) {
    console.error('Erro:', err);
    showToast('Erro de conexão ao buscar departamentos', 'error');
  }
}

function renderDepartments() {
  const tbody = document.getElementById('departmentsTableBody');
  if (!tbody) return;

  if (currentDepartments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#94a3b8;">Nenhum departamento cadastrado.</td></tr>';
    return;
  }

  tbody.innerHTML = currentDepartments.map(dept => `
    <tr>
      <td><strong>${dept.name}</strong></td>
      <td>
        <span class="badge" style="background-color: ${dept.color}15; color: ${dept.color}; border: 1px solid ${dept.color}30;">
          <i class="fa-solid fa-circle" style="font-size:8px;margin-right:6px;"></i> ${dept.color}
        </span>
      </td>
      <td>${dept.sla_target_minutes} minutos</td>
      <td style="text-align:right;">
        <button class="btn-icon" style="color:#ef4444;" onclick="deletarDepartamento('${dept.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function openNewDepartmentModal() {
  document.getElementById('modalDeptName').value = '';
  document.getElementById('modalDeptColor').value = '#2563eb';
  document.getElementById('modalDeptSLA').value = '15';
  openModal('modalNovoDepartamento');
}

async function salvarNovoDepartamento() {
  const name = document.getElementById('modalDeptName').value.trim();
  const color = document.getElementById('modalDeptColor').value;
  const sla = document.getElementById('modalDeptSLA').value;

  if (!name) {
    showToast('Nome do departamento é obrigatório', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_CONFIG.baseUrl}/api/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color, sla_target_minutes: sla })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Departamento criado com sucesso!');
      closeModal('modalNovoDepartamento');
      fetchDepartments();
    } else {
      showToast('Erro ao salvar departamento: ' + data.error, 'error');
    }
  } catch (err) {
    console.error('Erro:', err);
    showToast('Erro de conexão ao salvar departamento', 'error');
  }
}

async function deletarDepartamento(id) {
  if (!confirm('Tem certeza que deseja excluir este departamento?')) return;

  try {
    const res = await fetch(`${API_CONFIG.baseUrl}/api/departments/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Departamento excluído com sucesso!');
      fetchDepartments();
    } else {
      showToast('Erro ao excluir: ' + data.error, 'error');
    }
  } catch (err) {
    console.error('Erro:', err);
    showToast('Erro de conexão ao excluir departamento', 'error');
  }
}

// ==========================================
// CONFIGURAÇÕES DO BOT
// ==========================================

async function fetchBotSettings() {
  try {
    const res = await fetch(`${API_CONFIG.baseUrl}/api/settings`);
    const data = await res.json();
    if (data.success && data.settings) {
      if (data.settings.bot_greeting) {
        document.getElementById('botGreetingText').value = data.settings.bot_greeting;
      }
    }
  } catch (err) {
    console.error('Erro ao buscar settings do bot:', err);
  }
}

async function salvarMensagemBot() {
  const greeting = document.getElementById('botGreetingText').value;

  if (!greeting.trim()) {
    showToast('A mensagem não pode ficar vazia.', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_CONFIG.baseUrl}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'bot_greeting', value: greeting })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Mensagem do bot salva com sucesso!');
    } else {
      showToast('Erro ao salvar mensagem: ' + data.error, 'error');
    }
  } catch (err) {
    console.error('Erro:', err);
    showToast('Erro de conexão ao salvar mensagem do bot', 'error');
  }
}
