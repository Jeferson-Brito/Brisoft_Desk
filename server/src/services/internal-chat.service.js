const crypto = require('crypto');
const { supabase, isSupabaseConfigured } = require('../config/supabase');

// Fallback em memória para desenvolvimento ou caso a migração do banco ainda não tenha rodado
const memoryConversations = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    type: 'general',
    name: '📢 Geral da Empresa',
    last_message_text: 'Canal oficial para recados e comunicados de toda a equipe',
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];
const memoryParticipants = [];
const memoryMessages = [];

class InternalChatService {
  constructor() {
    this.io = null;
  }

  setIO(ioInstance) {
    this.io = ioInstance;
  }

  // Retorna todas as conversas pertinentes ao usuário:
  // 1. Canal Geral
  // 2. Canal do seu Departamento (se tiver)
  // 3. Conversas Diretas com outros colegas
  async listConversations(user) {
    if (!user || !user.id) return [];

    let conversations = [];

    // Tenta carregar do Supabase
    if (isSupabaseConfigured()) {
      try {
        // 1. Busca conversas gerais
        const { data: generalConvs } = await supabase
          .from('internal_conversations')
          .select('*')
          .eq('type', 'general');

        // 2. Busca conversas de departamento do usuário
        let deptConvs = [];
        const userDeptIds = [...new Set([...(user.department_ids || []), user.department_id].filter(Boolean))];
        if (userDeptIds.length > 0) {
          const { data: depts } = await supabase
            .from('internal_conversations')
            .select('*')
            .eq('type', 'department')
            .in('department_id', userDeptIds);
          if (depts) deptConvs = depts;
        }

        // 3. Busca conversas diretas onde o usuário é participante
        const { data: userParts } = await supabase
          .from('internal_conversation_participants')
          .select('conversation_id, last_read_at')
          .eq('user_id', user.id);

        let directConvs = [];
        if (userParts && userParts.length > 0) {
          const convIds = userParts.map(p => p.conversation_id);
          const { data: directs } = await supabase
            .from('internal_conversations')
            .select('*')
            .in('id', convIds)
            .in('type', ['direct', 'group']);
          if (directs) directConvs = directs;
        }

        // Consolida
        const rawConvs = [...(generalConvs || []), ...deptConvs, ...directConvs];
        const uniqueMap = new Map();
        for (const c of rawConvs) uniqueMap.set(c.id, c);

        conversations = Array.from(uniqueMap.values());
      } catch (err) {
        console.warn('⚠️ Falha ao consultar conversas no Supabase (usando fallback):', err.message);
        conversations = [...memoryConversations];
      }
    } else {
      conversations = [...memoryConversations];
    }

    // Se estiver vazio (ex: inicialização), garante canal geral
    if (!conversations.some(c => c.type === 'general')) {
      conversations.unshift(memoryConversations[0]);
    }

    // Para cada conversa, enriquece com dados do participante (se direct) e mensagens não lidas
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        let title = conv.name;
        let otherUser = null;
        let unreadCount = 0;

        if (conv.type === 'direct') {
          // Achar o outro participante
          const otherUserId = await this.getOtherParticipantId(conv.id, user.id);
          if (otherUserId) {
            otherUser = await this.getUserById(otherUserId);
            if (otherUser) {
              title = otherUser.name;
            }
          }
        }

        unreadCount = await this.getUnreadCount(conv.id, user.id);

        return {
          id: conv.id,
          type: conv.type,
          name: title,
          department_id: conv.department_id,
          other_user: otherUser,
          unread_count: unreadCount,
          last_message_text: conv.last_message_text || '',
          last_message_at: conv.last_message_at || conv.updated_at,
          created_at: conv.created_at
        };
      })
    );

    // Ordena por última mensagem mais recente
    enriched.sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0));
    return enriched;
  }

  // Lista todos os colegas disponíveis na empresa para iniciar chat direto
  async listTeamMembers(currentUser) {
    let users = [];

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email, role, department_id, avatar_url, status, is_active')
          .eq('is_active', true)
          .neq('id', currentUser.id)
          .order('name', { ascending: true });

        if (!error && Array.isArray(data)) {
          users = data;
        }
      } catch (err) {
        console.warn('Falha ao listar membros da equipe:', err.message);
      }
    }

    return users;
  }

  // Busca ou cria uma conversa direta entre currentUser e targetUserId
  async getOrCreateDirectChat(currentUser, targetUserId) {
    if (!currentUser?.id || !targetUserId || currentUser.id === targetUserId) {
      throw new Error('Usuário alvo inválido');
    }

    if (isSupabaseConfigured()) {
      try {
        // Procura conversa direta existente com esses dois participantes
        const { data: myParts } = await supabase
          .from('internal_conversation_participants')
          .select('conversation_id')
          .eq('user_id', currentUser.id);

        if (myParts && myParts.length > 0) {
          const myConvIds = myParts.map(p => p.conversation_id);
          const { data: targetParts } = await supabase
            .from('internal_conversation_participants')
            .select('conversation_id')
            .eq('user_id', targetUserId)
            .in('conversation_id', myConvIds);

          if (targetParts && targetParts.length > 0) {
            // Verifica se alguma é do tipo 'direct'
            const foundIds = targetParts.map(p => p.conversation_id);
            const { data: foundDirect } = await supabase
              .from('internal_conversations')
              .select('*')
              .in('id', foundIds)
              .eq('type', 'direct')
              .limit(1)
              .maybeSingle();

            if (foundDirect) {
              const otherUser = await this.getUserById(targetUserId);
              return {
                ...foundDirect,
                other_user: otherUser,
                unread_count: 0
              };
            }
          }
        }

        // Não existe: cria nova conversa direta
        const targetUser = await this.getUserById(targetUserId);
        const { data: newConv, error: createError } = await supabase
          .from('internal_conversations')
          .insert({
            type: 'direct',
            created_by: currentUser.id,
            name: targetUser ? targetUser.name : 'Conversa Direta'
          })
          .select('*')
          .single();

        if (createError) throw createError;

        // Associa os dois participantes
        await supabase.from('internal_conversation_participants').insert([
          { conversation_id: newConv.id, user_id: currentUser.id },
          { conversation_id: newConv.id, user_id: targetUserId }
        ]);

        return {
          ...newConv,
          other_user: targetUser,
          unread_count: 0
        };
      } catch (err) {
        console.warn('Erro ao criar conversa no Supabase, usando memória:', err.message);
      }
    }

    // Fallback em memória
    let existing = memoryConversations.find(c => 
      c.type === 'direct' &&
      memoryParticipants.some(p => p.conversation_id === c.id && p.user_id === currentUser.id) &&
      memoryParticipants.some(p => p.conversation_id === c.id && p.user_id === targetUserId)
    );

    if (existing) return existing;

    const newId = crypto.randomUUID();
    const newConv = {
      id: newId,
      type: 'direct',
      name: 'Conversa Direta',
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memoryConversations.push(newConv);
    memoryParticipants.push({ conversation_id: newId, user_id: currentUser.id });
    memoryParticipants.push({ conversation_id: newId, user_id: targetUserId });
    return newConv;
  }

  // Lista mensagens de uma conversa
  async getMessages(conversationId, limit = 50) {
    if (!conversationId) return [];

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('internal_messages')
          .select(`
            id,
            conversation_id,
            sender_id,
            text,
            media_url,
            media_type,
            file_name,
            reply_to_id,
            created_at,
            sender:users!sender_id (id, name, avatar_url, role)
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(limit);

        if (!error && Array.isArray(data)) {
          return data;
        }
      } catch (err) {
        console.warn('Erro ao carregar mensagens no Supabase:', err.message);
      }
    }

    return memoryMessages.filter(m => m.conversation_id === conversationId);
  }

  // Envia mensagem e faz broadcast instantâneo via Socket.io
  async sendMessage(currentUser, conversationId, { text, media_url, media_type, file_name, reply_to_id }) {
    if (!text && !media_url) {
      throw new Error('Mensagem vazia');
    }

    const messageData = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender_id: currentUser.id,
      text: String(text || '').trim(),
      media_url: media_url || null,
      media_type: media_type || null,
      file_name: file_name || null,
      reply_to_id: reply_to_id || null,
      created_at: new Date().toISOString(),
      sender: {
        id: currentUser.id,
        name: currentUser.name,
        avatar_url: currentUser.avatar_url || null,
        role: currentUser.role || 'Analista'
      }
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('internal_messages').insert({
          id: messageData.id,
          conversation_id: conversationId,
          sender_id: currentUser.id,
          text: messageData.text,
          media_url: messageData.media_url,
          media_type: messageData.media_type,
          file_name: messageData.file_name,
          reply_to_id: messageData.reply_to_id,
          created_at: messageData.created_at
        });

        // Atualiza last_message na conversa
        await supabase
          .from('internal_conversations')
          .update({
            last_message_text: messageData.text || 'Arquivo compartilhado',
            last_message_at: messageData.created_at,
            updated_at: messageData.created_at
          })
          .eq('id', conversationId);
      } catch (err) {
        console.warn('Erro ao salvar mensagem no Supabase:', err.message);
      }
    }

    memoryMessages.push(messageData);

    // Broadcast em tempo real via Socket.io
    if (this.io) {
      this.broadcastMessage(conversationId, messageData, currentUser);
    }

    return messageData;
  }

  // Marca conversa como lida
  async markAsRead(currentUser, conversationId) {
    if (!currentUser?.id || !conversationId) return;

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('internal_conversation_participants')
          .update({ last_read_at: new Date().toISOString() })
          .match({ conversation_id: conversationId, user_id: currentUser.id });
      } catch (_) {}
    }
  }

  // Broadcast do Socket.io de acordo com o tipo da conversa
  async broadcastMessage(conversationId, messageData, senderUser) {
    if (!this.io) return;

    // Busca o tipo da conversa
    let convType = 'direct';
    let deptId = null;

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('internal_conversations')
          .select('type, department_id')
          .eq('id', conversationId)
          .maybeSingle();
        if (data) {
          convType = data.type;
          deptId = data.department_id;
        }
      } catch (_) {}
    }

    if (convType === 'general') {
      // Emite para todos conectados
      this.io.emit('internal_message', messageData);
    } else if (convType === 'department' && deptId) {
      // Emite para a sala do departamento
      this.io.to(`department:${deptId}`).emit('internal_message', messageData);
    } else {
      // Direta: emite para o destinatário e para o remetente
      const otherUserId = await this.getOtherParticipantId(conversationId, senderUser.id);
      if (otherUserId) {
        this.io.to(`user:${otherUserId}`).emit('internal_message', messageData);
      }
      this.io.to(`user:${senderUser.id}`).emit('internal_message', messageData);
    }
  }

  async getOtherParticipantId(conversationId, currentUserId) {
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('internal_conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversationId)
          .neq('user_id', currentUserId)
          .limit(1)
          .maybeSingle();
        if (data?.user_id) return data.user_id;
      } catch (_) {}
    }

    const p = memoryParticipants.find(
      mp => mp.conversation_id === conversationId && mp.user_id !== currentUserId
    );
    return p?.user_id || null;
  }

  async getUserById(userId) {
    if (!userId) return null;
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('users')
          .select('id, name, email, role, avatar_url, status')
          .eq('id', userId)
          .maybeSingle();
        if (data) return data;
      } catch (_) {}
    }
    return { id: userId, name: 'Colaborador', role: 'Analista' };
  }

  async getUnreadCount(conversationId, userId) {
    if (isSupabaseConfigured()) {
      try {
        const { data: part } = await supabase
          .from('internal_conversation_participants')
          .select('last_read_at')
          .match({ conversation_id: conversationId, user_id: userId })
          .maybeSingle();

        const lastRead = part?.last_read_at || '1970-01-01T00:00:00Z';

        const { count, error } = await supabase
          .from('internal_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', userId)
          .gt('created_at', lastRead);

        if (!error && typeof count === 'number') {
          return count;
        }
      } catch (_) {}
    }
    return 0;
  }

  // Cria um novo canal ou grupo interno
  async createChannel(currentUser, { name, type = 'group', department_id = null, participant_ids = [] }) {
    if (!name || !name.trim()) throw new Error('Nome do canal é obrigatório');

    const cleanName = name.trim();
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    const allParticipantIds = [...new Set([currentUser.id, ...(participant_ids || [])])];

    const convData = {
      id: newId,
      type: type || 'group',
      name: cleanName,
      department_id: department_id || null,
      created_by: currentUser.id,
      last_message_text: `Canal criado por ${currentUser.name || 'Colega'}`,
      last_message_at: now,
      created_at: now,
      updated_at: now
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('internal_conversations').insert(convData);

        if (allParticipantIds.length > 0) {
          const participantRows = allParticipantIds.map(uid => ({
            conversation_id: newId,
            user_id: uid,
            joined_at: now
          }));
          await supabase.from('internal_conversation_participants').insert(participantRows);
        }
      } catch (err) {
        console.warn('Erro ao criar canal no Supabase, usando memória:', err.message);
      }
    }

    // Salva em memória para redundância
    memoryConversations.unshift(convData);
    allParticipantIds.forEach(uid => {
      memoryParticipants.push({ conversation_id: newId, user_id: uid });
    });

    // Notifica via Socket.io
    if (this.io) {
      if (type === 'general') {
        this.io.emit('internal_conversation_created', convData);
      } else {
        allParticipantIds.forEach(uid => {
          this.io.to(`user:${uid}`).emit('internal_conversation_created', convData);
        });
      }
    }

    return convData;
  }

  // Retorna detalhes completos da conversa (membros e galeria de mídia)
  async getConversationDetails(conversationId) {
    if (!conversationId) return null;

    let conv = null;
    let participants = [];
    let mediaMessages = [];

    if (isSupabaseConfigured()) {
      try {
        const { data: convData } = await supabase
          .from('internal_conversations')
          .select('*')
          .eq('id', conversationId)
          .single();
        if (convData) conv = convData;

        // Participantes
        const { data: partData } = await supabase
          .from('internal_conversation_participants')
          .select('user_id, joined_at, user:users(id, name, avatar_url, role, email)')
          .eq('conversation_id', conversationId);

        if (partData && Array.isArray(partData)) {
          participants = partData.map(p => ({
            id: p.user_id,
            joined_at: p.joined_at,
            name: p.user?.name || 'Colega',
            avatar_url: p.user?.avatar_url || null,
            role: p.user?.role || 'Colaborador',
            email: p.user?.email || ''
          }));
        }

        // Mídias compartilhadas
        const { data: medias } = await supabase
          .from('internal_messages')
          .select('id, media_url, media_type, file_name, created_at, sender_id')
          .eq('conversation_id', conversationId)
          .not('media_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(30);

        if (medias) mediaMessages = medias;
      } catch (err) {
        console.warn('Erro ao obter detalhes no Supabase:', err.message);
      }
    }

    if (!conv) {
      conv = memoryConversations.find(c => c.id === conversationId);
      const partIds = memoryParticipants.filter(p => p.conversation_id === conversationId).map(p => p.user_id);
      participants = partIds.map(uid => ({ id: uid, name: 'Colega', role: 'Colaborador' }));
      mediaMessages = memoryMessages.filter(m => m.conversation_id === conversationId && m.media_url);
    }

    return {
      conversation: conv,
      participants,
      mediaCount: mediaMessages.length,
      mediaMessages
    };
  }
}

module.exports = new InternalChatService();
