import { useEffect, useState } from 'react'
import { userApi, dictApi } from '@/services/api'
import type { User, DictOption } from '@/types'
import { formatDate } from '@/utils'
import { UserPlus, Trash2, Edit2, Shield, X, Check } from 'lucide-react'

export function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    username: '', password: '', display_name: '', role: 'user' as string, channel_id: 0
  })
  const [channelOptions, setChannelOptions] = useState<DictOption[]>([])

  const fetchChannelOptions = () => {
    dictApi.getOptions('channel').then(res => {
      setChannelOptions([{ id: 0, label: '全部渠道', value: '全部渠道' }, ...res.data])
    }).catch(() => {})
  }

  const fetchUsers = () => {
    setLoading(true)
    userApi.getList().then((res) => {
      setUsers(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchUsers(); fetchChannelOptions() }, [])

  const getChannelLabel = (channelId: number) => {
    const opt = channelOptions.find(o => o.id === channelId)
    return opt ? opt.label : '全部渠道'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingUser) {
      const updateData: Record<string, string | number | boolean> = { display_name: formData.display_name, role: formData.role, channel_id: formData.channel_id }
      if (formData.password) updateData.password = formData.password
      await userApi.update(editingUser.id, updateData)
    } else {
      if (!formData.username || !formData.password) return
      await userApi.create(formData)
    }
    setShowForm(false)
    setEditingUser(null)
    setFormData({ username: '', password: '', display_name: '', role: 'user', channel_id: 0 })
    fetchUsers()
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({ username: user.username, password: '', display_name: user.display_name, role: user.role, channel_id: user.channel_id })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此用户吗？')) return
    await userApi.delete(id)
    fetchUsers()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">用户管理</h1>
          <p className="text-slate-500 text-sm mt-1">管理系统用户账号、权限和渠道分配</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingUser(null); setFormData({ username: '', password: '', display_name: '', role: 'user', channel_id: 0 }) }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium rounded-lg hover:from-primary-600 hover:to-accent-600 transition-all shadow-md shadow-primary-500/20"
        >
          <UserPlus className="w-4 h-4" />
          添加用户
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg">{editingUser ? '编辑用户' : '添加用户'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!!editingUser}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{editingUser ? '新密码（留空不修改）' : '密码'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">显示名称</label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">角色</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">管理渠道</label>
                <select
                  value={formData.channel_id}
                  onChange={(e) => setFormData({ ...formData, channel_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                >
                  {channelOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">分配该用户管理的询盘渠道</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                  取消
                </button>
                <button type="submit" className="flex-1 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors">
                  {editingUser ? '保存修改' : '创建用户'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">用户名</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">显示名称</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">角色</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">渠道</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">状态</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">创建时间</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-slate-700">{user.username}</td>
                  <td className="px-6 py-3 text-sm text-slate-500">{user.display_name || '-'}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'admin' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {user.role === 'admin' && <Shield className="w-3 h-3" />}
                      {user.role === 'admin' ? '管理员' : '普通用户'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      user.channel_id === 0 ? 'bg-slate-100 text-slate-500' : 'bg-accent-100 text-accent-700'
                    }`}>
                      {getChannelLabel(user.channel_id)}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.is_active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {user.is_active ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-400">{formatDate(user.created_at)}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(user)} className="p-1.5 rounded hover:bg-slate-100 transition-colors">
                        <Edit2 className="w-4 h-4 text-slate-400 hover:text-primary-500" />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
