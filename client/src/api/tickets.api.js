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
  sendMedia:     (ticketId, file, metadata = {}, requestOptions = {}) => http.post(`/tickets/${ticketId}/media`, file, {
    timeout: 300000,
    onUploadProgress: requestOptions.onUploadProgress,
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-File-Name': encodeURIComponent(metadata.fileName || file?.name || 'arquivo'),
      'X-File-Type': metadata.mimeType || file?.type || 'application/octet-stream',
      'X-Media-Type': metadata.mediaType || '',
      'X-Voice-Note': metadata.voiceNote === true ? 'true' : 'false',
      'X-Media-Caption': encodeURIComponent(metadata.caption || '')
    }
  }),
  markAsRead:    (ticketId)                        => http.post('/tickets/read',             { ticketId }),
  kpis:          ()                                => http.get('/dashboard/kpis'),
  performance:   (params = {})                     => http.get('/performance', { params }),
  wallboard:     (params = {})                     => http.get('/wallboard', { params }),
  saveWallboardConfig: (departmentId, config)      => http.put('/wallboard/config', { departmentId, config })
}
