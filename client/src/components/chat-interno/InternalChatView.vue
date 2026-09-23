<template>
  <div class="internal-chat-layout">
    <!-- Coluna 1: Lista de Canais e Colegas de Equipe -->
    <aside class="internal-sidebar">
      <div class="sidebar-header">
        <div class="header-title-row">
          <div class="title-with-icon">
            <span class="chat-icon-badge"><i class="ri-team-line"></i></span>
            <div>
              <h2 class="sidebar-title">Equipe Brisoft</h2>
              <span class="sidebar-subtitle">Chat Interno da Empresa</span>
            </div>
          </div>
          <span class="online-counter-pill" :title="`${onlineCount} colaboradores online no sistema`">
            <span class="status-live-dot"></span>
            {{ onlineCount }} online
          </span>
        </div>

        <!-- Campo de Busca na Sidebar -->
        <div class="search-box-wrapper">
          <i class="ri-search-line search-icon"></i>
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Buscar colega ou canal..."
            class="search-input"
          />
          <button v-if="searchTerm" class="clear-search-btn" @click="searchTerm = ''">
            <i class="ri-close-line"></i>
          </button>
        </div>

        <!-- Pílulas de Filtro (Fase 3) -->
        <div class="sidebar-filter-tabs">
          <button
            type="button"
            class="filter-pill"
            :class="{ active: activeFilter === 'all' }"
            @click="activeFilter = 'all'"
          >
            Todos
          </button>
          <button
            type="button"
            class="filter-pill"
            :class="{ active: activeFilter === 'channels' }"
            @click="activeFilter = 'channels'"
          >
            Canais
          </button>
          <button
            type="button"
            class="filter-pill"
            :class="{ active: activeFilter === 'direct' }"
            @click="activeFilter = 'direct'"
          >
            Colegas
          </button>
          <button
            type="button"
            class="filter-pill"
            :class="{ active: activeFilter === 'unread' }"
            @click="activeFilter = 'unread'"
          >
            Não Lidas
            <span v-if="chatStore.totalUnreadCount > 0" class="filter-unread-count">
              {{ chatStore.totalUnreadCount }}
            </span>
          </button>
        </div>
      </div>

      <div class="sidebar-scrollable">
        <!-- SEÇÃO: Canais Coletivos -->
        <div
          v-if="activeFilter === 'all' || activeFilter === 'channels' || (activeFilter === 'unread' && unreadChannelConversations.length > 0)"
          class="section-channels-wrapper"
        >
          <div class="section-label-row">
            <span class="section-label-text">CANAIS DA EMPRESA</span>
            <button
              type="button"
              class="btn-new-channel"
              title="Criar novo canal corporativo"
              @click="openNewChannelModal"
            >
              <i class="ri-add-line"></i> Novo
            </button>
          </div>

          <div class="conversations-list">
            <button
              v-for="conv in displayedChannels"
              :key="conv.id"
              type="button"
              class="conversation-item channel-item"
              :class="{ active: chatStore.activeConversation?.id === conv.id }"
              @click="selectConversationWithDetails(conv)"
            >
              <div class="channel-icon-box">
                <i :class="getChannelIcon(conv.type)"></i>
              </div>
              <div class="conversation-info">
                <div class="conv-title-row">
                  <span class="conv-title">{{ conv.name }}</span>
                  <span v-if="conv.last_message_at" class="conv-time">{{ formatTime(conv.last_message_at) }}</span>
                </div>
                <div class="conv-preview-row">
                  <span class="conv-preview">{{ conv.last_message_text || 'Sem mensagens recentes' }}</span>
                  <span v-if="conv.unread_count > 0" class="conv-unread-badge">{{ conv.unread_count }}</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- SEÇÃO: Mensagens Diretas (Equipe) -->
        <div
          v-if="activeFilter === 'all' || activeFilter === 'direct' || (activeFilter === 'unread' && displayedMembers.length > 0)"
          class="section-members-wrapper"
        >
          <div class="section-label-row section-mt">
            <span class="section-label-text">COLEGAS DE TRABALHO ({{ displayedMembers.length }})</span>
          </div>

          <div class="members-list">
            <div v-if="displayedMembers.length === 0" class="empty-members-msg">
              <i class="ri-user-search-line"></i>
              <span>Nenhum colega encontrado</span>
            </div>

            <button
              v-for="member in displayedMembers"
              :key="member.id"
              type="button"
              class="conversation-item member-item"
              :class="{ active: isDirectActive(member.id) }"
              @click="openDirectChatWithDetails(member.id)"
            >
              <div class="member-avatar-wrapper">
                <div class="member-avatar" :style="getAvatarStyle(member)">
                  <img v-if="member.avatar_url" :src="member.avatar_url" :alt="member.name" />
                  <span v-else>{{ getInitials(member.name) }}</span>
                </div>
                <span
                  class="member-status-dot"
                  :class="{ online: isUserOnline(member.id) }"
                  :title="isUserOnline(member.id) ? 'Online no sistema' : 'Offline'"
                ></span>
              </div>

              <div class="conversation-info">
                <div class="conv-title-row">
                  <span class="conv-title">{{ member.name }}</span>
                  <span v-if="getDirectConv(member.id)?.last_message_at" class="conv-time">
                    {{ formatTime(getDirectConv(member.id).last_message_at) }}
                  </span>
                </div>
                <div class="conv-preview-row">
                  <span class="member-role-label">{{ member.role || 'Colaborador' }}</span>
                  <span v-if="getDirectConv(member.id)?.unread_count > 0" class="conv-unread-badge">
                    {{ getDirectConv(member.id).unread_count }}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Coluna 2: Janela de Conversa Ativa e Painel de Informações -->
    <main class="internal-chat-main">
      <div v-if="chatStore.activeConversation" class="chat-main-container" :class="{ 'with-drawer': showDetailsDrawer }">
        <!-- Painel Central de Mensagens -->
        <div class="chat-conversation-pane">
          <!-- Topo da Conversa -->
          <header class="chat-header">
            <div class="chat-header-info">
              <div
                v-if="chatStore.activeConversation.type === 'direct'"
                class="member-avatar-wrapper header-avatar"
              >
                <div class="member-avatar" :style="getAvatarStyle(activeDirectUser)">
                  <img v-if="activeDirectUser?.avatar_url" :src="activeDirectUser.avatar_url" :alt="chatStore.activeConversation.name" />
                  <span v-else>{{ getInitials(chatStore.activeConversation.name) }}</span>
                </div>
                <span
                  class="member-status-dot"
                  :class="{ online: isUserOnline(activeDirectUser?.id) }"
                ></span>
              </div>

              <div v-else class="channel-icon-box header-channel-icon">
                <i :class="getChannelIcon(chatStore.activeConversation.type)"></i>
              </div>

              <div class="chat-header-text">
                <h3 class="chat-title">{{ chatStore.activeConversation.name }}</h3>
                <p class="chat-subtitle">
                  <template v-if="chatStore.activeConversation.type === 'direct'">
                    <span class="status-indicator-text" :class="{ online: isUserOnline(activeDirectUser?.id) }">
                      {{ isUserOnline(activeDirectUser?.id) ? 'Disponível agora' : 'Offline' }}
                    </span>
                    <span class="sep-dot">•</span>
                    <span>{{ activeDirectUser?.role || 'Colaborador' }}</span>
                  </template>
                  <template v-else-if="chatStore.activeConversation.type === 'general'">
                    <span>Canal visível para todos os colaboradores da empresa</span>
                  </template>
                  <template v-else-if="chatStore.activeConversation.type === 'group'">
                    <span>Grupo interno restrito a participantes</span>
                  </template>
                  <template v-else>
                    <span>Canal exclusivo do setor</span>
                  </template>
                </p>
              </div>
            </div>

            <div class="chat-header-actions">
              <span class="secure-internal-badge" title="Mensagens trafegam exclusivamente dentro da rede interna">
                <i class="ri-shield-check-line"></i> Seguro
              </span>

              <!-- Botão: Pesquisar nesta conversa -->
              <button
                type="button"
                class="header-action-btn"
                :class="{ active: showMessageSearch }"
                title="Pesquisar mensagens nesta conversa"
                @click="toggleMessageSearch"
              >
                <i class="ri-search-line"></i>
              </button>

              <!-- Botão: Detalhes da conversa / Mídias -->
              <button
                type="button"
                class="header-action-btn"
                :class="{ active: showDetailsDrawer }"
                title="Ver participantes e mídias da conversa"
                @click="toggleDetailsDrawer"
              >
                <i class="ri-layout-right-line"></i>
              </button>
            </div>
          </header>

          <!-- Barra Retrátil de Busca Textual na Conversa Ativa (Fase 3) -->
          <div v-if="showMessageSearch" class="conversation-search-bar">
            <div class="search-bar-input-box">
              <i class="ri-search-line"></i>
              <input
                ref="messageSearchInputRef"
                v-model="messageSearchQuery"
                type="text"
                placeholder="Pesquisar mensagens na conversa atual..."
                class="conv-search-input"
                @keydown.enter.prevent="nextSearchMatch"
                @keydown.esc="closeMessageSearch"
              />
              <button v-if="messageSearchQuery" type="button" class="btn-clear-query" @click="messageSearchQuery = ''">
                <i class="ri-close-line"></i>
              </button>
            </div>

            <div class="search-bar-nav">
              <span class="search-count-label">
                {{ messageSearchQuery ? (searchMatches.length > 0 ? `${currentSearchIndex + 1} de ${searchMatches.length}` : 'Nenhum resultado') : '' }}
              </span>
              <button
                type="button"
                class="search-nav-btn"
                :disabled="searchMatches.length === 0"
                title="Resultado anterior"
                @click="prevSearchMatch"
              >
                <i class="ri-arrow-up-s-line"></i>
              </button>
              <button
                type="button"
                class="search-nav-btn"
                :disabled="searchMatches.length === 0"
                title="Próximo resultado"
                @click="nextSearchMatch"
              >
                <i class="ri-arrow-down-s-line"></i>
              </button>
              <button
                type="button"
                class="search-close-btn"
                title="Fechar pesquisa (Esc)"
                @click="closeMessageSearch"
              >
                <i class="ri-close-line"></i>
              </button>
            </div>
          </div>

          <!-- Banner de Mensagens Fixadas (Fase 4) -->
          <div v-if="latestPinnedMessage" class="pinned-message-banner">
            <div class="pinned-banner-content" @click="scrollToMessage(latestPinnedMessage.id)">
              <i class="ri-pushpin-2-fill pin-icon"></i>
              <div class="pinned-text-box">
                <span class="pinned-label">Mensagem Fixada</span>
                <span class="pinned-snippet">{{ getMessageSnippet(latestPinnedMessage) }}</span>
              </div>
            </div>
            <button
              type="button"
              class="btn-unpin-banner"
              title="Desafixar mensagem"
              @click="chatStore.togglePinMessage(latestPinnedMessage.id)"
            >
              <i class="ri-close-line"></i>
            </button>
          </div>

          <!-- Área de Rolagem das Mensagens -->
          <div class="chat-messages-area" ref="messagesContainerRef">
            <div v-if="chatStore.isLoading" class="messages-loading">
              <i class="ri-loader-4-line spin-icon"></i>
              <span>Carregando histórico...</span>
            </div>

            <div v-else-if="chatStore.messages.length === 0" class="empty-chat-state">
              <div class="empty-icon-circle">
                <i class="ri-chat-smile-2-line"></i>
              </div>
              <h4>Início da conversa</h4>
              <p>Nenhuma mensagem enviada ainda. Envie uma saudação para começar a interagir!</p>
            </div>

            <div v-else class="messages-flow">
              <template
                v-for="(msg, index) in chatStore.messages"
                :key="msg.id || index"
              >
                <!-- Divisor de Data -->
                <div v-if="shouldShowDateDivider(chatStore.messages, index)" class="chat-date-divider">
                  <span class="date-badge">{{ formatDateDivider(msg.created_at) }}</span>
                </div>

                <div
                  :id="`msg-${msg.id}`"
                  class="message-row"
                  :class="{
                    'message-mine': msg.sender_id === auth.user?.id,
                    'message-other': msg.sender_id !== auth.user?.id,
                    'search-target-matched': isMessageSearchMatched(msg.id),
                    'message-is-pinned': msg.is_pinned
                  }"
                >
                  <!-- Avatar do colega nas mensagens recebidas -->
                  <div
                    v-if="msg.sender_id !== auth.user?.id"
                    class="message-sender-avatar"
                    :style="getAvatarStyle(msg.sender)"
                    :title="msg.sender?.name"
                  >
                    <img v-if="msg.sender?.avatar_url" :src="msg.sender.avatar_url" :alt="msg.sender.name" />
                    <span v-else>{{ getInitials(msg.sender?.name) }}</span>
                  </div>

                  <div class="message-bubble-wrapper">
                    <!-- Barra de Ações Rápidas (Fase 4) -->
                    <div v-if="!msg.is_deleted" class="msg-actions-bar">
                      <!-- Reação Rápida com Popover -->
                      <div class="msg-action-item">
                        <button
                          type="button"
                          class="msg-action-trigger"
                          title="Reagir com emoji"
                          @click.stop="toggleReactionPopover(msg.id)"
                        >
                          <i class="ri-emotion-line"></i>
                        </button>
                        <div v-if="activeReactionPopoverId === msg.id" class="reactions-quick-popover" @click.stop>
                          <button
                            v-for="em in ['👍', '❤️', '😂', '🎉', '🚀', '👀']"
                            :key="em"
                            type="button"
                            class="quick-emoji-btn"
                            @click="addReaction(msg.id, em)"
                          >
                            {{ em }}
                          </button>
                        </div>
                      </div>

                      <!-- Responder -->
                      <button
                        type="button"
                        class="msg-action-trigger"
                        title="Responder mensagem"
                        @click="setReplyTo(msg)"
                      >
                        <i class="ri-reply-line"></i>
                      </button>

                      <!-- Mais Opções (...) -->
                      <div class="msg-action-item">
                        <button
                          type="button"
                          class="msg-action-trigger"
                          title="Mais opções"
                          @click.stop="toggleMoreMenu(msg.id)"
                        >
                          <i class="ri-more-2-fill"></i>
                        </button>
                        <div v-if="activeMoreMenuId === msg.id" class="msg-dropdown-menu" @click.stop>
                          <button type="button" class="dropdown-item" @click="chatStore.togglePinMessage(msg.id); activeMoreMenuId = null">
                            <i :class="msg.is_pinned ? 'ri-pushpin-line' : 'ri-pushpin-2-fill'"></i>
                            {{ msg.is_pinned ? 'Desafixar mensagem' : 'Fixar mensagem' }}
                          </button>
                          <button v-if="msg.text" type="button" class="dropdown-item" @click="copyMessageText(msg.text); activeMoreMenuId = null">
                            <i class="ri-file-copy-line"></i> Copiar texto
                          </button>
                          <button v-if="msg.sender_id === auth.user?.id && !msg.is_deleted && msg.text" type="button" class="dropdown-item" @click="startEditMessage(msg); activeMoreMenuId = null">
                            <i class="ri-edit-line"></i> Editar mensagem
                          </button>
                          <button v-if="(msg.sender_id === auth.user?.id || auth.user?.role === 'admin') && !msg.is_deleted" type="button" class="dropdown-item text-danger" @click="confirmDeleteMessage(msg.id); activeMoreMenuId = null">
                            <i class="ri-delete-bin-line"></i> Excluir mensagem
                          </button>
                        </div>
                      </div>
                    </div>

                    <div class="message-bubble-box" :class="{ 'is-deleted-bubble': msg.is_deleted }">
                      <!-- Tag de Mensagem Fixada -->
                      <div v-if="msg.is_pinned" class="msg-pinned-tag">
                        <i class="ri-pushpin-2-fill"></i> Fixada
                      </div>

                      <!-- Nome do remetente (apenas em canais ou se for de outro usuário) -->
                      <span
                        v-if="msg.sender_id !== auth.user?.id && chatStore.activeConversation.type !== 'direct'"
                        class="bubble-sender-name"
                      >
                        {{ msg.sender?.name || 'Colega' }}
                      </span>

                      <!-- Citação da Mensagem Respondida (se houver) -->
                      <div
                        v-if="msg.reply_to_id && findMessageById(msg.reply_to_id)"
                        class="quoted-reply-box"
                        @click="scrollToMessage(msg.reply_to_id)"
                      >
                        <div class="quoted-bar"></div>
                        <div class="quoted-content">
                          <span class="quoted-sender">{{ findMessageById(msg.reply_to_id)?.sender?.name || 'Colega' }}</span>
                          <span class="quoted-snippet">{{ getMessageSnippet(findMessageById(msg.reply_to_id)) }}</span>
                        </div>
                      </div>

                      <!-- Mensagem Apagada -->
                      <div v-if="msg.is_deleted" class="deleted-msg-content">
                        <i class="ri-forbid-line"></i> Esta mensagem foi apagada
                      </div>

                      <template v-else>
                        <!-- Mídia: Imagem -->
                        <div
                          v-if="msg.media_type === 'image' || isImageUrl(msg.media_url)"
                          class="message-media-image"
                          @click="openImagePreview(msg.media_url)"
                        >
                          <img :src="msg.media_url" :alt="msg.file_name || 'Imagem'" loading="lazy" />
                        </div>

                        <!-- Mídia: Áudio -->
                        <div
                          v-else-if="msg.media_type === 'audio'"
                          class="message-media-audio"
                        >
                          <audio :src="msg.media_url" controls controlsList="nodownload"></audio>
                        </div>

                        <!-- Mídia: Documento / Arquivo -->
                        <div
                          v-else-if="msg.media_type === 'document' || msg.media_url"
                          class="message-media-doc"
                        >
                          <a :href="msg.media_url" target="_blank" download class="doc-attachment-card">
                            <div class="doc-icon-box">
                              <i class="ri-file-text-line"></i>
                            </div>
                            <div class="doc-info-box">
                              <span class="doc-title">{{ msg.file_name || 'Documento anexo' }}</span>
                              <span class="doc-action">Clique para baixar</span>
                            </div>
                            <i class="ri-download-2-line doc-download-icon"></i>
                          </a>
                        </div>

                        <!-- Texto da Mensagem -->
                        <div
                          v-if="msg.text"
                          class="message-text-content"
                          v-html="formatMessageBody(msg.text)"
                        ></div>
                      </template>

                      <div class="message-meta-row">
                        <span v-if="msg.is_edited && !msg.is_deleted" class="msg-edited-badge" title="Mensagem editada">
                          (editada)
                        </span>
                        <span class="message-timestamp">{{ formatMessageTime(msg.created_at) }}</span>
                        <i
                          v-if="msg.sender_id === auth.user?.id"
                          class="ri-check-double-line message-check-read"
                        ></i>
                      </div>
                    </div>

                    <!-- Pílulas de Reações Agregadas (Fase 4) -->
                    <div v-if="msg.reactions && msg.reactions.length > 0" class="message-reactions-row">
                      <button
                        v-for="grp in groupReactions(msg.reactions)"
                        :key="grp.emoji"
                        type="button"
                        class="reaction-pill"
                        :class="{ 'user-reacted': grp.userReacted }"
                        :title="grp.tooltip"
                        @click="chatStore.toggleReaction(msg.id, grp.emoji)"
                      >
                        <span class="reaction-emoji">{{ grp.emoji }}</span>
                        <span class="reaction-count">{{ grp.count }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </template>
            </div>

            <!-- Indicador de Digitação -->
            <div v-if="isTypingNow" class="typing-indicator-row">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span class="typing-label">{{ typingLabel }}</span>
            </div>
          </div>

          <!-- Barra Inferior de Envio de Mensagem -->
          <footer class="chat-input-footer">
            <!-- Barra de Edição Ativa (Fase 4) -->
            <div v-if="editingMessage" class="active-editing-banner">
              <div class="editing-banner-bar"></div>
              <div class="editing-banner-info">
                <span class="editing-banner-title">
                  <i class="ri-edit-line"></i> Editando sua mensagem
                </span>
                <span class="editing-banner-snippet">{{ editingMessage.text }}</span>
              </div>
              <button type="button" class="btn-cancel-edit" title="Cancelar edição (Esc)" @click="cancelEditMessage">
                <i class="ri-close-line"></i>
              </button>
            </div>

            <!-- Barra de Resposta Ativa -->
            <div v-else-if="replyingTo" class="active-reply-banner">
              <div class="reply-banner-bar"></div>
              <div class="reply-banner-info">
                <span class="reply-banner-title">
                  Respondendo a <strong>{{ replyingTo.sender?.name || 'Colega' }}</strong>
                </span>
                <span class="reply-banner-snippet">{{ getMessageSnippet(replyingTo) }}</span>
              </div>
              <button type="button" class="btn-cancel-reply" title="Cancelar resposta" @click="cancelReply">
                <i class="ri-close-line"></i>
              </button>
            </div>

            <!-- Barra de Gravação de Áudio Ativa -->
            <div v-if="isRecordingAudio" class="audio-recording-bar">
              <div class="recording-indicator">
                <span class="rec-pulse-dot"></span>
                <span class="rec-timer">Gravando {{ formatRecordingTime(recordingSeconds) }}</span>
              </div>
              <div class="recording-actions">
                <button type="button" class="btn-cancel-rec" title="Cancelar gravação" @click="cancelAudioRecording">
                  <i class="ri-delete-bin-line"></i> Cancelar
                </button>
                <button type="button" class="btn-send-rec" title="Enviar áudio" @click="stopAndSendAudioRecording">
                  <i class="ri-send-plane-fill"></i> Enviar Áudio
                </button>
              </div>
            </div>

            <!-- Formulário Normal de Envio -->
            <form v-else class="chat-input-form" @submit.prevent="handleSend">
              <!-- Dropdown de Autocomplete de Menções (@mentions) (Fase 4) -->
              <div v-if="showMentionSuggestions && mentionCandidates.length > 0" class="mention-suggestions-popover">
                <div class="mention-suggestions-header">Mencionar colega</div>
                <button
                  v-for="member in mentionCandidates"
                  :key="member.id"
                  type="button"
                  class="mention-item-btn"
                  @click="selectMentionMember(member)"
                >
                  <div class="member-avatar drawer-small-avatar" :style="getAvatarStyle(member)">
                    <img v-if="member.avatar_url" :src="member.avatar_url" :alt="member.name" />
                    <span v-else>{{ getInitials(member.name) }}</span>
                  </div>
                  <div class="mention-item-info">
                    <span class="mention-name">{{ member.name }}</span>
                    <span class="mention-role">{{ member.role || 'Colaborador' }}</span>
                  </div>
                </button>
              </div>

              <input
                ref="fileInputRef"
                type="file"
                style="display: none"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                @change="onFileSelected"
              />

              <button
                type="button"
                class="tool-btn"
                title="Anexar imagem ou documento"
                @click="triggerFileInput"
              >
                <i class="ri-attachment-line"></i>
              </button>

              <button
                type="button"
                class="tool-btn"
                title="Inserir emoji"
                @click="insertEmoji('👋')"
              >
                <i class="ri-emotion-happy-line"></i>
              </button>

              <textarea
                ref="inputTextareaRef"
                v-model="inputMessage"
                rows="1"
                placeholder="Digite sua mensagem interna... (@ para mencionar, Enter para enviar)"
                class="chat-textarea"
                @keydown="onKeyDown"
                @input="onInputTyping"
              ></textarea>

              <button
                v-if="!inputMessage.trim()"
                type="button"
                class="tool-btn mic-btn"
                title="Gravar mensagem de voz"
                @click="startAudioRecording"
              >
                <i class="ri-mic-line"></i>
              </button>

              <button
                v-else
                type="submit"
                class="send-message-btn"
                :disabled="chatStore.isSending"
                :title="editingMessage ? 'Salvar alteração' : 'Enviar mensagem'"
              >
                <i v-if="chatStore.isSending" class="ri-loader-4-line spin-icon"></i>
                <i v-else-if="editingMessage" class="ri-check-line"></i>
                <i v-else class="ri-send-plane-2-fill"></i>
              </button>
            </form>
          </footer>
        </div>

        <!-- Painel Lateral Direito: Drawer de Informações da Conversa (Fase 3) -->
        <aside v-if="showDetailsDrawer" class="conversation-details-drawer">
          <div class="drawer-header">
            <h4 class="drawer-title">Detalhes da Conversa</h4>
            <button type="button" class="drawer-close-btn" title="Fechar painel" @click="showDetailsDrawer = false">
              <i class="ri-close-line"></i>
            </button>
          </div>

          <div class="drawer-content">
            <!-- Card de Perfil da Conversa -->
            <div class="drawer-profile-card">
              <div v-if="chatStore.activeConversation.type === 'direct'" class="drawer-big-avatar" :style="getAvatarStyle(activeDirectUser)">
                <img v-if="activeDirectUser?.avatar_url" :src="activeDirectUser.avatar_url" :alt="chatStore.activeConversation.name" />
                <span v-else>{{ getInitials(chatStore.activeConversation.name) }}</span>
              </div>
              <div v-else class="drawer-big-icon">
                <i :class="getChannelIcon(chatStore.activeConversation.type)"></i>
              </div>

              <h3 class="drawer-conv-name">{{ chatStore.activeConversation.name }}</h3>
              <span class="drawer-conv-type-badge">
                {{ getConversationTypeLabel(chatStore.activeConversation) }}
              </span>
            </div>

            <!-- Abas do Drawer: Membros / Arquivos / Fixadas -->
            <div class="drawer-tabs">
              <button
                type="button"
                class="drawer-tab"
                :class="{ active: detailsTab === 'members' }"
                @click="detailsTab = 'members'"
              >
                <i class="ri-group-line"></i> Membros
                <span v-if="conversationParticipants.length" class="drawer-badge-count">
                  {{ conversationParticipants.length }}
                </span>
              </button>
              <button
                type="button"
                class="drawer-tab"
                :class="{ active: detailsTab === 'media' }"
                @click="detailsTab = 'media'"
              >
                <i class="ri-attachment-line"></i> Mídias
                <span v-if="sharedMediaFiles.length" class="drawer-badge-count">
                  {{ sharedMediaFiles.length }}
                </span>
              </button>
              <button
                type="button"
                class="drawer-tab"
                :class="{ active: detailsTab === 'pinned' }"
                @click="detailsTab = 'pinned'"
              >
                <i class="ri-pushpin-2-line"></i> Fixadas
                <span v-if="chatStore.pinnedMessages.length" class="drawer-badge-count">
                  {{ chatStore.pinnedMessages.length }}
                </span>
              </button>
            </div>

            <!-- Aba Membros -->
            <div v-if="detailsTab === 'members'" class="drawer-tab-pane">
              <div v-if="chatStore.isLoadingDetails" class="drawer-loading">
                <i class="ri-loader-4-line spin-icon"></i> Carregando membros...
              </div>
              <div v-else class="drawer-members-list">
                <div
                  v-for="member in conversationParticipants"
                  :key="member.id"
                  class="drawer-member-card"
                >
                  <div class="member-avatar-wrapper">
                    <div class="member-avatar drawer-small-avatar" :style="getAvatarStyle(member)">
                      <img v-if="member.avatar_url" :src="member.avatar_url" :alt="member.name" />
                      <span v-else>{{ getInitials(member.name) }}</span>
                    </div>
                    <span class="member-status-dot" :class="{ online: isUserOnline(member.id) }"></span>
                  </div>
                  <div class="drawer-member-info">
                    <span class="drawer-member-name">{{ member.name }}</span>
                    <span class="drawer-member-sub">
                      {{ isUserOnline(member.id) ? 'Online agora' : 'Offline' }} • {{ member.role || 'Colaborador' }}
                    </span>
                  </div>
                  <button
                    v-if="member.id !== auth.user?.id"
                    type="button"
                    class="btn-quick-direct"
                    title="Conversar em particular"
                    @click="openDirectChatWithDetails(member.id)"
                  >
                    <i class="ri-message-3-line"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Aba Mídias & Arquivos -->
            <div v-else-if="detailsTab === 'media'" class="drawer-tab-pane">
              <div v-if="chatStore.isLoadingDetails" class="drawer-loading">
                <i class="ri-loader-4-line spin-icon"></i> Carregando mídias...
              </div>
              <div v-else-if="sharedMediaFiles.length === 0" class="drawer-empty-media">
                <i class="ri-image-line"></i>
                <p>Nenhuma foto ou documento compartilhado nesta conversa ainda.</p>
              </div>
              <div v-else class="drawer-media-content">
                <!-- Seção Fotos -->
                <div v-if="sharedImages.length > 0" class="drawer-media-section">
                  <span class="drawer-section-heading">Fotos e Imagens ({{ sharedImages.length }})</span>
                  <div class="drawer-images-grid">
                    <div
                      v-for="img in sharedImages"
                      :key="img.id"
                      class="drawer-image-thumb"
                      @click="openImagePreview(img.media_url)"
                    >
                      <img :src="img.media_url" :alt="img.file_name || 'Imagem'" loading="lazy" />
                    </div>
                  </div>
                </div>

                <!-- Seção Documentos -->
                <div v-if="sharedDocs.length > 0" class="drawer-media-section">
                  <span class="drawer-section-heading">Documentos ({{ sharedDocs.length }})</span>
                  <div class="drawer-docs-list">
                    <a
                      v-for="doc in sharedDocs"
                      :key="doc.id"
                      :href="doc.media_url"
                      target="_blank"
                      download
                      class="drawer-doc-item"
                    >
                      <div class="drawer-doc-icon">
                        <i class="ri-file-text-line"></i>
                      </div>
                      <div class="drawer-doc-details">
                        <span class="drawer-doc-name">{{ doc.file_name || 'Documento anexo' }}</span>
                        <span class="drawer-doc-date">{{ formatMessageTime(doc.created_at) }}</span>
                      </div>
                      <i class="ri-download-2-line"></i>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <!-- Aba Mensagens Fixadas (Fase 4) -->
            <div v-else-if="detailsTab === 'pinned'" class="drawer-tab-pane">
              <div v-if="chatStore.pinnedMessages.length === 0" class="drawer-empty-media">
                <i class="ri-pushpin-line"></i>
                <p>Nenhuma mensagem fixada nesta conversa ainda.</p>
              </div>
              <div v-else class="drawer-pinned-list">
                <div
                  v-for="pmsg in chatStore.pinnedMessages"
                  :key="pmsg.id"
                  class="drawer-pinned-card"
                  @click="scrollToMessage(pmsg.id)"
                >
                  <div class="drawer-pinned-card-header">
                    <span class="pmsg-author">{{ pmsg.sender?.name || 'Colega' }}</span>
                    <span class="pmsg-date">{{ formatMessageTime(pmsg.created_at) }}</span>
                  </div>
                  <p class="drawer-pinned-card-text">{{ getMessageSnippet(pmsg) }}</p>
                  <button
                    type="button"
                    class="btn-unpin-card"
                    title="Desafixar mensagem"
                    @click.stop="chatStore.togglePinMessage(pmsg.id)"
                  >
                    <i class="ri-close-line"></i> Desafixar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <!-- Estado Vazio (Nenhuma conversa selecionada) -->
      <div v-else class="no-active-chat-state">
        <div class="no-chat-illustration">
          <div class="illustration-bubble"><i class="ri-discuss-line"></i></div>
        </div>
        <h3 class="no-chat-title">Chat Interno da Empresa</h3>
        <p class="no-chat-desc">
          Converse com seus colegas de equipe e compartilhe comunicados em tempo real, sem depender do WhatsApp.
        </p>
        <button
          type="button"
          class="btn-start-general"
          @click="selectGeneralChannel"
        >
          <i class="ri-megaphone-line"></i> Abrir Canal Geral
        </button>
      </div>
    </main>

    <!-- Modal de Criação de Novo Canal Corporativo (Fase 3) -->
    <Teleport to="body">
      <div v-if="showNewChannelModal" class="modal-overlay" @click.self="closeNewChannelModal">
        <div class="channel-modal-card">
          <div class="channel-modal-header">
            <div>
              <h3 class="channel-modal-title">Novo Canal Corporativo</h3>
              <p class="channel-modal-subtitle">Crie um canal de comunicação para equipes, projetos ou setores</p>
            </div>
            <button type="button" class="btn-modal-close" @click="closeNewChannelModal">
              <i class="ri-close-line"></i>
            </button>
          </div>

          <form @submit.prevent="submitCreateChannel" class="channel-modal-body">
            <div class="channel-form-group">
              <label class="channel-form-label">Nome do Canal</label>
              <div class="channel-name-input-wrapper">
                <span class="hashtag-prefix">#</span>
                <input
                  v-model="newChannelForm.name"
                  type="text"
                  placeholder="ex: financeiro, projetos-2026, avisos"
                  class="channel-input"
                  required
                  maxlength="40"
                />
              </div>
              <span class="channel-input-hint">Use letras, números e hífens.</span>
            </div>

            <div class="channel-form-group">
              <label class="channel-form-label">Tipo de Canal</label>
              <div class="channel-type-selector">
                <label
                  class="type-option-card"
                  :class="{ selected: newChannelForm.type === 'general' }"
                >
                  <input
                    type="radio"
                    value="general"
                    v-model="newChannelForm.type"
                    style="display: none"
                  />
                  <div class="type-icon-box">
                    <i class="ri-global-line"></i>
                  </div>
                  <div class="type-text-box">
                    <span class="type-title">Público da Empresa</span>
                    <span class="type-desc">Todos os colaboradores têm acesso automático</span>
                  </div>
                </label>

                <label
                  class="type-option-card"
                  :class="{ selected: newChannelForm.type === 'group' }"
                >
                  <input
                    type="radio"
                    value="group"
                    v-model="newChannelForm.type"
                    style="display: none"
                  />
                  <div class="type-icon-box">
                    <i class="ri-lock-line"></i>
                  </div>
                  <div class="type-text-box">
                    <span class="type-title">Grupo Privado / Equipe</span>
                    <span class="type-desc">Apenas colaboradores selecionados participam</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Seleção de Membros se for Grupo Privado -->
            <div v-if="newChannelForm.type === 'group'" class="channel-form-group">
              <div class="member-select-header">
                <label class="channel-form-label mb-0">Adicionar Participantes</label>
                <span class="selected-counter">{{ newChannelForm.participant_ids.length }} selecionado(s)</span>
              </div>
              <div class="channel-member-picker">
                <div
                  v-for="member in chatStore.teamMembers.filter(m => m.id !== auth.user?.id)"
                  :key="member.id"
                  class="picker-member-row"
                  :class="{ selected: newChannelForm.participant_ids.includes(member.id) }"
                  @click="toggleChannelMember(member.id)"
                >
                  <input
                    type="checkbox"
                    :checked="newChannelForm.participant_ids.includes(member.id)"
                    @click.stop="toggleChannelMember(member.id)"
                    class="member-checkbox"
                  />
                  <div class="member-avatar drawer-small-avatar" :style="getAvatarStyle(member)">
                    <img v-if="member.avatar_url" :src="member.avatar_url" :alt="member.name" />
                    <span v-else>{{ getInitials(member.name) }}</span>
                  </div>
                  <div class="picker-member-info">
                    <span class="picker-name">{{ member.name }}</span>
                    <span class="picker-role">{{ member.role || 'Colaborador' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="channel-modal-footer">
              <button type="button" class="btn-modal-cancel" @click="closeNewChannelModal">
                Cancelar
              </button>
              <button type="submit" class="btn-modal-submit" :disabled="isSubmittingChannel">
                <i v-if="isSubmittingChannel" class="ri-loader-4-line spin-icon"></i>
                <span v-else>Criar Canal</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal Lightbox de Imagem Ampliada -->
    <Teleport to="body">
      <div v-if="previewImageUrl" class="image-lightbox-overlay" @click.self="closeImagePreview">
        <div class="lightbox-container">
          <img :src="previewImageUrl" alt="Visualização ampliada" class="lightbox-img" />
          <div class="lightbox-controls">
            <a :href="previewImageUrl" download target="_blank" class="lightbox-btn" title="Baixar imagem">
              <i class="ri-download-line"></i> Baixar
            </a>
            <button type="button" class="lightbox-btn close-btn" title="Fechar" @click="closeImagePreview">
              <i class="ri-close-line"></i> Fechar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useInternalChatStore } from '@/stores/internal-chat.store'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { useSocket } from '@/composables/useSocket'

const chatStore = useInternalChatStore()
const auth = useAuthStore()
const ui = useUiStore()
const { socket } = useSocket()

const searchTerm = ref('')
const activeFilter = ref('all') // 'all' | 'channels' | 'direct' | 'unread'
const inputMessage = ref('')
const messagesContainerRef = ref(null)
const inputTextareaRef = ref(null)
const fileInputRef = ref(null)

const replyingTo = ref(null)
const previewImageUrl = ref(null)

// ─── Busca Textual na Conversa Ativa ──────────────────────────────────────────
const showMessageSearch = ref(false)
const messageSearchQuery = ref('')
const messageSearchInputRef = ref(null)
const currentSearchIndex = ref(0)

// ─── Painel Lateral de Detalhes da Conversa ───────────────────────────────────
const showDetailsDrawer = ref(false)
const detailsTab = ref('members') // 'members' | 'media' | 'pinned'

// ─── Modal de Criação de Canal ────────────────────────────────────────────────
const showNewChannelModal = ref(false)
const isSubmittingChannel = ref(false)
const newChannelForm = ref({
  name: '',
  type: 'general',
  participant_ids: []
})

// ─── Fase 4: Reações, Menções, Fixadas e Edição ──────────────────────────────
const activeReactionPopoverId = ref(null)
const activeMoreMenuId = ref(null)
const editingMessage = ref(null)
const showMentionSuggestions = ref(false)
const mentionSearchTerm = ref('')

// ─── Gravação de Áudio ────────────────────────────────────────────────────────
const isRecordingAudio = ref(false)
const recordingSeconds = ref(0)
let audioTimer = null
let mediaRecorder = null
let audioChunks = []
let typingTimeout = null

// ─── Inicialização ────────────────────────────────────────────────────────────
onMounted(async () => {
  window.addEventListener('click', closeAllPopovers)
  await Promise.all([
    chatStore.fetchConversations(),
    chatStore.fetchTeamMembers()
  ])

  // Se não houver conversa ativa, seleciona o canal Geral por padrão
  if (!chatStore.activeConversation) {
    const general = chatStore.conversations.find(c => c.type === 'general')
    if (general) {
      chatStore.selectConversation(general)
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('click', closeAllPopovers)
  clearInterval(audioTimer)
})

function closeAllPopovers() {
  activeReactionPopoverId.value = null
  activeMoreMenuId.value = null
  showMentionSuggestions.value = false
}

// Rola para a mensagem mais recente ao carregar ou receber novas mensagens
watch(() => chatStore.messages.length, () => {
  scrollToBottom()
})

watch(() => chatStore.activeConversation?.id, async (newId) => {
  scrollToBottom()
  nextTick(() => {
    inputTextareaRef.value?.focus()
  })

  // Se o drawer de detalhes estiver aberto, carrega os dados da nova conversa
  if (newId && showDetailsDrawer.value) {
    await chatStore.fetchConversationDetails(newId)
  }
})

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainerRef.value) {
      messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
    }
  })
}

// ─── Computeds de Conversas e Filtros ──────────────────────────────────────────
const onlineCount = computed(() => ui.onlineUsersCount || 1)

const channelConversations = computed(() => {
  return chatStore.conversations.filter(c => c.type === 'general' || c.type === 'department' || c.type === 'group')
})

const unreadChannelConversations = computed(() => {
  return channelConversations.value.filter(c => (c.unread_count || 0) > 0)
})

const displayedChannels = computed(() => {
  let list = channelConversations.value
  if (activeFilter.value === 'unread') {
    list = unreadChannelConversations.value
  }

  const term = searchTerm.value.toLowerCase().trim()
  if (!term) return list
  return list.filter(c => c.name?.toLowerCase().includes(term))
})

const filteredMembers = computed(() => {
  const term = searchTerm.value.toLowerCase().trim()
  if (!term) return chatStore.teamMembers
  return chatStore.teamMembers.filter(m => 
    m.name?.toLowerCase().includes(term) ||
    m.role?.toLowerCase().includes(term) ||
    m.email?.toLowerCase().includes(term)
  )
})

const unreadDirectMembers = computed(() => {
  return filteredMembers.value.filter(m => {
    const conv = getDirectConv(m.id)
    return conv && (conv.unread_count || 0) > 0
  })
})

const displayedMembers = computed(() => {
  if (activeFilter.value === 'unread') {
    return unreadDirectMembers.value
  }
  return filteredMembers.value
})

const activeDirectUser = computed(() => {
  if (chatStore.activeConversation?.type !== 'direct') return null
  return chatStore.activeConversation.other_user
})

const isTypingNow = computed(() => {
  if (!chatStore.activeConversation) return false
  const typers = chatStore.typingUsers[chatStore.activeConversation.id]
  return typers && Object.keys(typers).length > 0
})

const typingLabel = computed(() => {
  if (!chatStore.activeConversation) return ''
  const typers = chatStore.typingUsers[chatStore.activeConversation.id] || {}
  const names = Object.values(typers)
  if (names.length === 1) return `${names[0]} está digitando...`
  if (names.length > 1) return `${names[0]} e outros estão digitando...`
  return ''
})

// ─── Fase 4: Mensagens Fixadas e Menções ──────────────────────────────────────
const latestPinnedMessage = computed(() => {
  const list = chatStore.pinnedMessages || []
  return list.length > 0 ? list[list.length - 1] : null
})

const mentionCandidates = computed(() => {
  const term = mentionSearchTerm.value.toLowerCase().trim()
  const members = chatStore.teamMembers.filter(m => m.id !== auth.user?.id)
  if (!term) return members.slice(0, 5)
  return members.filter(m => m.name?.toLowerCase().includes(term)).slice(0, 5)
})

// ─── Helpers de Canais e Ícones ───────────────────────────────────────────────
function getChannelIcon(type) {
  if (type === 'general') return 'ri-megaphone-line'
  if (type === 'group') return 'ri-team-line'
  if (type === 'department') return 'ri-building-line'
  return 'ri-hashtag'
}

function getConversationTypeLabel(conv) {
  if (!conv) return ''
  if (conv.type === 'general') return 'Canal Geral da Empresa'
  if (conv.type === 'group') return 'Grupo Privado de Equipe'
  if (conv.type === 'department') return 'Canal de Setor'
  return 'Mensagem Direta'
}

// ─── Busca Textual na Conversa Ativa ──────────────────────────────────────────
const searchMatches = computed(() => {
  const query = messageSearchQuery.value.trim().toLowerCase()
  if (!query) return []
  return chatStore.messages.filter(m => m.text && m.text.toLowerCase().includes(query))
})

watch(searchMatches, (newMatches) => {
  if (newMatches.length > 0) {
    currentSearchIndex.value = 0
    scrollToMessage(newMatches[0].id)
  }
})

function toggleMessageSearch() {
  showMessageSearch.value = !showMessageSearch.value
  if (showMessageSearch.value) {
    nextTick(() => {
      messageSearchInputRef.value?.focus()
    })
  } else {
    messageSearchQuery.value = ''
  }
}

function closeMessageSearch() {
  showMessageSearch.value = false
  messageSearchQuery.value = ''
}

function nextSearchMatch() {
  if (searchMatches.value.length === 0) return
  currentSearchIndex.value = (currentSearchIndex.value + 1) % searchMatches.value.length
  scrollToMessage(searchMatches.value[currentSearchIndex.value].id)
}

function prevSearchMatch() {
  if (searchMatches.value.length === 0) return
  currentSearchIndex.value = (currentSearchIndex.value - 1 + searchMatches.value.length) % searchMatches.value.length
  scrollToMessage(searchMatches.value[currentSearchIndex.value].id)
}

function isMessageSearchMatched(msgId) {
  if (!messageSearchQuery.value.trim() || searchMatches.value.length === 0) return false
  const activeMatch = searchMatches.value[currentSearchIndex.value]
  return activeMatch?.id === msgId
}

// ─── Drawer de Detalhes da Conversa ───────────────────────────────────────────
async function toggleDetailsDrawer() {
  showDetailsDrawer.value = !showDetailsDrawer.value
  if (showDetailsDrawer.value && chatStore.activeConversation) {
    await chatStore.fetchConversationDetails(chatStore.activeConversation.id)
  }
}

async function selectConversationWithDetails(conv) {
  await chatStore.selectConversation(conv)
  if (showDetailsDrawer.value && conv?.id) {
    await chatStore.fetchConversationDetails(conv.id)
  }
}

async function openDirectChatWithDetails(userId) {
  const conv = await chatStore.startDirectChatWith(userId)
  if (showDetailsDrawer.value && conv?.id) {
    await chatStore.fetchConversationDetails(conv.id)
  }
}

const conversationParticipants = computed(() => {
  if (chatStore.activeConversation?.type === 'direct') {
    const list = []
    if (auth.user) list.push({ id: auth.user.id, name: auth.user.name, role: auth.user.role, avatar_url: auth.user.avatar_url })
    if (activeDirectUser.value) list.push(activeDirectUser.value)
    return list
  }
  if (chatStore.conversationDetails?.participants?.length) {
    return chatStore.conversationDetails.participants
  }
  // Se for canal geral e ainda não carregou, exibe toda a equipe
  if (chatStore.activeConversation?.type === 'general') {
    return chatStore.teamMembers
  }
  return []
})

const sharedMediaFiles = computed(() => {
  if (chatStore.conversationDetails?.media?.length) {
    return chatStore.conversationDetails.media
  }
  // Fallback para mensagens locais se houver anexos
  return chatStore.messages.filter(m => m.media_url)
})

const sharedImages = computed(() => {
  return sharedMediaFiles.value.filter(m => m.media_type === 'image' || isImageUrl(m.media_url))
})

const sharedDocs = computed(() => {
  return sharedMediaFiles.value.filter(m => m.media_type !== 'image' && !isImageUrl(m.media_url))
})

// ─── Criação de Novos Canais Corporativos ─────────────────────────────────────
function openNewChannelModal() {
  newChannelForm.value = {
    name: '',
    type: 'general',
    participant_ids: []
  }
  showNewChannelModal.value = true
}

function closeNewChannelModal() {
  showNewChannelModal.value = false
  isSubmittingChannel.value = false
}

function toggleChannelMember(memberId) {
  const index = newChannelForm.value.participant_ids.indexOf(memberId)
  if (index === -1) {
    newChannelForm.value.participant_ids.push(memberId)
  } else {
    newChannelForm.value.participant_ids.splice(index, 1)
  }
}

async function submitCreateChannel() {
  let rawName = newChannelForm.value.name.trim().replace(/^#+/, '').replace(/\s+/g, '-').toLowerCase()
  if (!rawName) {
    ui.showToast('Informe um nome para o canal.', 'error')
    return
  }

  isSubmittingChannel.value = true
  try {
    const created = await chatStore.createChannel({
      name: `#${rawName}`,
      type: newChannelForm.value.type,
      participant_ids: newChannelForm.value.participant_ids
    })

    if (created) {
      closeNewChannelModal()
      if (showDetailsDrawer.value) {
        await chatStore.fetchConversationDetails(created.id)
      }
    }
  } finally {
    isSubmittingChannel.value = false
  }
}

// ─── Fase 4: Reações com Emojis ──────────────────────────────────────────────
function toggleReactionPopover(msgId) {
  if (activeReactionPopoverId.value === msgId) {
    activeReactionPopoverId.value = null
  } else {
    activeReactionPopoverId.value = msgId
    activeMoreMenuId.value = null
  }
}

function addReaction(msgId, emoji) {
  activeReactionPopoverId.value = null
  chatStore.toggleReaction(msgId, emoji)
}

function groupReactions(reactions) {
  if (!Array.isArray(reactions) || reactions.length === 0) return []
  const map = {}
  reactions.forEach(r => {
    if (!map[r.emoji]) {
      map[r.emoji] = { emoji: r.emoji, count: 0, userReacted: false, names: [] }
    }
    map[r.emoji].count++
    if (r.user_id === auth.user?.id) {
      map[r.emoji].userReacted = true
    }
    if (r.user_name) {
      map[r.emoji].names.push(r.user_name)
    }
  })
  return Object.values(map).map(g => ({
    ...g,
    tooltip: `${g.names.join(', ')} reagiu com ${g.emoji}`
  }))
}

// ─── Fase 4: Menu de Mais Ações e Edição/Exclusão ─────────────────────────────
function toggleMoreMenu(msgId) {
  if (activeMoreMenuId.value === msgId) {
    activeMoreMenuId.value = null
  } else {
    activeMoreMenuId.value = msgId
    activeReactionPopoverId.value = null
  }
}

function startEditMessage(msg) {
  editingMessage.value = msg
  inputMessage.value = msg.text || ''
  nextTick(() => {
    inputTextareaRef.value?.focus()
  })
}

function cancelEditMessage() {
  editingMessage.value = null
  inputMessage.value = ''
}

async function confirmDeleteMessage(msgId) {
  if (confirm('Tem certeza que deseja apagar esta mensagem para todos?')) {
    await chatStore.deleteMessage(msgId)
  }
}

function copyMessageText(text) {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    ui.showToast('Texto copiado para a área de transferência!')
  }).catch(() => {})
}

// ─── Fase 4: Autocomplete de Menções (@mentions) ──────────────────────────────
function selectMentionMember(member) {
  const val = inputMessage.value
  const atIdx = val.lastIndexOf('@')
  if (atIdx >= 0) {
    inputMessage.value = val.slice(0, atIdx) + `@${member.name} `
  } else {
    inputMessage.value += `@${member.name} `
  }
  showMentionSuggestions.value = false
  nextTick(() => {
    inputTextareaRef.value?.focus()
  })
}

// ─── Helpers de Status e Conversas ───────────────────────────────────────────
function isUserOnline(userId) {
  if (!userId) return false
  if (userId === auth.user?.id) return true
  return ui.onlineUsersList.some(u => String(u.id) === String(userId))
}

function getDirectConv(userId) {
  return chatStore.conversations.find(c => 
    c.type === 'direct' && String(c.other_user?.id) === String(userId)
  )
}

function isDirectActive(userId) {
  if (chatStore.activeConversation?.type !== 'direct') return false
  return String(chatStore.activeConversation.other_user?.id) === String(userId)
}

function selectGeneralChannel() {
  const general = chatStore.conversations.find(c => c.type === 'general')
  if (general) chatStore.selectConversation(general)
}

// ─── Envio e Digitação ────────────────────────────────────────────────────────
async function handleSend() {
  const text = inputMessage.value.trim()
  if (!text) return

  // Se estiver em modo de edição
  if (editingMessage.value) {
    const editId = editingMessage.value.id
    editingMessage.value = null
    inputMessage.value = ''
    await chatStore.editMessage(editId, text)
    return
  }

  const replyId = replyingTo.value?.id || null
  inputMessage.value = ''
  replyingTo.value = null
  showMentionSuggestions.value = false

  if (chatStore.activeConversation) {
    socket?.emit('internal_typing', {
      conversationId: chatStore.activeConversation.id,
      isTyping: false
    })
  }

  await chatStore.sendMessage(text, { reply_to_id: replyId })
  scrollToBottom()
}

function onKeyDown(e) {
  if (e.key === 'Escape') {
    if (editingMessage.value) {
      cancelEditMessage()
      return
    }
    if (showMentionSuggestions.value) {
      showMentionSuggestions.value = false
      return
    }
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    if (showMentionSuggestions.value && mentionCandidates.value.length > 0) {
      e.preventDefault()
      selectMentionMember(mentionCandidates.value[0])
      return
    }
    e.preventDefault()
    handleSend()
  }
}

function onInputTyping() {
  // Detecção de menção ativa (@...)
  const val = inputMessage.value
  const atIdx = val.lastIndexOf('@')
  if (atIdx >= 0) {
    const textAfterAt = val.slice(atIdx + 1)
    if (!textAfterAt.includes(' ') && textAfterAt.length < 25) {
      showMentionSuggestions.value = true
      mentionSearchTerm.value = textAfterAt
    } else {
      showMentionSuggestions.value = false
    }
  } else {
    showMentionSuggestions.value = false
  }

  if (chatStore.activeConversation) {
    socket?.emit('internal_typing', {
      conversationId: chatStore.activeConversation.id,
      isTyping: true
    })
  }
  clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {
    if (chatStore.activeConversation) {
      socket?.emit('internal_typing', {
        conversationId: chatStore.activeConversation.id,
        isTyping: false
      })
    }
  }, 2000)
}

function insertEmoji(emoji) {
  inputMessage.value += emoji
  inputTextareaRef.value?.focus()
}

// ─── Citação e Resposta (Reply) ──────────────────────────────────────────────
function setReplyTo(msg) {
  replyingTo.value = msg
  nextTick(() => {
    inputTextareaRef.value?.focus()
  })
}

function cancelReply() {
  replyingTo.value = null
}

function findMessageById(id) {
  if (!id) return null
  return chatStore.messages.find(m => m.id === id)
}

function getMessageSnippet(msg) {
  if (!msg) return ''
  if (msg.text) return msg.text.slice(0, 60) + (msg.text.length > 60 ? '...' : '')
  if (msg.media_type === 'image') return '📷 Imagem'
  if (msg.media_type === 'audio') return '🎤 Mensagem de voz'
  return '📎 Arquivo'
}

function scrollToMessage(msgId) {
  nextTick(() => {
    const el = document.getElementById(`msg-${msgId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('highlight-pulse')
      setTimeout(() => {
        el.classList.remove('highlight-pulse')
      }, 1500)
    }
  })
}

// ─── Anexos e Upload de Mídia ────────────────────────────────────────────────
function triggerFileInput() {
  fileInputRef.value?.click()
}

async function onFileSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return
  event.target.value = ''

  let mediaType = 'document'
  if (file.type.startsWith('image/')) mediaType = 'image'
  else if (file.type.startsWith('audio/')) mediaType = 'audio'
  else if (file.type.startsWith('video/')) mediaType = 'video'

  const caption = inputMessage.value.trim()
  const replyId = replyingTo.value?.id || null

  inputMessage.value = ''
  replyingTo.value = null

  await chatStore.sendMedia(file, {
    fileName: file.name,
    mediaType,
    caption,
    replyToId: replyId
  })
  scrollToBottom()
}

// ─── Gravação de Áudio ───────────────────────────────────────────────────────
async function startAudioRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioChunks = []
    mediaRecorder = new MediaRecorder(stream)
    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) audioChunks.push(e.data)
    }
    mediaRecorder.start()
    isRecordingAudio.value = true
    recordingSeconds.value = 0
    audioTimer = setInterval(() => {
      recordingSeconds.value++
    }, 1000)
  } catch (err) {
    ui.showToast('Permissão de microfone negada ou indisponível.', 'error')
  }
}

function cancelAudioRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  clearInterval(audioTimer)
  isRecordingAudio.value = false
  audioChunks = []
}

async function stopAndSendAudioRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return
  clearInterval(audioTimer)
  
  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, { type: 'audio/webm' })
    const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' })
    const replyId = replyingTo.value?.id || null
    replyingTo.value = null
    await chatStore.sendMedia(file, {
      fileName: file.name,
      mediaType: 'audio',
      replyToId: replyId
    })
    scrollToBottom()
  }
  mediaRecorder.stop()
  isRecordingAudio.value = false
}

function formatRecordingTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Lightbox / Visualização de Imagem ───────────────────────────────────────
function isImageUrl(url) {
  if (!url) return false
  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url)
}

function openImagePreview(url) {
  if (!url) return
  previewImageUrl.value = url
}

function closeImagePreview() {
  previewImageUrl.value = null
}

// ─── Formatação de Texto e Separadores de Data ──────────────────────────────
function formatMessageBody(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/@([A-Za-zÀ-ÿ0-9_\-\.]+)/g, '<span class="mention-tag">@$1</span>')
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    .replace(/~([^~\n]+)~/g, '<del>$1</del>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br />')
}

function shouldShowDateDivider(messages, index) {
  if (index === 0) return true
  const prevDate = new Date(messages[index - 1].created_at).toDateString()
  const currDate = new Date(messages[index].created_at).toDateString()
  return prevDate !== currDate
}

function formatDateDivider(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === now.toDateString()) return 'Hoje'
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ─── Estilos de Avatar e Formatação de Data ──────────────────────────────────
function getInitials(name) {
  if (!name) return 'CB'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getAvatarStyle(user) {
  const colors = [
    '#2563eb', '#7c3aed', '#059669', '#ea580c', '#dc2626', '#0891b2', '#4f46e5'
  ]
  let hash = 0
  const str = user?.name || user?.id || 'Brisoft'
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  const color = colors[Math.abs(hash) % colors.length]
  return { backgroundColor: color, color: '#ffffff' }
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  } catch {
    return ''
  }
}

function formatMessageTime(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
</script>

<style scoped>
.internal-chat-layout {
  display: grid;
  grid-template-columns: 340px 1fr;
  height: 100%;
  width: 100%;
  background: #f8fafc;
  overflow: hidden;
  font-family: inherit;
}

/* ─── SIDEBAR ESQUERDA ──────────────────────────────────────────────────────── */
.internal-sidebar {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  height: 100%;
  min-width: 0;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  background: #ffffff;
}

.header-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-icon-badge {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
}

.sidebar-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  line-height: 1.2;
}

.sidebar-subtitle {
  font-size: 11.5px;
  color: #64748b;
}

.online-counter-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.status-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
}

.search-box-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: #94a3b8;
  font-size: 14px;
}

.search-input {
  width: 100%;
  height: 34px;
  padding: 0 30px 0 32px;
  background: #f1f5f9;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 12.5px;
  color: #1e293b;
  outline: none;
  transition: all 0.15s ease;
}

.search-input:focus {
  background: #ffffff;
  border-color: #cbd5e1;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px;
}

/* Pílulas de Filtro da Sidebar */
.sidebar-filter-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  overflow-x: auto;
  scrollbar-width: none;
}

.sidebar-filter-tabs::-webkit-scrollbar {
  display: none;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.filter-pill:hover {
  background: #f1f5f9;
  color: #1e293b;
  border-color: #cbd5e1;
}

.filter-pill.active {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
  font-weight: 700;
}

.filter-unread-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  padding: 0 4px;
  line-height: 1;
}

.sidebar-scrollable {
  flex: 1;
  overflow-y: auto;
  padding: 10px 8px;
}

.section-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 4px 8px;
}

.section-label-text {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.5px;
}

.btn-new-channel {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-new-channel:hover {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}

.section-label {
  padding: 8px 8px 4px 8px;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.5px;
}

.section-mt {
  margin-top: 14px;
}

.conversation-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  margin-bottom: 2px;
}

.conversation-item:hover {
  background: #f1f5f9;
}

.conversation-item.active {
  background: #eff6ff;
}

.channel-icon-box {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.conversation-item.active .channel-icon-box {
  background: #dbeafe;
  color: #1d4ed8;
  border-color: #bfdbfe;
}

.member-avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.member-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  overflow: hidden;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #cbd5e1;
  border: 2px solid #ffffff;
}

.member-status-dot.online {
  background: #22c55e;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conv-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.conv-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-time {
  font-size: 11px;
  color: #94a3b8;
  flex-shrink: 0;
  margin-left: 6px;
}

.conv-preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.conv-preview,
.member-role-label {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-unread-badge {
  background: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
  flex-shrink: 0;
}

.empty-members-msg {
  padding: 24px 12px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

/* ─── PAINEL CENTRAL DO CHAT ────────────────────────────────────────────────── */
.internal-chat-main {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8fafc;
  min-width: 0;
}

.chat-main-container {
  display: flex;
  flex-direction: row;
  height: 100%;
  min-width: 0;
  position: relative;
  overflow: hidden;
}

.chat-conversation-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
  min-width: 0;
  position: relative;
}

.chat-header {
  height: 58px;
  padding: 0 20px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.chat-header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-channel-icon {
  width: 38px;
  height: 38px;
  font-size: 19px;
  background: #eff6ff;
  color: #2563eb;
  border-color: #dbeafe;
}

.chat-title {
  font-size: 14.5px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.chat-subtitle {
  font-size: 11.5px;
  color: #64748b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-indicator-text.online {
  color: #16a34a;
  font-weight: 600;
}

.sep-dot {
  color: #cbd5e1;
}

.chat-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.secure-internal-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: #059669;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  padding: 4px 10px;
  border-radius: 12px;
}

.header-action-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.header-action-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
  border-color: #cbd5e1;
}

.header-action-btn.active {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}

/* Barra Retrátil de Busca Textual */
.conversation-search-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.search-bar-input-box {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 420px;
}

.search-bar-input-box i {
  position: absolute;
  left: 10px;
  color: #94a3b8;
  font-size: 14px;
}

.conv-search-input {
  width: 100%;
  height: 32px;
  padding: 0 30px 0 32px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12.5px;
  color: #1e293b;
  outline: none;
  transition: all 0.15s ease;
}

.conv-search-input:focus {
  background: #ffffff;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.btn-clear-query {
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px;
}

.search-bar-nav {
  display: flex;
  align-items: center;
  gap: 6px;
}

.search-count-label {
  font-size: 12px;
  color: #64748b;
  margin-right: 4px;
  white-space: nowrap;
}

.search-nav-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.search-nav-btn:hover:not(:disabled) {
  background: #f1f5f9;
  color: #1e293b;
}

.search-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.search-close-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.search-close-btn:hover {
  color: #ef4444;
  background: #fee2e2;
}

.search-target-matched .message-bubble-box {
  outline: 2px solid #3b82f6 !important;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.4) !important;
}

/* ─── MENSAGENS ─────────────────────────────────────────────────────────────── */
.chat-messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.messages-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
  margin: auto;
}

.empty-chat-state {
  margin: auto;
  text-align: center;
  max-width: 320px;
  color: #64748b;
}

.empty-icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #eff6ff;
  color: #3b82f6;
  font-size: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px auto;
}

.empty-chat-state h4 {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 6px 0;
}

.empty-chat-state p {
  font-size: 12.5px;
  margin: 0;
  line-height: 1.4;
}

.messages-flow {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 75%;
}

.message-mine {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-other {
  align-self: flex-start;
}

.message-sender-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
  overflow: hidden;
  margin-bottom: 2px;
}

.message-sender-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-date-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16px 0 10px 0;
  width: 100%;
}

.date-badge {
  background: #e2e8f0;
  color: #475569;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 12px;
  border-radius: 12px;
  text-transform: capitalize;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message-bubble-wrapper {
  position: relative;
  max-width: 75%;
}

.message-bubble-box {
  position: relative;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.msg-reply-trigger {
  position: absolute;
  top: 4px;
  right: -28px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #64748b;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.15s ease;
}

.message-row:hover .msg-reply-trigger {
  display: flex;
}

.message-mine .msg-reply-trigger {
  right: auto;
  left: -28px;
}

.msg-reply-trigger:hover {
  background: #eff6ff;
  color: #2563eb;
  border-color: #93c5fd;
  transform: scale(1.1);
}

.message-mine .message-bubble-box {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
  border-bottom-right-radius: 2px;
}

.message-other .message-bubble-box {
  border-bottom-left-radius: 2px;
}

.bubble-sender-name {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #4f46e5;
  margin-bottom: 3px;
}

/* Citação / Quote */
.quoted-reply-box {
  display: flex;
  gap: 8px;
  background: rgba(0, 0, 0, 0.04);
  padding: 4px 8px;
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: pointer;
}

.message-mine .quoted-reply-box {
  background: rgba(255, 255, 255, 0.18);
}

.quoted-bar {
  width: 3px;
  background: #2563eb;
  border-radius: 2px;
  flex-shrink: 0;
}

.message-mine .quoted-bar {
  background: #ffffff;
}

.quoted-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.quoted-sender {
  font-size: 10.5px;
  font-weight: 700;
  color: #2563eb;
}

.message-mine .quoted-sender {
  color: #ffffff;
}

.quoted-snippet {
  font-size: 11px;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-mine .quoted-snippet {
  color: rgba(255, 255, 255, 0.85);
}

/* Mídias */
.message-media-image {
  margin-bottom: 6px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  max-width: 320px;
}

.message-media-image img {
  width: 100%;
  max-height: 260px;
  object-fit: cover;
  display: block;
  border-radius: 8px;
  transition: transform 0.2s ease;
}

.message-media-image img:hover {
  transform: scale(1.02);
}

.message-media-audio {
  margin: 4px 0 6px 0;
}

.message-media-audio audio {
  width: 240px;
  height: 36px;
}

.doc-attachment-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  margin-bottom: 6px;
  transition: background 0.15s ease;
}

.message-mine .doc-attachment-card {
  background: rgba(255, 255, 255, 0.15);
}

.doc-attachment-card:hover {
  background: rgba(0, 0, 0, 0.08);
}

.message-mine .doc-attachment-card:hover {
  background: rgba(255, 255, 255, 0.25);
}

.doc-icon-box {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.doc-info-box {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.doc-title {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-action {
  font-size: 10px;
  opacity: 0.7;
}

.doc-download-icon {
  font-size: 16px;
  opacity: 0.8;
}

.highlight-pulse {
  animation: pulse-border 1.5s ease-in-out;
}

@keyframes pulse-border {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7); }
  50% { transform: scale(1.02); box-shadow: 0 0 0 8px rgba(37, 99, 235, 0); }
  100% { transform: scale(1); }
}

.message-text-content {
  font-size: 13.5px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-meta-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 4px;
}

.message-timestamp {
  font-size: 10.5px;
  color: #94a3b8;
}

.message-mine .message-timestamp {
  color: rgba(255, 255, 255, 0.8);
}

.message-check-read {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
}

.typing-indicator-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 12px;
  color: #64748b;
}

.typing-dots {
  display: flex;
  gap: 3px;
}

.typing-dots span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #94a3b8;
  animation: typing-blink 1.4s infinite both;
}

.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-blink {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

/* ─── FOOTER DO INPUT ───────────────────────────────────────────────────────── */
.chat-input-footer {
  padding: 12px 20px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
}

.chat-input-form {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 4px 8px;
  transition: all 0.15s ease;
}

.chat-input-form:focus-within {
  background: #ffffff;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.tool-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 18px;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.tool-btn:hover {
  color: #2563eb;
  background: #eff6ff;
}

.chat-textarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  font-size: 13.5px;
  color: #0f172a;
  max-height: 100px;
  line-height: 1.4;
  padding: 6px 0;
  font-family: inherit;
}

.send-message-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #2563eb;
  color: #ffffff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.send-message-btn:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.send-message-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

/* Banner de Resposta Ativa */
.active-reply-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 6px 10px;
  margin-bottom: 8px;
}

.reply-banner-bar {
  width: 3px;
  height: 28px;
  background: #2563eb;
  border-radius: 2px;
  flex-shrink: 0;
}

.reply-banner-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.reply-banner-title {
  font-size: 11px;
  color: #2563eb;
}

.reply-banner-snippet {
  font-size: 12px;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-cancel-reply {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-cancel-reply:hover {
  background: #e2e8f0;
  color: #ef4444;
}

/* Gravação de Áudio */
.audio-recording-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 8px 14px;
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rec-pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
  animation: pulse-rec 1s infinite;
}

@keyframes pulse-rec {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.6; }
}

.rec-timer {
  font-size: 13px;
  font-weight: 700;
  color: #b91c1c;
}

.recording-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-cancel-rec {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #64748b;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-cancel-rec:hover {
  background: #f8fafc;
  color: #ef4444;
  border-color: #fca5a5;
}

.btn-send-rec {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  background: #ef4444;
  border: none;
  color: #ffffff;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-send-rec:hover {
  background: #dc2626;
}

.mic-btn:hover {
  color: #ef4444;
  background: #fee2e2;
}

/* Lightbox Modal */
.image-lightbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.lightbox-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 90vw;
  max-height: 90vh;
}

.lightbox-img {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.lightbox-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lightbox-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.lightbox-btn:hover {
  background: rgba(255, 255, 255, 0.35);
  color: #ffffff;
}

.lightbox-btn.close-btn {
  background: rgba(239, 68, 68, 0.8);
  border-color: transparent;
}

.lightbox-btn.close-btn:hover {
  background: #dc2626;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ─── ESTADO VAZIO (NENHUMA CONVERSA ATIVA) ──────────────────────────────────── */
.no-active-chat-state {
  margin: auto;
  text-align: center;
  max-width: 380px;
  padding: 30px;
}

.no-chat-illustration {
  margin-bottom: 16px;
}

.illustration-bubble {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  box-shadow: 0 8px 16px -4px rgba(37, 99, 235, 0.15);
}

.no-chat-title {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px 0;
}

.no-chat-desc {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  margin: 0 0 20px 0;
}

.btn-start-general {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #2563eb;
  color: #ffffff;
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-start-general:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}

/* ─── PAINEL LATERAL DE DETALHES DA CONVERSA (DRAWER) ───────────────────────── */
.conversation-details-drawer {
  width: 310px;
  background: #ffffff;
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100%;
  animation: slideDrawer 0.2s ease-out;
}

@keyframes slideDrawer {
  from { width: 0; opacity: 0; }
  to { width: 310px; opacity: 1; }
}

.drawer-header {
  height: 58px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
}

.drawer-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.drawer-close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.drawer-close-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.drawer-profile-card {
  padding: 20px 16px;
  text-align: center;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
}

.drawer-big-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  margin: 0 auto 10px auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.drawer-big-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.drawer-big-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px auto;
  border: 1px solid #dbeafe;
}

.drawer-conv-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 6px 0;
}

.drawer-conv-type-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  background: #e2e8f0;
  padding: 2px 8px;
  border-radius: 12px;
}

.drawer-tabs {
  display: flex;
  border-bottom: 1px solid #f1f5f9;
  background: #ffffff;
}

.drawer-tab {
  flex: 1;
  padding: 10px 4px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.drawer-tab:hover {
  color: #1e293b;
}

.drawer-tab.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  font-weight: 700;
}

.drawer-badge-count {
  font-size: 10px;
  background: #f1f5f9;
  color: #475569;
  padding: 1px 5px;
  border-radius: 8px;
}

.drawer-tab.active .drawer-badge-count {
  background: #eff6ff;
  color: #2563eb;
}

.drawer-tab-pane {
  padding: 14px 12px;
  flex: 1;
}

.drawer-loading {
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
  padding: 24px 0;
}

.drawer-members-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.drawer-member-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
  transition: background 0.15s ease;
}

.drawer-member-card:hover {
  background: #f8fafc;
}

.drawer-small-avatar {
  width: 32px;
  height: 32px;
  font-size: 11px;
}

.drawer-member-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.drawer-member-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drawer-member-sub {
  font-size: 11px;
  color: #94a3b8;
}

.btn-quick-direct {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-quick-direct:hover {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}

.drawer-empty-media {
  text-align: center;
  padding: 30px 10px;
  color: #94a3b8;
}

.drawer-empty-media i {
  font-size: 32px;
  margin-bottom: 6px;
  display: inline-block;
}

.drawer-empty-media p {
  font-size: 12px;
  margin: 0;
  line-height: 1.4;
}

.drawer-media-section {
  margin-bottom: 16px;
}

.drawer-section-heading {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.drawer-images-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.drawer-image-thumb {
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #e2e8f0;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.drawer-image-thumb:hover {
  transform: scale(1.03);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.drawer-image-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.drawer-docs-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.drawer-doc-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  text-decoration: none;
  color: #1e293b;
  transition: all 0.15s ease;
}

.drawer-doc-item:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.drawer-doc-icon {
  font-size: 20px;
  color: #2563eb;
  flex-shrink: 0;
}

.drawer-doc-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.drawer-doc-name {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drawer-doc-date {
  font-size: 10.5px;
  color: #94a3b8;
}

/* ─── MODAL DE NOVO CANAL ────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.channel-modal-card {
  background: #ffffff;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.channel-modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.channel-modal-title {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px 0;
}

.channel-modal-subtitle {
  font-size: 12.5px;
  color: #64748b;
  margin: 0;
}

.btn-modal-close {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 20px;
  cursor: pointer;
  padding: 2px;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.btn-modal-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.channel-modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.channel-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.channel-form-label {
  font-size: 12.5px;
  font-weight: 600;
  color: #334155;
}

.mb-0 {
  margin-bottom: 0;
}

.channel-name-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.hashtag-prefix {
  position: absolute;
  left: 12px;
  color: #64748b;
  font-weight: 700;
  font-size: 15px;
}

.channel-input {
  width: 100%;
  height: 38px;
  padding: 0 12px 0 28px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 13.5px;
  color: #1e293b;
  outline: none;
  transition: all 0.15s ease;
}

.channel-input:focus {
  background: #ffffff;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.channel-input-hint {
  font-size: 11px;
  color: #94a3b8;
}

.channel-type-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.type-option-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  background: #f8fafc;
  transition: all 0.15s ease;
}

.type-option-card:hover {
  background: #ffffff;
  border-color: #cbd5e1;
}

.type-option-card.selected {
  background: #eff6ff;
  border-color: #2563eb;
}

.type-icon-box {
  font-size: 18px;
  color: #64748b;
  margin-top: 1px;
}

.type-option-card.selected .type-icon-box {
  color: #2563eb;
}

.type-text-box {
  display: flex;
  flex-direction: column;
}

.type-title {
  font-size: 12.5px;
  font-weight: 700;
  color: #1e293b;
}

.type-desc {
  font-size: 10.5px;
  color: #64748b;
  line-height: 1.3;
  margin-top: 2px;
}

.member-select-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.selected-counter {
  font-size: 11px;
  font-weight: 600;
  color: #2563eb;
}

.channel-member-picker {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.picker-member-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.picker-member-row:hover {
  background: #f1f5f9;
}

.picker-member-row.selected {
  background: #eff6ff;
}

.member-checkbox {
  cursor: pointer;
}

.picker-member-info {
  display: flex;
  flex-direction: column;
}

.picker-name {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
}

.picker-role {
  font-size: 10.5px;
  color: #94a3b8;
}

.channel-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}

.btn-modal-cancel {
  padding: 9px 16px;
  background: #f1f5f9;
  border: none;
  border-radius: 8px;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-modal-cancel:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.btn-modal-submit {
  padding: 9px 20px;
  background: #2563eb;
  border: none;
  border-radius: 8px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-modal-submit:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-modal-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ─── FASE 4: MENSAGENS FIXADAS, REAÇÕES, EDIÇÃO E MENÇÕES ───────────────── */
/* Banner de mensagem fixada no topo do chat */
.pinned-message-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f0fdf4;
  border-bottom: 1px solid #bbf7d0;
  padding: 8px 16px;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.pinned-banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  flex: 1;
  min-width: 0;
}

.pinned-banner-content .pin-icon {
  font-size: 16px;
  color: #16a34a;
  flex-shrink: 0;
}

.pinned-text-box {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pinned-label {
  font-size: 10.5px;
  font-weight: 700;
  color: #15803d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pinned-snippet {
  font-size: 12px;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-unpin-banner {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.btn-unpin-banner:hover {
  background: #dcfce7;
  color: #15803d;
}

/* Barra de Ações Rápidas na Mensagem */
.msg-actions-bar {
  position: absolute;
  top: -14px;
  right: 12px;
  display: none;
  align-items: center;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 2px 4px;
  z-index: 20;
  gap: 2px;
}

.message-mine .msg-actions-bar {
  right: auto;
  left: 12px;
}

.message-row:hover .msg-actions-bar,
.msg-actions-bar:has(.reactions-quick-popover),
.msg-actions-bar:has(.msg-dropdown-menu) {
  display: flex;
}

.msg-action-item {
  position: relative;
  display: flex;
  align-items: center;
}

.msg-action-trigger {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.msg-action-trigger:hover {
  background: #f1f5f9;
  color: #2563eb;
  transform: scale(1.1);
}

/* Popover Rápido de Emojis */
.reactions-quick-popover {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  padding: 3px 6px;
  z-index: 30;
}

.quick-emoji-btn {
  background: none;
  border: none;
  font-size: 17px;
  cursor: pointer;
  padding: 3px 4px;
  border-radius: 6px;
  line-height: 1;
  transition: transform 0.15s ease, background 0.15s ease;
}

.quick-emoji-btn:hover {
  transform: scale(1.35);
  background: #f8fafc;
}

/* Dropdown Menu de Mais Ações */
.msg-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 165px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  padding: 4px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.message-mine .msg-dropdown-menu {
  right: auto;
  left: 0;
}

.msg-dropdown-menu .dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  font-size: 12px;
  color: #334155;
  background: none;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.msg-dropdown-menu .dropdown-item:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.msg-dropdown-menu .dropdown-item.text-danger {
  color: #ef4444;
}

.msg-dropdown-menu .dropdown-item.text-danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

.msg-dropdown-menu .dropdown-item i {
  font-size: 14px;
}

/* Tag de Mensagem Fixada no Balão */
.msg-pinned-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #16a34a;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  padding: 2px 6px;
  border-radius: 4px;
  margin-bottom: 5px;
}

.message-mine .msg-pinned-tag {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.35);
  color: #ffffff;
}

/* Mensagem Apagada */
.deleted-msg-content {
  font-size: 12px;
  font-style: italic;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 5px;
}

.message-mine .deleted-msg-content {
  color: rgba(255, 255, 255, 0.7);
}

.is-deleted-bubble {
  opacity: 0.85;
}

/* Badge de Editada */
.msg-edited-badge {
  font-size: 9.5px;
  opacity: 0.75;
  margin-right: 4px;
  font-style: italic;
}

/* Pílulas de Reações Agregadas */
.message-reactions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.reaction-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 12px;
  font-size: 11px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.reaction-pill:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.reaction-pill.user-reacted {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
  font-weight: 600;
}

.reaction-emoji {
  font-size: 12px;
  line-height: 1;
}

.reaction-count {
  font-size: 10.5px;
}

/* Banner de Edição Ativa no Footer */
.active-editing-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fefce8;
  border-top: 1px solid #fef08a;
  padding: 8px 16px;
  position: relative;
}

.editing-banner-bar {
  width: 3px;
  height: 28px;
  background: #ca8a04;
  border-radius: 2px;
  flex-shrink: 0;
}

.editing-banner-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.editing-banner-title {
  font-size: 11px;
  font-weight: 700;
  color: #854d0e;
  display: flex;
  align-items: center;
  gap: 4px;
}

.editing-banner-snippet {
  font-size: 11.5px;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-cancel-edit {
  background: none;
  border: none;
  color: #854d0e;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.btn-cancel-edit:hover {
  background: #fef08a;
}

/* Popover Flutuante de Menções (@mentions) */
.mention-suggestions-popover {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 16px;
  width: 260px;
  max-height: 220px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.14);
  z-index: 50;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.mention-suggestions-header {
  font-size: 10.5px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
}

.mention-item-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
  width: 100%;
}

.mention-item-btn:hover {
  background: #eff6ff;
}

.mention-item-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.mention-name {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
}

.mention-role {
  font-size: 10.5px;
  color: #94a3b8;
}

/* Tag de Menção no Corpo da Mensagem */
:deep(.mention-tag) {
  display: inline-block;
  color: #2563eb;
  font-weight: 600;
  background: rgba(37, 99, 235, 0.08);
  padding: 0 4px;
  border-radius: 4px;
}

.message-mine :deep(.mention-tag) {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.25);
  text-decoration: underline;
}

/* Aba "Fixadas" no Drawer Lateral de Detalhes */
.drawer-pinned-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.drawer-pinned-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.drawer-pinned-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.drawer-pinned-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.pmsg-author {
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
}

.pmsg-date {
  font-size: 10.5px;
  color: #94a3b8;
}

.drawer-pinned-card-text {
  font-size: 12px;
  color: #475569;
  line-height: 1.4;
  margin: 0 0 8px 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.btn-unpin-card {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #ef4444;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: opacity 0.15s ease;
}

.btn-unpin-card:hover {
  opacity: 0.8;
  text-decoration: underline;
}

/* ─── RESPONSIVIDADE ────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .internal-chat-layout {
    grid-template-columns: 1fr;
  }
  .conversation-details-drawer {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 20;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  }
}
</style>
