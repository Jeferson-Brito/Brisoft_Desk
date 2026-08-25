// ==========================================================================
// CORE - REALTIME API & WEBSOCKET CONNECTOR
// ==========================================================================

const API_CONFIG = {
  baseUrl: 'http://localhost:3000',
  socket: null,
  whatsappStatus: 'disconnected',
  _firstConnect: true   // Só busca tickets completos na primeira conexão
};

function initRealtimeConnection() {
  if (typeof io === 'undefined') {
    console.warn('⚠️ Biblioteca Socket.io não carregada no navegador.');
    return;
  }

  try {
    API_CONFIG.socket = io(API_CONFIG.baseUrl, {
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 15000,
      transports: ['websocket', 'polling']
    });

    // 1. Status do WhatsApp
    API_CONFIG.socket.on('whatsapp_status', (data) => {
      console.log('📡 Status WhatsApp:', data.status);
      API_CONFIG.whatsappStatus = data.status;
      updateWhatsAppUI(data);
      if (data.qrCode && data.status === 'scan_qr') {
        showWhatsAppQrModal(data.qrCode);
      }
    });

    // 2. QR Code recebido
    API_CONFIG.socket.on('whatsapp_qr', (data) => {
      console.log('📲 QR Code recebido do servidor!');
      showWhatsAppQrModal(data.qrCode);
    });

    // 3. Nova mensagem recebida do cliente — ATUALIZAÇÃO INCREMENTAL (sem piscar)
    API_CONFIG.socket.on('new_message', (data) => {
      console.log('📩 Nova mensagem via WebSocket:', data.ticketId);
      handleIncomingRealtimeMessage(data);
    });

    // 4. Resposta enviada pelo atendente (confirmação do servidor)
    API_CONFIG.socket.on('agent_replied', (data) => {
      // Não faz nada: o frontend já renderizou a mensagem localmente em sendChatMessage()
      // Apenas atualiza o status de entregue se necessário
      console.log('📤 Confirmação agent_replied:', data.ticketId);
    });

    // 5. Ticket atualizado (assumido, status alterado, etc.)
    API_CONFIG.socket.on('ticket_updated', (data) => {
      const { ticket } = data;
      if (!ticket) return;
      const idx = MOCK_DATA.atendimentos.findIndex(a => a.id === ticket.id);
      if (idx !== -1) {
        const existingMsgs = MOCK_DATA.atendimentos[idx].messages || [];
        MOCK_DATA.atendimentos[idx] = { ...ticket, messages: ticket.messages || existingMsgs };
      } else {
        MOCK_DATA.atendimentos.unshift(ticket);
      }
      if (typeof renderQueueList === 'function') renderQueueList();
    });

    // 6. KPIs atualizados (nova mensagem, ticket encerrado, avaliação recebida)
    API_CONFIG.socket.on('kpis_updated', () => {
      if (typeof fetchAndUpdateKpis === 'function') fetchAndUpdateKpis();
      if (typeof renderDashboard === 'function') renderDashboard();
    });

    // 7. Notificações específicas (Novo ticket e Avaliação recebida)
    API_CONFIG.socket.on('ticket_created', (data) => {
      const t = data.ticket;
      if (!t) return;
      // Exibe notificação de novo ticket
      if (typeof showToast === 'function') showToast(`Novo atendimento recebido: ${t.client_name}`);
    });

    API_CONFIG.socket.on('rating_received', (data) => {
      // Exibe notificação de avaliação SOMENTE para o atendente que finalizou o ticket
      if (data.agentName && MOCK_DATA.currentUser.name !== data.agentName) return;
      if (typeof showToast === 'function') showToast(`O cliente avaliou seu atendimento com ${data.rating} estrelas!`);
    });

    // 8. Evento de conexão — só busca tickets completos na 1ª vez
    API_CONFIG.socket.on('connect', () => {
      console.log('✅ Conectado ao servidor Brisoft Desk!');
      updateConnectionBadge(true);

      if (API_CONFIG._firstConnect) {
        API_CONFIG._firstConnect = false;
        fetchRealTickets();
      }
    });

    API_CONFIG.socket.on('disconnect', () => {
      console.warn('⚠️ Desconectado do servidor.');
      updateConnectionBadge(false);
    });

    API_CONFIG.socket.on('reconnect', () => {
      console.log('🔄 Reconectado ao servidor.');
      updateConnectionBadge(true);
      // Ao reconectar, sincroniza tickets silenciosamente SEM re-renderizar o chat
      syncTicketsSilent();
    });

  } catch (err) {
    console.error('Erro ao conectar WebSocket:', err);
  }
}

function updateConnectionBadge(online) {
  const badge = document.getElementById('serverConnectionBadge');
  if (!badge) return;
  if (online) {
    badge.innerHTML = '<span class="pulse-dot"></span> <span>Servidor Online</span>';
    badge.style.color = '#16a34a';
  } else {
    badge.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> <span>Servidor Offline</span>';
    badge.style.color = '#ef4444';
  }
}

// Sincronização silenciosa — atualiza dados mas NÃO re-renderiza o chat ativo
async function syncTicketsSilent() {
  try {
    const res = await fetch(`${API_CONFIG.baseUrl}/api/tickets`);
    const data = await res.json();
    if (data.success && Array.isArray(data.tickets) && data.tickets.length > 0) {
      // Mescla tickets do servidor com mensagens locais
      data.tickets.forEach(serverTicket => {
        const localIdx = MOCK_DATA.atendimentos.findIndex(a => a.id === serverTicket.id);
        if (localIdx !== -1) {
          const localMsgs = MOCK_DATA.atendimentos[localIdx].messages || [];
          const serverMsgs = serverTicket.messages || [];
          // Usa o array maior (mais completo)
          MOCK_DATA.atendimentos[localIdx] = {
            ...serverTicket,
            unreadCount: serverTicket.unread_count || 0,
            messages: serverMsgs.length >= localMsgs.length ? serverMsgs : localMsgs
          };
        } else {
          MOCK_DATA.atendimentos.push({
            ...serverTicket,
            unreadCount: serverTicket.unread_count || 0
          });
        }
      });
      if (typeof renderQueueList === 'function') renderQueueList();
    }
  } catch (e) {
    // Silencioso — não imprime erro ao reconectar
  }
}

// Carregamento completo na inicialização
async function fetchRealTickets() {
  try {
    const res = await fetch(`${API_CONFIG.baseUrl}/api/tickets`);
    const data = await res.json();
    if (data.success && Array.isArray(data.tickets)) {
      MOCK_DATA.atendimentos = data.tickets.map(t => ({
        ...t,
        unreadCount: t.unread_count || 0
      }));

      // Detecta se há tickets em atendimento para selecionar a aba e ticket corretos
      const emAtendimento = data.tickets.filter(t => t.status === 'em_atendimento');
      const aguardando    = data.tickets.filter(t => t.status === 'aguardando');

      if (emAtendimento.length > 0) {
        // Há atendimento assumido — vai direto pra aba em_atendimento
        if (typeof activeQueueTab !== 'undefined') activeQueueTab = 'em_atendimento';
        selectedAtendimentoId = emAtendimento[0].id;
      } else if (aguardando.length > 0) {
        if (typeof activeQueueTab !== 'undefined') activeQueueTab = 'aguardando';
        selectedAtendimentoId = aguardando[0].id;
      } else if (data.tickets.length > 0) {
        selectedAtendimentoId = data.tickets[0].id;
      }

      if (typeof renderQueueList === 'function') renderQueueList();
      if (typeof renderActiveChat === 'function') renderActiveChat();
    }
  } catch (e) {
    console.warn('Não foi possível carregar tickets do servidor:', e);
  }
}

function updateWhatsAppUI(data) {
  const statusEl = document.getElementById('whatsappStatusText');
  const dotEl = document.getElementById('whatsappStatusDot');
  const btnConnect = document.getElementById('btnConnectWhatsapp');

  if (data.status === 'connected') {
    if (statusEl) statusEl.innerText = 'WhatsApp Conectado';
    if (dotEl) dotEl.style.backgroundColor = '#22c55e';
    if (btnConnect) {
      btnConnect.innerText = 'Conectado';
      btnConnect.style.backgroundColor = '#16a34a';
    }
    closeModal('modalWhatsappQr');
  } else if (data.status === 'scan_qr') {
    if (statusEl) statusEl.innerText = 'Aguardando Leitura do QR Code';
    if (dotEl) dotEl.style.backgroundColor = '#f59e0b';
    if (data.qrCode) showWhatsAppQrModal(data.qrCode);
  } else {
    if (statusEl) statusEl.innerText = 'Conectar WhatsApp';
    if (dotEl) dotEl.style.backgroundColor = '#ef4444';
    if (btnConnect) {
      btnConnect.innerText = 'Conectar WhatsApp';
      btnConnect.style.backgroundColor = 'var(--brand-primary)';
    }
  }
}

function showWhatsAppQrModal(qrCodeBase64) {
  if (!qrCodeBase64) return;
  const qrImg = document.getElementById('whatsappQrImage');
  const qrPlaceholder = document.getElementById('whatsappQrPlaceholder');
  if (qrImg) {
    qrImg.src = qrCodeBase64;
    qrImg.style.display = 'block';
    if (qrPlaceholder) qrPlaceholder.style.display = 'none';
  }
  openModal('modalWhatsappQr');
}

// Atualiza mensagens incrementalmente (SEM piscar)
function appendMessageToChat(msg, ticket) {
  const msgBox = document.getElementById('chatMessagesBox');
  if (!msgBox || !ticket) return;

  // Verifica se a mensagem já existe no DOM
  const msgKey = `msg-${msg.time}-${(msg.text || '').substring(0, 10).replace(/\s/g, '')}`;
  if (msgBox.querySelector(`[data-msg-key="${msgKey}"]`)) return;

  const div = document.createElement('div');
  div.setAttribute('data-msg-key', msgKey);

  if (msg.type === 'divider') {
    div.className = 'chat-divider-row';
    div.innerHTML = `<div class="chat-divider-pill">${(msg.text || '').replace(/\n/g, '<br>')}</div>`;
  } else if (msg.sender === 'client') {
    div.className = 'chat-bubble-row';
    div.innerHTML = `
      <div class="initial-avatar" style="background:${ticket.avatarColor || '#2563eb'};width:28px;height:28px;font-size:10px;">${ticket.initials || 'CL'}</div>
      <div class="chat-bubble incoming">
        <div>${(msg.text || '').replace(/\n/g, '<br>')}</div>
        <div class="chat-bubble-time">${msg.time || ''}</div>
      </div>`;
  } else {
    // Formata o texto do agente: *Nome*:\n\nMensagem → exibe com header em negrito
    const rawText = msg.text || '';
    const agentFormatMatch = rawText.match(/^\*(.+?)\*:\n\n([\s\S]*)$/);
    const bubbleContent = agentFormatMatch
      ? `<div style="font-weight:700;font-size:11px;color:#1d4ed8;margin-bottom:4px;">${agentFormatMatch[1]}</div><div>${agentFormatMatch[2].replace(/\n/g, '<br>')}</div>`
      : `<div>${rawText.replace(/\n/g, '<br>')}</div>`;
    div.className = 'chat-bubble-row outgoing';
    div.innerHTML = `
      <div class="chat-bubble outgoing">
        ${bubbleContent}
        <div class="chat-bubble-time">
          ${msg.time || ''}
          <i class="fa-solid fa-check-double" style="margin-left:3px;"></i>
        </div>
      </div>`;
  }

  msgBox.appendChild(div);
  msgBox.scrollTop = msgBox.scrollHeight;
}

function handleIncomingRealtimeMessage(data) {
  const { ticketId, message, contact, ticket } = data;

  let currentTicket = MOCK_DATA.atendimentos.find(a => a.id === ticketId);

  if (!currentTicket && ticket) {
    // Novo ticket — adiciona com dados completos
    MOCK_DATA.atendimentos.unshift(ticket);
    currentTicket = ticket;
    if (!selectedAtendimentoId) {
      selectedAtendimentoId = ticket.id;
    }
  } else if (!currentTicket) {
    const phone = contact?.phone || 'WhatsApp';
    const name = contact?.name || `Cliente ${phone.slice(-4)}`;
    currentTicket = {
      id: ticketId,
      clientName: name,
      initials: name.substring(0, 2).toUpperCase(),
      avatarColor: '#2563eb',
      channel: 'whatsapp',
      phone,
      time: message.time || 'Agora',
      preview: message.text,
      department: 'Comercial',
      status: 'aguardando',
      assumed: false,
      contact: { phone, email: '', cnpj: '', since: new Date().toLocaleDateString('pt-BR'), history: [], notes: [], tags: ['WhatsApp'] },
      messages: []
    };
    MOCK_DATA.atendimentos.unshift(currentTicket);
    if (!selectedAtendimentoId) selectedAtendimentoId = ticketId;
  } else {
  // Ticket existente — atualiza preview
    currentTicket.preview = message.text;
    currentTicket.time = message.time || 'Agora';
  }

  // Lógica do contador de mensagens não lidas
  if (message.sender === 'client' && currentTicket.id !== selectedAtendimentoId) {
    currentTicket.unreadCount = (currentTicket.unreadCount || 0) + 1;
  }

  const isNewTicket = !MOCK_DATA.atendimentos.find(a => a.id === ticketId);

  // Adiciona mensagem ao array local
  if (!currentTicket.messages) currentTicket.messages = [];
  currentTicket.messages.push(message);

  // Atualiza a fila (sem piscar — só atualiza o card)
  if (typeof renderQueueList === 'function') renderQueueList();

  // Mensagens do agente já foram renderizadas localmente por sendChatMessage — ignora duplicata
  const isAgentMsg = message.sender === 'agent';
  if (!isAgentMsg) {
    // Se esse é o ticket ativo, adiciona a mensagem incrementalmente (SEM piscar)
    if (selectedAtendimentoId === ticketId || selectedAtendimentoId === currentTicket.id) {
      appendMessageToChat(message, currentTicket);
    }
  }

  // Toast e som apenas para mensagens do cliente
  if (message.sender === 'client' || !message.sender) {
    const clientName = contact?.name || ticket?.clientName || currentTicket?.clientName || 'Cliente';
    const shortMsg = (message.text || '').substring(0, 40);
    showToast(`💬 ${clientName}: "${shortMsg}"`);

    if (isNewTicket) {
      playNewTicketSound();   // Novo chat na fila: som de destaque
    } else {
      playNewMessageSound();  // Resposta em chat existente: som suave
    }
  }
}

// Som suave de "pop" — nova mensagem em chat já existente
function playNewMessageSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.18);
  } catch(e) { /* Áudio bloqueado */ }
}

// Som de destaque — novo chat entrando na fila (dois "pings" ascendentes)
function playNewTicketSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    function ping(freq, startTime, duration) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    }

    // Dois pings: primeiro em 900Hz, depois em 1300Hz
    ping(900,  ctx.currentTime,        0.22);
    ping(1300, ctx.currentTime + 0.26, 0.22);
  } catch(e) { /* Áudio bloqueado */ }
}

function handleAgentRepliedRealtime(data) {
  // Confirmação do servidor: apenas loga, não re-renderiza
  console.log('📤 Resposta confirmada pelo servidor:', data.ticketId);
}

async function dispatchMessageToServer(ticketId, text) {
  try {
    console.log(`📤 Enviando mensagem para API (Ticket ${ticketId}): "${text}"`);
    const res = await fetch(`${API_CONFIG.baseUrl}/api/tickets/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketId,
        text,
        agentName: MOCK_DATA.currentUser.name
      })
    });
    const result = await res.json();
    if (!result.success) {
      console.warn('⚠️ Servidor retornou erro ao enviar:', result);
    }
    return result;
  } catch (err) {
    console.warn('⚠️ Erro ao conectar ao servidor backend:', err);
    return { success: false, offline: true };
  }
}

async function requestWhatsAppConnect() {
  try {
    openModal('modalWhatsappQr');
    const qrPlaceholder = document.getElementById('whatsappQrPlaceholder');
    if (qrPlaceholder) {
      qrPlaceholder.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size:36px;color:var(--brand-primary);margin-bottom:8px;"></i><span>Gerando QR Code...</span>';
      qrPlaceholder.style.display = 'flex';
    }
    const res = await fetch(`${API_CONFIG.baseUrl}/api/whatsapp/connect`, { method: 'POST' });
    const data = await res.json();
    if (data.qrCode) showWhatsAppQrModal(data.qrCode);
  } catch (err) {
    showToast('Não foi possível conectar ao servidor backend na porta 3000');
  }
}
