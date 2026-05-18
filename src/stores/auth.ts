import { create } from 'zustand'
import type { User } from '@/types'
import { authApi } from '@/services/api'

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  fetchUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: true,

  login: async (username: string, password: string) => {
    const res = await authApi.login(username, password)
    localStorage.setItem('token', res.data.token)
    set({ user: res.data.user, token: res.data.token })
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },

  fetchUser: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ loading: false })
      return
    }
    try {
      const res = await authApi.getMe()
      set({ user: res.data, token, loading: false })
    } catch (err: any) {
      // 只有服务端明确返回 401（token无效/过期）才清空
      if (err?.response?.status === 401) {
        localStorage.removeItem('token')
        set({ user: null, token: null, loading: false })
      } else {
        set({ loading: false })
      }
    }
  },
}))
