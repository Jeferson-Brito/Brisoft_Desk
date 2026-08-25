// ==========================================================================
// VIEW CONTROLLER - HISTÓRICO DE ATENDIMENTOS
// ==========================================================================

let selectedHistoryId = null;
let histFilterStatusVal = 'todas';

// Carrega histórico real da API e renderiza
async function fetchHistory() {
  try {
    const res = await fetch('http://localhost:3000/api/tickets/history');
    const data = await res.json();
    if (data.success && Array.isArray(data.history)) {
      MOCK_DATA.historico = data.history;
      renderHistoryList();
      if (data.history.length > 0 && !selectedHistoryId) {
        selectedHistoryId = data.history[0].id;
        renderActiveHistory();
      }
    }
  } catch (e) {
    console.warn('Não foi possível carregar histórico:', e);
  }
}

function filterHistoryStatus(status) {
  histFilterStatusVal = status;
  const tabAll = document.getElementById('histTabAll');
  const tabOng = document.getElementById('histTabOngoing');
  const tabDon = document.getElementById('histTabDone');
  if (tabAll) tabAll.classList.toggle('active', status === 'todas');
  if (tabOng) tabOng.classList.toggle('active', status === 'Em andamento');
  if (tabDon) tabDon.classList.toggle('active', status === 'Finalizado');
  renderHistoryList();
}


function renderHistoryList() {
  const container = document.getElementById('historyListContainer');
  if (!container) return;

  const search = (document.getElementById('histSearchInput')?.value || '').toLowerCase();
  const dept = document.getElementById('histFilterDept')?.value || 'todos';
  const agent = document.getElementById('histFilterAgent')?.value || 'todos';
  const status = document.getElementById('histFilterStatus')?.value || 'todos';
  const rating = document.getElementById('histFilterRating')?.value || 'todas';

  const list = MOCK_DATA.historico.filter(item => {
    const matchTab = histFilterStatusVal === 'todas' ? true : item.status === histFilterStatusVal;
    const matchSearch = item.clientName.toLowerCase().includes(search) ||
                        item.protocolo.toLowerCase().includes(search) ||
                        item.phone.toLowerCase().includes(search);
    const matchDept = dept === 'todos' || item.deptInitial === dept || item.deptFinal === dept;
    const matchAgent = agent === 'todos' || item.agent === agent;
    const matchStatus = status === 'todos' || item.status === status;
    const matchRating = rating === 'todas' || (item.rating && item.rating.toString() === rating);

    return matchTab && matchSearch && matchDept && matchAgent && matchStatus && matchRating;
  });

  const badge = document.getElementById('historyCountBadge');
  if (badge) badge.innerText = list.length;

  if (list.length === 0) {
    container.innerHTML = `
      <div style="padding: 24px; text-align: center; color: #94a3b8; font-size: 12px;">
        Nenhum registro encontrado no histórico
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => {
    const isSelected = item.id === selectedHistoryId;
    const starsHTML = item.rating ? `
      <span style="color:#f59e0b;font-size:11px;font-weight:700;display:flex;align-items:center;gap:2px;">
        <i class="fa-solid fa-star" style="font-size:9px;"></i> ${item.rating}
      </span>
    ` : '';

    return `
      <div class="queue-card ${isSelected ? 'active' : ''}" onclick="selectHistory('${item.id}')">
        <div class="initial-avatar" style="background:${item.avatarColor}">${item.initials}</div>
        <div class="queue-card-content">
          <div class="queue-card-top">
            <span class="queue-card-name">${item.clientName}</span>
            <span class="queue-card-time" style="color:#64748b;font-weight:500;">${item.time}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:10.5px;color:#64748b;">
            <span>Protocolo: <strong>${item.protocolo}</strong></span>
            <span class="badge ${item.status === 'Finalizado' ? 'badge-finalizado' : 'badge-andamento'}" style="font-size:9.5px;padding:1px 6px;">${item.status}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:2px;">
            <span class="queue-card-msg">${item.preview}</span>
            ${starsHTML}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterHistoryList() {
  renderHistoryList();
}

function resetHistoryFilters() {
  const sInput = document.getElementById('histSearchInput');
  const dInput = document.getElementById('histFilterDept');
  const aInput = document.getElementById('histFilterAgent');
  const stInput = document.getElementById('histFilterStatus');
  const rInput = document.getElementById('histFilterRating');
  
  if (sInput) sInput.value = '';
  if (dInput) dInput.value = 'todos';
  if (aInput) aInput.value = 'todos';
  if (stInput) stInput.value = 'todos';
  if (rInput) rInput.value = 'todas';
  
  histFilterStatusVal = 'todas';
  renderHistoryList();
  showToast('Filtros do histórico redefinidos');
}

function selectHistory(id) {
  selectedHistoryId = id;
  renderHistoryList();
  renderActiveHistory();
}

function renderActiveHistory() {
  const item = MOCK_DATA.historico.find(h => h.id === selectedHistoryId) || MOCK_DATA.historico[0];
  if (!item) return;

  const titleEl = document.getElementById('histChatTitle');
  const subEl = document.getElementById('histChatSubtitle');
  const protEl = document.getElementById('histChatProtocol');
  const avEl = document.getElementById('histChatAvatar');

  if (titleEl) titleEl.innerText = item.clientName;
  if (subEl) subEl.innerText = item.phone;
  if (protEl) protEl.innerText = `Protocolo ${item.protocolo}`;
  if (avEl) {
    avEl.innerText = item.initials;
    avEl.style.backgroundColor = item.avatarColor;
  }
  
  const statusBadge = document.getElementById('histChatStatusBadge');
  if (statusBadge) {
    statusBadge.innerText = item.status;
    statusBadge.className = `badge ${item.status === 'Finalizado' ? 'badge-finalizado' : 'badge-andamento'}`;
  }

  const box = document.getElementById('histMessagesBox');
  if (box) {
    const dataFormatada = item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : 'Hoje';
    let html = `<div class="chat-date-pill">${dataFormatada}</div>`;

    if (item.messages && item.messages.length > 0) {
      item.messages.forEach(msg => {
        if (msg.type === 'divider') {
          html += `<div class="chat-divider-row"><div class="chat-divider-pill">${msg.text.replace(/\n/g, '<br>')}</div></div>`;
        } else if (msg.type === 'satisfaction') {
          html += `
            <div class="satisfaction-card">
              <div class="satisfaction-header">
                <span class="satisfaction-title">Pesquisa de satisfação enviada • ${msg.sentTime}</span>
                <div class="satisfaction-stars">
                  <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
                  <span style="color:#1e293b;font-weight:700;margin-left:4px;font-size:11.5px;">${msg.stars}/5</span>
                </div>
              </div>
              <div class="satisfaction-quote">"${msg.comment}"</div>
            </div>
          `;
        } else if (msg.sender === 'client') {
          html += `
            <div class="chat-bubble-row">
              <div class="chat-bubble incoming">
                <div>${msg.text}</div>
                <div class="chat-bubble-time">${msg.time}</div>
              </div>
            </div>
          `;
        } else {
          let fileHTML = '';
          if (msg.file) {
            fileHTML = `
              <div class="file-attachment-card">
                <div class="file-pdf-icon"><i class="fa-regular fa-file-pdf"></i></div>
                <div class="file-info-text">
                  <span class="file-name">${msg.file.name}</span>
                  <span class="file-size">${msg.file.size}</span>
                </div>
                <i class="fa-solid fa-download" style="color:#64748b;margin-left:auto;font-size:12px;"></i>
              </div>
            `;
          }

          html += `
            <div class="chat-bubble-row outgoing">
              <div class="chat-bubble outgoing">
                <div>${(msg.text || '').replace(/\n/g, '<br>')}</div>
                ${fileHTML}
                <div class="chat-bubble-time">${msg.time} <i class="fa-solid fa-check-double"></i></div>
              </div>
            </div>
          `;
        }
      });
    }

    box.innerHTML = html;
  }

  const infoCl = document.getElementById('histInfoClient');
  const infoSt = document.getElementById('histInfoStatus');
  const infoPh = document.getElementById('histInfoPhone');
  const infoEm = document.getElementById('histInfoEmail');
  const infoStart = document.getElementById('histInfoStart');
  const infoEnd = document.getElementById('histInfoEnd');
  const infoAgName = document.getElementById('histInfoAgentName');
  const infoAgImg = document.getElementById('histInfoAgentImg');

  if (infoCl) infoCl.innerText = item.clientName;
  if (infoSt) infoSt.innerText = item.status;
  if (infoPh) infoPh.innerText = item.phone;
  if (infoEm) infoEm.innerText = item.email || 'Não informado';

  const startTimeStr = item.created_at ? new Date(item.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : (item.time || '--:--');
  const endTimeStr = item.closed_at ? new Date(item.closed_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : (item.encerrado_em || '--:--');

  if (infoStart) infoStart.innerText = startTimeStr;
  if (infoEnd) infoEnd.innerText = endTimeStr;
  if (infoAgName) infoAgName.innerText = item.agent;
  if (infoAgImg) infoAgImg.src = item.agentAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.agent) + '&background=f8fafc&color=334155';

  const timelineContainer = document.getElementById('histTimelineContainer');
  if (timelineContainer && item.timeline && item.timeline.length > 0) {
    timelineContainer.innerHTML = item.timeline.map(step => `
      <div class="timeline-step">
        <div class="timeline-dot"><i class="fa-solid fa-circle"></i></div>
        <span class="timeline-step-title">${step.title}</span>
        <span class="timeline-step-time">${step.time}</span>
      </div>
    `).join('');
  }

  // Preencher Indicadores Reais
  const msgCount = (item.messages || []).length;
  if (document.getElementById('indMsgCount')) {
    document.getElementById('indMsgCount').innerText = msgCount;
  }
  
  if (document.getElementById('indTransfers')) {
    document.getElementById('indTransfers').innerText = '0'; // Funcionalidade não implementada
  }

  // Cálculos de tempo
  const parseTime = (dateStr) => dateStr ? new Date(dateStr).getTime() : 0;
  const start = parseTime(item.created_at);
  const end = parseTime(item.closed_at);
  
  const formatDiff = (diffMs) => {
    if (diffMs <= 0 || isNaN(diffMs)) return '00:00:00';
    const s = Math.floor((diffMs / 1000) % 60);
    const m = Math.floor((diffMs / (1000 * 60)) % 60);
    const h = Math.floor(diffMs / (1000 * 60 * 60));
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  let totalTime = '00:00:00';
  if (start > 0 && end > 0) {
    totalTime = formatDiff(end - start);
  }
  
  if (document.getElementById('indTotalTime')) {
    document.getElementById('indTotalTime').innerText = totalTime;
  }

  // Tempo de espera (Fila -> Assumido)
  let waitTime = '00:00:00';
  let firstResponseTime = '00:00:00';
  let slaMet = true;

  if (start > 0) {
    // 1. Tempo de Espera (quando clicou em Assumir)
    if (item.assumed_at) {
      waitTime = formatDiff(parseTime(item.assumed_at) - start);
    } else {
      // Fallback para tickets antigos sem assumed_at
      if (item.messages) {
        const firstAgentMsg = item.messages.find(m => m.sender === 'agent');
        if (firstAgentMsg && firstAgentMsg.created_at) {
          waitTime = formatDiff(parseTime(firstAgentMsg.created_at) - start);
        }
      }
    }

    // 2. Primeira Resposta (quando mandou a 1ª mensagem)
    if (item.messages) {
      const firstAgentMsg = item.messages.find(m => m.sender === 'agent');
      if (firstAgentMsg && firstAgentMsg.created_at) {
        const diff = parseTime(firstAgentMsg.created_at) - start;
        firstResponseTime = formatDiff(diff);
        if (diff > (15 * 60 * 1000)) slaMet = false; // SLA 15 min p/ resposta
      }
    }
  }

  if (document.getElementById('indWaitTime')) document.getElementById('indWaitTime').innerText = waitTime;
  if (document.getElementById('indFirstResponse')) document.getElementById('indFirstResponse').innerText = firstResponseTime;
  
  const slaEl = document.getElementById('indSlaMet');
  if (slaEl) {
    if (slaMet) {
      slaEl.innerHTML = `<i class="fa-solid fa-check"></i> Sim`;
      slaEl.style.color = '#16a34a';
    } else {
      slaEl.innerHTML = `<i class="fa-solid fa-xmark"></i> Não`;
      slaEl.style.color = '#ef4444';
    }
  }
}
