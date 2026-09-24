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
    this.userCache = new Map();
    this.lastReadCache = new Map(); // key: `${userId}:${conversationId}` -> ISO string
  }

  setIO(ioInstance) {
    this.io = ioInstance;
  }

  // Retorna todas as conversas pertinentes ao usuário de forma ultra-rápida (batch queries)
  async listConversations(user) {
    if (!user || !user.id) return [];

    let conversations = [];

    // Tenta carregar do Supabase
    if (isSupabaseConfigured()) {
      try {
        const userDeptIds = [...new Set([...(user.department_ids || []), user.department_id].filter(Boolean))];

        // 1. Busca conversas gerais, de departamento e do usuário em paralelo
        const [generalRes, deptRes, partsRes] = await Promise.all([
          supabase.from('internal_conversations').select('*').eq('type', 'general'),
          userDeptIds.length > 0
            ? supabase.from('internal_conversations').select('*').eq('type', 'department').in('department_id', userDeptIds)
            : Promise.resolve({ data: [] }),
          supabase.from('internal_conversation_participants').select('conversation_id, last_read_at').eq('user_id', user.id)
        ]);

        const generalConvs = generalRes.data || [];
        const deptConvs = deptRes.data || [];
        const userParts = partsRes.data || [];

        let directConvs = [];
        if (userParts.length > 0) {
          const convIds = userParts.map(p => p.conversation_id);
          const { data: directs } = await supabase
            .from('internal_conversations')
            .select('*')
            .in('id', convIds)
            .in('type', ['direct', 'group']);
          if (directs) directConvs = directs;
        }

        // Consolida únicas
        const rawConvs = [...generalConvs, ...deptConvs, ...directConvs];
        const uniqueMap = new Map();
        for (const c of rawConvs) uniqueMap.set(c.id, c);
        conversations = Array.from(uniqueMap.values());

        // Batch resolve participants e other_user para conversas diretas
        const directConvIds = conversations.filter(c => c.type === 'direct').map(c => c.id);
        const userPartMap = new Map(userParts.map(p => [p.conversation_id, p.last_read_at]));

        let allOtherParts = [];
        if (directConvIds.length > 0) {
          const { data: parts } = await supabase
            .from('internal_conversation_participants')
            .select('conversation_id, user_id')
            .in('conversation_id', directConvIds)
            .neq('user_id', user.id);
          if (parts) allOtherParts = parts;
        }

        const otherUserIdByConv = new Map();
        for (const p of allOtherParts) {
          otherUserIdByConv.set(p.conversation_id, p.user_id);
        }

        // Carrega em batch usuários que ainda não estão em cache
        const missingUserIds = [...new Set(Array.from(otherUserIdByConv.values()))].filter(
          id => !this.userCache.has(id) || this.userCache.get(id).expiresAt <= Date.now()
        );

        if (missingUserIds.length > 0) {
          const { data: fetchedUsers } = await supabase
            .from('users')
            .select('id, name, email, role, avatar_url, status')
            .in('id', missingUserIds);

          if (fetchedUsers) {
            const exp = Date.now() + 120000;
            for (const u of fetchedUsers) {
              this.userCache.set(u.id, { user: u, expiresAt: exp });
            }
          }
        }

        // Checagem otimizada de não lidas apenas nas conversas com mensagens recentes
        const convsNeedingUnreadCheck = conversations.filter(c => {
          const cachedRead = this.lastReadCache.get(`${user.id}:${c.id}`);
          const dbRead = userPartMap.get(c.id);
          const lastRead = cachedRead || dbRead || null;
          // Se o usuário nunca leu e a conversa não possui mensagens, dispensa contagem
          if (!lastRead && !c.last_message_at && !c.updated_at) return false;
          const effectiveRead = lastRead || '1970-01-01T00:00:00Z';
          const lastMsg = c.last_message_at || c.updated_at || '';
          return lastMsg > effectiveRead;
        });

        const unreadCountMap = new Map();
        if (convsNeedingUnreadCheck.length > 0) {
          await Promise.all(
            convsNeedingUnreadCheck.map(async (c) => {
              const cachedRead = this.lastReadCache.get(`${user.id}:${c.id}`);
              const dbRead = userPartMap.get(c.id);
              const lastRead = cachedRead || dbRead || '1970-01-01T00:00:00Z';
              const { count } = await supabase
                .from('internal_messages')
                .select('id', { count: 'exact', head: true })
                .eq('conversation_id', c.id)
                .neq('sender_id', user.id)
                .gt('created_at', lastRead);
              unreadCountMap.set(c.id, count || 0);
            })
          );
        }

        // Mapeia enriquecimento instantâneo em memória
        const enriched = conversations.map(conv => {
          let title = conv.name;
          let otherUser = null;

          if (conv.type === 'direct') {
            const otherId = otherUserIdByConv.get(conv.id);
            if (otherId) {
              const cached = this.userCache.get(otherId);
              otherUser = cached ? cached.user : { id: otherId, name: 'Colaborador', role: 'Analista' };
              if (otherUser?.name) title = otherUser.name;
            }
          }

          const unreadCount = unreadCountMap.get(conv.id) || 0;

          return {
            id: conv.id,
            type: conv.type,
            name: title,
            department_id: conv.department_id,
            created_by: conv.created_by || null,
            avatar_url: conv.avatar_url || null,
            other_user: otherUser,
            unread_count: unreadCount,
            last_message_text: conv.last_message_text || '',
            last_message_at: conv.last_message_at || conv.updated_at,
            created_at: conv.created_at
          };
        });

        if (!enriched.some(c => c.type === 'general')) {
          enriched.unshift(memoryConversations[0]);
        }

        enriched.sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0));
        return enriched;
      } catch (err) {
        console.warn('⚠️ Falha ao consultar conversas no Supabase (usando fallback):', err.message);
        conversations = [...memoryConversations];
      }
    } else {
      conversations = [...memoryConversations];
    }

    if (!conversations.some(c => c.type === 'general')) {
      conversations.unshift(memoryConversations[0]);
    }
    return conversations;
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
            reactions,
            is_pinned,
            is_edited,
            is_deleted,
            created_at,
            sender:users!sender_id (id, name, avatar_url, role)
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(limit);

        if (!error && Array.isArray(data)) {
          return data.map(m => ({
            ...m,
            reactions: m.reactions || [],
            is_pinned: !!m.is_pinned,
            is_edited: !!m.is_edited,
            is_deleted: !!m.is_deleted
          }));
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
      reactions: [],
      is_pinned: false,
      is_edited: false,
      is_deleted: false,
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
    const now = new Date().toISOString();

    // 1. Atualiza cache em memória imediato do serviço (0ms de latência)
    this.lastReadCache.set(`${currentUser.id}:${conversationId}`, now);

    // 2. Persiste no Supabase com upsert (garante criação caso não exista linha de participante para canais gerais ou de setor)
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('internal_conversation_participants')
          .upsert({
            conversation_id: conversationId,
            user_id: currentUser.id,
            last_read_at: now,
            joined_at: now
          }, { onConflict: 'conversation_id,user_id' });
      } catch (err) {
        console.warn('Erro ao marcar conversa interna como lida no Supabase:', err.message);
      }
    }

    // 3. Fallback para estrutura em memória
    const memPart = memoryParticipants.find(p => p.conversation_id === conversationId && p.user_id === currentUser.id);
    if (memPart) {
      memPart.last_read_at = now;
    } else {
      memoryParticipants.push({ conversation_id: conversationId, user_id: currentUser.id, last_read_at: now, joined_at: now });
    }

    // 4. Notifica via Socket.io para sincronizar abas do mesmo usuário
    if (this.io) {
      this.io.to(`user:${currentUser.id}`).emit('internal_conversation_read', {
        conversationId,
        userId: currentUser.id,
        readAt: now
      });
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
    const now = Date.now();
    const cached = this.userCache.get(userId);
    if (cached && cached.expiresAt > now) {
      return cached.user;
    }

    let user = null;
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('users')
          .select('id, name, email, role, avatar_url, status')
          .eq('id', userId)
          .maybeSingle();
        if (data) user = data;
      } catch (_) {}
    }

    if (!user) {
      user = { id: userId, name: 'Colaborador', role: 'Analista' };
    }

    this.userCache.set(userId, { user, expiresAt: now + 120000 });
    return user;
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
  async createChannel(currentUser, { name, type = 'group', department_id = null, avatar_url = null, participant_ids = [] }) {
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
      avatar_url: avatar_url || null,
      last_message_text: `Grupo criado por ${currentUser.name || 'Colega'}`,
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

  // Atualiza dados e participantes do grupo/canal
  async updateChannel(currentUser, conversationId, { name, avatar_url, participant_ids }) {
    if (!conversationId) throw new Error('ID da conversa é obrigatório');

    let conv = null;
    let currentParticipantIds = [];
    if (isSupabaseConfigured()) {
      const { data: convData } = await supabase
        .from('internal_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      if (!convData) throw new Error('Conversa não encontrada');
      conv = convData;

      const { data: currentParts } = await supabase
        .from('internal_conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId);
      currentParticipantIds = (currentParts || []).map(p => p.user_id);
    } else {
      conv = memoryConversations.find(c => c.id === conversationId);
      if (!conv) throw new Error('Conversa não encontrada');
      currentParticipantIds = memoryParticipants.filter(p => p.conversation_id === conversationId).map(p => p.user_id);
    }

    if (conv.type === 'direct') {
      throw new Error('Conversas diretas não podem ser editadas');
    }

    const updates = { updated_at: new Date().toISOString() };
    if (name && typeof name === 'string' && name.trim()) {
      updates.name = name.trim();
      conv.name = updates.name;
    }
    if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url;
      conv.avatar_url = avatar_url;
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('internal_conversations')
          .update(updates)
          .eq('id', conversationId);
      } catch (err) {
        console.warn('Erro ao atualizar conversa no Supabase:', err.message);
      }
    }

    // Gerenciar participantes se fornecido
    if (Array.isArray(participant_ids)) {
      const targetIds = [...new Set([conv.created_by || currentUser.id, ...participant_ids].filter(Boolean))];
      const toAdd = targetIds.filter(id => !currentParticipantIds.includes(id));
      const toRemove = currentParticipantIds.filter(id => !targetIds.includes(id) && id !== conv.created_by);

      if (isSupabaseConfigured()) {
        try {
          if (toAdd.length > 0) {
            const rowsToAdd = toAdd.map(uid => ({
              conversation_id: conversationId,
              user_id: uid,
              joined_at: new Date().toISOString()
            }));
            await supabase.from('internal_conversation_participants').insert(rowsToAdd);
          }
          if (toRemove.length > 0) {
            await supabase
              .from('internal_conversation_participants')
              .delete()
              .eq('conversation_id', conversationId)
              .in('user_id', toRemove);
          }
        } catch (err) {
          console.warn('Erro ao atualizar participantes no Supabase:', err.message);
        }
      }

      // Memória
      toAdd.forEach(uid => memoryParticipants.push({ conversation_id: conversationId, user_id: uid }));
      for (let i = memoryParticipants.length - 1; i >= 0; i--) {
        if (memoryParticipants[i].conversation_id === conversationId && toRemove.includes(memoryParticipants[i].user_id)) {
          memoryParticipants.splice(i, 1);
        }
      }

      if (this.io) {
        toRemove.forEach(uid => {
          this.io.to(`user:${uid}`).emit('internal_conversation_removed', { id: conversationId });
        });
      }
    }

    const updatedDetails = await this.getConversationDetails(conversationId);

    if (this.io) {
      this.broadcastEvent(conversationId, 'internal_conversation_updated', {
        id: conversationId,
        name: conv.name,
        avatar_url: conv.avatar_url,
        updated_at: updates.updated_at,
        details: updatedDetails
      });
    }

    return updatedDetails;
  }

  // Exclui grupo ou canal
  async deleteChannel(currentUser, conversationId) {
    if (!conversationId) throw new Error('ID do canal é obrigatório');

    let conv = null;
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from('internal_conversations').select('*').eq('id', conversationId).single();
      conv = data;
    } else {
      conv = memoryConversations.find(c => c.id === conversationId);
    }
    if (!conv) throw new Error('Canal não encontrado');
    if (conv.type === 'general') throw new Error('O canal geral da empresa não pode ser excluído');

    const isAdminUser = currentUser?.role === 'Administrador';
    if (!isAdminUser && conv.created_by && conv.created_by !== currentUser.id) {
      throw new Error('Apenas o criador do canal ou administradores podem excluí-lo');
    }

    if (this.io) {
      this.broadcastEvent(conversationId, 'internal_conversation_deleted', { id: conversationId });
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('internal_conversations').delete().eq('id', conversationId);
      } catch (err) {
        console.warn('Erro ao deletar conversa no Supabase:', err.message);
      }
    }

    const convIndex = memoryConversations.findIndex(c => c.id === conversationId);
    if (convIndex !== -1) memoryConversations.splice(convIndex, 1);

    return { success: true, id: conversationId };
  }

  // Sair de um grupo
  async leaveChannel(currentUser, conversationId) {
    if (!conversationId) throw new Error('ID do canal é obrigatório');

    let conv = null;
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from('internal_conversations').select('*').eq('id', conversationId).single();
      conv = data;
    } else {
      conv = memoryConversations.find(c => c.id === conversationId);
    }
    if (!conv) throw new Error('Canal não encontrado');
    if (conv.type === 'general') throw new Error('Não é possível sair do canal geral da empresa');

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('internal_conversation_participants')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', currentUser.id);
      } catch (err) {
        console.warn('Erro ao sair do canal no Supabase:', err.message);
      }
    }

    for (let i = memoryParticipants.length - 1; i >= 0; i--) {
      if (memoryParticipants[i].conversation_id === conversationId && memoryParticipants[i].user_id === currentUser.id) {
        memoryParticipants.splice(i, 1);
      }
    }

    if (this.io) {
      this.io.to(`user:${currentUser.id}`).emit('internal_conversation_removed', { id: conversationId });
      this.broadcastEvent(conversationId, 'internal_participant_left', {
        conversation_id: conversationId,
        user_id: currentUser.id,
        user_name: currentUser.name
      });
    }

    return { success: true };
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

  // Emite evento para os participantes da conversa
  async broadcastEvent(conversationId, eventName, payload) {
    if (!this.io) return;

    let convType = 'general';
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
    } else {
      const conv = memoryConversations.find(c => c.id === conversationId);
      if (conv) {
        convType = conv.type;
        deptId = conv.department_id;
      }
    }

    if (convType === 'general') {
      this.io.emit(eventName, payload);
    } else if (convType === 'department' && deptId) {
      this.io.to(`department:${deptId}`).emit(eventName, payload);
    } else {
      // Para conversas diretas ou grupos, busca todos os participantes
      let participantIds = [];
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabase
            .from('internal_conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversationId);
          if (data) participantIds = data.map(p => p.user_id);
        } catch (_) {}
      }
      if (participantIds.length === 0) {
        participantIds = memoryParticipants.filter(p => p.conversation_id === conversationId).map(p => p.user_id);
      }

      participantIds.forEach(uid => {
        this.io.to(`user:${uid}`).emit(eventName, payload);
      });
    }
  }

  // Alterna reação com emoji na mensagem
  async toggleReaction(currentUser, messageId, emoji) {
    if (!currentUser?.id || !messageId || !emoji) {
      throw new Error('Parâmetros inválidos');
    }

    let msg = memoryMessages.find(m => m.id === messageId);
    if (!msg && isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('internal_messages')
          .select('*')
          .eq('id', messageId)
          .maybeSingle();
        if (data) msg = data;
      } catch (_) {}
    }

    if (!msg) {
      throw new Error('Mensagem não encontrada');
    }

    let reactions = Array.isArray(msg.reactions) ? [...msg.reactions] : [];
    const existingIndex = reactions.findIndex(r => r.emoji === emoji && r.user_id === currentUser.id);

    if (existingIndex >= 0) {
      reactions.splice(existingIndex, 1);
    } else {
      reactions.push({
        emoji,
        user_id: currentUser.id,
        user_name: currentUser.name
      });
    }

    msg.reactions = reactions;

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('internal_messages')
          .update({ reactions })
          .eq('id', messageId);
      } catch (err) {
        console.warn('Supabase reactions update skipped:', err.message);
      }
    }

    const payload = {
      messageId,
      conversationId: msg.conversation_id,
      reactions
    };

    await this.broadcastEvent(msg.conversation_id, 'internal_reaction_updated', payload);
    return payload;
  }

  // Alterna fixação da mensagem
  async togglePinMessage(currentUser, messageId) {
    if (!currentUser?.id || !messageId) {
      throw new Error('Parâmetros inválidos');
    }

    let msg = memoryMessages.find(m => m.id === messageId);
    if (!msg && isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('internal_messages')
          .select('*')
          .eq('id', messageId)
          .maybeSingle();
        if (data) msg = data;
      } catch (_) {}
    }

    if (!msg) {
      throw new Error('Mensagem não encontrada');
    }

    const isPinned = !msg.is_pinned;
    msg.is_pinned = isPinned;
    msg.pinned_by = isPinned ? currentUser.id : null;
    msg.pinned_at = isPinned ? new Date().toISOString() : null;

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('internal_messages')
          .update({
            is_pinned: msg.is_pinned,
            pinned_by: msg.pinned_by,
            pinned_at: msg.pinned_at
          })
          .eq('id', messageId);
      } catch (err) {
        console.warn('Supabase pin update skipped:', err.message);
      }
    }

    const payload = {
      messageId,
      conversationId: msg.conversation_id,
      is_pinned: msg.is_pinned,
      pinned_by: msg.pinned_by,
      pinned_at: msg.pinned_at,
      message: msg
    };

    await this.broadcastEvent(msg.conversation_id, 'internal_message_pinned', payload);
    return payload;
  }

  // Edita texto da mensagem (somente o autor)
  async editMessage(currentUser, messageId, newText) {
    const text = String(newText || '').trim();
    if (!text) {
      throw new Error('Texto da mensagem não pode ser vazio');
    }

    let msg = memoryMessages.find(m => m.id === messageId);
    if (!msg && isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('internal_messages')
          .select('*')
          .eq('id', messageId)
          .maybeSingle();
        if (data) msg = data;
      } catch (_) {}
    }

    if (!msg) {
      throw new Error('Mensagem não encontrada');
    }

    if (msg.sender_id !== currentUser.id) {
      throw new Error('Apenas o autor pode editar a mensagem');
    }

    msg.text = text;
    msg.is_edited = true;
    msg.edited_at = new Date().toISOString();

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('internal_messages')
          .update({
            text: msg.text,
            is_edited: true,
            edited_at: msg.edited_at
          })
          .eq('id', messageId);
      } catch (err) {
        console.warn('Supabase edit update skipped:', err.message);
      }
    }

    const payload = {
      messageId,
      conversationId: msg.conversation_id,
      text: msg.text,
      is_edited: true,
      edited_at: msg.edited_at
    };

    await this.broadcastEvent(msg.conversation_id, 'internal_message_edited', payload);
    return payload;
  }

  // Exclui mensagem (autor ou admin)
  async deleteMessage(currentUser, messageId) {
    let msg = memoryMessages.find(m => m.id === messageId);
    if (!msg && isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('internal_messages')
          .select('*')
          .eq('id', messageId)
          .maybeSingle();
        if (data) msg = data;
      } catch (_) {}
    }

    if (!msg) {
      throw new Error('Mensagem não encontrada');
    }

    const isAuthor = msg.sender_id === currentUser.id;
    const isAdmin = currentUser.role === 'admin';
    if (!isAuthor && !isAdmin) {
      throw new Error('Você não tem permissão para excluir esta mensagem');
    }

    msg.is_deleted = true;
    msg.text = 'Esta mensagem foi apagada';
    msg.media_url = null;

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('internal_messages')
          .update({
            is_deleted: true,
            text: msg.text,
            media_url: null
          })
          .eq('id', messageId);
      } catch (err) {
        console.warn('Supabase delete update skipped:', err.message);
      }
    }

    const payload = {
      messageId,
      conversationId: msg.conversation_id
    };

    await this.broadcastEvent(msg.conversation_id, 'internal_message_deleted', payload);
    return { success: true, messageId };
  }
}

module.exports = new InternalChatService();
