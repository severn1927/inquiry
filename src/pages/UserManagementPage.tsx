import { useEffect, useState } from 'react'
import { authApi } from '@/services/api'
import type { User } from '@/types'
import { useAuthStore } from '@/stores/auth'
import toast from 'react-hot-toast'
import { formatDate } from '@/utils'
import {
  Plus, Pencil, Trash2, X, Check, UserPlus, Shield, Users,
  Loader2, AlertTriangle, Search,
} from 'lucide-react'

const ROLE_OPTIONS = ['admin', '英文官网', '阿里国际站', '社媒', '其他']
const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  '英文官网': '英文官网',
  '阿里国际站': '阿里国际站',
  '社媒': '社媒',
  '其他': '其他',
}

export function UserManagementPage() {
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  // 表单
  const [form, setForm] = useState({
    username: '',
    password: '',
    display_name: '',
    role: '英文官网',
    channel: '',
    info_source: '',
  })

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await authApi.getUsers()
      setUsers(res.data)
    } catch {
      toast.error('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const openCreate = () => {
    setEditingUser(null)
    setForm({ username: '', password: '', display_name: '', role: '英文官网', channel: '', info_source: '' })
    setShowModal(true)
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    setForm({
      username: user.username,
      password: '',
      display_name: user.display_name,
      role: user.role,
      channel: user.channel || '',
      info_source: user.info_source || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!editingUser && !form.username.trim()) {
      toast.error('请输入用户名')
      return
    }
    if (!editingUser && !form.password.trim()) {
      toast.error('请输入密码')
      return
    }

    setSaving(true)
    try {
      if (editingUser) {
        const data: any = {
          display_name: form.display_name,
          role: form.role,
          channel: form.channel,
          info_source: form.info_source,
        }
        if (form.password) data.password = form.password
        await authApi.updateUser(editingUser.id, data)
        toast.success('用户信息已更新')
      } else {
        await authApi.createUser(form)
        toast.success('用户创建成功')
      }
      setShowModal(false)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || '操作失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (userId: number) => {
    if (userId === currentUser?.id) {
      toast.error('不能删除自己的账号')
      return
    }
    setSaving(true)
    try {
      await authApi.deleteUser(userId)
      toast.success('用户已删除')
      setDeleteConfirm(null)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || '删除失败')
    } finally {
      setSaving(false)
    }
  }

  // 过滤用户
  const filteredUsers = users.filter(u =>
    u.username.includes(searchQuery) ||
    u.display_name.includes(searchQuery) ||
    u.role.includes(searchQuery)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">用户管理</h1>
          <p className="text-slate-500 text-sm mt-1">管理系统登录账号和权限</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-violet-600 transition-all shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          添加用户
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索用户名或显示名..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
        />
      </div>

      {/* User table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">加载中...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">暂无用户数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50 to-violet-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">用户名</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">显示名</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">角色</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">渠道</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">信息来源</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">创建时间</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-indigo-700 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 flex items-center justify-center text-white text-xs font-bold">
                          {user.username[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-800">{user.username}</span>
                        {user.role === 'admin' && (
                          <Shield className="w-3.5 h-3.5 text-amber-500" title="管理员" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{user.display_name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-50 text-slate-600 border border-slate-200'
                      }`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{user.channel || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{user.info_source || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(user)}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="编辑"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {user.id !== currentUser?.id && (
                          deleteConfirm === user.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(user.id)}
                                disabled={saving}
                                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                title="确认删除"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors"
                                title="取消"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(user.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-display font-semibold text-lg text-slate-800">
                {editingUser ? '编辑用户' : '添加用户'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">用户名</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  disabled={!!editingUser}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="输入用户名"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  密码 {editingUser ? '(留空则不修改)' : ''}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  placeholder={editingUser ? '留空不修改' : '输入密码'}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">显示名</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  placeholder="输入显示名称"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">角色</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 appearance-none cursor-pointer"
                >
                  {ROLE_OPTIONS.map(role => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">渠道</label>
                <input
                  type="text"
                  value={form.channel}
                  onChange={(e) => setForm({ ...form, channel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  placeholder="如：英文官网、阿里国际站、社媒等"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">信息来源</label>
                <input
                  type="text"
                  value={form.info_source}
                  onChange={(e) => setForm({ ...form, info_source: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  placeholder="如：Google、LinkedIn、展会等"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-violet-600 transition-all disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingUser ? '保存修改' : '创建用户'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
