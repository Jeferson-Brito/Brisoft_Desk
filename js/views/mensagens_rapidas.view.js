// ==========================================================================
// VIEW CONTROLLER - MENSAGENS RÁPIDAS
// ==========================================================================

let selectedQuickMessageId = 'msg-1';

function renderQuickMessages() {
  const tbody = document.getElementById('quickMessagesTableBody');
  if (!tbody) return;

  const search = (document.getElementById('qmSearchInput')?.value || '').toLowerCase();
  const cat = document.getElementById('qmCategoryFilter')?.value || 'todas';

  const rawList = Array.isArray(MOCK_DATA.mensagensRapidas) ? MOCK_DATA.mensagensRapidas : (MOCK_DATA.mensagensRapidas?.list || []);
  const list = rawList.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search) || m.preview.toLowerCase().includes(search);
    const matchCat = cat === 'todas' || m.category === cat;
    return matchSearch && matchCat;
  });

  tbody.innerHTML = list.map(item => {
    const isSelected = item.id === selectedQuickMessageId;
    const starIcon = item.favorite ? 'fa-solid fa-star' : 'fa-regular fa-star';
    const starColor = item.favorite ? '#f59e0b' : '#cbd5e1';

    return `
      <tr class="${isSelected ? 'selected' : ''}" onclick="selectQuickMessage('${item.id}')" style="cursor:pointer;">
        <td>
          <div style="display:flex;align-items:flex-start;gap:10px;">
            <i class="${starIcon}" style="color:${starColor};margin-top:2px;cursor:pointer;" onclick="event.stopPropagation(); toggleQuickMessageFavorite('${item.id}')"></i>
            <div>
              <strong style="font-size:12.5px;display:block;">${item.title}</strong>
              <span style="font-size:11px;color:#64748b;display:block;max-width:320px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.preview}</span>
            </div>
          </div>
        </td>
        <td><span class="badge ${item.catBadge}">${item.category}</span></td>
        <td>${item.department}</td>
        <td><span style="font-weight:600;font-size:11.5px;color:#64748b;">{x} ${item.variablesCount}</span></td>
        <td><strong>${item.uses}</strong></td>
        <td>
          <label class="switch-toggle" onclick="event.stopPropagation();">
            <input type="checkbox" ${item.active ? 'checked' : ''} onchange="toggleQuickMessageStatus('${item.id}', this.checked)">
            <span class="slider-round"></span>
          </label>
        </td>
        <td>
          <div class="table-actions-cell" onclick="event.stopPropagation();">
            <button class="btn-icon" title="Editar" onclick="selectQuickMessage('${item.id}'); toggleQmDrawer(true);"><i class="fa-solid fa-pen" style="font-size:11px;"></i></button>
            <button class="btn-icon" title="Duplicar" onclick="showToast('Mensagem duplicada')"><i class="fa-regular fa-clone" style="font-size:11px;"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterQuickMessages() {
  renderQuickMessages();
}

function selectQuickMessage(id) {
  selectedQuickMessageId = id;
  renderQuickMessages();

  const msg = MOCK_DATA.mensagensRapidas.list.find(m => m.id === id);
  if (!msg) return;

  const titleEl = document.getElementById('qmEditTitle');
  const catEl = document.getElementById('qmEditCategory');
  const deptEl = document.getElementById('qmEditDept');
  const textEl = document.getElementById('qmEditText');
  const statusEl = document.getElementById('qmEditStatus');
  const countT = document.getElementById('qmCharCountTitle');
  const countM = document.getElementById('qmCharCountMsg');

  if (titleEl) titleEl.value = msg.title;
  if (catEl) catEl.value = msg.category;
  if (deptEl) deptEl.value = msg.department;
  if (textEl) textEl.value = msg.preview;
  if (statusEl) statusEl.value = msg.active ? 'Ativa' : 'Inativa';
  if (countT) countT.innerText = `${msg.title.length}/100`;
  if (countM) countM.innerText = `${msg.preview.length}/1024`;

  toggleQmDrawer(true);
}

function toggleQmDrawer(open) {
  const drawer = document.getElementById('qmDetailsDrawer');
  if (drawer) drawer.style.display = open ? 'flex' : 'none';
}

function toggleQuickMessageFavorite(id) {
  const msg = MOCK_DATA.mensagensRapidas.list.find(m => m.id === id);
  if (msg) {
    msg.favorite = !msg.favorite;
    renderQuickMessages();
    showToast(msg.favorite ? 'Mensagem favoritada!' : 'Mensagem removida dos favoritos');
  }
}

function toggleQuickMessageStatus(id, active) {
  const msg = MOCK_DATA.mensagensRapidas.list.find(m => m.id === id);
  if (msg) {
    msg.active = active;
    showToast(`Status da mensagem alterado para: ${active ? 'Ativa' : 'Inativa'}`);
  }
}

function insertVariableToMessage(variableTag) {
  const textarea = document.getElementById('qmEditText');
  if (textarea) {
    textarea.value += ' ' + variableTag;
    textarea.focus();
    const countM = document.getElementById('qmCharCountMsg');
    if (countM) countM.innerText = `${textarea.value.length}/1024`;
  }
}

function insertEmojiInQm(emoji) {
  const textarea = document.getElementById('qmEditText');
  if (textarea) {
    textarea.value += ' ' + emoji;
    textarea.focus();
    const countM = document.getElementById('qmCharCountMsg');
    if (countM) countM.innerText = `${textarea.value.length}/1024`;
  }
}

function saveSelectedQuickMessage() {
  const msg = MOCK_DATA.mensagensRapidas.list.find(m => m.id === selectedQuickMessageId);
  if (!msg) return;

  const titleEl = document.getElementById('qmEditTitle');
  const catEl = document.getElementById('qmEditCategory');
  const deptEl = document.getElementById('qmEditDept');
  const textEl = document.getElementById('qmEditText');
  const statusEl = document.getElementById('qmEditStatus');

  if (titleEl) msg.title = titleEl.value;
  if (catEl) msg.category = catEl.value;
  if (deptEl) msg.department = deptEl.value;
  if (textEl) msg.preview = textEl.value;
  if (statusEl) msg.active = statusEl.value === 'Ativa';

  renderQuickMessages();
  showToast('Mensagem rápida atualizada com sucesso!');
}

function deleteSelectedQuickMessage() {
  const idx = MOCK_DATA.mensagensRapidas.list.findIndex(m => m.id === selectedQuickMessageId);
  if (idx !== -1) {
    MOCK_DATA.mensagensRapidas.list.splice(idx, 1);
    if (MOCK_DATA.mensagensRapidas.list.length > 0) {
      selectedQuickMessageId = MOCK_DATA.mensagensRapidas.list[0].id;
    }
    renderQuickMessages();
    showToast('Mensagem rápida excluída');
  }
}

function openModalNovaMensagem() {
  openModal('modalNovaMensagem');
}

function salvarNovaMensagemRapida() {
  const title = document.getElementById('modalQmTitle')?.value;
  const category = document.getElementById('modalQmCategory')?.value;
  const dept = document.getElementById('modalQmDept')?.value;
  const text = document.getElementById('modalQmText')?.value;

  if (!title || !text) {
    showToast('Preencha o título e o texto da mensagem');
    return;
  }

  MOCK_DATA.mensagensRapidas.list.unshift({
    id: `msg-${Date.now()}`,
    title,
    preview: text,
    category: category || "Saudação",
    catBadge: 'badge-comercial',
    department: dept || "Todos",
    variablesCount: 0,
    uses: 1,
    active: true,
    favorite: false
  });

  closeModal('modalNovaMensagem');
  renderQuickMessages();
  showToast('Nova mensagem rápida cadastrada com sucesso!');
}
