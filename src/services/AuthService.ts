import apiClient from './apiClient'

export interface User {
  id: string
  name: string
  email: string
}

type Provider = 'google' | 'linkedin'

export interface AuthTokens {
  accessToken: string
  refreshToken?: string | null
  expiresIn?: number | null
}

const AuthService = {
  async getAuthUrl(provider: Provider) {
    const data = await apiClient.post<{ auth_url: string }>(`/api/auth/${provider}`)
    return data.auth_url
  },

  async handleCallback(
    provider: Provider,
    code?: string | null,
    state?: string | null,
    tokenInQuery?: string | null,
  ): Promise<AuthTokens> {
    if (tokenInQuery) {
      return { accessToken: tokenInQuery }
    }

    if (!code || !state) {
      throw new Error('Missing code or state for OAuth callback.')
    }

    const data = await apiClient.post<{ token: string; refresh_token?: string; expires_in?: number }>(
      `/api/auth/${provider}/callback`,
      { code, state },
    )
    return {
      accessToken: data.token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    }
  },

  async verify(token: string) {
    const data = await apiClient.get<{ valid: boolean }>('/api/auth/verify', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return data.valid
  },

  async profile(): Promise<User> {
    return apiClient.get<User>('/api/auth/profile')
  },
}

export default AuthService
