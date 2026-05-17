import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import {
  LayoutDashboard, Mail, PlusCircle, Users, Settings,
  LogOut, ChevronLeft, ChevronRight, BookOpen, UserCog, BarChart3,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '仪表盘' },
  { to: '/inquiries', icon: Mail, label: '询盘列表' },
  { to: '/inquiries/new', icon: PlusCircle, label: '新增询盘' },
  { to: '/analytics', icon: BarChart3, label: '询盘分析' },
  { to: '/users', icon: Users, label: '用户管理', adminOnly: true },
  { to: '/sales', icon: UserCog, label: '业务员管理', adminOnly: true },
  { to: '/dicts', icon: BookOpen, label: '字典管理', adminOnly: true },
  { to: '/settings', icon: Settings, label: '系统设置', adminOnly: true },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 sidebar-gradient text-white flex flex-col transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center font-bold text-sm shrink-0">
          INQ
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <div className="font-display font-bold text-base whitespace-nowrap">INQ V3</div>
            <div className="text-[10px] text-primary-300 whitespace-nowrap">询盘管理系统</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') return null
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-white/15 text-white shadow-lg shadow-primary-500/10'
                    : 'text-primary-200 hover:bg-white/8 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* User Info + Logout */}
      <div className="p-3 border-t border-white/10">
        <div className={`flex items-center gap-3 px-3 py-2 mb-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-400 to-primary-500 flex items-center justify-center text-xs font-bold shrink-0">
            {user?.display_name?.[0] || user?.username?.[0] || 'U'}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-sm font-medium truncate">{user?.display_name || user?.username}</div>
              <div className="text-xs text-primary-300">{user?.role === 'admin' ? '管理员' : '普通用户'}</div>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-primary-200 hover:bg-red-500/20 hover:text-red-300 transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>退出登录</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-primary-600 border-2 border-slate-50 flex items-center justify-center text-white hover:bg-primary-500 transition-colors shadow-md"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  )
}
