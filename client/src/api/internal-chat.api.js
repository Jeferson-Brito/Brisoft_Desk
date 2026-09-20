import http from './http'

export const internalChatApi = {
  listConversations: () => http.get('/internal-chat/conversations'),
  listTeamMembers: () => http.get('/internal-chat/members'),
  getMessages: (conversationId) => http.get(`/internal-chat/conversations/${conversationId}/messages`),
  sendMessage: (conversationId, payload) => http.post(`/internal-chat/conversations/${conversationId}/messages`, payload),
  startDirectChat: (targetUserId) => http.post(`/internal-chat/direct/${targetUserId}`),
  markAsRead: (conversationId) => http.post(`/internal-chat/conversations/${conversationId}/read`)
}
