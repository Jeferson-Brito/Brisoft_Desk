import http from './http'

export const connectionsApi = {
  serverStatus: () => http.get('/system/status'),
  serverLogs: (limit = 300) => http.get('/system/logs', { params: { limit } }),
  clearServerLogs: () => http.delete('/system/logs'),
  listWhatsApp: () => http.get('/whatsapp/accounts'),
  createWhatsApp: (name) => http.post('/whatsapp/accounts', { name }),
  connectWhatsApp: (id) => http.post(`/whatsapp/accounts/${id}/connect`),
  disconnectWhatsApp: (id) => http.post(`/whatsapp/accounts/${id}/disconnect`),
  removeWhatsApp: (id) => http.delete(`/whatsapp/accounts/${id}`)
}
