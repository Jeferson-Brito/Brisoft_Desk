// ==========================================================================
// BRISOFT DESK - TICKET & SLA SERVICE (SUPABASE VERSION)
// ==========================================================================

const { supabase, isSupabaseConfigured } = require('../config/supabase');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getBotConfig, renderBotMessage, departmentOptions } = require('./bot-config.service');
const {
  isGeneratedCustomerName,
  extractAndValidateName,
  findContactByPhone,
  saveConfirmedContact
} = require('./customer-identification.service');

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

function canUserAccessTicket(user, ticket) {
  if (!user || !ticket) return false;
  if (user.role === 'Administrador') return true;
  return Boolean(
    (ticket.agent_name && ticket.agent_name === user.name) ||
    (ticket.department_id && ticket.department_id === user.department_id) ||
    (ticket.department && user.department && ticket.department.toLowerCase() === user.department.toLowerCase())
  );
}

function scopeTicketQuery(query, user) {
  if (!user || user.role === 'Administrador') return query;
  const filters = [];
  if (user.name) filters.push(`agent_name.eq.${user.name}`);
  if (user.department_id) filters.push(`department_id.eq.${user.department_id}`);
  if (user.department) filters.push(`department.eq.${user.department}`);
  return filters.length ? query.or(filters.join(',')) : query.is('id', null);
}

function emitTicketEvent(io, event, payload, ticket) {
  if (!io || !ticket) return;
  let target = io.to('admins');
  if (ticket.department_id) target = target.to(`department:${ticket.department_id}`);
  target.emit(event, payload);
}

function assertSupabase(result, context) {
  if (result && result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
  return result ? result.data : null;
}

class TicketService {
  async processIncomingMessage(msgData, io, whatsappService) {
    const { from, rawJid, phone: rawPhone, senderName, text, whatsappAccountId } = msgData;
    const phone = rawPhone || from.replace(/\D/g, '');
    const whatsappChannel = whatsappAccountId ? `whatsapp:${whatsappAccountId}` : 'whatsapp';
    let cleanName = senderName || `Cliente ${phone.slice(-4)}`;
    console.log(`Processando mensagem de ${cleanName} | Tel: ${phone} | JID: ${from}`);
    if (!isSupabaseConfigured()) return null;
    try {
      const now = new Date();
      const t = makeTimeStr(now);

      // Busca os departamentos no banco para montar o menu dinâmico
      const defaultDepts = [
        { id: '1', name: 'B3 Eletrônica' },
        { id: '2', name: 'Comercial' },
        { id: '3', name: 'Comercial eletrônica' },
        { id: '4', name: 'Financeiro' },
        { id: '5', name: 'Operacional' },
        { id: '6', name: 'Recursos Humanos' },
        { id: '7', name: 'Suporte Técnico' },
        { id: '8', name: 'Suprimentos' }
      ];
      let deptList = defaultDepts;
      try {
        const { data: depts, error: deptsError } = await supabase.from('departments').select('id, name').order('name');
        if (!deptsError && depts && depts.length > 0) {
          deptList = depts;
        }
      } catch (errDept) {
        deptList = defaultDepts;
      }

      const botConfig = await getBotConfig();
      const knownContact = await findContactByPhone(phone);
      const needsCustomerName = !knownContact || isGeneratedCustomerName(knownContact.name);
      if (knownContact?.name && !isGeneratedCustomerName(knownContact.name)) cleanName = knownContact.name;
      const scopeWhatsAppChannel = query => whatsappAccountId === 'default'
        ? query.in('channel', ['whatsapp', whatsappChannel])
        : query.eq('channel', whatsappChannel);
      const optionsText = departmentOptions(deptList);
      const defaultDepartment = deptList.find(dept => dept.id === botConfig.default_department_id) || deptList[0] || null;
      const botVariables = (extra = {}) => ({
        nome: cleanName,
        departamento: defaultDepartment?.name || 'fila de atendimento',
        opcoes: optionsText,
        limite: botConfig.invalid_attempt_limit,
        ...extra
      });
      const sendBotText = async (template, extra = {}) => {
        const rendered = renderBotMessage(template, botVariables(extra)).trim();
        if (rendered && whatsappService) await whatsappService.sendMessage(from, rendered);
      };
      const incomingMessagePayload = ticketId => {
        const payload = { ticket_id: ticketId, sender: 'client', text, time: t };
        if (msgData.mediaType) payload.type = msgData.mediaType;
        if (msgData.mediaUrl) payload.media_url = msgData.mediaUrl;
        return payload;
      };
      const routeWithoutBot = async (targetTicket, incomingText, storeIncomingMessage = true, noticeTemplate = botConfig.disabled_routing_message) => {
        if (!defaultDepartment) throw new Error('Nenhum departamento disponível para o roteamento automático.');
        const updatePayload = {
          status: 'aguardando',
          department: defaultDepartment.name,
          department_id: defaultDepartment.id,
          time: t,
          preview: incomingText.slice(0, 50),
          unread_count: Math.max(1, (targetTicket.unread_count || 0) + 1),
          updated_at: now.toISOString()
        };
        assertSupabase(await supabase.from('tickets').update(updatePayload).eq('id', targetTicket.id), 'Falha ao encaminhar ticket');
        if (storeIncomingMessage) {
          assertSupabase(await supabase.from('messages').insert(incomingMessagePayload(targetTicket.id)), 'Falha ao registrar mensagem recebida');
        }
        Object.assign(targetTicket, updatePayload);
        await sendBotText(noticeTemplate, { departamento: defaultDepartment.name });
        const fullTicket = await this.getFullTicket(targetTicket.id);
        if (io && fullTicket) {
          emitTicketEvent(io, 'ticket_created', { ticket: fullTicket }, fullTicket);
          emitTicketEvent(io, 'ticket_updated', { ticket: fullTicket }, fullTicket);
          emitTicketEvent(io, 'queue_updated', { ticket: fullTicket }, fullTicket);
          io.emit('kpis_updated');
        }
        return { type: 'bot_disabled_routed', ticket: fullTicket || targetTicket };
      };
      const botStatePrefix = '[Chatbot][State] ';
      const saveBotState = async (ticketId, state) => {
        assertSupabase(await supabase.from('messages').insert({
          ticket_id: ticketId,
          sender: 'system',
          type: 'divider',
          text: `${botStatePrefix}${JSON.stringify(state)}`,
          time: t
        }), 'Falha ao registrar estado do bot');
      };
      const getLatestBotState = async ticketId => {
        const { data, error } = await supabase
          .from('messages')
          .select('text')
          .eq('ticket_id', ticketId)
          .like('text', `${botStatePrefix}%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error || !data?.text) return null;
        try { return JSON.parse(data.text.slice(botStatePrefix.length)); } catch (_) { return null; }
      };
      const askForCustomerName = async (targetTicket, attempt = 1, template = botConfig.ask_customer_name_message) => {
        await saveBotState(targetTicket.id, { step: 'awaiting_name', attempt });
        await sendBotText(template, { tentativa: attempt, limite: botConfig.customer_name_attempt_limit });
        return { type: 'chatbot_asking_name', ticket: targetTicket };
      };
      const startDepartmentRouting = async targetTicket => {
        const since = new Date(Date.now() - botConfig.resume_window_hours * 60 * 60 * 1000).toISOString();
        let lastClosedTicket = null;
        try {
          let recentTicketQuery = supabase
            .from('tickets')
            .select('id, department, department_id, agent_name, updated_at')
            .or(`phone.eq.${phone},jid.eq.${from}`)
            .eq('status', 'finalizado')
            .gte('updated_at', since);
          recentTicketQuery = scopeWhatsAppChannel(recentTicketQuery);
          const result = await recentTicketQuery.order('updated_at', { ascending: false }).limit(1).maybeSingle();
          if (!result.error && result.data?.department) lastClosedTicket = result.data;
        } catch (_) {}

        if (botConfig.resume_recent_enabled && lastClosedTicket) {
          const previousDepartment = lastClosedTicket.department;
          assertSupabase(await supabase.from('messages').insert({
            ticket_id: targetTicket.id,
            sender: 'system',
            type: 'divider',
            text: `[Chatbot] Menu 24h enviado: Retomar ${previousDepartment}`,
            time: t
          }), 'Falha ao registrar menu de retomada');
          await sendBotText(botConfig.resume_message, { departamento: previousDepartment });
          return { type: 'chatbot_resume_prompt', ticket: targetTicket };
        }

        if (deptList.length > 0) {
          await sendBotText(botConfig.greeting_message, { opcoes: botConfig.show_department_menu ? optionsText : '' });
        }
        return { type: 'chatbot_greeting', ticket: targetTicket };
      };

      // 1. Verifica se o cliente já possui um ticket ATIVO (chatbot, aguardando ou em_atendimento)
      let activeTicketQuery = supabase
        .from('tickets')
        .select('*')
        .or(`phone.eq.${phone},jid.eq.${from}`)
        .in('status', ['aguardando', 'em_atendimento', 'chatbot']);
      activeTicketQuery = scopeWhatsAppChannel(activeTicketQuery);
      let { data: ticket } = await activeTicketQuery
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ticket && knownContact?.name && isGeneratedCustomerName(ticket.client_name)) {
        const updatedIdentity = {
          client_name: knownContact.name,
          initials: knownContact.name.substring(0, 2).toUpperCase(),
          contact_id: knownContact.id
        };
        const result = await supabase.from('tickets').update(updatedIdentity).eq('id', ticket.id);
        if (!result.error) Object.assign(ticket, updatedIdentity);
      }

      // 2. Se NÃO houver ticket ativo, verifica se é uma resposta de avaliação (1 a 5) para um ticket finalizado
      if (!ticket) {
        const cleanText = text.trim();
        const rawRating = parseInt(cleanText, 10);
        if (!isNaN(rawRating) && rawRating >= 1 && rawRating <= 5 && cleanText.length <= 2) {
          let ratingTicketQuery = supabase
            .from('tickets')
            .select('id, status, phone, jid, raw_jid, encerrado_por, agent_name, department_id, updated_at')
            .or(`phone.eq.${phone},jid.eq.${from}`)
            .eq('status', 'finalizado');
          ratingTicketQuery = scopeWhatsAppChannel(ratingTicketQuery);
          const { data: closedTickets } = await ratingTicketQuery
            .order('updated_at', { ascending: false })
            .limit(3);

          if (closedTickets && closedTickets.length > 0) {
            const nowMs = Date.now();
            const targetTicket = closedTickets.find(ct => {
              const upTime = new Date(ct.updated_at).getTime();
              return (nowMs - upTime) < (botConfig.rating_window_minutes * 60 * 1000);
            });

            if (targetTicket) {
              console.log(`⭐ Avaliação confirmada: ${rawRating} estrelas | Ticket ${targetTicket.id}`);

              try {
                const ratingResult = await supabase.from('ratings').insert({
                  id: crypto.randomUUID(),
                  ticket_id: targetTicket.id,
                  agent_name: targetTicket.encerrado_por || targetTicket.agent_name || 'Atendente',
                  score: rawRating,
                  phone: phone,
                  jid: from
                });
                if (ratingResult.error) {
                  assertSupabase(await supabase.from('avaliacoes').insert({
                    id: crypto.randomUUID(),
                    ticket_id: targetTicket.id,
                    agent_name: targetTicket.encerrado_por || targetTicket.agent_name || 'Atendente',
                    rating: rawRating,
                    phone,
                    jid: from
                  }), 'Falha ao salvar avaliação');
                }
              } catch(errRating) { console.error(errRating.message); }

              try {
                await supabase.from('messages').insert({
                  ticket_id: targetTicket.id,
                  sender: 'system',
                  type: 'divider',
                  text: `⭐ Avaliação do cliente recebida: ${rawRating} de 5 estrelas`,
                  time: makeTimeStr(new Date())
                });
              } catch(e) {}

              if (io) {
                emitTicketEvent(io, 'rating_received', {
                  ticketId: targetTicket.id,
                  rating: rawRating,
                  agentName: targetTicket.encerrado_por || targetTicket.agent_name
                }, targetTicket);
                io.emit('kpis_updated');
              }

              // Envia mensagem de agradecimento ao cliente
              if (whatsappService) {
                const stars = '⭐'.repeat(rawRating);
              const thankMsg = renderBotMessage(botConfig.rating_thank_you_message, { estrelas: stars, nome: cleanName });
                try {
                  if (thankMsg.trim()) await whatsappService.sendMessage(from, thankMsg);
                } catch(e) {}
              }

              return { type: 'rating', rating: rawRating, ticketId: targetTicket.id };
            }
          }
        }
      }

      // 3. Se ainda não tem ticket ativo, cria o atendimento e inicia a identificação/roteamento.
      if (!ticket) {
        const { data: insertedTicket, error: insertError } = await supabase.from('tickets').insert({
          id: crypto.randomUUID(),
          client_name: cleanName,
          initials: cleanName.substring(0, 2).toUpperCase(),
          phone,
          jid: from,
          raw_jid: rawJid,
          time: t,
          preview: text.slice(0, 50),
          status: botConfig.enabled ? 'chatbot' : 'aguardando',
          channel: whatsappChannel,
          unread_count: 0
        }).select().single();
        if (insertError) throw insertError;
        ticket = insertedTicket;

        // Auto-salva o contato no banco mesmo quando collect_customer_name está desativado
        // (só se o nome não parecer gerado automaticamente)
        if (!needsCustomerName && knownContact === null && !isGeneratedCustomerName(cleanName)) {
          try {
            await saveConfirmedContact(phone, cleanName);
          } catch (_) {}
        }

        if (!botConfig.enabled) return routeWithoutBot(ticket, text);

        assertSupabase(await supabase.from('messages').insert(incomingMessagePayload(ticket.id)), 'Falha ao registrar mensagem inicial');

        if (botConfig.collect_customer_name && needsCustomerName) return askForCustomerName(ticket);
        return startDepartmentRouting(ticket);
      }
      
      // Processa resposta ao Chatbot
      if (ticket.status === 'chatbot') {
         if (!botConfig.enabled) return routeWithoutBot(ticket, text);
         const cleanText = text.trim();
         const cleanLower = cleanText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove acentos

         assertSupabase(await supabase.from('messages').insert(incomingMessagePayload(ticket.id)), 'Falha ao registrar resposta ao bot');

         const nameState = await getLatestBotState(ticket.id);
         const normalizeKeyword = value => value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
         const humanKeywords = botConfig.human_handoff_keywords.split(',').map(normalizeKeyword).filter(Boolean);
         if (botConfig.human_handoff_enabled && humanKeywords.some(keyword => cleanLower === keyword || cleanLower.includes(keyword))) {
           return routeWithoutBot(ticket, text, false, botConfig.human_handoff_message);
         }

         if (msgData.mediaType && !botConfig.accept_media_during_routing) {
           try { await sendBotText(botConfig.media_during_routing_message); } catch(e) {}
           return { type: 'chatbot_media_blocked', ticket };
         }
         if (msgData.mediaType) {
           try {
             if (botConfig.collect_customer_name && nameState?.step === 'confirming_name') {
               await sendBotText(botConfig.confirm_customer_name_message, { nome: nameState.candidate });
             } else if (botConfig.collect_customer_name && nameState?.step === 'awaiting_name') {
               await sendBotText(botConfig.ask_customer_name_message);
             } else {
               await sendBotText(botConfig.greeting_message, { opcoes: botConfig.show_department_menu ? optionsText : '' });
             }
           } catch(e) {}
           return { type: 'chatbot_media_received', ticket };
         }

         // Fluxo de coleta de nome — só entra se a opção estiver ativada
         if (botConfig.collect_customer_name && nameState?.step === 'awaiting_name') {
           const validation = extractAndValidateName(cleanText, botConfig, deptList);
           if (!validation.valid) {
             const nextAttempt = (nameState.attempt || 1) + 1;
             if (nextAttempt > botConfig.customer_name_attempt_limit) {
               await saveBotState(ticket.id, { step: 'name_skipped' });
               await sendBotText(botConfig.customer_name_skipped_message);
               return startDepartmentRouting(ticket);
             }
             return askForCustomerName(ticket, nextAttempt, botConfig.invalid_customer_name_message);
           }

           await saveBotState(ticket.id, { step: 'confirming_name', candidate: validation.name, attempt: nameState.attempt || 1 });
           await sendBotText(botConfig.confirm_customer_name_message, {
             nome: validation.name,
             tentativa: nameState.attempt || 1,
             limite: botConfig.customer_name_attempt_limit
           });
           return { type: 'chatbot_confirming_name', ticket, candidate: validation.name };
         }

         if (botConfig.collect_customer_name && nameState?.step === 'confirming_name') {
           const confirmation = ['1', '1️⃣', 'sim', 's', 'correto', 'isso', 'confirmo'].includes(cleanLower);
           const correction = ['2', '2️⃣', 'nao', 'n', 'corrigir', 'correcao', 'errado'].includes(cleanLower);
           if (confirmation) {
             let contactId = null;
             try {
               const contact = await saveConfirmedContact(phone, nameState.candidate);
               contactId = contact?.id || null;
             } catch (errContact) {
               console.warn('Aviso: falha ao salvar contato após confirmação de nome:', errContact.message);
             }
             cleanName = nameState.candidate;
             const identity = {
               client_name: cleanName,
               initials: cleanName.substring(0, 2).toUpperCase(),
               ...(contactId ? { contact_id: contactId } : {})
             };
             try {
               assertSupabase(await supabase.from('tickets').update(identity).eq('id', ticket.id), 'Falha ao vincular contato ao ticket');
             } catch (_) {}
             Object.assign(ticket, identity);
             await saveBotState(ticket.id, { step: 'name_complete' });
             await sendBotText(botConfig.customer_name_saved_message, { nome: cleanName });
             return startDepartmentRouting(ticket);
           }
           if (correction) return askForCustomerName(ticket, nameState.attempt || 1);
           await sendBotText(botConfig.confirm_customer_name_message, { nome: nameState.candidate });
           return { type: 'chatbot_confirming_name', ticket, candidate: nameState.candidate };
         }

         // Só pede o nome novamente se collect_customer_name está ativado e nenhum estado de nome existe ainda
         if (botConfig.collect_customer_name && needsCustomerName && isGeneratedCustomerName(ticket.client_name) && !nameState) {
           return askForCustomerName(ticket);
         }

         // Verifica se o chatbot estava aguardando decisão do menu de 24h
         const { data: chatbotMsgs } = await supabase
           .from('messages')
           .select('text')
           .eq('ticket_id', ticket.id)
           .like('text', '[Chatbot]%')
           .order('created_at', { ascending: false })
           .limit(1);

         const isWaitingResume = chatbotMsgs?.[0]?.text?.startsWith('[Chatbot] Menu 24h enviado: Retomar') || false;
         let resumeTargetDept = null;
         if (isWaitingResume) {
           const match = chatbotMsgs[0].text.match(/\[Chatbot\] Menu 24h enviado: Retomar (.+)/);
           if (match) resumeTargetDept = match[1].trim();
         }

         let selectedDept = null;

         // Se estava aguardando resposta do menu de 24 horas:
         if (isWaitingResume && resumeTargetDept) {
           const isOptionResume = cleanText === '1' || ['retomar', 'continuar', 'mesmo', 'sim', 'anterior', '1️⃣'].some(w => cleanLower.includes(w));
           const isOptionOther = cleanText === '2' || ['outro', 'novo', 'mudar', 'diferente', '2️⃣'].some(w => cleanLower.includes(w));

           if (isOptionResume) {
             selectedDept = deptList.find(d => d.name.toLowerCase() === resumeTargetDept.toLowerCase()) || { name: resumeTargetDept };
           } else if (isOptionOther) {
             // Cliente optou por outro departamento -> envia menu padrão com todos os setores
             const menuStr = renderBotMessage(botConfig.greeting_message, botVariables({ opcoes: botConfig.show_department_menu ? optionsText : '' }));
             
             // Registra que o cliente escolheu ver outro departamento
             await supabase.from('messages').insert({
               ticket_id: ticket.id,
               sender: 'system',
               type: 'divider',
               text: `[Chatbot] Cliente escolheu outro departamento`,
               time: t
             });

             if (whatsappService) {
               try { await whatsappService.sendMessage(from, menuStr); } catch(e) {}
             }
             return { type: 'chatbot_menu_sent', ticket };
           }
         }

         // 1. Tenta identificar por número (ex: "1", "2", "3") se não selecionou retomar
         if (!selectedDept) {
           const option = parseInt(cleanText, 10);
           if (deptList.length > 0 && !isNaN(option) && option >= 1 && option <= deptList.length) {
              selectedDept = deptList[option - 1];
           }
         }

         // 2. Se não identificou por número, identifica por nome ou palavras-chave
         if (!selectedDept && botConfig.accept_department_name && deptList.length > 0) {
            selectedDept = deptList.find(d => {
               const deptNorm = d.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
               if (cleanLower === deptNorm || cleanLower.includes(deptNorm) || (cleanLower.length >= 3 && deptNorm.includes(cleanLower))) {
                  return true;
               }
               // Siglas e sinônimos comuns
               if (deptNorm.includes('recursos humanos') && (cleanLower === 'rh' || cleanLower.includes('rh'))) {
                  return true;
               }
               const deptWords = deptNorm.split(/\s+/).filter(w => w.length > 2);
               return deptWords.some(w => cleanLower.includes(w));
            });
         }

         if (selectedDept) {
            let updatePayload = { status: 'aguardando', time: t, preview: text.slice(0, 50), updated_at: now.toISOString(), unread_count: 1 };
            // Só adiciona department_id se for um UUID real (length > 10)
            if (selectedDept.id && selectedDept.id.length > 10) {
                updatePayload.department_id = selectedDept.id;
            }
            if (selectedDept.name) {
                updatePayload.department = selectedDept.name;
            }
            const { error: updErr } = await supabase.from('tickets').update(updatePayload).eq('id', ticket.id);
            if (updErr) console.error("Erro ao atualizar ticket para aguardando:", updErr.message);

            ticket.status = 'aguardando';
            ticket.department = selectedDept.name;
            ticket.unread_count = 1;
            ticket.preview = text.slice(0, 50);
            
            // Registra a escolha como uma mensagem do sistema
            await supabase.from('messages').insert({ ticket_id: ticket.id, sender: 'system', type: 'divider', text: `[Chatbot] Cliente escolheu: ${selectedDept.name}`, time: t });

            // Envia confirmação
            if (whatsappService && botConfig.send_queue_confirmation) {
              const confirmMsg = renderBotMessage(botConfig.queue_confirmation_message, botVariables({ departamento: selectedDept.name }));
              try { if (confirmMsg.trim()) await whatsappService.sendMessage(from, confirmMsg); } catch(e) {}
            }

            const fullTicket = await this.getFullTicket(ticket.id);
            // Notifica o frontend com dados completos do ticket e departamento real
            if (io && fullTicket) {
              emitTicketEvent(io, 'ticket_created', { ticket: fullTicket }, fullTicket);
              emitTicketEvent(io, 'ticket_updated', { ticket: fullTicket }, fullTicket);
              emitTicketEvent(io, 'queue_updated', { ticket: fullTicket }, fullTicket);
              io.emit('kpis_updated');
            }
            
            return { type: 'chatbot_routed', ticket: fullTicket || ticket };
         } else {
             // Se o cliente digitou uma saudação ou comando para reiniciar menu
             const menuKeywords = botConfig.menu_keywords.split(',').map(normalizeKeyword).filter(Boolean);
             const isGreeting = menuKeywords.some(keyword => cleanLower === keyword || cleanLower.startsWith(`${keyword} `));

             if (whatsappService) {
                if (isGreeting || deptList.length === 0) {
                  const menuStr = renderBotMessage(botConfig.greeting_message, botVariables({ opcoes: botConfig.show_department_menu ? optionsText : '' }));
                  try { await whatsappService.sendMessage(from, menuStr); } catch(e) {}
                } else {
                  const { count: previousInvalidAttempts } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('ticket_id', ticket.id)
                    .eq('sender', 'system')
                    .eq('text', '[Chatbot] Opção inválida');
                  const attempt = (previousInvalidAttempts || 0) + 1;
                  await supabase.from('messages').insert({ ticket_id: ticket.id, sender: 'system', type: 'divider', text: '[Chatbot] Opção inválida', time: t });

                  if (botConfig.auto_route_after_invalid && attempt >= botConfig.invalid_attempt_limit) {
                    return routeWithoutBot(ticket, text, false, botConfig.fallback_routing_message);
                  }

                  const invalidMsg = renderBotMessage(botConfig.invalid_option_message, botVariables({ tentativa: attempt }));
                  try { if (invalidMsg.trim()) await whatsappService.sendMessage(from, invalidMsg); } catch(e) {}
                }
             }
             return { type: 'chatbot_invalid', ticket };
          }
      }

      // Ticket em andamento (aguardando ou em_atendimento)
      const newUnread = (ticket.unread_count || 0) + 1;
      await supabase.from('tickets').update({ preview: text.slice(0, 50), time: t, updated_at: now.toISOString(), unread_count: newUnread }).eq('id', ticket.id);
      ticket.preview = text.slice(0, 50); ticket.time = t; ticket.unread_count = newUnread;
      
      const { mediaType, mediaUrl, fileName } = msgData;
      let savedMsg = null;

      try {
        const msgPayload = { ticket_id: ticket.id, sender: 'client', text, time: t };
        if (mediaType) msgPayload.type = mediaType;
        if (mediaUrl) msgPayload.media_url = mediaUrl;

        const { data: insertedMsg, error: msgError } = await supabase.from('messages').insert(msgPayload).select().single();
        if (msgError) {
          // Fallback caso a tabela messages não tenha a coluna media_url
          const { data: fallbackMsg } = await supabase.from('messages').insert({ ticket_id: ticket.id, sender: 'client', text, time: t }).select().single();
          savedMsg = fallbackMsg;
        } else {
          savedMsg = insertedMsg;
        }
      } catch (err) {
        const { data: fallbackMsg } = await supabase.from('messages').insert({ ticket_id: ticket.id, sender: 'client', text, time: t }).select().single();
        savedMsg = fallbackMsg;
      }

      if (savedMsg) {
        if (mediaUrl) {
          savedMsg.media_url = mediaUrl;
          savedMsg.mediaUrl = mediaUrl;
          savedMsg.type = mediaType;
        }
      }
      
      if (io) {
        emitTicketEvent(io, 'new_message', { ticketId: ticket.id, message: savedMsg, ticket }, ticket);
        emitTicketEvent(io, 'queue_updated', { ticket }, ticket);
        emitTicketEvent(io, 'ticket_updated', { ticket }, ticket);
        io.emit('kpis_updated');
      }
      return { ticket, message: savedMsg };
    } catch (e) {
      console.error('Erro no Supabase ao processar mensagem:', e);
      return null;
    }
  }

  /**
   * Consolida as mensagens do chamado atual com mensagens de chamados anteriores das últimas 24h
   */
  async get24hMessagesForTicket(ticket, user = null) {
    if (!ticket) return [];
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const phone = ticket.phone;
      const jid = ticket.jid || ticket.raw_jid;

      let query = supabase
        .from('tickets')
        .select('id, status, department, agent_name, encerrado_por, encerrado_em, created_at, updated_at')
        .eq('status', 'finalizado')
        .gte('updated_at', twentyFourHoursAgo)
        .neq('id', ticket.id);

      query = scopeTicketQuery(query, user);

      if (phone) {
        query = query.or(`phone.eq.${phone},jid.eq.${jid || phone}`);
      } else if (jid) {
        query = query.eq('jid', jid);
      }

      query = query.order('created_at', { ascending: true });

      const { data: pastTickets, error } = await query;
      if (error || !pastTickets || pastTickets.length === 0) {
        const { data: currentMsgs } = await supabase.from('messages').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true });
        return currentMsgs || [];
      }

      let consolidated = [];

      for (const past of pastTickets) {
        const { data: pMsgs } = await supabase.from('messages').select('*').eq('ticket_id', past.id).order('created_at', { ascending: true });
        if (pMsgs && pMsgs.length > 0) {
          const deptName = past.department || 'Atendimento';
          const closedBy = past.encerrado_por || past.agent_name || 'Atendente';
          const closeTime = past.encerrado_em || makeTimeStr(new Date(past.updated_at));

          consolidated.push({
            id: `start_${past.id}`,
            ticket_id: ticket.id,
            sender: 'system',
            type: 'divider',
            created_at: past.created_at || past.updated_at,
            text: `📜 Histórico anterior (Últimas 24h) • *${deptName}*`
          });

          consolidated.push(...pMsgs);

          consolidated.push({
            id: `end_${past.id}`,
            ticket_id: ticket.id,
            sender: 'system',
            type: 'divider',
            created_at: past.updated_at || past.created_at,
            text: `✅ Atendimento finalizado por *${closedBy}* às *${closeTime}*`
          });
        }
      }

      // Adiciona divisor para o chamado atual
      consolidated.push({
        id: `current_${ticket.id}`,
        ticket_id: ticket.id,
        sender: 'system',
        type: 'divider',
        created_at: ticket.created_at || ticket.updated_at || new Date().toISOString(),
        text: `⚡ Atendimento Atual • *${ticket.department || 'Novo Chamado'}*`
      });

      const { data: currentMsgs } = await supabase.from('messages').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true });
      consolidated.push(...(currentMsgs || []));

      return consolidated;
    } catch (e) {
      console.warn('Erro ao carregar mensagens 24h:', e.message);
      const { data: currentMsgs } = await supabase.from('messages').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true });
      return currentMsgs || [];
    }
  }

  async getTickets(user) {
    if (!isSupabaseConfigured()) return [];
    try {
      let ticketQuery = supabase
        .from('tickets')
        .select('*, departments(id, name, color)')
        .in('status', ['aguardando', 'em_atendimento']);
      ticketQuery = scopeTicketQuery(ticketQuery, user);
      const { data: tickets, error } = await ticketQuery
        .order('updated_at', { ascending: false });
      if (error) throw error;

      const ticketIds = (tickets || []).map(t => t.id);
      let msgsMap = {};
      if (ticketIds.length > 0) {
        const { data: allMsgs } = await supabase
          .from('messages')
          .select('*')
          .in('ticket_id', ticketIds)
          .order('created_at', { ascending: true });
        if (allMsgs) {
          for (const m of allMsgs) {
            if (!msgsMap[m.ticket_id]) msgsMap[m.ticket_id] = [];
            msgsMap[m.ticket_id].push(m);
          }
        }
      }

      for (let t of tickets) {
        t.messages = msgsMap[t.id] || [];
        t.clientName = t.client_name;
        t.avatarColor = t.avatar_color;
        t.unreadCount = t.unread_count || 0;
        if (t.departments) {
          t.department = t.departments.name;
          t.departmentColor = t.departments.color;
          t.department_id = t.departments.id || t.department_id;
        }
      }
      saveTicketsToDisk(tickets);
      return tickets;
    } catch (e) { console.error('Erro ao buscar tickets:', e); return []; }
  }

  /** Retorna ticket completo com mensagens e dados do departamento */
  async getFullTicket(ticketId, user = null) {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data: ticket, error } = await supabase
        .from('tickets')
        .select('*, departments(id, name, color)')
        .eq('id', ticketId)
        .single();
      if (error || !ticket) return null;
      if (user && !canUserAccessTicket(user, ticket)) return null;
      ticket.messages = await this.get24hMessagesForTicket(ticket, user);
      ticket.clientName = ticket.client_name;
      ticket.avatarColor = ticket.avatar_color;
      ticket.unreadCount = ticket.unread_count || 0;
      if (ticket.departments) {
        ticket.department = ticket.departments.name;
        ticket.departmentColor = ticket.departments.color;
        ticket.department_id = ticket.departments.id || ticket.department_id;
      }
      return ticket;
    } catch (e) {
      console.error('Erro em getFullTicket:', e);
      return null;
    }
  }

  /** Retorna histórico de tickets finalizados com avaliações e mensagens */
  async getHistory(user) {
    if (!isSupabaseConfigured()) return [];
    try {
      let historyQuery = supabase
        .from('tickets')
        .select('*, departments(id, name, color)')
        .eq('status', 'finalizado');
      historyQuery = scopeTicketQuery(historyQuery, user);
      const { data: tickets, error } = await historyQuery
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      // Busca avaliações e mensagens para cada ticket
      const ticketIds = (tickets || []).map(t => t.id);
      let ratingMap = {};
      let messagesMap = {};

      if (ticketIds.length > 0) {
        const [ { data: avaliacoes }, { data: msgs } ] = await Promise.all([
          supabase.from('ratings').select('ticket_id, score').in('ticket_id', ticketIds),
          supabase.from('messages').select('*').in('ticket_id', ticketIds).order('created_at', { ascending: true })
        ]);

        (avaliacoes || []).forEach(a => { ratingMap[a.ticket_id] = a.score; });
        
        (msgs || []).forEach(m => {
          if (!messagesMap[m.ticket_id]) messagesMap[m.ticket_id] = [];
          messagesMap[m.ticket_id].push(m);
        });
      }

      return (tickets || []).map(t => {
        let deptName = t.departments?.name || t.department || '';
        let deptColor = t.departments?.color || '#2563eb';

        // Fallback inteligente: se department estiver vazio ou padrão, recupera da mensagem de escolha do Chatbot
        if (!deptName || deptName === 'Comercial' || deptName === 'Geral') {
          const choiceMsg = (messagesMap[t.id] || []).find(m => m.text?.includes('[Chatbot] Cliente escolheu:'));
          if (choiceMsg) {
            const match = choiceMsg.text.match(/\[Chatbot\] Cliente escolheu:\s*(.+)/i);
            if (match) {
              deptName = match[1].trim();
            }
          }
        }
        let finalScore = t.rating || ratingMap[t.id] || null;
        if (!finalScore) {
          const rMsg = (messagesMap[t.id] || []).find(m => 
            m.text?.includes('⭐') || 
            m.text?.includes('estrelas') || 
            m.text?.includes('estrela')
          );
          if (rMsg) {
            const match = rMsg.text.match(/(\d+)\s*(?:de 5\s*)?estrela/i);
            if (match) {
              finalScore = parseInt(match[1], 10);
            }
          }
        }

        return {
          ...t,
          clientName: t.client_name,
          avatarColor: t.avatar_color,
          rating: finalScore,
          messages: messagesMap[t.id] || [],
          protocolo: t.id,
          agent: t.agent_name || t.encerrado_por || '--',
          deptInitial: deptName,
          deptFinal: deptName,
          department: deptName,
          departmentColor: deptColor
        };
      });
    } catch (e) {
      console.error('❌ Erro ao buscar histórico:', e);
      return [];
    }
  }


  async getKpis(user) {
    if (!isSupabaseConfigured()) return null;
    try {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();
      const scoped = query => scopeTicketQuery(query, user);
      const [
        { count: atendimentosHoje },
        { count: emAtendimento },
        { count: aguardando },
        { data: finalizados },
        { data: avaliacoes },
        { data: assumidosHoje }
      ] = await Promise.all([
        scoped(supabase.from('tickets').select('*', { count: 'exact', head: true }).gte('created_at', todayISO)),
        scoped(supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'em_atendimento')),
        scoped(supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'aguardando')),
        scoped(supabase.from('tickets').select('created_at, closed_at, encerrado_por').eq('status', 'finalizado').gte('created_at', todayISO).not('closed_at', 'is', null)),
        supabase.from('ratings').select('score'),
        scoped(supabase.from('tickets').select('created_at, assumed_at').gte('created_at', todayISO).not('assumed_at', 'is', null))
      ]);

      // Busca de live activity separada e protegida contra erro de fk
      let messagesData = [];
      try {
        if (user?.role !== 'Administrador') throw new Error('Atividade global restrita');
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
      const visibleRatings = user?.role === 'Administrador' ? (avaliacoes || []) : [];
      if (visibleRatings.length > 0) {
        totalAvaliacoes = visibleRatings.length;
        mediaAvaliacao = (visibleRatings.reduce((acc, a) => acc + a.score, 0) / totalAvaliacoes).toFixed(1);
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
        slaPorDept: [],
        rankingAtendentes
      };
    } catch (e) { console.error('Erro ao buscar KPIs:', e); return null; }
  }

  async sendAgentMessage(ticketId, text, currentUser, io, whatsappService) {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase nao configurado' };
    
    // Busca rápida do ticket sem overhead de recarregar histórico pesado
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id, jid, raw_jid, phone, client_name, department, department_id, agent_name, status, channel')
      .eq('id', ticketId)
      .single();

    if (!ticket || !canUserAccessTicket(currentUser, ticket)) return { success: false, error: 'Ticket nao encontrado' };
    const agentName = currentUser.name || 'Atendente';
    const now = new Date(); const t = makeTimeStr(now);
    const targetJid = ticket.jid || ticket.raw_jid;
    const formattedText = `*${agentName}:*\n\n${text}`;
    try {
      // 1. Envia imediatamente para o WhatsApp
      const accountId = ticket.channel?.startsWith('whatsapp:') ? ticket.channel.slice('whatsapp:'.length) : null;
      const sent = await whatsappService.sendMessage(targetJid, formattedText, accountId);
      if (sent) {
        // 2. Grava a mensagem no banco
        const messageResult = await supabase
          .from('messages')
          .insert({ ticket_id: ticket.id, sender: 'agent', text: formattedText, time: t })
          .select()
          .single();
        const savedMsg = assertSupabase(messageResult, 'Falha ao salvar mensagem');

        ticket.preview = `Você: ${text.slice(0, 40)}`;
        ticket.time = t;
        assertSupabase(await supabase.from('tickets').update({ preview: ticket.preview, time: t, updated_at: now.toISOString() }).eq('id', ticket.id), 'Falha ao atualizar ticket');

        // 3. Emite WebSocket IMEDIATAMENTE para a interface
        if (io) {
          emitTicketEvent(io, 'new_message', { ticketId: ticket.id, message: savedMsg, ticket }, ticket);
          emitTicketEvent(io, 'queue_updated', { ticket }, ticket);
        }
        return { success: true, ticket, message: savedMsg };
      }
    } catch (error) { return { success: false, error: error.message }; }
    return { success: false, error: 'Falha ao enviar' };
  }

  async assumeTicket(ticketId, currentUser, io) {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase nao configurado' };
    try {
      const existingTicket = await this.getFullTicket(ticketId, currentUser);
      if (!existingTicket) return { success: false, error: 'Ticket nao encontrado' };
      const agentName = currentUser.name || 'Atendente';
      const nowISO = new Date().toISOString();
      assertSupabase(await supabase.from('tickets').update({ status: 'em_atendimento', assumed: true, agent_name: agentName, updated_at: nowISO }).eq('id', ticketId), 'Falha ao assumir ticket');
      
      try { await supabase.from('tickets').update({ assumed_at: nowISO }).eq('id', ticketId); } catch(e) {}

      assertSupabase(await supabase.from('messages').insert({ ticket_id: ticketId, sender: 'system', type: 'divider', text: `Atendimento assumido por ${agentName}`, time: makeTimeStr(new Date()) }), 'Falha ao registrar atendimento');
      const fullTicket = await this.getFullTicket(ticketId);
      if (io) { emitTicketEvent(io, 'ticket_updated', { ticket: fullTicket }, fullTicket); emitTicketEvent(io, 'queue_updated', { ticket: fullTicket }, fullTicket); io.emit('kpis_updated'); }
      return { success: true, ticket: fullTicket };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async transferTicket(ticketId, transferData, currentUser, io, whatsappService) {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase nao configurado' };
    try {
      const { departmentId, departmentName, targetUserId, targetUserName, note } = transferData;
      
      const { data: currentTicket } = await supabase
        .from('tickets')
        .select('id, jid, raw_jid, phone, client_name, department, department_id, agent_name, status, channel')
        .eq('id', ticketId)
        .single();

      if (!currentTicket || !canUserAccessTicket(currentUser, currentTicket)) return { success: false, error: 'Ticket nao encontrado' };

      const oldDept = currentTicket.department || 'Geral';
      const newDept = departmentName || 'Novo Departamento';
      const now = new Date();
      const timeStr = makeTimeStr(now);

      const updatePayload = {
        updated_at: now.toISOString(),
        department: newDept
      };

      if (departmentId && departmentId.length > 10) {
        updatePayload.department_id = departmentId;
      }

      if (targetUserName) {
        updatePayload.agent_name = targetUserName;
        updatePayload.assumed = true;
        updatePayload.status = 'em_atendimento';
      } else {
        updatePayload.agent_name = null;
        updatePayload.assumed = false;
        updatePayload.status = 'aguardando';
      }

      assertSupabase(await supabase.from('tickets').update(updatePayload).eq('id', ticketId), 'Falha ao transferir ticket');

      const updatedTicket = { ...currentTicket, ...updatePayload };

      // Registra mensagem de sistema no histórico da conversa
      let transferMsgText = `🔄 Atendimento transferido de *${oldDept}* para *${newDept}* por *${currentUser.name || 'Atendente'}*`;
      if (targetUserName) {
        transferMsgText += ` (Direcionado para: *${targetUserName}*)`;
      }
      if (note && note.trim()) {
        transferMsgText += ` 💬 Motivo: *${note.trim()}*`;
      }

      const transferMessageResult = await supabase.from('messages').insert({
        ticket_id: ticketId,
        sender: 'system',
        type: 'divider',
        text: transferMsgText,
        time: timeStr
      }).select().single();
      const savedTransferMessage = assertSupabase(transferMessageResult, 'Falha ao registrar transferência');
      if (io) emitTicketEvent(io, 'new_message', { ticketId, message: savedTransferMessage, ticket: updatedTicket }, updatedTicket);

      // Emite WebSocket imediatamente
      if (io) {
        emitTicketEvent(io, 'ticket_transferred', { ticket: updatedTicket, fromDept: oldDept, toDept: newDept, by: currentUser.name }, updatedTicket);
        emitTicketEvent(io, 'ticket_updated', { ticket: updatedTicket }, updatedTicket);
        emitTicketEvent(io, 'queue_updated', { ticket: updatedTicket }, updatedTicket);
        io.emit('kpis_updated');
      }

      // Notifica o cliente via WhatsApp sobre a transferência em background
      if (whatsappService) {
        const botConfig = await getBotConfig();
        const targetJid = currentTicket.jid || currentTicket.raw_jid;
        if (targetJid && botConfig.send_transfer_notice) {
          const clientNotice = renderBotMessage(botConfig.transfer_message, {
            nome: currentTicket.client_name || 'Cliente',
            departamento: newDept,
            atendente: targetUserName || ''
          });
          const accountId = currentTicket.channel?.startsWith('whatsapp:') ? currentTicket.channel.slice('whatsapp:'.length) : null;
          if (clientNotice.trim()) whatsappService.sendMessage(targetJid, clientNotice, accountId).catch(e => {
            console.warn('Erro ao notificar cliente no WhatsApp sobre transferência:', e.message);
          });
        }
      }

      return { success: true, ticket: updatedTicket };
    } catch (e) {
      console.error('❌ Erro ao transferir ticket:', e);
      return { success: false, error: e.message };
    }
  }

  async closeTicket(ticketId, currentUser, io, whatsappService) {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase nao configurado' };
    try {
      const agentName = currentUser.name || 'Atendente';
      const now = new Date();
      const encerradoEm = makeTimeStr(now);

      const { data: ticket } = await supabase
        .from('tickets')
        .select('id, jid, raw_jid, phone, client_name, department, department_id, agent_name, channel')
        .eq('id', ticketId)
        .single();

      if (!ticket || !canUserAccessTicket(currentUser, ticket)) return { success: false, error: 'Ticket nao encontrado' };
      // ─── Update direto no banco ─────
      assertSupabase(await supabase.from('tickets').update({
        status: 'finalizado',
        assumed: false,
        encerrado_em: encerradoEm,
        encerrado_por: agentName,
        closed_at: now.toISOString(),
        awaiting_rating: true,
        updated_at: now.toISOString()
      }).eq('id', ticketId), 'Falha ao encerrar ticket');

      // Insere mensagem de sistema em background
      assertSupabase(await supabase.from('messages').insert({
        ticket_id: ticketId,
        sender: 'system',
        type: 'divider',
        time: encerradoEm,
        text: `✅ Atendimento encerrado por *${agentName}* às *${encerradoEm}*`
      }), 'Falha ao registrar encerramento');

      const closedTicket = { ...ticket, status: 'finalizado', encerrado_por: agentName, encerrado_em: encerradoEm };

      // Emite WebSocket imediatamente para a tela atualizar na hora
      if (io) {
        emitTicketEvent(io, 'ticket_updated', { ticket: closedTicket }, closedTicket);
        emitTicketEvent(io, 'queue_updated', { ticket: closedTicket }, closedTicket);
        io.emit('kpis_updated');
      }

      // Envia pesquisa de satisfação via WhatsApp em background (não atrasa a resposta)
      if (whatsappService && ticket) {
        const botConfig = await getBotConfig();
        const targetJid = ticket.jid || ticket.raw_jid;
        if (targetJid && botConfig.send_rating_request) {
          const ratingMsg = renderBotMessage(botConfig.rating_request_message, {
            nome: ticket.client_name || 'Cliente',
            departamento: ticket.department || '',
            atendente: agentName
          });
          
          const accountId = ticket.channel?.startsWith('whatsapp:') ? ticket.channel.slice('whatsapp:'.length) : null;
          if (ratingMsg.trim()) whatsappService.sendMessage(targetJid, ratingMsg, accountId).catch(e => {
            console.warn('⚠️ Erro ao enviar pesquisa de satisfação:', e.message);
          });
        }
      }

      return { success: true, ticket: closedTicket };
    } catch (e) {
      console.error('❌ Erro ao encerrar ticket:', e);
      return { success: false, error: e.message };
    }
  }

  async markAsRead(ticketId, currentUser, io) {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase nao configurado' };
    try {
      const existingTicket = await this.getFullTicket(ticketId, currentUser);
      if (!existingTicket) return { success: false, error: 'Ticket nao encontrado' };
      assertSupabase(await supabase.from('tickets').update({ unread_count: 0 }).eq('id', ticketId), 'Falha ao marcar ticket como lido');
      const fullTicket = await this.getFullTicket(ticketId);
      if (io) emitTicketEvent(io, 'queue_updated', { ticket: fullTicket }, fullTicket);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async updateContact(ticketId, contactData, currentUser, io) {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase nao configurado' };
    try {
      const existingTicket = await this.getFullTicket(ticketId, currentUser);
      if (!existingTicket) return { success: false, error: 'Ticket nao encontrado' };
      const { name, phone, email, cnpj, company, note } = contactData;
      const updatePayload = {
        updated_at: new Date().toISOString()
      };
      if (name) updatePayload.client_name = name;
      if (phone) updatePayload.phone = phone;

      assertSupabase(await supabase.from('tickets').update(updatePayload).eq('id', ticketId), 'Falha ao atualizar contato');

      const { data: ticket } = await supabase.from('tickets').select('*').eq('id', ticketId).single();
      if (ticket) {
        const { data: existingContact } = await supabase.from('contacts').select('*').eq('phone', ticket.phone).maybeSingle();
        if (existingContact) {
          await supabase.from('contacts').update({
            name: name || existingContact.name,
            email: email || existingContact.email,
            role: company || existingContact.role
          }).eq('id', existingContact.id);
        } else if (name || phone) {
          await supabase.from('contacts').insert({
            id: crypto.randomUUID(),
            name: name || ticket.client_name,
            phone: phone || ticket.phone,
            email: email || null,
            role: company || null
          });
        }
      }

      const fullTicket = await this.getFullTicket(ticketId);
      if (io && fullTicket) {
        emitTicketEvent(io, 'ticket_updated', { ticket: fullTicket }, fullTicket);
        emitTicketEvent(io, 'queue_updated', { ticket: fullTicket }, fullTicket);
      }

      return { success: true, ticket: fullTicket };
    } catch (e) {
      console.error('Erro ao atualizar contato:', e);
      return { success: false, error: e.message };
    }
  }

  async canAccessMedia(filename, user) {
    if (!isSupabaseConfigured()) return false;
    const { data: message, error } = await supabase
      .from('messages')
      .select('ticket_id')
      .eq('media_url', `/api/media/${filename}`)
      .limit(1)
      .maybeSingle();
    if (error || !message) return false;
    return Boolean(await this.getFullTicket(message.ticket_id, user));
  }
}

module.exports = new TicketService();
