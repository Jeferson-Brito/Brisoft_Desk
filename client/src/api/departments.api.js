import http from './http'

export const departmentsApi = {
  list:   ()       => http.get('/departments'),
  save:   (data)   => http.post('/departments', data),
  remove: (id)     => http.delete(`/departments/${id}`)
}
