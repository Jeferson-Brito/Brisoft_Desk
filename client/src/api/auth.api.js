import http from './http'

export const authApi = {
  login: (email, password) =>
    http.post('/auth/login', { email, password }),

  logout: () =>
    http.post('/auth/logout').catch(() => {}),

  me: () =>
    http.get('/auth/me'),

  updateProfile: (payload) =>
    http.put('/auth/profile', payload)
}
