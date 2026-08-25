// ==========================================================================
// BRISOFT DESK - TICKET & SLA SERVICE (SUPABASE VERSION)
// ==========================================================================

const { supabase, isSupabaseConfigured } = require('../config/supabase');
const fs = require('fs');
const path = require('path');

// Janela de avaliacao: 30 minutos
const RATING_WINDOW_MS = 30 * 60 * 1000;

const TICKETS_FILE = path.join(__dirname, '../../data/tickets.json');

function saveTicketsToDisk(tickets) {
  try {
    const dir = path.dirname(TICKETS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2), 'utf8');
  } catch (e) {
    console.warn('Erro ao salvar tickets no disco:', e.message);
  }
}

function makeTimeStr(date) {
  const d = date || new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

class TicketService {
  async processIncomingMessage(msgData, io, whatsappService) {
    const { from, rawJid, phone: rawPhone, senderName, text } = msgData;
    const phone = rawPhone || from.replace(/\D/g, '');
    const cleanName = senderName || `Cliente ${phone.slice(-4)}`;
    console.log(`Processando mensagem de ${cleanName} | Tel: ${phone} | JID: ${from}`);
    if (!isSupabaseConfigured()) return null;
    try {
      const ratingWindowStart = new Date(Date.now() - RATING_WINDOW_MS).toISOString();
      const { data: pendingRating } = await supabase.from('tickets').select('*').eq('phone', phone).eq('awaiting_rating', true).gte('closed_at', ratingWindowStart).order('closed_at', { ascending: false }).limit(1).single();
      if (pendingRating) {
        const rawRating = parseInt(text.trim(), 10);
        if (rawRating >= 1 && rawRating <= 5) {
          console.log(`Avaliacao recebida: ${rawRating} estrelas | Ticket ${pendingRating.id}`);
          await supabase.from('avaliacoes').insert({ ticket_id: pendingRating.id, agent_name: pendingRating.encerrado_por || 'Atendente', rating: rawRating, phone, jid: from });
          await supabase.from('tickets').update({ awaiting_rating: false, updated_at: new Date().toISOString() }).eq('id', pendingRating.id);
          if (io) { io.emit('rating_received', { ticketId: pendingRating.id, rating: rawRating, agentName: pendingRating.encerrado_por }); io.emit('kpis_updated'); }
          // Envia mensagem de agradecimento ao cliente
          if (whatsappService) {
            const stars = '⭐'.repeat(rawRating);
            const thankMsg = `Obrigado pela sua avaliação! ${stars}\n\nSua opinião é muito importante para nós. Até a próxima! 😊`;
            try { await whatsappService.sendMessage(from, thankMsg); } catch(e) { console.warn('Erro ao enviar agradecimento:', e.message); }
          }
          return { type: 'rating', rating: rawRating };
        } else {
          await supabase.from('tickets').update({ awaiting_rating: false }).eq('id', pendingRating.id);
        }
      }
      let { data: ticket } = await supabase.from('tickets').select('*').eq('phone', phone).in('status', ['aguardando', 'em_atendimento', 'chatbot']).order('created_at', { ascending: false }).limit(1).single();
      const now = new Date();
      const t = makeTimeStr(now);

      // Busca os departamentos no banco para montar o menu dinâmico
      const { data: depts, error: deptsError } = await supabase.from('departments').select('id, name').order('name');
      let deptList = depts || [];
      if (deptsError || deptList.length === 0) {
         console.warn('⚠️ Tabela departments não existe ou está vazia. Usando fallback temporário.');
         deptList = [
           { id: '1', name: 'Comercial' },
           { id: '2', name: 'Suporte Técnico' },
           { id: '3', name: 'Financeiro' }
         ];
      }

      if (!ticket) {
        // Novo ticket -> entra no Chatbot primeiro
        const { data: insertedTicket, error: insertError } = await supabase.from('tickets').insert({ id: `at-${Date.now()}`, client_name: cleanName, initials: cleanName.substring(0, 2).toUpperCase(), phone, jid: from, raw_jid: rawJid, time: t, preview: text.slice(0, 50), status: 'chatbot', unread_count: 0 }).select().single();
        if (insertError) throw insertError;
        ticket = insertedTicket;
        
        // Envia menu do robô
        if (whatsappService && deptList.length > 0) {
           let greetingText = `Olá, {nome}! Bem-vindo à nossa central de atendimento.\nCom qual departamento deseja falar?`;
           try {
             const { data: setts } = await supabase.from('system_settings').select('value').eq('key', 'bot_greeting').single();
             if (setts && setts.value) greetingText = setts.value;
           } catch(e) {}

           let menuStr = greetingText.replace('{nome}', cleanName) + '\n\n';
           deptList.forEach((d, idx) => { menuStr += `${idx + 1}️⃣ - ${d.name}\n`; });
           menuStr += `\nResponda com o número correspondente.`;
           try { await whatsappService.sendMessage(from, menuStr); } catch(e) {}
        }
        return { type: 'chatbot_greeting', ticket };
      }
      
      // Processa resposta ao Chatbot
      if (ticket.status === 'chatbot') {
         const option = parseInt(text.trim(), 10);
         if (deptList.length > 0 && option >= 1 && option <= deptList.length) {
            const selectedDept = deptList[option - 1];
            
            let updatePayload = { status: 'aguardando', time: t, preview: text.slice(0, 50), updated_at: now.toISOString(), unread_count: 1 };
            // Só adiciona department_id se for um UUID real (length > 10)
            if (selectedDept.id && selectedDept.id.length > 10) {
                updatePayload.department_id = selectedDept.id;
            }
            const { error: updErr } = await supabase.from('tickets').update(updatePayload).eq('id', ticket.id);
            if (updErr) console.error("Erro ao atualizar ticket para aguardando:", updErr.message);

            ticket.status = 'aguardando';
            ticket.department = selectedDept.name;
            ticket.unread_count = 1;
            ticket.preview = text.slice(0, 50);
            
            // Registra a escolha como uma mensagem do sistema
            await supabase.from('messages').insert({ ticket_id: ticket.id, sender: 'client', text: `[Chatbot] Cliente escolheu: ${selectedDept.name}`, time: t });

            // Envia confirmação
            if (whatsappService) {
              const confirmMsg = `✅ Certo! Você selecionou *${selectedDept.name}*.\n\nAguarde um momento, um de nossos especialistas já vai te atender.`;
              try { await whatsappService.sendMessage(from, confirmMsg); } catch(e) {}
            }

            // Notifica o frontend
            if (io) io.emit('ticket_created', { ticket });
            if (io) { const fullTicket = await this.getFullTicket(ticket.id); io.emit('queue_updated', { ticket: fullTicket }); io.emit('ticket_updated', { ticket: fullTicket }); io.emit('kpis_updated'); }
            
            return { type: 'chatbot_routed', ticket };
         } else {
            // Opção inválida
            if (whatsappService && deptList.length > 0) {
               const errorMsg = `⚠️ Opção inválida.\nPor favor, responda com um número de 1 a ${deptList.length}.`;
               try { await whatsappService.sendMessage(from, errorMsg); } catch(e) {}
            }
            return { type: 'chatbot_invalid', ticket };
         }
      }

      // Ticket em andamento (aguardando ou em_atendimento)
      const newUnread = (ticket.unread_count || 0) + 1;
      await supabase.from('tickets').update({ preview: text.slice(0, 50), time: t, updated_at: now.toISOString(), unread_count: newUnread }).eq('id', ticket.id);
      ticket.preview = text.slice(0, 50); ticket.time = t; ticket.unread_count = newUnread;
      
      const { data: savedMsg, error: msgError } = await supabase.from('messages').insert({ ticket_id: ticket.id, sender: 'client', text, time: t }).select().single();
      if (msgError) throw msgError;
      if (io) { const fullTicket = await this.getFullTicket(ticket.id); io.emit('new_message', { ticketId: ticket.id, message: savedMsg, ticket: fullTicket }); io.emit('queue_updated', { ticket: fullTicket }); io.emit('kpis_updated'); }
      return { ticket, message: savedMsg };
    } catch (e) {
      console.error('Erro no Supabase ao processar mensagem:', e);
      return null;
    }
  }

  async getTickets() {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data: tickets, error } = await supabase.from('tickets').select('*, departments(name, color)').in('status', ['aguardando', 'em_atendimento']).order('updated_at', { ascending: false });
      if (error) throw error;
      for (let t of tickets) {
        const { data: msgs } = await supabase.from('messages').select('*').eq('ticket_id', t.id).order('id', { ascending: true });
        t.messages = msgs || [];
        t.clientName = t.client_name;
        t.avatarColor = t.avatar_color;
        if (t.departments) {
          t.department = t.departments.name;
          t.departmentColor = t.departments.color;
        }
      }
      saveTicketsToDisk(tickets);
      return tickets;
    } catch (e) { console.error('Erro ao buscar tickets:', e); return []; }
  }

  /** Retorna ticket completo com mensagens */
  async getFullTicket(ticketId) {
    if (!isSupabaseConfigured()) return null;
    const { data: ticket } = await supabase.from('tickets').select('*').eq('id', ticketId).single();
    if (!ticket) return null;
    const { data: msgs } = await supabase.from('messages').select('*').eq('ticket_id', ticketId).order('id', { ascending: true });
    ticket.messages = msgs || [];
    ticket.clientName = ticket.client_name;
    ticket.avatarColor = ticket.avatar_color;
    return ticket;
  }

  /** Retorna histórico de tickets finalizados com avaliações e mensagens */
  async getHistory() {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('status', 'finalizado')
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      // Busca avaliações e mensagens para cada ticket
      const ticketIds = (tickets || []).map(t => t.id);
      let ratingMap = {};
      let messagesMap = {};

      if (ticketIds.length > 0) {
        const [ { data: avaliacoes }, { data: msgs } ] = await Promise.all([
          supabase.from('avaliacoes').select('ticket_id, rating').in('ticket_id', ticketIds),
          supabase.from('messages').select('*').in('ticket_id', ticketIds).order('id', { ascending: true })
        ]);

        (avaliacoes || []).forEach(a => { ratingMap[a.ticket_id] = a.rating; });
        
        (msgs || []).forEach(m => {
          if (!messagesMap[m.ticket_id]) messagesMap[m.ticket_id] = [];
          messagesMap[m.ticket_id].push(m);
        });
      }

      return (tickets || []).map(t => ({
        ...t,
        clientName: t.client_name,
        avatarColor: t.avatar_color,
        rating: ratingMap[t.id] || null,
        messages: messagesMap[t.id] || [],
        protocolo: t.id,
        agent: t.agent_name || t.encerrado_por || '--',
        deptInitial: t.department || 'Comercial',
        deptFinal: t.department || 'Comercial'
      }));
    } catch (e) {
      console.error('❌ Erro ao buscar histórico:', e);
      return [];
    }
  }


  async getKpis() {
    if (!isSupabaseConfigured()) return null;
    try {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();
      const [
        { count: atendimentosHoje },
        { count: emAtendimento },
        { count: aguardando },
        { data: finalizados },
        { data: avaliacoes },
        { data: assumidosHoje }
      ] = await Promise.all([
        supabase.from('tickets').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'em_atendimento'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'aguardando'),
        supabase.from('tickets').select('created_at, closed_at, encerrado_por').eq('status', 'finalizado').gte('created_at', todayISO).not('closed_at', 'is', null),
        supabase.from('avaliacoes').select('rating'),
        supabase.from('tickets').select('created_at, assumed_at').gte('created_at', todayISO).not('assumed_at', 'is', null)
      ]);

      // Busca de live activity separada e protegida contra erro de fk
      let messagesData = [];
      try {
        const res = await supabase.from('messages').select('text, time, sender, created_at, ticket_id').order('created_at', { ascending: false }).limit(5);
        if (res.data) messagesData = res.data;
      } catch (e) {}
      
      let tma = '00:00:00';
      const numFinalizados = finalizados ? finalizados.length : 0;
      if (numFinalizados > 0) {
        const totalSecs = finalizados.reduce((acc, t) => { const diff = (new Date(t.closed_at) - new Date(t.created_at)) / 1000; return acc + (diff > 0 ? diff : 0); }, 0);
        const avg = Math.round(totalSecs / numFinalizados);
        const h = Math.floor(avg / 3600);
        const m = Math.floor((avg % 3600) / 60);
        const s = avg % 60;
        tma = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }

      let tme = '00:00:00';
      if (assumidosHoje && assumidosHoje.length > 0) {
        const totalSecsWait = assumidosHoje.reduce((acc, t) => { const diff = (new Date(t.assumed_at) - new Date(t.created_at)) / 1000; return acc + (diff > 0 ? diff : 0); }, 0);
        const avgWait = Math.round(totalSecsWait / assumidosHoje.length);
        const h = Math.floor(avgWait / 3600);
        const m = Math.floor((avgWait % 3600) / 60);
        const s = avgWait % 60;
        tme = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }

      let mediaAvaliacao = '--'; let totalAvaliacoes = 0;
      if (avaliacoes && avaliacoes.length > 0) {
        totalAvaliacoes = avaliacoes.length;
        mediaAvaliacao = (avaliacoes.reduce((acc, a) => acc + a.rating, 0) / totalAvaliacoes).toFixed(1);
      }
      
      // Ranking
      const rankMap = {};
      (finalizados || []).forEach(t => {
        if (t.encerrado_por) rankMap[t.encerrado_por] = (rankMap[t.encerrado_por] || 0) + 1;
      });
      const rankingAtendentes = Object.keys(rankMap)
        .map(name => ({ name, count: rankMap[name], avatar: 'https://ui-avatars.com/api/?name='+encodeURIComponent(name)+'&background=random', rank: '#', growth: '0%' }))
        .sort((a, b) => b.count - a.count)
        .map((item, idx) => ({ ...item, rank: `#${idx + 1}` }));
        
      // Live Activity
      const liveActivity = messagesData.map(m => ({
        color: m.sender === 'client' ? '#10b981' : '#2563eb',
        icon: m.sender === 'client' ? 'fa-solid fa-arrow-down' : 'fa-solid fa-arrow-up',
        title: m.sender === 'client' ? 'Mensagem de Cliente' : 'Resposta do Atendente',
        sub: (m.text || '').slice(0, 30) + '...',
        time: m.time || 'Agora'
      }));

      return {
        // Dados legados para o footer da página (kpi.js)
        atendimentosHoje: atendimentosHoje || 0,
        emAtendimento: emAtendimento || 0,
        aguardando: aguardando || 0,
        tma,
        tme,
        mediaAvaliacao,
        totalAvaliacoes,

        // Dados estruturados novos para a aba Dashboard
        kpis: {
          total: { val: atendimentosHoje || 0, growth: "0%", vs: "hoje" },
          concluidos: { val: numFinalizados, growth: "0%", vs: "hoje" },
          em_atendimento: { val: emAtendimento || 0, growth: "0%", vs: "agora" },
          aguardando: { val: aguardando || 0, growth: "0%", vs: "agora" },
          sla: { val: "100%", growth: "0%", vs: "hoje" },
          tempo_resposta: { val: tma, growth: "00:00", vs: "hoje" }
        },
        liveActivity,
        slaPorDept: [
          { name: 'Comercial', sla: 100, target: 95, color: '#2563eb' },
          { name: 'Suporte', sla: 100, target: 90, color: '#10b981' }
        ],
        rankingAtendentes
      };
    } catch (e) { console.error('Erro ao buscar KPIs:', e); return null; }
  }

  async sendAgentMessage(ticketId, text, agentName, io, whatsappService) {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase nao configurado' };
    const ticket = await this.getFullTicket(ticketId);
    if (!ticket) return { success: false, error: 'Ticket nao encontrado' };
    const now = new Date(); const t = makeTimeStr(now);
    const targetJid = ticket.jid || ticket.raw_jid;
    const formattedText = `*${agentName}:*\n\n${text}`;
    try {
      const sent = await whatsappService.sendMessage(targetJid, formattedText);
      if (sent) {
        const { data: savedMsg } = await supabase.from('messages').insert({ ticket_id: ticket.id, sender: 'agent', text: formattedText, time: t }).select().single();
        await supabase.from('tickets').update({ preview: `Voce: ${text.slice(0, 40)}`, time: t, updated_at: now.toISOString() }).eq('id', ticket.id);
        const fullTicket = await this.getFullTicket(ticket.id);
        if (io) { io.emit('new_message', { ticketId: ticket.id, message: savedMsg, ticket: fullTicket }); io.emit('queue_updated', { ticket: fullTicket }); }
        return { ticket: fullTicket, message: savedMsg };
      }
    } catch (error) { return { success: false, error: error.message }; }
    return { success: false, error: 'Falha ao enviar' };
  }

  async assumeTicket(ticketId, agentName, io) {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase nao configurado' };
    try {
      const nowISO = new Date().toISOString();
      await supabase.from('tickets').update({ status: 'em_atendimento', assumed: true, agent_name: agentName, updated_at: nowISO }).eq('id', ticketId);
      
      try { await supabase.from('tickets').update({ assumed_at: nowISO }).eq('id', ticketId); } catch(e) {}

      await supabase.from('messages').insert({ ticket_id: ticketId, sender: 'system', type: 'divider', text: `Atendimento assumido por ${agentName}`, time: makeTimeStr(new Date()) });
      const fullTicket = await this.getFullTicket(ticketId);
      if (io) { io.emit('ticket_updated', { ticket: fullTicket }); io.emit('queue_updated', { ticket: fullTicket }); io.emit('kpis_updated'); }
      return { success: true, ticket: fullTicket };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async closeTicket(ticketId, agentName, io, whatsappService) {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase nao configurado' };
    try {
      const now = new Date();
      const encerradoEm = makeTimeStr(now);

      // ─── Update 1: colunas que SEMPRE existem (garante o encerramento) ─────
      const { error: closeError } = await supabase.from('tickets').update({
        status: 'finalizado',
        assumed: false,
        encerrado_em: encerradoEm,
        encerrado_por: agentName,
        updated_at: now.toISOString()
      }).eq('id', ticketId);

      if (closeError) throw closeError;

      // ─── Update 2: colunas novas (para avaliação e TMA) ──────────────────
      // Executado em try/catch separado para não bloquear o encerramento
      // caso o SQL de migração ainda não tenha sido executado no Supabase.
      try {
        await supabase.from('tickets').update({
          closed_at: now.toISOString(),
          awaiting_rating: true
        }).eq('id', ticketId);
      } catch (migrationErr) {
        console.warn('⚠️ Colunas closed_at/awaiting_rating ainda não existem. Execute o SQL de migração no Supabase.');
      }

      await supabase.from('messages').insert({
        ticket_id: ticketId,
        sender: 'system',
        type: 'divider',
        time: encerradoEm,
        text: `✅ Atendimento encerrado por ${agentName} às ${encerradoEm}`
      });

      const fullTicket = await this.getFullTicket(ticketId);

      // Envia pesquisa de satisfação via WhatsApp
      if (whatsappService && fullTicket) {
        const targetJid = fullTicket.jid || fullTicket.raw_jid;
        if (targetJid) {
          const ratingMsg =
            `✅ *Seu atendimento foi encerrado!*\n\n` +
            `Gostaríamos da sua opinião. Como você avalia o atendimento que recebeu?\n\n` +
            `Responda com apenas um número:\n\n` +
            `1️⃣ - Muito insatisfeito\n` +
            `2️⃣ - Insatisfeito\n` +
            `3️⃣ - Regular\n` +
            `4️⃣ - Satisfeito\n` +
            `5️⃣ - Muito satisfeito`;
          try {
            await whatsappService.sendMessage(targetJid, ratingMsg);
            console.log(`📊 Pesquisa de satisfação enviada para ${targetJid}`);
          } catch (e) {
            console.warn('⚠️ Erro ao enviar pesquisa de satisfação:', e.message);
          }
        }
      }

      if (io) {
        io.emit('ticket_updated', { ticket: fullTicket });
        io.emit('queue_updated', { ticket: fullTicket });
        io.emit('kpis_updated');
      }
      return { success: true, ticket: fullTicket };
    } catch (e) {
      console.error('❌ Erro ao encerrar ticket:', e);
      return { success: false, error: e.message };
    }
  }

  async markAsRead(ticketId, io) {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase nao configurado' };
    try {
      await supabase.from('tickets').update({ unread_count: 0 }).eq('id', ticketId);
      const fullTicket = await this.getFullTicket(ticketId);
      if (io) io.emit('queue_updated', { ticket: fullTicket });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = new TicketService();
