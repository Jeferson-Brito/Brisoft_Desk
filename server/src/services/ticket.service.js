// ==========================================================================
// BRISOFT DESK - TICKET & SLA SERVICE (SUPABASE VERSION)
// ==========================================================================

const { supabase, isSupabaseConfigured } = require('../config/supabase');
const fs = require('fs');
const path = require('path');
const { isAdmin, isSupervisor, departmentIds, canAccessDepartment } = require('./access-control.service');
const crypto = require('crypto');
const { getBotConfig, renderBotMessage, departmentOptions } = require('./bot-config.service');
const {
  normalizeBotInput,
  matchesCustomerCancellation,
  matchesHumanHandoff,
  matchesMenuRequest,
  matchesNewServiceRequest,
  matchesExternalClosureMessage,
  resolveDepartmentIntent,
  resolveNameConfirmation,
  resolveResumeChoice,
  messageWasSentBeforePrompt,
  whatsappTimestampMs
} = require('./bot-intent.service');
const { normalizeOutgoingMedia } = require('./media-transcode.service');
const cloudStorage = require('./cloud-storage.service');
const {
  isGeneratedCustomerName,
  extractAndValidateName,
  findContactByPhone,
  saveConfirmedContact
} = require('./customer-identification.service');

// Janela de avaliacao: 30 minutos
const RATING_WINDOW_MS = 30 * 60 * 1000;

const TICKETS_FILE = path.join(__dirname, '../../data/tickets.json');
const MEDIA_DIR = path.join(__dirname, '../../public/media');
const MEDIA_TICKET_CACHE_MAX = 5000;
const mediaTicketCache = new Map();
let remoteMessageColumnsAvailable = null;
let conversationTrackingColumnsAvailable = null;
let ticketTimingColumnsAvailable = null;
let conversationTrackingCheckPromise = null;
const DEPARTMENT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_DEPARTMENTS = Object.freeze([
  { id: '1', name: 'B3 Eletrônica' },
  { id: '2', name: 'Comercial' },
  { id: '3', name: 'Comercial eletrônica' },
  { id: '4', name: 'Financeiro' },
  { id: '5', name: 'Operacional' },
  { id: '6', name: 'Recursos Humanos' },
  { id: '7', name: 'Suporte Técnico' },
  { id: '8', name: 'Suprimentos' }
]);
let departmentCache = null;
let departmentCacheExpiresAt = 0;
let departmentLoadPromise = null;
let ticketBackupTimer = null;
let kpiUpdateTimer = null;

function isMissingRemoteMessageColumns(error) {
  return error?.code === '42703' || error?.code === 'PGRST204' || /remote_message_id|whatsapp_account_id/i.test(error?.message || '');
}

function isMissingConversationTrackingColumns(error) {
  return error?.code === '42703' || error?.code === 'PGRST204' || /sender_type|sender_name|message_context|handled_via|direct_whatsapp_messages|platform_messages/i.test(error?.message || '');
}

function isMissingTicketTimingColumns(error) {
  return error?.code === '42703' || error?.code === 'PGRST204' || /assumed_at|first_response_at|started_at|finished_at|sla_minutes_target|sla_met/i.test(error?.message || '');
}

function mergeHandledVia(current, next) {
  const normalized = String(current || 'pending').toLowerCase();
  if (normalized === 'mixed' || normalized === next) return normalized;
  if (normalized === 'pending' || !normalized) return next;
  return 'mixed';
}

async function ensureConversationTrackingColumns() {
  if (conversationTrackingColumnsAvailable !== null) return conversationTrackingColumnsAvailable;
  if (!conversationTrackingCheckPromise) {
    conversationTrackingCheckPromise = Promise.all([
      supabase.from('messages').select('sender_type, sender_name, message_context').limit(1),
      supabase.from('tickets').select('handled_via, direct_whatsapp_messages, platform_messages').limit(1)
    ]).then(results => {
      conversationTrackingColumnsAvailable = results.every(result => !result.error);
      return conversationTrackingColumnsAvailable;
    }).catch(() => {
      conversationTrackingColumnsAvailable = false;
      return false;
    }).finally(() => {
      conversationTrackingCheckPromise = null;
    });
  }
  return conversationTrackingCheckPromise;
}

async function wasRemoteMessageProcessed(whatsappAccountId, messageId) {
  if (!whatsappAccountId || !messageId || remoteMessageColumnsAvailable === false) return false;
  const { data, error } = await supabase
    .from('messages')
    .select('id')
    .eq('whatsapp_account_id', whatsappAccountId)
    .eq('remote_message_id', messageId)
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isMissingRemoteMessageColumns(error)) {
      remoteMessageColumnsAvailable = false;
      return false;
    }
    console.warn(`Falha ao verificar mensagem duplicada: ${error.message}`);
    return false;
  }
  remoteMessageColumnsAvailable = true;
  return Boolean(data);
}

function rememberMediaTicket(mediaUrl, ticketId) {
  const filename = String(mediaUrl || '').split('/').pop();
  if (!filename || !ticketId) return;
  mediaTicketCache.delete(filename);
  mediaTicketCache.set(filename, ticketId);
  if (mediaTicketCache.size > MEDIA_TICKET_CACHE_MAX) {
    mediaTicketCache.delete(mediaTicketCache.keys().next().value);
  }
}

function saveTicketsToDisk(tickets) {
  clearTimeout(ticketBackupTimer);
  ticketBackupTimer = setTimeout(async () => {
    try {
      await fs.promises.mkdir(path.dirname(TICKETS_FILE), { recursive: true });
      await fs.promises.writeFile(TICKETS_FILE, JSON.stringify(tickets, null, 2), 'utf8');
    } catch (e) {
      console.warn('Erro ao salvar tickets no disco:', e.message);
    }
  }, 250);
  ticketBackupTimer.unref?.();
}

async function getCachedDepartments() {
  if (departmentCache && Date.now() < departmentCacheExpiresAt) return departmentCache;
  if (!departmentLoadPromise) {
    departmentLoadPromise = (async () => {
      try {
        const { data, error } = await supabase.from('departments').select('id, name').order('name');
        if (error) throw error;
        return data?.length ? data : [...DEFAULT_DEPARTMENTS];
      } catch (_) {
        return [...DEFAULT_DEPARTMENTS];
      }
    })();
  }
  try {
    departmentCache = await departmentLoadPromise;
    departmentCacheExpiresAt = Date.now() + DEPARTMENT_CACHE_TTL_MS;
    return departmentCache;
  } finally {
    departmentLoadPromise = null;
  }
}

function scheduleKpiUpdate(io) {
  if (!io || kpiUpdateTimer) return;
  kpiUpdateTimer = setTimeout(() => {
    io.emit('kpis_updated');
    kpiUpdateTimer = null;
  }, 500);
  kpiUpdateTimer.unref?.();
}

function makeTimeStr(date) {
  const d = date || new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function preferredWhatsAppJid(phone, fallbackJid = '') {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 15) return `${digits}@s.whatsapp.net`;
  return String(fallbackJid || '');
}

function phoneFromWhatsAppIdentity(phone, fallbackJid = '') {
  const explicitDigits = String(phone || '').replace(/\D/g, '');
  if (explicitDigits.length >= 10 && explicitDigits.length <= 15) return explicitDigits;
  const fallback = String(fallbackJid || '').replace(/:\d+@/, '@').replace(/:\d+$/, '');
  if (!fallback || fallback.includes('@lid')) return '';
  const fallbackDigits = fallback.replace(/@(?:s\.whatsapp\.net|c\.us)$/, '').replace(/\D/g, '');
  return fallbackDigits.length >= 10 && fallbackDigits.length <= 15 ? fallbackDigits : '';
}

function uuidOrNull(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '')) ? value : null;
}

function safeUploadedFileName(value) {
  const decoded = String(value || 'arquivo').trim();
  const extension = path.extname(decoded).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12);
  const base = path.basename(decoded, path.extname(decoded)).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'arquivo';
  return { displayName: `${base}${extension}`, extension };
}

function canUserAccessTicket(user, ticket) {
  if (!user || !ticket) return false;
  if (isAdmin(user)) return true;
  if (isSupervisor(user)) return departmentIds(user).includes(String(ticket.department_id || ''));
  return Boolean(
    (ticket.agent_name && ticket.agent_name === user.name) ||
    (ticket.department_id && String(ticket.department_id) === String(user.department_id)) ||
    (ticket.department && user.department && ticket.department.toLowerCase() === user.department.toLowerCase())
  );
}

function scopeTicketQuery(query, user) {
  if (!user || isAdmin(user)) return query;
  if (isSupervisor(user)) {
    const ids = departmentIds(user);
    return ids.length ? query.in('department_id', ids) : query.is('id', null);
  }
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
  invalidateDepartmentCache() {
    departmentCache = null;
    departmentCacheExpiresAt = 0;
    departmentLoadPromise = null;
  }

  async processIncomingMessage(msgData, io, whatsappService) {
    const {
      from,
      rawJid,
      phone: rawPhone,
      senderName,
      text,
      whatsappAccountId,
      whatsappRoutingMode,
      whatsappDepartmentId,
      whatsappDepartmentName
    } = msgData;
    const targetJid = rawJid || from;
    if (!targetJid || targetJid === 'undefined') {
      console.warn('Mensagem recebida sem JID válido:', msgData);
      return null;
    }
    const phone = phoneFromWhatsAppIdentity(rawPhone, targetJid);
    const outboundJid = preferredWhatsAppJid(phone, targetJid);
    const whatsappChannel = whatsappAccountId ? `whatsapp:${whatsappAccountId}` : 'whatsapp';
    let cleanName = senderName || (phone ? `Cliente ${phone.slice(-4)}` : 'Cliente');
    console.log(`Processando mensagem de ${cleanName} | Tel: ${phone} | JID: ${targetJid}`);
    if (!isSupabaseConfigured()) return null;
    try {
      await ensureConversationTrackingColumns();
      if (await wasRemoteMessageProcessed(whatsappAccountId, msgData.messageId)) {
        console.log(`[WhatsApp:${whatsappAccountId}] mensagem duplicada ignorada (${msgData.messageId}).`);
        return { type: 'duplicate', messageId: msgData.messageId };
      }
      const now = new Date();
      const t = makeTimeStr(now);

      const deptList = await getCachedDepartments();

      const botConfig = await getBotConfig();
      let forceDepartmentMenu = false;
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
      const sendBotText = async (ticketId, template, extra = {}) => {
        const rendered = renderBotMessage(template, botVariables(extra)).trim();
        if (!rendered || !whatsappService) return false;
        const sent = await whatsappService.sendMessage(outboundJid, rendered);
        if (sent && ticketId) {
          const botMessagePayload = {
            ticket_id: ticketId,
            sender: 'bot',
            text: `*Bot:*

${rendered}`,
            time: makeTimeStr(new Date()),
            remote_message_id: sent?.key?.id || null,
            whatsapp_account_id: whatsappAccountId || null
          };
          if (conversationTrackingColumnsAvailable === true) Object.assign(botMessagePayload, {
            sender_type: 'bot', sender_name: 'Bot', message_context: 'bot'
          });
          const result = await supabase.from('messages').insert(botMessagePayload);
          if (result.error) console.warn(`Falha ao registrar mensagem enviada pelo bot: ${result.error.message}`);
        }
        return sent;
      };
      const incomingMessagePayload = (ticketId, messageContext = 'service') => {
        const payload = { ticket_id: ticketId, sender: 'client', text, time: t };
        if (conversationTrackingColumnsAvailable === true) {
          payload.sender_type = 'customer';
          payload.message_context = messageContext;
        }
        const messageTimestamp = whatsappTimestampMs(msgData.timestamp);
        if (messageTimestamp) payload.created_at = new Date(messageTimestamp).toISOString();
        if (msgData.mediaType) payload.type = msgData.mediaType;
        if (remoteMessageColumnsAvailable === true) {
          payload.remote_message_id = msgData.messageId || null;
          payload.whatsapp_account_id = whatsappAccountId || null;
          payload.file_name = msgData.fileName || null;
        }
        if (msgData.mediaUrl) {
          payload.media_url = msgData.mediaUrl;
          rememberMediaTicket(msgData.mediaUrl, ticketId);
        }
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
        await sendBotText(targetTicket.id, noticeTemplate, { departamento: defaultDepartment.name });
        const fullTicket = await this.getFullTicket(targetTicket.id);
        if (io && fullTicket) {
          emitTicketEvent(io, 'ticket_created', { ticket: fullTicket }, fullTicket);
          scheduleKpiUpdate(io);
        }
        return { type: 'bot_disabled_routed', ticket: fullTicket || targetTicket };
      };
      const botStatePrefix = '[Chatbot][State] ';
      const saveBotState = async (ticketId, state) => {
        const statePayload = {
          ticket_id: ticketId,
          sender: 'system',
          type: 'divider',
          text: `${botStatePrefix}${JSON.stringify(state)}`,
          time: t
        };
        if (conversationTrackingColumnsAvailable === true) Object.assign(statePayload, {
          sender_type: 'bot', sender_name: 'Bot', message_context: 'bot'
        });
        assertSupabase(await supabase.from('messages').insert(statePayload), 'Falha ao registrar estado do bot');
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
        await saveBotState(targetTicket.id, { step: 'awaiting_name', attempt, promptedAt: new Date().toISOString() });
        await sendBotText(targetTicket.id, template, { tentativa: attempt, limite: botConfig.customer_name_attempt_limit });
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

        if (!forceDepartmentMenu && botConfig.resume_recent_enabled && lastClosedTicket) {
          const previousDepartment = lastClosedTicket.department;
          await saveBotState(targetTicket.id, {
            step: 'awaiting_resume',
            department: previousDepartment,
            promptedAt: new Date().toISOString()
          });
          assertSupabase(await supabase.from('messages').insert({
            ticket_id: targetTicket.id,
            sender: 'system',
            type: 'divider',
            text: `[Chatbot] Menu 24h enviado: Retomar ${previousDepartment}`,
            time: t
          }), 'Falha ao registrar menu de retomada');
          await sendBotText(targetTicket.id, botConfig.resume_message, { departamento: previousDepartment });
          return { type: 'chatbot_resume_prompt', ticket: targetTicket };
        }

        if (deptList.length > 0) {
          await saveBotState(targetTicket.id, { step: 'awaiting_department', promptedAt: new Date().toISOString() });
          await sendBotText(targetTicket.id, botConfig.greeting_message, { opcoes: botConfig.show_department_menu ? optionsText : '' });
        }
        return { type: 'chatbot_greeting', ticket: targetTicket };
      };

      // 1. Verifica se o cliente já possui um ticket ATIVO (chatbot, aguardando ou em_atendimento)
      const lookupConditions = [
        `phone.eq.${phone}`,
        `jid.eq.${from}`,
        `jid.eq.${outboundJid}`
      ];
      if (rawJid && rawJid !== from) {
        lookupConditions.push(`raw_jid.eq.${rawJid}`);
        lookupConditions.push(`jid.eq.${rawJid}`);
      }
      const rawLidNum = rawJid ? rawJid.replace('@lid', '').replace(/:\d+$/, '') : null;
      if (rawLidNum && rawLidNum !== phone) {
        lookupConditions.push(`phone.eq.${rawLidNum}`);
      }

      let activeTicketQuery = supabase
        .from('tickets')
        .select('*')
        .or(lookupConditions.join(','))
        .in('status', ['aguardando', 'em_atendimento', 'chatbot']);
      activeTicketQuery = scopeWhatsAppChannel(activeTicketQuery);
      let { data: ticket } = await activeTicketQuery
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ticket && phone && phone.length <= 15 && (ticket.phone !== phone || ticket.jid !== outboundJid || ticket.raw_jid !== rawJid)) {
        await supabase.from('tickets').update({ phone, jid: outboundJid, raw_jid: rawJid || from }).eq('id', ticket.id);
        ticket.phone = phone;
        ticket.jid = outboundJid;
        ticket.raw_jid = rawJid || from;
        if (ticket.contact_id) {
          await supabase.from('contacts').update({ phone }).eq('id', ticket.contact_id);
        }
      }

      if (ticket && knownContact?.name && isGeneratedCustomerName(ticket.client_name)) {
        const updatedIdentity = {
          client_name: knownContact.name,
          initials: knownContact.name.substring(0, 2).toUpperCase(),
          contact_id: knownContact.id
        };
        const result = await supabase.from('tickets').update(updatedIdentity).eq('id', ticket.id);
        if (!result.error) Object.assign(ticket, updatedIdentity);
      }

      // Uma conversa atendida pelo celular permanece humana enquanto estiver
      // ativa. Ela volta ao bot somente por encerramento, inatividade ou quando
      // o próprio cliente pede explicitamente um novo atendimento/menu.
      const isExternalHumanTicket = ticket && ticket.status === 'em_atendimento'
        && (['whatsapp_device', 'mixed'].includes(ticket.handled_via) || String(ticket.agent_name || '').startsWith('WhatsApp ('));
      if (isExternalHumanTicket) {
        const inactiveForMs = Date.now() - new Date(ticket.updated_at || ticket.created_at || now).getTime();
        const expired = botConfig.auto_close_external_service
          && inactiveForMs >= botConfig.external_service_idle_minutes * 60 * 1000;
        const requestedRestart = matchesNewServiceRequest(text, botConfig.restart_service_keywords);
        if (expired || requestedRestart) {
          forceDepartmentMenu = requestedRestart;
          await this.finalizeExternalTicket(ticket, {
            io,
            whatsappService,
            botConfig,
            sendRating: false,
            reason: requestedRestart ? 'Novo atendimento solicitado pelo cliente' : 'Inatividade no WhatsApp'
          });
          ticket = null;
        }
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
                scheduleKpiUpdate(io);
              }

              // Envia mensagem de agradecimento ao cliente
              if (whatsappService) {
                const stars = '⭐'.repeat(rawRating);
                try {
                  await sendBotText(targetTicket.id, botConfig.rating_thank_you_message, { estrelas: stars, nome: cleanName });
                } catch(e) {}
              }

              return { type: 'rating', rating: rawRating, ticketId: targetTicket.id };
            }
          }
        }
      }

      // 3. Se ainda não tem ticket ativo, cria o atendimento e inicia a identificação/roteamento.
      if (!ticket) {
        const isDedicated = whatsappRoutingMode === 'department' && Boolean(whatsappDepartmentId);
        const dedicatedDept = isDedicated
          ? deptList.find(d => String(d.id) === String(whatsappDepartmentId) || (whatsappDepartmentName && d.name.toLowerCase() === whatsappDepartmentName.toLowerCase()))
          : null;

        if (isDedicated && dedicatedDept) {
          const newTicketPayload = {
            id: crypto.randomUUID(),
            client_name: cleanName,
            initials: cleanName.substring(0, 2).toUpperCase(),
            phone,
            jid: outboundJid,
            raw_jid: rawJid,
            time: t,
            preview: text.slice(0, 50),
            status: 'aguardando',
            department: dedicatedDept.name,
            channel: whatsappChannel,
            unread_count: 1
          };
          if (dedicatedDept.id && dedicatedDept.id.length > 10) {
            newTicketPayload.department_id = dedicatedDept.id;
          }
          const { data: insertedTicket, error: insertError } = await supabase.from('tickets').insert(newTicketPayload).select().single();
          if (insertError) throw insertError;
          ticket = insertedTicket;

          // Auto-salva o contato no banco se ainda não existe cadastro e o nome não for genérico
          if (!knownContact && !isGeneratedCustomerName(cleanName)) {
            try {
              const saved = await saveConfirmedContact(phone, cleanName);
              if (saved?.id) {
                await supabase.from('tickets').update({ contact_id: saved.id }).eq('id', ticket.id);
                ticket.contact_id = saved.id;
              }
            } catch (_) {}
          }

          assertSupabase(await supabase.from('messages').insert(incomingMessagePayload(ticket.id)), 'Falha ao registrar mensagem inicial');

          await supabase.from('messages').insert({
            ticket_id: ticket.id,
            sender: 'system',
            type: 'divider',
            text: `[WhatsApp] Encaminhado diretamente para a fila: ${dedicatedDept.name}`,
            time: t
          });

          if (whatsappService && botConfig.send_queue_confirmation) {
            try {
              await sendBotText(ticket.id, botConfig.queue_confirmation_message, { departamento: dedicatedDept.name });
            } catch(e) {}
          }

          const fullTicket = await this.getFullTicket(ticket.id);
          if (io && fullTicket) {
            emitTicketEvent(io, 'ticket_created', { ticket: fullTicket }, fullTicket);
            scheduleKpiUpdate(io);
          }

          return { type: 'dedicated_routed', ticket: fullTicket || ticket };
        }

        const { data: insertedTicket, error: insertError } = await supabase.from('tickets').insert({
          id: crypto.randomUUID(),
          client_name: cleanName,
          initials: cleanName.substring(0, 2).toUpperCase(),
          phone,
          jid: outboundJid,
          raw_jid: rawJid,
          time: t,
          preview: text.slice(0, 50),
          status: botConfig.enabled ? 'chatbot' : 'aguardando',
          channel: whatsappChannel,
          unread_count: 0
        }).select().single();
        if (insertError) throw insertError;
        ticket = insertedTicket;

        // Auto-salva o contato no banco se ainda não existe cadastro e o nome não for genérico
        if (!knownContact && !isGeneratedCustomerName(cleanName)) {
          try {
            const saved = await saveConfirmedContact(phone, cleanName);
            if (saved?.id) {
              await supabase.from('tickets').update({ contact_id: saved.id }).eq('id', ticket.id);
              ticket.contact_id = saved.id;
            }
          } catch (_) {}
        }

        if (!botConfig.enabled) return routeWithoutBot(ticket, text);

        assertSupabase(await supabase.from('messages').insert(incomingMessagePayload(ticket.id, 'bot')), 'Falha ao registrar mensagem inicial');

        if (botConfig.collect_customer_name && needsCustomerName) return askForCustomerName(ticket);
        return startDepartmentRouting(ticket);
      }

      // Processa resposta ao Chatbot
      if (ticket.status === 'chatbot') {
         const isDedicated = whatsappRoutingMode === 'department' && Boolean(whatsappDepartmentId);
         const dedicatedDept = isDedicated
           ? deptList.find(d => String(d.id) === String(whatsappDepartmentId) || (whatsappDepartmentName && d.name.toLowerCase() === whatsappDepartmentName.toLowerCase()))
           : null;

         if (isDedicated && dedicatedDept) {
           let updatePayload = {
             status: 'aguardando',
             department: dedicatedDept.name,
             time: t,
             preview: text.slice(0, 50),
             updated_at: now.toISOString(),
             unread_count: Math.max(1, (ticket.unread_count || 0) + 1)
           };
           if (dedicatedDept.id && dedicatedDept.id.length > 10) {
             updatePayload.department_id = dedicatedDept.id;
           }
           await supabase.from('tickets').update(updatePayload).eq('id', ticket.id);
           Object.assign(ticket, updatePayload);

           assertSupabase(await supabase.from('messages').insert(incomingMessagePayload(ticket.id)), 'Falha ao registrar mensagem recebida');

           await supabase.from('messages').insert({
             ticket_id: ticket.id,
             sender: 'system',
             type: 'divider',
             text: `[WhatsApp] Encaminhado diretamente para a fila: ${dedicatedDept.name}`,
             time: t
           });

           if (whatsappService && botConfig.send_queue_confirmation) {
             try {
               await sendBotText(ticket.id, botConfig.queue_confirmation_message, { departamento: dedicatedDept.name });
             } catch (e) {}
           }

           const fullTicket = await this.getFullTicket(ticket.id);
           if (io && fullTicket) {
             emitTicketEvent(io, 'ticket_created', { ticket: fullTicket }, fullTicket);
             scheduleKpiUpdate(io);
           }
           return { type: 'dedicated_routed', ticket: fullTicket || ticket };
         }

         if (!botConfig.enabled) return routeWithoutBot(ticket, text);
         const cleanText = text.trim();
         assertSupabase(await supabase.from('messages').insert(incomingMessagePayload(ticket.id, 'bot')), 'Falha ao registrar resposta ao bot');

         const botState = await getLatestBotState(ticket.id);
         const arrivedBeforePrompt = state => messageWasSentBeforePrompt(
           msgData.timestamp,
           state?.promptedAt,
           botConfig.rapid_message_grace_seconds
         );
         const ignoreEarlyMessage = state => {
           console.log(`[Chatbot] Mensagem recebida antes do prompt foi preservada e não contou como erro (ticket ${ticket.id}, etapa ${state?.step || 'desconhecida'}).`);
           return { type: 'chatbot_early_message_ignored', ticket };
         };

         // Verifica se o cliente solicitou cancelamento/encerramento do atendimento
         if (botConfig.allow_customer_cancel && matchesCustomerCancellation(cleanText, botConfig.cancel_keywords)) {
           console.log(`🚫 Atendimento cancelado pelo cliente no bot: Ticket ${ticket.id} (${cleanName})`);
           const encerradoEm = makeTimeStr(now);
           const closePayload = {
             status: 'finalizado',
             assumed: false,
             encerrado_em: encerradoEm,
             encerrado_por: 'Cliente',
             closed_at: now.toISOString(),
             unread_count: 0,
             updated_at: now.toISOString()
           };
           await supabase.from('tickets').update(closePayload).eq('id', ticket.id);
           Object.assign(ticket, closePayload);

           await supabase.from('messages').insert({
             ticket_id: ticket.id,
             sender: 'system',
             type: 'divider',
             text: '🚫 [Chatbot] Atendimento cancelado pelo cliente',
             time: encerradoEm
           });

           try {
             await sendBotText(ticket.id, botConfig.customer_cancel_message, { nome: cleanName });
           } catch (_) {}

           if (io) {
             emitTicketEvent(io, 'ticket_closed', { ticketId: ticket.id, status: 'finalizado', closed_at: now.toISOString(), encerrado_por: 'Cliente' }, ticket);
             emitTicketEvent(io, 'queue_updated', { ticket }, ticket);
             scheduleKpiUpdate(io);
           }

           return { type: 'customer_cancelled', ticket };
         }

         if (botConfig.human_handoff_enabled && matchesHumanHandoff(cleanText, botConfig.human_handoff_keywords)) {
           return routeWithoutBot(ticket, text, false, botConfig.human_handoff_message);
         }

         if (msgData.mediaType && !botConfig.accept_media_during_routing) {
           try { await sendBotText(ticket.id, botConfig.media_during_routing_message); } catch(e) {}
           return { type: 'chatbot_media_blocked', ticket };
         }
         if (msgData.mediaType) {
           if (arrivedBeforePrompt(botState)) return ignoreEarlyMessage(botState);
           try {
             if (botConfig.collect_customer_name && botState?.step === 'confirming_name') {
               await sendBotText(ticket.id, botConfig.confirm_customer_name_message, { nome: botState.candidate });
             } else if (botConfig.collect_customer_name && botState?.step === 'awaiting_name') {
               await sendBotText(ticket.id, botConfig.ask_customer_name_message);
             } else {
               await sendBotText(ticket.id, botConfig.greeting_message, { opcoes: botConfig.show_department_menu ? optionsText : '' });
             }
           } catch(e) {}
           return { type: 'chatbot_media_received', ticket };
         }

         // Fluxo de coleta de nome — só entra se a opção estiver ativada
         if (botConfig.collect_customer_name && botState?.step === 'awaiting_name') {
           if (arrivedBeforePrompt(botState)) return ignoreEarlyMessage(botState);
           const validation = extractAndValidateName(cleanText, botConfig, deptList);
           if (!validation.valid) {
             const nextAttempt = (botState.attempt || 1) + 1;
             if (nextAttempt > botConfig.customer_name_attempt_limit) {
               await saveBotState(ticket.id, { step: 'name_skipped' });
               await sendBotText(ticket.id, botConfig.customer_name_skipped_message);
               return startDepartmentRouting(ticket);
             }
             return askForCustomerName(ticket, nextAttempt, botConfig.invalid_customer_name_message);
           }

           await saveBotState(ticket.id, {
             step: 'confirming_name',
             candidate: validation.name,
             attempt: botState.attempt || 1,
             promptedAt: new Date().toISOString()
           });
           await sendBotText(ticket.id, botConfig.confirm_customer_name_message, {
             nome: validation.name,
             tentativa: botState.attempt || 1,
             limite: botConfig.customer_name_attempt_limit
           });
           return { type: 'chatbot_confirming_name', ticket, candidate: validation.name };
         }

         if (botConfig.collect_customer_name && botState?.step === 'confirming_name') {
           const nameDecision = resolveNameConfirmation(cleanText);
           if (nameDecision === 'confirm') {
             let contactId = null;
             try {
               const contact = await saveConfirmedContact(phone, botState.candidate);
               contactId = contact?.id || null;
             } catch (errContact) {
               console.warn('Aviso: falha ao salvar contato após confirmação de nome:', errContact.message);
             }
             cleanName = botState.candidate;
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
             await sendBotText(ticket.id, botConfig.customer_name_saved_message, { nome: cleanName });
             return startDepartmentRouting(ticket);
           }
           if (nameDecision === 'correct') return askForCustomerName(ticket, botState.attempt || 1);
           if (arrivedBeforePrompt(botState)) return ignoreEarlyMessage(botState);
           await saveBotState(ticket.id, { ...botState, promptedAt: new Date().toISOString() });
           await sendBotText(ticket.id, botConfig.confirm_customer_name_message, { nome: botState.candidate });
           return { type: 'chatbot_confirming_name', ticket, candidate: botState.candidate };
         }

         // Só pede o nome novamente se collect_customer_name está ativado e nenhum estado de nome existe ainda
         if (botConfig.collect_customer_name && needsCustomerName && isGeneratedCustomerName(ticket.client_name) && !botState) {
           return askForCustomerName(ticket);
         }

         // Estado estruturado é a fonte principal; a busca textual mantém compatibilidade
         // com tickets que já estavam abertos antes desta versão.
         let isWaitingResume = botState?.step === 'awaiting_resume';
         let resumeTargetDept = isWaitingResume ? botState.department : null;
         if (!isWaitingResume) {
           const { data: chatbotMsgs } = await supabase
             .from('messages')
             .select('text')
             .eq('ticket_id', ticket.id)
             .like('text', '[Chatbot]%')
             .order('created_at', { ascending: false })
             .limit(1);
           isWaitingResume = chatbotMsgs?.[0]?.text?.startsWith('[Chatbot] Menu 24h enviado: Retomar') || false;
           if (isWaitingResume) {
             const match = chatbotMsgs[0].text.match(/\[Chatbot\] Menu 24h enviado: Retomar (.+)/);
             if (match) resumeTargetDept = match[1].trim();
           }
         }

         let selectedDept = null;

         // Se estava aguardando resposta do menu de 24 horas:
         if (isWaitingResume && resumeTargetDept) {
           const resumeChoice = resolveResumeChoice(cleanText);

           if (resumeChoice === 'resume') {
             selectedDept = deptList.find(d => d.name.toLowerCase() === resumeTargetDept.toLowerCase()) || { name: resumeTargetDept };
           } else if (resumeChoice === 'other') {
             // Cliente optou por outro departamento -> envia menu padrão com todos os setores
             // Registra que o cliente escolheu ver outro departamento
             await supabase.from('messages').insert({
               ticket_id: ticket.id,
               sender: 'system',
               type: 'divider',
               text: `[Chatbot] Cliente escolheu outro departamento`,
               time: t
             });

             await saveBotState(ticket.id, { step: 'awaiting_department', promptedAt: new Date().toISOString() });
             try { await sendBotText(ticket.id, botConfig.greeting_message, { opcoes: botConfig.show_department_menu ? optionsText : '' }); } catch(e) {}
             return { type: 'chatbot_menu_sent', ticket };
           } else if (arrivedBeforePrompt(botState)) {
             return ignoreEarlyMessage(botState);
           } else {
             // Uma resposta diferente de 1/2 pode ser o nome direto de outro setor.
             // A partir daqui seguimos pelo reconhecedor do menu completo.
             isWaitingResume = false;
             resumeTargetDept = null;
           }
         }

         // Reconhece número, nome, siglas, frases naturais e pequenos erros de digitação.
         if (!selectedDept && !(isWaitingResume && resumeTargetDept)) {
           selectedDept = resolveDepartmentIntent(cleanText, deptList, {
             acceptDepartmentName: botConfig.accept_department_name
           })?.department || null;
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
              try { await sendBotText(ticket.id, botConfig.queue_confirmation_message, { departamento: selectedDept.name }); } catch(e) {}
            }

            const fullTicket = await this.getFullTicket(ticket.id);
            // Notifica o frontend com dados completos do ticket e departamento real
            if (io && fullTicket) {
              emitTicketEvent(io, 'ticket_created', { ticket: fullTicket }, fullTicket);
              scheduleKpiUpdate(io);
            }
            
            return { type: 'chatbot_routed', ticket: fullTicket || ticket };
         } else {
             // Se o cliente digitou uma saudação ou comando para reiniciar menu
             const isGreeting = matchesMenuRequest(cleanText, botConfig.menu_keywords);

             if (whatsappService) {
                if (isGreeting || deptList.length === 0) {
                  await saveBotState(ticket.id, { step: 'awaiting_department', promptedAt: new Date().toISOString() });
                  try { await sendBotText(ticket.id, botConfig.greeting_message, { opcoes: botConfig.show_department_menu ? optionsText : '' }); } catch(e) {}
                } else {
                  if (arrivedBeforePrompt(botState)) return ignoreEarlyMessage(botState);
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

                  await saveBotState(ticket.id, { step: isWaitingResume ? 'awaiting_resume' : 'awaiting_department', department: resumeTargetDept, promptedAt: new Date().toISOString() });
                  try { await sendBotText(ticket.id, botConfig.invalid_option_message, { tentativa: attempt }); } catch(e) {}
                }
             }
             return { type: 'chatbot_invalid', ticket };
          }
      }

      // Ticket em andamento (aguardando ou em_atendimento)
       if (ticket.status === 'aguardando') {
         if (botConfig.allow_customer_cancel && matchesCustomerCancellation(text, botConfig.cancel_keywords)) {
           console.log(`🚫 Atendimento na fila cancelado pelo cliente: Ticket ${ticket.id} (${cleanName})`);
           const encerradoEm = makeTimeStr(now);
           const closePayload = {
             status: 'finalizado',
             assumed: false,
             encerrado_em: encerradoEm,
             encerrado_por: 'Cliente',
             closed_at: now.toISOString(),
             unread_count: 0,
             updated_at: now.toISOString()
           };
           await supabase.from('tickets').update(closePayload).eq('id', ticket.id);
           Object.assign(ticket, closePayload);

           await supabase.from('messages').insert({
             ticket_id: ticket.id,
             sender: 'system',
             type: 'divider',
             text: '🚫 Atendimento cancelado pelo cliente na fila de espera',
             time: encerradoEm
           });

           try {
             await sendBotText(ticket.id, botConfig.customer_cancel_message, { nome: cleanName });
           } catch (_) {}

           if (io) {
             emitTicketEvent(io, 'ticket_closed', { ticketId: ticket.id, status: 'finalizado', closed_at: now.toISOString(), encerrado_por: 'Cliente' }, ticket);
             emitTicketEvent(io, 'queue_updated', { ticket }, ticket);
             scheduleKpiUpdate(io);
           }

           return { type: 'customer_cancelled', ticket };
         }
       }

      const newUnread = (ticket.unread_count || 0) + 1;
      await supabase.from('tickets').update({ preview: text.slice(0, 50), time: t, updated_at: now.toISOString(), unread_count: newUnread }).eq('id', ticket.id);
      ticket.preview = text.slice(0, 50); ticket.time = t; ticket.unread_count = newUnread;
      
      const { mediaType, mediaUrl } = msgData;
      let savedMsg = null;

      try {
        const msgPayload = incomingMessagePayload(ticket.id);

        const { data: insertedMsg, error: msgError } = await supabase.from('messages').insert(msgPayload).select().single();
        if (msgError) {
          if (msgError.code === '23505') return { type: 'duplicate', messageId: msgData.messageId };
          if (isMissingRemoteMessageColumns(msgError)) remoteMessageColumnsAvailable = false;
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
      }
      return { ticket, message: savedMsg };
    } catch (e) {
      console.error('Erro no Supabase ao processar mensagem:', e);
      return null;
    }
  }

  async processExternalWhatsAppMessage(msgData, io, whatsappService = null) {
    if (!isSupabaseConfigured()) return null;
    const {
      from,
      rawJid,
      phone: rawPhone,
      text = '',
      mediaType,
      mediaUrl,
      fileName,
      timestamp,
      messageId,
      whatsappAccountId,
      whatsappAccountName,
      whatsappRoutingMode,
      whatsappDepartmentId,
      whatsappDepartmentName
    } = msgData;
    try {
      await ensureConversationTrackingColumns();
      if (await wasRemoteMessageProcessed(whatsappAccountId, messageId)) {
        return { type: 'duplicate', messageId };
      }

      const targetJid = rawJid || from;
      const phone = phoneFromWhatsAppIdentity(rawPhone, targetJid);
      const outboundJid = preferredWhatsAppJid(phone, targetJid);
      const channel = whatsappAccountId ? `whatsapp:${whatsappAccountId}` : 'whatsapp';
      const now = new Date();
      const messageDateMs = whatsappTimestampMs(timestamp);
      const createdAt = messageDateMs ? new Date(messageDateMs).toISOString() : now.toISOString();
      const time = makeTimeStr(messageDateMs ? new Date(messageDateMs) : now);
      const accountLabel = String(whatsappAccountName || 'celular').trim().slice(0, 80);
      const senderLabel = `WhatsApp (${accountLabel})`;
      const previewText = text || ({ audio: '🎙️ Áudio', image: '📷 Imagem', video: '🎥 Vídeo', document: `📄 ${fileName || 'Documento'}` }[mediaType] || 'Mensagem enviada pelo WhatsApp');

      const lookup = [`phone.eq.${phone}`, `jid.eq.${targetJid}`];
      if (outboundJid && outboundJid !== targetJid) lookup.push(`jid.eq.${outboundJid}`);
      if (rawJid && rawJid !== targetJid) lookup.push(`raw_jid.eq.${rawJid}`);
      let activeQuery = supabase.from('tickets').select('*').or(lookup.join(',')).in('status', ['chatbot', 'aguardando', 'em_atendimento']);
      activeQuery = whatsappAccountId === 'default'
        ? activeQuery.in('channel', ['whatsapp', channel])
        : activeQuery.eq('channel', channel);
      let { data: ticket, error: activeError } = await activeQuery.order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (activeError) throw activeError;
      let createdTicket = false;

      let previousTicket = null;
      if (!ticket) {
        let previousQuery = supabase.from('tickets').select('client_name, initials, contact_id, department, department_id, agent_name, handled_via').or(lookup.join(','));
        previousQuery = whatsappAccountId === 'default'
          ? previousQuery.in('channel', ['whatsapp', channel])
          : previousQuery.eq('channel', channel);
        const previousResult = await previousQuery.order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (!previousResult.error) previousTicket = previousResult.data;

        const knownContact = await findContactByPhone(phone);
        const departments = await getCachedDepartments();
        const botConfig = await getBotConfig();
        const dedicatedDepartment = whatsappRoutingMode === 'department'
          ? departments.find(department => String(department.id) === String(whatsappDepartmentId)
            || normalizeBotInput(department.name) === normalizeBotInput(whatsappDepartmentName))
          : null;
        const inheritedDepartment = previousTicket?.department_id
          ? departments.find(department => String(department.id) === String(previousTicket.department_id))
          : null;
        const targetDepartment = dedicatedDepartment || inheritedDepartment
          || departments.find(department => String(department.id) === String(botConfig.default_department_id))
          || departments[0] || null;
        const clientName = knownContact?.name || previousTicket?.client_name || (phone ? `Cliente ${phone.slice(-4)}` : 'Cliente');
        const ticketPayload = {
          id: crypto.randomUUID(),
          client_name: clientName,
          initials: clientName.substring(0, 2).toUpperCase(),
          contact_id: knownContact?.id || previousTicket?.contact_id || null,
          phone,
          jid: outboundJid,
          raw_jid: rawJid || targetJid,
          time,
          preview: `WhatsApp: ${previewText.slice(0, 70)}`,
          status: 'em_atendimento',
          assumed: true,
          assumed_at: now.toISOString(),
          first_response_at: createdAt,
          agent_name: senderLabel,
          channel,
          unread_count: 0,
          handled_via: 'whatsapp_device',
          direct_whatsapp_messages: 1
        };
        if (targetDepartment?.name) ticketPayload.department = targetDepartment.name;
        if (targetDepartment?.id && String(targetDepartment.id).length > 10) ticketPayload.department_id = targetDepartment.id;
        let insertResult = await supabase.from('tickets').insert(ticketPayload).select().single();
        if (insertResult.error && isMissingTicketTimingColumns(insertResult.error)) {
          delete ticketPayload.first_response_at;
          insertResult = await supabase.from('tickets').insert(ticketPayload).select().single();
        }
        if (insertResult.error && isMissingConversationTrackingColumns(insertResult.error)) {
          conversationTrackingColumnsAvailable = false;
          delete ticketPayload.handled_via;
          delete ticketPayload.direct_whatsapp_messages;
          insertResult = await supabase.from('tickets').insert(ticketPayload).select().single();
        } else if (!insertResult.error) {
          conversationTrackingColumnsAvailable = true;
        }
        ticket = assertSupabase(insertResult, 'Falha ao criar atendimento iniciado pelo WhatsApp');
        createdTicket = true;
      } else {
        const inferredCurrent = ticket.handled_via || (ticket.agent_name && !String(ticket.agent_name).startsWith('WhatsApp (') ? 'platform' : 'pending');
        const updatePayload = {
          status: 'em_atendimento',
          assumed: true,
          assumed_at: ticket.assumed_at || now.toISOString(),
          first_response_at: ticket.first_response_at || createdAt,
          agent_name: ticket.agent_name || senderLabel,
          time,
          preview: `WhatsApp: ${previewText.slice(0, 70)}`,
          updated_at: now.toISOString(),
          handled_via: mergeHandledVia(inferredCurrent, 'whatsapp_device'),
          direct_whatsapp_messages: (ticket.direct_whatsapp_messages || 0) + 1
        };
        let updateResult = await supabase.from('tickets').update(updatePayload).eq('id', ticket.id);
        if (updateResult.error && isMissingTicketTimingColumns(updateResult.error)) {
          delete updatePayload.first_response_at;
          updateResult = await supabase.from('tickets').update(updatePayload).eq('id', ticket.id);
        }
        if (updateResult.error && isMissingConversationTrackingColumns(updateResult.error)) {
          conversationTrackingColumnsAvailable = false;
          delete updatePayload.handled_via;
          delete updatePayload.direct_whatsapp_messages;
          updateResult = await supabase.from('tickets').update(updatePayload).eq('id', ticket.id);
        } else if (!updateResult.error) {
          conversationTrackingColumnsAvailable = true;
        }
        assertSupabase(updateResult, 'Falha ao atualizar atendimento respondido pelo WhatsApp');
        Object.assign(ticket, updatePayload);
      }

      // O @lid identifica o dispositivo/conversa, mas não deve ser usado como
      // destinatário. Mantemos o valor bruto para correlação e persistimos o
      // JID telefônico para que as mensagens possam ser descriptografadas.
      if (ticket && phone && phone.length <= 15
        && (ticket.phone !== phone || ticket.jid !== outboundJid || ticket.raw_jid !== (rawJid || targetJid))) {
        const identity = { phone, jid: outboundJid, raw_jid: rawJid || targetJid };
        const identityResult = await supabase.from('tickets').update(identity).eq('id', ticket.id);
        if (!identityResult.error) Object.assign(ticket, identity);
      }

      const formattedText = `*${senderLabel}:*${text ? `\n\n${text}` : ''}`;
      const messagePayload = {
        ticket_id: ticket.id,
        sender: 'agent',
        sender_type: 'whatsapp_device',
        sender_name: senderLabel,
        message_context: 'service',
        type: mediaType || null,
        text: formattedText,
        time,
        media_url: mediaUrl || null,
        file_name: fileName || null,
        remote_message_id: messageId || null,
        whatsapp_account_id: whatsappAccountId || null,
        created_at: createdAt
      };
      let messageResult = await supabase.from('messages').insert(messagePayload).select().single();
      if (messageResult.error?.code === '23505') return { type: 'duplicate', messageId, ticket };
      if (messageResult.error && isMissingConversationTrackingColumns(messageResult.error)) {
        conversationTrackingColumnsAvailable = false;
        delete messagePayload.sender_type;
        delete messagePayload.sender_name;
        delete messagePayload.message_context;
        messageResult = await supabase.from('messages').insert(messagePayload).select().single();
      } else if (!messageResult.error) {
        conversationTrackingColumnsAvailable = true;
      }
      const savedMessage = assertSupabase(messageResult, 'Falha ao salvar resposta feita pelo WhatsApp');
      if (mediaUrl) rememberMediaTicket(mediaUrl, ticket.id);

      const fullTicket = await this.getFullTicket(ticket.id);
      const emittedTicket = fullTicket || ticket;
      if (io) {
        emitTicketEvent(io, createdTicket ? 'ticket_created' : 'ticket_updated', { ticket: emittedTicket }, emittedTicket);
        emitTicketEvent(io, 'new_message', { ticketId: ticket.id, message: savedMessage, ticket: emittedTicket }, emittedTicket);
        scheduleKpiUpdate(io);
      }
      if (matchesExternalClosureMessage(text)) {
        await this.finalizeExternalTicket(emittedTicket, {
          io,
          whatsappService,
          reason: 'Encerrado pelo atendente no WhatsApp'
        });
        return { type: 'external_whatsapp_closed', ticket: emittedTicket, message: savedMessage };
      }
      return { type: 'external_whatsapp_message', ticket: emittedTicket, message: savedMessage };
    } catch (error) {
      console.error('Falha ao registrar resposta enviada diretamente pelo WhatsApp:', error.message);
      return null;
    }
  }

  async finalizeExternalTicket(ticket, { io, whatsappService = null, botConfig = null, sendRating = true, reason = 'Inatividade no WhatsApp' } = {}) {
    if (!ticket?.id) return false;
    const now = new Date();
    const time = makeTimeStr(now);
    const config = botConfig || await getBotConfig();
    const closePayload = {
      status: 'finalizado',
      assumed: false,
      encerrado_em: time,
      encerrado_por: reason,
      closed_at: now.toISOString(),
      awaiting_rating: Boolean(sendRating && config.send_rating_request),
      unread_count: 0,
      updated_at: now.toISOString()
    };
    const closeResult = await supabase.from('tickets').update(closePayload).eq('id', ticket.id);
    if (closeResult.error) throw closeResult.error;
    Object.assign(ticket, closePayload);

    await supabase.from('messages').insert({
      ticket_id: ticket.id,
      sender: 'system',
      type: 'divider',
      text: `✅ Atendimento pelo WhatsApp encerrado • ${reason}`,
      time
    });

    if (sendRating && config.send_rating_request && whatsappService) {
      const targetJid = preferredWhatsAppJid(ticket.phone, ticket.jid || ticket.raw_jid);
      const accountId = ticket.channel?.startsWith('whatsapp:') ? ticket.channel.slice('whatsapp:'.length) : null;
      const ratingText = renderBotMessage(config.rating_request_message, {
        nome: ticket.client_name || 'Cliente',
        departamento: ticket.department || 'Atendimento'
      }).trim();
      if (targetJid && ratingText) {
        const sent = await whatsappService.sendMessage(targetJid, ratingText, accountId);
        if (sent) {
          const ratingPayload = {
            ticket_id: ticket.id,
            sender: 'bot',
            text: `*Bot:*\n\n${ratingText}`,
            time,
            remote_message_id: sent?.key?.id || null,
            whatsapp_account_id: accountId || null
          };
          if (conversationTrackingColumnsAvailable === true) Object.assign(ratingPayload, {
            sender_type: 'bot', sender_name: 'Bot', message_context: 'bot'
          });
          await supabase.from('messages').insert(ratingPayload);
        }
      }
    }

    if (io) {
      emitTicketEvent(io, 'ticket_closed', {
        ticketId: ticket.id,
        status: 'finalizado',
        closed_at: closePayload.closed_at,
        encerrado_por: reason
      }, ticket);
      emitTicketEvent(io, 'queue_updated', { ticket }, ticket);
      scheduleKpiUpdate(io);
    }
    return true;
  }

  async closeInactiveExternalTickets(io, whatsappService) {
    if (!isSupabaseConfigured()) return 0;
    await ensureConversationTrackingColumns();
    if (conversationTrackingColumnsAvailable !== true) return 0;
    const config = await getBotConfig();
    if (!config.auto_close_external_service) return 0;
    const cutoff = new Date(Date.now() - config.external_service_idle_minutes * 60 * 1000).toISOString();
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('status', 'em_atendimento')
      .in('handled_via', ['whatsapp_device', 'mixed'])
      .lt('updated_at', cutoff)
      .limit(100);
    if (error) {
      if (!isMissingConversationTrackingColumns(error)) console.warn(`Falha ao verificar atendimentos externos inativos: ${error.message}`);
      return 0;
    }
    let closed = 0;
    for (const ticket of tickets || []) {
      try {
        if (await this.finalizeExternalTicket(ticket, { io, whatsappService, botConfig: config })) closed += 1;
      } catch (closeError) {
        console.warn(`Falha ao encerrar atendimento externo ${ticket.id}: ${closeError.message}`);
      }
    }
    return closed;
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
      const relatedTicketIds = [...pastTickets.map(item => item.id), ticket.id];
      const { data: relatedMessages, error: relatedMessagesError } = await supabase
        .from('messages')
        .select('*')
        .in('ticket_id', relatedTicketIds)
        .order('created_at', { ascending: true });
      if (relatedMessagesError) throw relatedMessagesError;
      const messagesByTicket = new Map();
      for (const message of relatedMessages || []) {
        const group = messagesByTicket.get(message.ticket_id) || [];
        group.push(message);
        messagesByTicket.set(message.ticket_id, group);
      }

      for (const past of pastTickets) {
        const pMsgs = messagesByTicket.get(past.id) || [];
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

      consolidated.push(...(messagesByTicket.get(ticket.id) || []));

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

      for (let t of tickets) {
        // A listagem da fila carrega apenas resumos. As mensagens são buscadas
        // sob demanda quando o atendente abre uma conversa.
        t.messages = [];
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
        if (!isAdmin(user)) throw new Error('Atividade global restrita');
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
      const visibleRatings = isAdmin(user) ? (avaliacoes || []) : [];
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
    await ensureConversationTrackingColumns();
    
    // Busca rápida do ticket sem overhead de recarregar histórico pesado
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (!ticket || !canUserAccessTicket(currentUser, ticket)) return { success: false, error: 'Ticket nao encontrado' };
    const agentName = currentUser.name || 'Atendente';
    const now = new Date(); const t = makeTimeStr(now);
    const targetJid = preferredWhatsAppJid(ticket.phone, ticket.jid || ticket.raw_jid);
    const formattedText = `*${agentName}:*\n\n${text}`;
    try {
      // 1. Envia imediatamente para o WhatsApp
      const accountId = ticket.channel?.startsWith('whatsapp:') ? ticket.channel.slice('whatsapp:'.length) : null;
      const sent = await whatsappService.sendMessage(targetJid, formattedText, accountId);
      if (sent) {
        // 2. Grava a mensagem no banco
        const agentMessagePayload = {
          ticket_id: ticket.id,
          sender: 'agent',
          text: formattedText,
          time: t,
          remote_message_id: sent?.key?.id || null,
          whatsapp_account_id: accountId || null
        };
        if (conversationTrackingColumnsAvailable === true) Object.assign(agentMessagePayload, {
          sender_type: 'platform', sender_name: agentName, message_context: 'service'
        });
        const messageResult = await supabase
          .from('messages')
          .insert(agentMessagePayload)
          .select()
          .single();
        const savedMsg = assertSupabase(messageResult, 'Falha ao salvar mensagem');

        ticket.preview = `Você: ${text.slice(0, 40)}`;
        ticket.time = t;
        const platformUpdate = {
          preview: ticket.preview,
          time: t,
          updated_at: now.toISOString(),
          agent_name: agentName,
          handled_via: mergeHandledVia(ticket.handled_via, 'platform'),
          platform_messages: (ticket.platform_messages || 0) + 1
        };
        let platformUpdateResult = await supabase.from('tickets').update(platformUpdate).eq('id', ticket.id);
        if (platformUpdateResult.error && isMissingConversationTrackingColumns(platformUpdateResult.error)) {
          conversationTrackingColumnsAvailable = false;
          delete platformUpdate.handled_via;
          delete platformUpdate.platform_messages;
          platformUpdateResult = await supabase.from('tickets').update(platformUpdate).eq('id', ticket.id);
        } else if (!platformUpdateResult.error) {
          conversationTrackingColumnsAvailable = true;
        }
        assertSupabase(platformUpdateResult, 'Falha ao atualizar ticket');
        Object.assign(ticket, platformUpdate);

        // 3. Emite WebSocket IMEDIATAMENTE para a interface
        if (io) {
          emitTicketEvent(io, 'new_message', { ticketId: ticket.id, message: savedMsg, ticket }, ticket);
        }
        return { success: true, ticket, message: savedMsg };
      }
    } catch (error) { return { success: false, error: error.message }; }
    return { success: false, error: 'Falha ao enviar' };
  }

  async sendAgentMedia(ticketId, fileBuffer, metadata, currentUser, io, whatsappService) {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase nao configurado' };
    await ensureConversationTrackingColumns();
    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) return { success: false, error: 'Arquivo vazio ou inválido.' };
    try {
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .maybeSingle();
      if (ticketError) throw ticketError;
      if (!ticket || !canUserAccessTicket(currentUser, ticket)) return { success: false, error: 'Ticket nao encontrado' };

      let mimeType = String(metadata.mimeType || 'application/octet-stream').slice(0, 120).toLowerCase();
      const requestedType = String(metadata.mediaType || '').toLowerCase();
      const mediaType = requestedType === 'audio' || mimeType.startsWith('audio/') ? 'audio'
        : requestedType === 'image' || mimeType.startsWith('image/') ? 'image'
          : requestedType === 'video' || mimeType.startsWith('video/') ? 'video'
            : 'document';
      const { displayName, extension } = safeUploadedFileName(metadata.fileName);
      const normalizedMedia = await normalizeOutgoingMedia(fileBuffer, {
        mediaType,
        mimeType,
        voiceNote: metadata.voiceNote === true
      });
      const outgoingBuffer = normalizedMedia.buffer;
      mimeType = normalizedMedia.mimeType;
      const inferredExtension = normalizedMedia.fileExtension || extension || ({ audio: '.ogg', image: '.jpg', video: '.mp4', document: '.bin' }[mediaType]);
      const storedName = `sent_${Date.now()}_${crypto.randomUUID().replace(/-/g, '')}${inferredExtension}`;
      const mediaUrl = `/api/media/${storedName}`;
      const caption = String(metadata.caption || '').trim().slice(0, 4000);
      const agentName = currentUser.name || 'Atendente';
      const targetJid = preferredWhatsAppJid(ticket.phone, ticket.jid || ticket.raw_jid);
      const accountId = ticket.channel?.startsWith('whatsapp:') ? ticket.channel.slice('whatsapp:'.length) : null;

      await fs.promises.mkdir(MEDIA_DIR, { recursive: true });
      const storedMediaPath = path.join(MEDIA_DIR, storedName);
      const sendPromise = whatsappService.sendMediaMessage(
        targetJid,
        outgoingBuffer,
        mediaType,
        caption,
        displayName,
        accountId,
        mimeType,
        normalizedMedia.voiceNote === true
      );
      // O salvamento do histórico local e o upload ao WhatsApp são independentes.
      // Executá-los juntos reduz a espera, sobretudo em arquivos maiores.
      const [, sent] = await Promise.all([
        Promise.all([
          fs.promises.writeFile(storedMediaPath, outgoingBuffer),
          cloudStorage.uploadMedia(storedName, outgoingBuffer, mimeType)
            .catch(error => console.warn(`Mídia enviada salva apenas localmente: ${error.message}`))
        ]),
        sendPromise
      ]);
      if (!sent) {
        await fs.promises.unlink(storedMediaPath).catch(() => {});
        return { success: false, error: 'Falha ao enviar arquivo para o WhatsApp.' };
      }

      const now = new Date();
      const formattedText = `*${agentName}:*${caption ? `\n\n${caption}` : ''}`;
      const messagePromise = supabase.from('messages').insert({
        ticket_id: ticket.id,
        sender: 'agent',
        ...(conversationTrackingColumnsAvailable === true ? {
          sender_type: 'platform', sender_name: agentName, message_context: 'service'
        } : {}),
        type: mediaType,
        text: formattedText,
        time: makeTimeStr(now),
        media_url: mediaUrl,
        media_type: mimeType,
        file_name: displayName,
        remote_message_id: sent?.key?.id || null,
        whatsapp_account_id: accountId || null
      }).select().single();
      const preview = caption || ({ audio: '🎙️ Áudio', image: '📷 Imagem', video: '🎥 Vídeo', document: `📄 ${displayName}` }[mediaType]);
      const updatePayload = {
        preview,
        time: makeTimeStr(now),
        updated_at: now.toISOString(),
        agent_name: agentName,
        handled_via: mergeHandledVia(ticket.handled_via, 'platform'),
        platform_messages: (ticket.platform_messages || 0) + 1
      };
      const messageResult = await messagePromise;
      const savedMessage = assertSupabase(messageResult, 'Falha ao salvar mídia enviada');
      let ticketUpdateResult = await supabase.from('tickets').update(updatePayload).eq('id', ticket.id);
      if (ticketUpdateResult.error && isMissingConversationTrackingColumns(ticketUpdateResult.error)) {
        conversationTrackingColumnsAvailable = false;
        delete updatePayload.handled_via;
        delete updatePayload.platform_messages;
        ticketUpdateResult = await supabase.from('tickets').update(updatePayload).eq('id', ticket.id);
      } else if (!ticketUpdateResult.error) {
        conversationTrackingColumnsAvailable = true;
      }
      assertSupabase(ticketUpdateResult, 'Falha ao atualizar ticket');
      rememberMediaTicket(mediaUrl, ticket.id);
      Object.assign(ticket, updatePayload);
      if (io) {
        emitTicketEvent(io, 'new_message', { ticketId: ticket.id, message: savedMessage, ticket }, ticket);
      }
      return { success: true, ticket, message: savedMessage };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async assumeTicket(ticketId, currentUser, io) {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase nao configurado' };
    try {
      const { data: existingTicket, error: ticketError } = await supabase
        .from('tickets')
        .select('id, user_id, agent_name, department_id, department, status, assumed')
        .eq('id', ticketId)
        .maybeSingle();
      if (ticketError) throw ticketError;
      if (!existingTicket || !canUserAccessTicket(currentUser, existingTicket)) return { success: false, error: 'Ticket nao encontrado' };

      // Se o chamado já está em atendimento e atribuído ao mesmo usuário, retorna com sucesso
      if (existingTicket.status === 'em_atendimento' && (existingTicket.user_id === currentUser.id || existingTicket.agent_name === currentUser.name)) {
        const fullTicket = await this.getFullTicket(ticketId);
        return { success: true, ticket: fullTicket };
      }

      const agentName = currentUser.name || 'Atendente';
      const nowISO = new Date().toISOString();
      const claimPayload = {
        status: 'em_atendimento',
        assumed: true,
        user_id: uuidOrNull(currentUser.id),
        agent_name: agentName,
        assumed_at: nowISO,
        updated_at: nowISO
      };
      if (ticketTimingColumnsAvailable !== false) {
        claimPayload.first_response_at = nowISO;
      }
      let claimResult;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        claimResult = await supabase
          .from('tickets')
          .update(claimPayload)
          .eq('id', ticketId)
          .eq('status', 'aguardando')
          .or('assumed.eq.false,assumed.is.null')
          .select('id')
          .maybeSingle();

        if (!claimResult.error) {
          if ('first_response_at' in claimPayload) ticketTimingColumnsAvailable = true;
          break;
        }
        if (!isMissingTicketTimingColumns(claimResult.error)) break;

        const errorMessage = String(claimResult.error.message || '');
        let removedField = false;
        for (const field of ['first_response_at', 'assumed_at']) {
          if (field in claimPayload && errorMessage.includes(field)) {
            delete claimPayload[field];
            removedField = true;
          }
        }
        if (!removedField) {
          delete claimPayload.first_response_at;
          delete claimPayload.assumed_at;
        }
        ticketTimingColumnsAvailable = false;
      }

      if (claimResult.error) throw claimResult.error;
      if (!claimResult.data) {
        // Duas requisições do mesmo atendente podem disputar o mesmo chamado
        // antes de a interface terminar de atualizar. Nesse caso, assumir é
        // idempotente: a segunda requisição confirma o resultado da primeira.
        const { data: latestTicket, error: latestError } = await supabase
          .from('tickets')
          .select('id, user_id, agent_name, department_id, department, status, assumed')
          .eq('id', ticketId)
          .maybeSingle();
        if (latestError) throw latestError;
        if (latestTicket?.status === 'em_atendimento' && (latestTicket.user_id === currentUser.id || latestTicket.agent_name === currentUser.name)) {
          const fullTicket = await this.getFullTicket(ticketId);
          return { success: true, ticket: fullTicket };
        }
        return { success: false, error: 'Este atendimento já foi assumido por outro atendente.' };
      }

      assertSupabase(await supabase.from('messages').insert({ ticket_id: ticketId, sender: 'system', type: 'divider', text: `Atendimento assumido por ${agentName}`, time: makeTimeStr(new Date()) }), 'Falha ao registrar atendimento');
      const fullTicket = await this.getFullTicket(ticketId);
      if (io) { emitTicketEvent(io, 'ticket_updated', { ticket: fullTicket }, fullTicket); scheduleKpiUpdate(io); }
      return { success: true, ticket: fullTicket };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async transferTicket(ticketId, transferData, currentUser, io, whatsappService) {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase nao configurado' };
    try {
      const { departmentId, departmentName, targetUserId, targetUserName, note } = transferData;
      if (isSupervisor(currentUser) && (!departmentId || !canAccessDepartment(currentUser, departmentId))) {
        return { success: false, error: 'Supervisores só podem transferir atendimentos entre os departamentos sob sua supervisão.' };
      }
      
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
        updatePayload.user_id = uuidOrNull(targetUserId);
        updatePayload.agent_name = targetUserName;
        updatePayload.assumed = true;
        updatePayload.status = 'em_atendimento';
      } else {
        updatePayload.user_id = null;
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
        scheduleKpiUpdate(io);
      }

      // Notifica o cliente via WhatsApp sobre a transferência em background
      if (whatsappService) {
        const botConfig = await getBotConfig();
        const targetJid = preferredWhatsAppJid(currentTicket.phone, currentTicket.jid || currentTicket.raw_jid);
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
        scheduleKpiUpdate(io);
      }

      // Envia pesquisa de satisfação via WhatsApp em background (não atrasa a resposta)
      if (whatsappService && ticket) {
        const botConfig = await getBotConfig();
        const targetJid = preferredWhatsAppJid(ticket.phone, ticket.jid || ticket.raw_jid);
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
      }

      return { success: true, ticket: fullTicket };
    } catch (e) {
      console.error('Erro ao atualizar contato:', e);
      return { success: false, error: e.message };
    }
  }

  async attachIncomingMedia(media, io) {
    if (!isSupabaseConfigured() || !media?.ticketId || !media?.mediaUrl) return false;
    try {
      const updatePayload = {
        type: media.mediaType,
        media_url: media.mediaUrl,
        media_type: media.mediaType,
        file_name: media.fileName || null
      };
      let message = null;
      if (remoteMessageColumnsAvailable !== false && media.messageId && media.whatsappAccountId) {
        const result = await supabase.from('messages').update(updatePayload)
          .eq('ticket_id', media.ticketId)
          .eq('remote_message_id', media.messageId)
          .eq('whatsapp_account_id', media.whatsappAccountId)
          .select().maybeSingle();
        if (!result.error) message = result.data;
        else if (isMissingRemoteMessageColumns(result.error)) remoteMessageColumnsAvailable = false;
      }
      if (!message) {
        const { data: candidate } = await supabase.from('messages')
          .select('id')
          .eq('ticket_id', media.ticketId)
          .eq('sender', 'client')
          .eq('type', media.mediaType)
          .is('media_url', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (candidate) {
          const result = await supabase.from('messages').update(updatePayload).eq('id', candidate.id).select().single();
          if (result.error) throw result.error;
          message = result.data;
        }
      }
      if (!message) return false;
      rememberMediaTicket(media.mediaUrl, media.ticketId);
      const fullTicket = await this.getFullTicket(media.ticketId);
      if (io && fullTicket) {
        emitTicketEvent(io, 'ticket_updated', { ticket: fullTicket }, fullTicket);
      }
      return true;
    } catch (error) {
      console.warn(`Falha ao vincular mídia recuperada ao atendimento: ${error.message}`);
      return false;
    }
  }

  async canAccessMedia(filename, user) {
    if (!isSupabaseConfigured()) return false;
    let ticketId = mediaTicketCache.get(filename) || null;
    if (!ticketId) {
      const { data: message, error } = await supabase
        .from('messages')
        .select('ticket_id')
        .or(`media_url.eq./api/media/${filename},text.like.%||/api/media/${filename}`)
        .limit(1)
        .maybeSingle();
      if (error || !message) return false;
      ticketId = message.ticket_id;
      rememberMediaTicket(`/api/media/${filename}`, ticketId);
    }
    if (isAdmin(user)) return true;

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, agent_name, department_id, department')
      .eq('id', ticketId)
      .maybeSingle();
    if (ticketError || !ticket) return false;
    return canUserAccessTicket(user, ticket);
  }
}

const ticketService = new TicketService();
ticketService._test = { mergeHandledVia, preferredWhatsAppJid, phoneFromWhatsAppIdentity };

module.exports = ticketService;
