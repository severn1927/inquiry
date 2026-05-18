import { useEffect, useState } from 'react'
import { settingsApi, scheduleApi } from '@/services/api'
import type { ApiSettings, StaffItem, StaffDutyConfig, ScheduleItem } from '@/types'
import toast from 'react-hot-toast'
import {
  Settings, Key, Users, Calendar, Save, Plus, Trash2, GripVertical,
  Loader2, ChevronDown, RefreshCw, AlertCircle, X,
} from 'lucide-react'

type TabType = 'api' | 'staff' | 'schedule'

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('api')

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'api', label: 'API 设置', icon: <Key className="w-4 h-4" /> },
    { key: 'staff', label: '业务员配置', icon: <Users className="w-4 h-4" /> },
    { key: 'schedule', label: '排班表', icon: <Calendar className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">系统设置</h1>
        <p className="text-slate-500 text-sm mt-1">管理API配置、业务员权重和排班</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'api' && <ApiSettingsTab />}
      {activeTab === 'staff' && <StaffSettingsTab />}
      {activeTab === 'schedule' && <ScheduleTab />}
    </div>
  )
}

// ========== API 设置 ==========
function ApiSettingsTab() {
  const [form, setForm] = useState<ApiSettings>({
    deepseek_api_key: '',
    deepseek_api_url: 'https://api.deepseek.com/chat/completions',
    deepseek_model: 'deepseek-chat',
    deepseek_max_tokens: 2048,
    deepseek_temperature: 0.1,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    settingsApi.getApiSettings().then(res => {
      setForm(res.data)
      setLoading(false)
    }).catch(() => {
      toast.error('加载API设置失败')
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await settingsApi.updateApiSettings(form)
      toast.success('API设置已保存')
    } catch {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-indigo-500" />
          <h3 className="font-display font-semibold text-lg text-slate-800">DeepSeek API 配置</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.deepseek_api_key}
              onChange={(e) => setForm({ ...form, deepseek_api_key: e.target.value })}
              className="w-full px-3 py-2 pr-20 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              placeholder="sk-..."
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
            >
              {showKey ? '隐藏' : '显示'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">API URL</label>
          <input
            type="text"
            value={form.deepseek_api_url}
            onChange={(e) => setForm({ ...form, deepseek_api_url: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">模型</label>
            <input
              type="text"
              value={form.deepseek_model}
              onChange={(e) => setForm({ ...form, deepseek_model: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Max Tokens</label>
            <input
              type="number"
              value={form.deepseek_max_tokens}
              onChange={(e) => setForm({ ...form, deepseek_max_tokens: parseInt(e.target.value) || 2048 })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Temperature</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={form.deepseek_temperature}
              onChange={(e) => setForm({ ...form, deepseek_temperature: parseFloat(e.target.value) || 0.1 })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-violet-600 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          保存设置
        </button>
      </div>
    </div>
  )
}

// ========== 业务员配置 ==========
function StaffSettingsTab() {
  const [config, setConfig] = useState<StaffDutyConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    settingsApi.getStaffDuty().then(res => {
      setConfig(res.data)
      setLoading(false)
    }).catch(() => {
      toast.error('加载业务员配置失败')
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    try {
      await settingsApi.updateStaffDuty({ staff: config.staff })
      toast.success('业务员配置已保存')
    } catch {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 添加业务员
  const addStaff = (region: string) => {
    if (!config) return
    setConfig({
      ...config,
      staff: [...config.staff, { name: '', email: '', weight: 1, region }],
    })
  }

  // 删除业务员
  const removeStaff = (index: number) => {
    if (!config) return
    setConfig({
      ...config,
      staff: config.staff.filter((_, i) => i !== index),
    })
  }

  // 更新业务员
  const updateStaff = (index: number, field: keyof StaffItem, value: any) => {
    if (!config) return
    const newStaff = [...config.staff]
    newStaff[index] = { ...newStaff[index], [field]: value }
    setConfig({ ...config, staff: newStaff })
  }

  // 按区域分组
  const regions = ['亚太', '美洲', '欧非']
  const regionColors: Record<string, string> = {
    '亚太': 'border-blue-200 bg-blue-50/50',
    '美洲': 'border-emerald-200 bg-emerald-50/50',
    '欧非': 'border-amber-200 bg-amber-50/50',
  }
  const regionHeaderColors: Record<string, string> = {
    '亚太': 'text-blue-700 bg-blue-50',
    '美洲': 'text-emerald-700 bg-emerald-50',
    '欧非': 'text-amber-700 bg-amber-50',
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
      </div>
    )
  }

  if (!config) return null

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          <h3 className="font-display font-semibold text-lg text-slate-800">业务员配置</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">共 {config.staff.length} 人</span>
        </div>
      </div>

      <div className="space-y-6">
        {regions.map(region => {
          const regionStaff = config.staff.filter(s => s.region === region)
          return (
            <div key={region} className={`rounded-xl border ${regionColors[region]} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${regionHeaderColors[region]}`}>
                  {region} ({regionStaff.length}人)
                </span>
                <button
                  onClick={() => addStaff(region)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加
                </button>
              </div>

              {regionStaff.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">暂无业务员</p>
              ) : (
                <div className="space-y-2">
                  {regionStaff.map((staff, idx) => {
                    const globalIdx = config.staff.indexOf(staff)
                    return (
                      <div key={globalIdx} className="flex items-center gap-2 bg-white rounded-lg border border-slate-100 p-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {staff.name ? staff.name[0] : '?'}
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-2 min-w-0">
                          <input
                            type="text"
                            value={staff.name}
                            onChange={(e) => updateStaff(globalIdx, 'name', e.target.value)}
                            placeholder="姓名"
                            className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                          />
                          <input
                            type="text"
                            value={staff.email}
                            onChange={(e) => updateStaff(globalIdx, 'email', e.target.value)}
                            placeholder="邮箱"
                            className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                          />
                          <input
                            type="number"
                            min="1"
                            value={staff.weight}
                            onChange={(e) => updateStaff(globalIdx, 'weight', parseInt(e.target.value) || 1)}
                            placeholder="权重"
                            className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 w-20"
                          />
                        </div>
                        <button
                          onClick={() => removeStaff(globalIdx)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              <p className="mt-2 text-xs text-slate-400">
                {region === '亚太' ? '亚太区按排班轮换，权重不生效' : `${region}区按权重随机分配，权重越大被选中概率越高`}
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-violet-600 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          保存配置
        </button>
      </div>
    </div>
  )
}

// ========== 排班表 ==========
function ScheduleTab() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [duty, setDuty] = useState<StaffDutyConfig['duty'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [days, setDays] = useState(14)

  const fetchSchedule = async () => {
    setLoading(true)
    try {
      const [scheduleRes, staffRes] = await Promise.all([
        scheduleApi.getSchedule(days),
        settingsApi.getStaffDuty(),
      ])
      setSchedule(scheduleRes.data)
      setDuty(staffRes.data.duty)
    } catch {
      toast.error('加载排班数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSchedule() }, [days])

  const handleSaveDuty = async () => {
    if (!duty) return
    setSaving(true)
    try {
      await settingsApi.updateStaffDuty({ duty })
      toast.success('排班配置已保存')
      fetchSchedule()
    } catch {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 只显示亚太排班 — 后端返回 region 为 "亚太"
  const asiaSchedule = schedule.filter(s => s.region === '亚太')

  // 按周分组
  const weeks: ScheduleItem[][] = []
  let currentWeek: ScheduleItem[] = []
  asiaSchedule.forEach((item, idx) => {
    currentWeek.push(item)
    if ((idx + 1) % 7 === 0 || idx === asiaSchedule.length - 1) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 排班配置 */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <h3 className="font-display font-semibold text-lg text-slate-800">排班配置 (亚太区)</h3>
          </div>
        </div>

        {duty && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">起始日期</label>
                <input
                  type="date"
                  value={duty.base_date}
                  onChange={(e) => setDuty({ ...duty, base_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">每人值班天数</label>
                <input
                  type="number"
                  min="1"
                  value={duty.days_per_person}
                  onChange={(e) => setDuty({ ...duty, days_per_person: parseInt(e.target.value) || 2 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">显示天数</label>
                <select
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 appearance-none cursor-pointer"
                >
                  <option value={7}>7天</option>
                  <option value={14}>14天</option>
                  <option value={21}>21天</option>
                  <option value={28}>28天</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">值班人员顺序</label>
              <div className="flex flex-wrap gap-2">
                {duty.staff_order.map((name, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200"
                  >
                    {idx + 1}. {name}
                    <button
                      onClick={() => setDuty({ ...duty, staff_order: duty.staff_order.filter((_, i) => i !== idx) })}
                      className="ml-1 text-blue-400 hover:text-blue-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => {
                    const name = prompt('输入业务员姓名:')
                    if (name?.trim()) {
                      setDuty({ ...duty, staff_order: [...duty.staff_order, name.trim()] })
                    }
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-dashed border-slate-300 hover:border-indigo-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加人员
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={handleSaveDuty}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-violet-600 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                保存排班配置
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 排班表 */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-lg text-slate-800">亚太区排班表</h3>
          <button
            onClick={fetchSchedule}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>

        {asiaSchedule.length === 0 ? (
          <div className="text-center py-8 text-slate-400">暂无排班数据，请先配置排班参数</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50 to-violet-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">日期</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">星期</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">值班人员</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {asiaSchedule.map((item, idx) => {
                  const isToday = item.date === new Date().toISOString().split('T')[0]
                  return (
                    <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${isToday ? 'bg-indigo-50/50' : ''}`}>
                      <td className="px-4 py-2.5">
                        <span className={`text-sm font-medium ${isToday ? 'text-indigo-700' : 'text-slate-700'}`}>
                          {item.date}
                        </span>
                        {isToday && (
                          <span className="ml-2 inline-flex px-1.5 py-0.5 bg-indigo-500 text-white text-xs rounded-full">今天</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-500">{item.weekday}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                          <Users className="w-3.5 h-3.5" />
                          {item.staff_name}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
