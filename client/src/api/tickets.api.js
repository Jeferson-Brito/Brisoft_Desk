import http from './http'

export const ticketsApi = {
  list:        ()                    => http.get('/tickets'),
  get:         (ticketId)            => http.get(`/tickets/${ticketId}`),
  history:     ()                    => http.get('/tickets/history'),
  assume:        (ticketId)                        => http.post('/tickets/assume',           { ticketId }),
  transfer:      (ticketId, transferData)          => http.post('/tickets/transfer',         { ticketId, ...transferData }),
  close:         (ticketId)                        => http.post('/tickets/close',            { ticketId }),
  updateContact: (ticketId, contactData)           => http.put(`/tickets/${ticketId}/contact`, contactData),
  sendMessage:   (ticketId, text)                  => http.post('/tickets/send-message',     { ticketId, text }),
  markAsRead:    (ticketId)                        => http.post('/tickets/read',             { ticketId }),
  kpis:          ()                                => http.get('/dashboard/kpis')
}
