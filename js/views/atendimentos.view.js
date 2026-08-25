// ==========================================================================
// VIEW CONTROLLER - ATENDIMENTOS (CHAT & FILA)
// ==========================================================================

let activeQueueTab = 'aguardando';
let selectedAtendimentoId = null;
let isContactDetailsOpen = false;

function switchQueueTab(tabName) {
  activeQueueTab = tabName;
  const tabWait = document.getElementById('queueTabWaiting');
  const tabAct = document.getElementById('queueTabActive');
  if (tabWait) tabWait.classList.toggle('active', tabName === 'aguardando');
  if (tabAct) tabAct.classList.toggle('active', tabName === 'em_atendimento');
  renderQueueList();
}

function renderQueueList() {
  const container = document.getElementById('queueListContainer');
  if (!container) return;

  // Conta os atendimentos por status para atualizar as abas
  const countAguardando = MOCK_DATA.atendimentos.filter(a => a.status === 'aguardando').length;
  const countEmAtendimento = MOCK_DATA.atendimentos.filter(a => a.status === 'em_atendimento').length;

  const tabWait = document.getElementById('queueTabWaiting');
  const tabAct = document.getElementById('queueTabActive');
  
  if (tabWait) tabWait.innerText = `Aguardando (${countAguardando})`;
  if (tabAct) tabAct.innerText = `Em atendimento (${countEmAtendimento})`;

  const searchTerm = (document.getElementById('queueSearchInput')?.value || '').toLowerCase();
  
  let list = MOCK_DATA.atendimentos.filter(item => {
    const matchTab = activeQueueTab === 'aguardando' ? item.status === 'aguardando' : item.status === 'em_atendimento';
    
    const cName = (item.clientName || '').toLowerCase();
    const cPrev = (item.preview || '').toLowerCase();
    const cDept = (item.department || '').toLowerCase();
    
    const matchSearch = cName.includes(searchTerm) || cPrev.includes(searchTerm) || cDept.includes(searchTerm);
    return matchTab && matchSearch;
  });

  if (list.length === 0) {
    container.innerHTML = `
      <div style="padding: 40px 16px; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <i class="fa-brands fa-whatsapp" style="font-size: 32px; color: #22c55e; margin-bottom: 10px;"></i>
        <strong style="color: #334155; font-size: 13px; margin-bottom: 4px;">Fila Vazia</strong>
        <span style="font-size: 11px; line-height: 1.4; color: #64748b;">Aguardando novas mensagens de clientes no WhatsApp...</span>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => {
    const isSelected = item.id === selectedAtendimentoId;
    const deptColor = item.departmentColor || '#6366f1';
    const deptName = item.department || 'Geral';
    return `
      <div class="queue-card ${isSelected ? 'active' : ''}" onclick="selectAtendimento('${item.id}')">
        <div class="initial-avatar" style="background:${item.avatarColor || '#2563eb'}">${item.initials || 'CL'}</div>
        <div class="queue-card-content">
          <div class="queue-card-top">
            <span class="queue-card-name">
              ${item.clientName}
              <i class="fa-brands fa-whatsapp"></i>
            </span>
            <div style="display:flex;align-items:center;gap:6px;">
              ${item.unreadCount ? `<span class="badge" style="background:#ef4444;color:white;min-width:18px;text-align:center;padding:2px 4px;border-radius:10px;">${item.unreadCount}</span>` : ''}
              <span class="queue-card-time">${item.time}</span>
            </div>
          </div>
          <span class="queue-card-msg">${item.preview}</span>
          <div class="queue-card-bottom">
            <span style="
              display: inline-flex;
              align-items: center;
              gap: 5px;
              font-size: 10px;
              font-weight: 600;
              letter-spacing: 0.03em;
              padding: 2px 8px;
              border-radius: 20px;
              background: ${deptColor}22;
              color: ${deptColor};
              border: 1px solid ${deptColor}55;
            "><i class="fa-solid fa-circle" style="font-size:6px;"></i>${deptName}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterQueueList() {
  renderQueueList();
}

function selectAtendimento(id) {
  selectedAtendimentoId = id;
  const current = MOCK_DATA.atendimentos.find(a => a.id === id);
  if (current) {
    current.unreadCount = 0;
    current.unread_count = 0;
    // Marca como lido no banco de dados de forma assíncrona
    fetch(`${API_CONFIG.baseUrl}/api/tickets/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: id })
    }).catch(console.error);
  }
  
  renderQueueList();
  renderActiveChat();
}

function renderActiveChat() {
  const current = MOCK_DATA.atendimentos.find(a => a.id === selectedAtendimentoId) || MOCK_DATA.atendimentos[0];
  const btnAssumir = document.getElementById('btnAssumirChat');

  if (!current) {
    // Sem atendimento selecionado: esconde ambos os botões
    const btnA = document.getElementById('btnAssumirChat');
    const btnE = document.getElementById('btnEncerrarChat');
    if (btnA) btnA.style.display = 'none';
    if (btnE) btnE.style.display = 'none';
    const msgBox = document.getElementById('chatMessagesBox');
    if (msgBox) {
      msgBox.innerHTML = `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#94a3b8;gap:12px;margin:auto;">
          <div style="width:52px;height:52px;border-radius:50%;background:#eff6ff;color:var(--brand-primary);display:flex;align-items:center;justify-content:center;font-size:22px;">
            <i class="fa-regular fa-comments"></i>
          </div>
          <strong style="color:#334155;font-size:14px;">Central Pronta para Atendimento</strong>
          <p style="font-size:11.5px;color:#64748b;max-width:300px;text-align:center;margin:0;line-height:1.45;">
            Conecte seu WhatsApp no topo da tela. As mensagens reais dos clientes aparecerão aqui automaticamente.
          </p>
        </div>
      `;
    }
    const titleEl = document.getElementById('activeChatTitle');
    if (titleEl) titleEl.innerText = 'Aguardando Atendimentos';
    const avatarEl = document.getElementById('activeChatAvatar');
    if (avatarEl) {
      avatarEl.innerText = 'WA';
      avatarEl.style.backgroundColor = '#22c55e';
    }
    return;
  }

  const titleEl = document.getElementById('activeChatTitle');
  if (titleEl) titleEl.innerText = current.clientName;

  const avatarEl = document.getElementById('activeChatAvatar');
  if (avatarEl) {
    avatarEl.innerText = current.initials || 'CL';
    avatarEl.style.backgroundColor = current.avatarColor || '#2563eb';
  }

  // Controla visibilidade dos botões Assumir / Encerrar e do input de mensagem
  const btnEncerrar = document.getElementById('btnEncerrarChat');
  const chatFooter = document.getElementById('chatFooter');

  if (current.status === 'finalizado') {
    // Atendimento finalizado: esconde tudo
    if (btnAssumir) btnAssumir.style.display = 'none';
    if (btnEncerrar) btnEncerrar.style.display = 'none';
    if (chatFooter) chatFooter.style.display = 'none';
  } else if (current.assumed || current.status === 'em_atendimento') {
    // Assumido: mostra só Encerrar e input de mensagem
    if (btnAssumir) btnAssumir.style.display = 'none';
    if (btnEncerrar) btnEncerrar.style.display = 'inline-flex';
    if (chatFooter) chatFooter.style.display = 'block';
  } else {
    // Aguardando: mostra só Assumir, esconde input
    if (btnAssumir) btnAssumir.style.display = 'inline-flex';
    if (btnEncerrar) btnEncerrar.style.display = 'none';
    if (chatFooter) chatFooter.style.display = 'none';
  }

  const msgBox = document.getElementById('chatMessagesBox');
  if (msgBox) {
    let messagesHTML = `<div class="chat-date-pill">Hoje</div>`;

    current.messages.forEach(msg => {
      if (msg.type === 'divider') {
        messagesHTML += `
          <div class="chat-divider-row">
            <div class="chat-divider-pill">${(msg.text || '').replace(/\n/g, '<br>')}</div>
          </div>
        `;
      } else if (msg.sender === 'client') {
        messagesHTML += `
          <div class="chat-bubble-row">
            <div class="initial-avatar" style="background:${current.avatarColor || '#2563eb'};width:28px;height:28px;font-size:10px;">${current.initials || 'CL'}</div>
            <div class="chat-bubble incoming">
              <div>${(msg.text || '').replace(/\n/g, '<br>')}</div>
              <div class="chat-bubble-time">${msg.time || ''}</div>
            </div>
          </div>
        `;
      } else {
        // Formata o texto do agente: *Nome*:\n\nMensagem → exibe com header em negrito
        const rawText = msg.text || '';
        const agentFormatMatch = rawText.match(/^\*(.+?)\*:\n\n([\s\S]*)$/);
        const bubbleContent = agentFormatMatch
          ? `<div style="font-weight:700;font-size:11px;color:#1d4ed8;margin-bottom:4px;">${agentFormatMatch[1]}</div><div>${agentFormatMatch[2].replace(/\n/g, '<br>')}</div>`
          : `<div>${rawText.replace(/\n/g, '<br>')}</div>`;
        messagesHTML += `
          <div class="chat-bubble-row outgoing">
            <div class="chat-bubble outgoing">
              ${bubbleContent}
              <div class="chat-bubble-time">
                ${msg.time || ''}
                <i class="fa-solid fa-check-double" style="margin-left:3px;"></i>
              </div>
            </div>
          </div>
        `;
      }
    });

    msgBox.innerHTML = messagesHTML;
    msgBox.scrollTop = msgBox.scrollHeight;
  }

  // Dados do Contato
  const c = current.contact || {};
  const detAvatar = document.getElementById('detailsAvatar');
  if (detAvatar) {
    detAvatar.innerText = current.initials;
    detAvatar.style.backgroundColor = current.avatarColor;
  }

  const detName = document.getElementById('detailsName');
  if (detName) detName.innerHTML = `${current.clientName} <i class="fa-brands fa-whatsapp" style="color:#22c55e;font-size:13px;"></i>`;

  const detPhone = document.getElementById('detailsPhone');
  if (detPhone) detPhone.innerText = c.phone || '(11) 98765-4321';

  const detEmail = document.getElementById('detailsEmail');
  if (detEmail) detEmail.innerText = c.email || 'contato@acme.com.br';

  const detCnpj = document.getElementById('detailsCnpj');
  if (detCnpj) detCnpj.innerText = `CNPJ: ${c.cnpj || '12.345.678/0001-99'}`;

  const detSince = document.getElementById('detailsSince');
  if (detSince) detSince.innerText = `Cliente desde: ${c.since || '15/03/2023'}`;

  const historyListEl = document.getElementById('contactHistoryList');
  if (historyListEl) {
    if (c.history && c.history.length > 0) {
      historyListEl.innerHTML = c.history.map(h => `
        <div class="history-mini-item">
          <div class="history-mini-top">
            <span class="history-mini-date">${h.date}</span>
            <span class="badge badge-finalizado" style="font-size:9.5px;padding:1px 6px;">${h.status}</span>
          </div>
          <span class="history-mini-subject">${h.subject}</span>
        </div>
      `).join('');
    } else {
      historyListEl.innerHTML = '<span style="font-size:11px;color:#94a3b8;">Nenhum atendimento anterior</span>';
    }
  }

  const notesCard = document.getElementById('contactNotesCard');
  if (notesCard) {
    if (c.notes && c.notes.length > 0) {
      const noteTxt = document.getElementById('contactNoteText');
      const noteAuth = document.getElementById('contactNoteAuthor');
      if (noteTxt) noteTxt.innerText = c.notes[0].text;
      if (noteAuth) noteAuth.innerText = `Adicionado em ${c.notes[0].date} por ${c.notes[0].author}`;
      notesCard.style.display = 'flex';
    } else {
      notesCard.style.display = 'none';
    }
  }

  const tagsContainer = document.getElementById('contactTagsContainer');
  if (tagsContainer && c.tags && c.tags.length > 0) {
    tagsContainer.innerHTML = c.tags.map((tag, idx) => `
      <span class="tag-pill ${idx % 2 === 0 ? 'tag-blue' : 'tag-purple'}">${tag}</span>
    `).join('');
  }
}

function toggleContactDetails(forceState) {
  if (typeof forceState === 'boolean') {
    isContactDetailsOpen = forceState;
  } else {
    isContactDetailsOpen = !isContactDetailsOpen;
  }

  const grid = document.querySelector('.atendimentos-main-grid');
  const col = document.getElementById('contactDetailsCol');
  const icon = document.getElementById('contactDetailsToggleIcon');

  if (grid && col) {
    if (isContactDetailsOpen) {
      grid.classList.add('details-open');
      col.style.display = 'flex';
      if (icon) icon.className = 'fa-solid fa-chevron-up';
    } else {
      grid.classList.remove('details-open');
      col.style.display = 'none';
      if (icon) icon.className = 'fa-solid fa-chevron-down';
    }
  }
}

async function assumirAtendimento() {
  const current = MOCK_DATA.atendimentos.find(a => a.id === selectedAtendimentoId) || MOCK_DATA.atendimentos[0];
  if (!current) return;
  selectedAtendimentoId = current.id;

  // Atualização otimista: reflete na UI imediatamente
  current.assumed = true;
  current.status = 'em_atendimento';
  if (!current.messages) current.messages = [];
  current.messages.push({
    type: 'divider',
    text: `Atendimento assumido por ${MOCK_DATA.currentUser.name}`
  });

  renderQueueList();
  renderActiveChat();

  try {
    const res = await fetch('http://localhost:3000/api/tickets/assume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: current.id, agentName: MOCK_DATA.currentUser.name })
    });
    const result = await res.json();
    if (result.success) {
      showToast('✅ Atendimento assumido com sucesso!');
    } else {
      showToast('⚠️ Erro ao assumir atendimento no servidor.');
    }
  } catch (e) {
    console.warn('Erro ao persistir assumirAtendimento:', e);
    showToast('⚠️ Sem conexão com o servidor.');
  }
}

// Abre modal de confirmação de encerramento
function encerrarAtendimento() {
  const current = MOCK_DATA.atendimentos.find(a => a.id === selectedAtendimentoId) || MOCK_DATA.atendimentos[0];
  if (!current) return;

  const subtitleEl = document.getElementById('modalEncerrarSubtitle');
  if (subtitleEl) {
    subtitleEl.innerText = `Deseja encerrar o atendimento de ${current.clientName}? O chamado será marcado como finalizado.`;
  }
  const modal = document.getElementById('modalEncerrarAtendimento');
  if (modal) modal.classList.add('active');
}

function closeEncerrarModal() {
  const modal = document.getElementById('modalEncerrarAtendimento');
  if (modal) modal.classList.remove('active');
}

// Confirma e executa o encerramento
async function confirmarEncerramento() {
  closeEncerrarModal();

  const ticketIdToClose = selectedAtendimentoId;
  const current = MOCK_DATA.atendimentos.find(a => a.id === ticketIdToClose) || MOCK_DATA.atendimentos[0];
  if (!current) return;

  const clientName = current.clientName;
  const encerradoEm = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  try {
    const res = await fetch('http://localhost:3000/api/tickets/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: current.id, agentName: MOCK_DATA.currentUser.name })
    });
    const result = await res.json();

    if (result.success) {
      // Remove o ticket do array local para que não reapareça ao recarregar
      const idx = MOCK_DATA.atendimentos.findIndex(a => a.id === ticketIdToClose);
      if (idx !== -1) MOCK_DATA.atendimentos.splice(idx, 1);

      // Seleciona próximo ticket disponível, se houver
      const remaining = MOCK_DATA.atendimentos.filter(a => a.status !== 'finalizado');
      selectedAtendimentoId = remaining.length > 0 ? remaining[0].id : null;

      renderQueueList();
      renderActiveChat();
      showToast(`✅ Atendimento de ${clientName} encerrado com sucesso!`);
    } else {
      showToast('⚠️ Erro ao encerrar atendimento no servidor.');
    }
  } catch (e) {
    console.warn('Erro ao encerrar atendimento no servidor:', e);
    showToast('⚠️ Sem conexão com o servidor.');
  }
}

function switchChatMode(mode) {
  const modeResp = document.getElementById('chatModeResponder');
  const modeObs = document.getElementById('chatModeObs');
  if (modeResp) modeResp.classList.toggle('active', mode === 'responder');
  if (modeObs) modeObs.classList.toggle('active', mode === 'observacao');
  
  const input = document.getElementById('chatMessageInput');
  if (input) {
    if (mode === 'observacao') {
      input.placeholder = 'Digite uma observação interna (visível apenas para atendentes)...';
    } else {
      input.placeholder = 'Digite sua mensagem...';
    }
  }
}

function handleChatInput(e) {
  if (e.key === 'Enter') {
    sendChatMessage();
  }
}

function sendChatMessage() {
  const input = document.getElementById('chatMessageInput');
  const text = (input?.value || '').trim();
  if (!text) return;

  const current = MOCK_DATA.atendimentos.find(a => a.id === selectedAtendimentoId) || MOCK_DATA.atendimentos[0];
  if (!current) {
    showToast('Nenhum atendimento selecionado.');
    return;
  }
  selectedAtendimentoId = current.id;

  const isObs = document.getElementById('chatModeObs')?.classList.contains('active');
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Para mensagens reais, já armazena com o formato que o servidor vai enviar
  // (evita duplicata quando o socket retorna a mensagem formatada do servidor)
  const agentName = MOCK_DATA.currentUser.name;
  const formattedText = isObs
    ? null
    : `*${agentName}:*\n\n${text}`;

  const msg = isObs
    ? { type: 'divider', text: `📌 NOTA INTERNA (${agentName}): ${text}` }
    : { sender: 'agent', text: formattedText, time: timeStr, read: true };

  // Adiciona ao array local
  if (!current.messages) current.messages = [];
  current.messages.push(msg);

  // Limpa o input imediatamente
  input.value = '';

  // Adiciona mensagem ao DOM incrementalmente (SEM piscar)
  if (typeof appendMessageToChat === 'function') {
    appendMessageToChat(msg, current);
  }

  // Despacha para o servidor backend e WhatsApp (só para mensagens reais, não notas)
  // Passa o texto puro (sem formatação) para o servidor formatar e enviar
  if (!isObs && typeof dispatchMessageToServer === 'function') {
    dispatchMessageToServer(current.id, text);
  }
}

function insertEmoji(emoji) {
  const input = document.getElementById('chatMessageInput');
  if (input) {
    input.value += emoji;
    input.focus();
  }
}
