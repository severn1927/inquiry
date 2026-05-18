import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAuthStore } from '@/stores/auth'

export function AppLayout() {
  const { user, loading, token } = useAuthStore()

  // 正在加载用户信息
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-mesh">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center font-bold text-white mx-auto mb-4 animate-pulse-glow">
            INQ
          </div>
          <p className="text-primary-300 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // 没有 token 且没有 user → 跳转登录
  if (!user && !token) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="ml-[240px] transition-all duration-300">
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
