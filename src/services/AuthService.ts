import http from './http'

export interface User {
  id: string
  name: string
  email: string
}

const AuthService = {
  async getAuthUrl(provider: 'google' | 'linkedin') {
    const { data } = await http.post(`/api/auth/${provider}`)
    return data.auth_url as string
  },

  async handleCallback(params: { code: string; state: string }) {
    const { data } = await http.post('/api/auth/callback', params)
    return data.token as string
  },

  async verify() {
    const { data } = await http.get('/api/auth/verify')
    return data.valid as boolean
  },

  async profile(): Promise<User> {
    const { data } = await http.get('/api/auth/profile')
    return data as User
  },
}

export default AuthService
