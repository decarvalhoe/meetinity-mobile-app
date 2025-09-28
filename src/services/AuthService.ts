import http from './http'

export interface User {
  id: string
  name: string
  email: string
}

type Provider = 'google' | 'linkedin'

const AuthService = {
  async getAuthUrl(provider: Provider) {
    const { data } = await http.post(`/api/auth/${provider}`)
    return data.auth_url as string
  },

  async handleCallback(provider: Provider, code?: string | null, state?: string | null, tokenInQuery?: string | null) {
    if (tokenInQuery) {
      return tokenInQuery
    }

    if (!code || !state) {
      throw new Error('Missing code or state for OAuth callback.')
    }

    const { data } = await http.post(`/api/auth/${provider}/callback`, { code, state })
    return data.token as string
  },

  async verify(token: string) {
    const { data } = await http.get('/api/auth/verify', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return data.valid as boolean
  },

  async profile(): Promise<User> {
    const { data } = await http.get('/api/auth/profile')
    return data as User
  },
}

export default AuthService
