import { useEffect, useState, useCallback } from 'react'
import { settingsApi, scheduleApi } from '@/services/api'
import type { ApiSettings, StaffItem, StaffDutyConfig, ScheduleItem, CountryStaff, DictItem, AssignRules } from '@/types'
import toast from 'react-hot-toast'
import {
  Settings, Key, Users, Calendar, Save, Plus, Trash2, GripVertical,
  Loader2, ChevronDown, RefreshCw, AlertCircle, X, BookOpen, MapPin, Globe,
  Edit2, Mail, Weight, Database, ToggleLeft, ToggleRight, Check, UserPlus, CalendarClock, Sliders, Tag, FolderPlus,
} from 'lucide-react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, horizontalListSortingStrategy, useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type TabType = 'api' | 'staff' | 'schedule' | 'assign-rules' | 'dict'

const REGIONS = ['亚太', '美洲', '欧非'] as const
const REGION_COLORS: Record<string, string> = {
  '亚太': 'bg-blue-50 border-blue-200',
  '美洲': 'bg-green-50 border-green-200',
  '欧非': 'bg-purple-50 border-purple-200',
}
const REGION_GRADIENTS: Record<string, string> = {
  '亚太': 'from-blue-500 to-cyan-500',
  '美洲': 'from-green-500 to-emerald-500',
  '欧非': 'from-purple-500 to-pink-500',
}

// 获取姓名首字母头像色
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-rose-500',
  'bg-teal-500', 'bg-orange-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-lime-500', 'bg-red-500',
]
function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ==========================================
// 可拖拽的排班人员卡片
// ==========================================
function SortableStaffCard({ name, index }: { name: string; index: number }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: name })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative' as const,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all select-none
        ${isDragging
          ? 'border-indigo-400 bg-indigo-50 shadow-lg shadow-indigo-200/50 scale-105'
          : 'border-slate-200 bg-white hover:shadow-sm hover:border-slate-300'}`}
    >
      <div {...attributes} {...listeners}
        className="flex items-center justify-center cursor-grab active:cursor-grabbing px-0.5 rounded hover:bg-slate-100 transition-colors"
        title="拖拽调整顺序">
        <GripVertical className="w-4 h-4 text-slate-300" />
      </div>
      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold">
        {index + 1}
      </span>
      <span className={`w-7 h-7 flex items-center justify-center rounded-full text-white text-xs font-bold ${getAvatarColor(name)}`}>
        {name[0]}
      </span>
      <span className="text-sm font-medium text-slate-700">{name}</span>
    </div>
  )
}

// ==========================================
// 可拖拽排班列表
// ==========================================
function DraggableStaffList({
  names,
  onReorder,
}: {
  names: string[]
  onReorder: (names: string[]) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = names.indexOf(active.id as string)
    const newIndex = names.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    const newNames = arrayMove(names, oldIndex, newIndex)
    onReorder(newNames)
  }

  if (names.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-slate-400">
        <AlertCircle className="w-4 h-4 mr-2" />
        暂无值班人员，请添加
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={names} strategy={horizontalListSortingStrategy}>
        <div className="flex flex-wrap gap-2">
          {names.map((name, idx) => (
            <SortableStaffCard key={name} name={name} index={idx} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

// ==========================================
// 主页面
// ==========================================
export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('api')

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'api', label: 'API 设置', icon: <Key className="w-4 h-4" /> },
    { key: 'staff', label: '业务员配置', icon: <Users className="w-4 h-4" /> },
    { key: 'schedule', label: '排班表', icon: <Calendar className="w-4 h-4" /> },
    { key: 'assign-rules', label: '分配规则', icon: <Globe className="w-4 h-4" /> },
    { key: 'dict', label: '字典管理', icon: <BookOpen className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">系统设置</h1>
        <p className="text-slate-500 text-sm mt-1">管理API配置、业务员权重和排班</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
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
      {activeTab === 'assign-rules' && <AssignRulesTab />}
      {activeTab === 'dict' && <DictTab />}
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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    settingsApi.getApiSettings().then(res => setForm(res.data)).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await settingsApi.updateApiSettings(form)
      toast.success('API 设置已保存')
    } catch { toast.error('保存失败') }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Key className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-slate-800">DeepSeek API 配置</h3>
          <p className="text-xs text-slate-400">配置AI分析模型参数</p>
        </div>
      </div>
      <div className="space-y-4 pt-2">
        {[
          { key: 'deepseek_api_url', label: 'API 地址', type: 'text', placeholder: 'https://api.deepseek.com/chat/completions' },
          { key: 'deepseek_api_key', label: 'API Key', type: 'password', placeholder: 'sk-...' },
          { key: 'deepseek_model', label: '模型名称', type: 'text', placeholder: 'deepseek-chat' },
          { key: 'deepseek_max_tokens', label: '最大 Token', type: 'number', placeholder: '2048' },
          { key: 'deepseek_temperature', label: 'Temperature', type: 'number', placeholder: '0.1' },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{f.label}</label>
            <input
              type={f.type}
              value={(form as any)[f.key]}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
              placeholder={f.placeholder}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-300"
            />
          </div>
        ))}
      </div>
      <div className="pt-2">
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all disabled:opacity-50 shadow-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          保存设置
        </button>
      </div>
    </div>
  )
}

// ========== 业务员配置 ==========
function StaffSettingsTab() {
  const [staff, setStaff] = useState<StaffItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 添加业务员表单
  const [showAddForm, setShowAddForm] = useState<string | null>(null) // region key
  const [addForm, setAddForm] = useState({ name: '', email: '', weight: 1 })

  useEffect(() => {
    settingsApi.getStaffDuty().then(res => {
      setStaff(res.data.staff)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await settingsApi.updateStaffDuty({ staff })
      toast.success('业务员配置已保存')
    } catch { toast.error('保存失败') }
    finally { setSaving(false) }
  }

  const updateStaffField = (idx: number, field: keyof StaffItem, value: any) => {
    setStaff(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const addStaff = (region: string) => {
    if (!addForm.name.trim()) { toast.error('请输入业务员姓名'); return }
    setStaff(prev => [...prev, { name: addForm.name.trim(), email: addForm.email.trim(), weight: addForm.weight, region }])
    setAddForm({ name: '', email: '', weight: 1 })
    setShowAddForm(null)
  }

  const removeStaff = (idx: number) => {
    setStaff(prev => prev.filter((_, i) => i !== idx))
  }

  // 按区域分组
  const grouped: Record<string, StaffItem[]> = {}
  REGIONS.forEach(r => { grouped[r] = [] })
  staff.forEach(s => { if (grouped[s.region]) grouped[s.region].push(s) })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-slate-800">业务员配置</h1>
            <p className="text-slate-400 text-xs mt-0.5">管理业务员信息和随机权重分配</p>
          </div>
        </div>
        <span className="text-sm text-slate-500">共 {staff.length} 人</span>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400 text-sm">加载中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {REGIONS.map(region => {
            const list = grouped[region]
            const regionWeight = list.reduce((sum, s) => sum + s.weight, 0)

            return (
              <div key={region} className={`bg-white rounded-2xl border-2 ${REGION_COLORS[region]} overflow-hidden`}>
                {/* 区域标题 */}
                <div className={`bg-gradient-to-r ${REGION_GRADIENTS[region]} px-5 py-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{region}</span>
                      <span className="text-white/70 text-xs">({list.length}人)</span>
                    </div>
                    <button
                      onClick={() => setShowAddForm(showAddForm === region ? null : region)}
                      className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-md text-white/90 text-xs hover:bg-white/30 transition-colors">
                      <Plus className="w-3 h-3" />
                      添加
                    </button>
                  </div>
                </div>

                {/* 添加表单 */}
                {showAddForm === region && (
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-2">
                    <input type="text" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="姓名"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') addStaff(region); if (e.key === 'Escape') setShowAddForm(null) }} />
                    <input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} placeholder="邮箱"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                    <div className="flex gap-2">
                      <input type="number" min={1} max={10} value={addForm.weight} onChange={e => setAddForm({ ...addForm, weight: Number(e.target.value) })} placeholder="权重"
                        className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                      <button onClick={() => addStaff(region)}
                        className="flex-1 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-violet-600 transition-all">
                        确认添加
                      </button>
                    </div>
                  </div>
                )}

                {/* 人员列表 */}
                <div className="divide-y divide-slate-50">
                  {list.map((s, idx) => {
                    const globalIdx = staff.indexOf(s)
                    return (
                      <div key={globalIdx} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors group">
                        {/* 头像 */}
                        <span className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-xs font-bold shrink-0 ${getAvatarColor(s.name)}`}>
                          {s.name[0]}
                        </span>
                        {/* 姓名 */}
                        <input type="text" value={s.name} onChange={e => updateStaffField(globalIdx, 'name', e.target.value)}
                          className="w-24 text-sm font-medium text-slate-800 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-400 focus:bg-white rounded px-2 py-1 transition-all outline-none" />
                        {/* 邮箱 */}
                        <input type="email" value={s.email} onChange={e => updateStaffField(globalIdx, 'email', e.target.value)}
                          className="flex-1 min-w-0 text-xs text-slate-400 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-400 focus:bg-white rounded px-2 py-1 transition-all outline-none truncate" />
                        {/* 权重 */}
                        <input type="number" min={1} max={10} value={s.weight} onChange={e => updateStaffField(globalIdx, 'weight', Number(e.target.value))}
                          className="w-14 text-xs text-center bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                        {/* 删除 */}
                        <button onClick={() => removeStaff(globalIdx)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                  {list.length === 0 && (
                    <div className="px-5 py-8 text-center text-sm text-slate-300">暂无人员</div>
                  )}
                </div>

                {/* 底部权重统计 */}
                {list.length > 0 && (
                  <div className="px-5 py-2 border-t border-slate-100 bg-slate-50/30">
                    <span className="text-[11px] text-slate-400">权重合计 {regionWeight}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all disabled:opacity-50 shadow-sm">
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
  const [loading, setLoading] = useState(false)

  // 排班配置
  const [baseDate, setBaseDate] = useState('2026-05-05')
  const [daysPerPerson, setDaysPerPerson] = useState(2)
  const [displayDays, setDisplayDays] = useState(14)
  const [staffOrder, setStaffOrder] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const loadSchedule = () => {
    setLoading(true)
    scheduleApi.getSchedule(displayDays).then(res => {
      setSchedule(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => {
    // 加载排班配置和分配规则，根据排班区域过滤staffOrder
    Promise.all([
      settingsApi.getStaffDuty(),
      settingsApi.getAssignRules(),
    ]).then(([staffRes, rulesRes]) => {
      if (staffRes.data.duty) {
        setBaseDate(staffRes.data.duty.base_date)
        setDaysPerPerson(staffRes.data.duty.days_per_person)
      }
      const regions = rulesRes.data.schedule_regions || []
      setScheduleRegions(regions)
      const allStaffList = staffRes.data.staff || []
      setAllStaff(allStaffList)

      // 根据排班区域过滤staff_order，只保留属于排班区域的人员
      const savedOrder = staffRes.data.duty?.staff_order || []
      if (regions.length > 0) {
        const regionStaffNames = new Set(
          allStaffList.filter((s: StaffItem) => regions.includes(s.region)).map((s: StaffItem) => s.name)
        )
        const filtered = savedOrder.filter((n: string) => regionStaffNames.has(n))
        setStaffOrder(filtered)
        setAvailableStaff([...regionStaffNames])
      } else {
        setStaffOrder(savedOrder)
        setAvailableStaff(allStaffList.map((s: StaffItem) => s.name))
      }
    }).catch(() => {})
    loadSchedule()
  }, [])

  const handleSaveDuty = async () => {
    setSaving(true)
    try {
      await settingsApi.updateStaffDuty({
        duty: {
          base_date: baseDate,
          staff_order: staffOrder,
          days_per_person: daysPerPerson,
        }
      })
      toast.success('排班配置已保存')
      loadSchedule() // 刷新排班表
    } catch { toast.error('保存失败') }
    finally { setSaving(false) }
  }

  const handleReorder = (newOrder: string[]) => {
    setStaffOrder(newOrder)
  }

  // 排班区域（从分配规则读取）
  const [scheduleRegions, setScheduleRegions] = useState<string[]>([])
  const [allStaff, setAllStaff] = useState<StaffItem[]>([])

  const [availableStaff, setAvailableStaff] = useState<string[]>([])
  // availableStaff 在上方初始化 useEffect 中已设置

  // 添加人员到排班顺序
  const addStaffToOrder = (name: string) => {
    if (!name || staffOrder.includes(name)) return
    setStaffOrder(prev => [...prev, name])
  }

  const removeFromOrder = (name: string) => {
    setStaffOrder(prev => prev.filter(n => n !== name))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-slate-800">排班表</h1>
          <p className="text-slate-400 text-xs mt-0.5">配置值班轮换规则和查看排班日历</p>
        </div>
      </div>

      {/* 排班配置 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">排班配置{scheduleRegions.length > 0 ? `（${scheduleRegions.join("、")}）` : ""}</h3>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">起始日期</label>
            <input type="date" value={baseDate} onChange={e => setBaseDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">每人值班天数</label>
            <input type="number" min={1} max={7} value={daysPerPerson} onChange={e => setDaysPerPerson(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">显示天数</label>
            <input type="number" min={7} max={90} value={displayDays} onChange={e => setDisplayDays(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
          </div>
        </div>

        {/* 值班人员顺序 */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">值班人员顺序</span>
              <span className="text-xs text-slate-400">（{staffOrder.length}人）</span>
            </div>
          </div>
          {staffOrder.length > 0 && (
            <p className="text-[11px] text-slate-400 mb-3 flex items-center gap-1">
              <GripVertical className="w-3 h-3" />
              拖拽卡片调整轮值顺序，当前轮值：{staffOrder.join(' → ')}
            </p>
          )}
          <DraggableStaffList names={staffOrder} onReorder={handleReorder} />
          {/* 添加人员 */}
          <div className="flex items-center gap-2 mt-3">
            <select onChange={e => { if (e.target.value) { addStaffToOrder(e.target.value); e.target.value = '' } }}
              defaultValue=""
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
              <option value="">+ 添加人员</option>
              {availableStaff.filter(n => !staffOrder.includes(n)).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleSaveDuty} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all disabled:opacity-50 shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存排班配置
          </button>
          <button onClick={loadSchedule} disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新排班表
          </button>
        </div>
      </div>

      {/* 排班表 */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-slate-700">{scheduleRegions.length > 0 ? `${scheduleRegions.join("、")}排班表` : "排班表"}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 w-40">日期</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 w-24">星期</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">值班人员</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {schedule.map(item => (
                <tr key={`${item.date}-${item.region}`} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-slate-700">{item.date}</td>
                  <td className="px-5 py-3 text-sm text-slate-400">周{item.weekday}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
                      <span className={`w-5 h-5 flex items-center justify-center rounded-full text-white text-[10px] font-bold ${getAvatarColor(item.staff_name)}`}>
                        {item.staff_name[0]}
                      </span>
                      {item.staff_name}
                    </span>
                  </td>
                </tr>
              ))}
              {schedule.length === 0 && !loading && (
                <tr><td colSpan={3} className="px-5 py-12 text-center text-sm text-slate-400">暂无排班数据，请先保存排班配置</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ========== 分配规则 ==========
function AssignRulesTab() {
  const [rules, setRules] = useState<AssignRules>({
    schedule_regions: [],
    continent_overrides: {},
  })
  const [countryStaff, setCountryStaff] = useState<CountryStaff[]>([])
  const [saving, setSaving] = useState(false)
  const [allRegions, setAllRegions] = useState<string[]>([])

  // 国家专属表单
  const [newCountry, setNewCountry] = useState('')
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffEmail, setNewStaffEmail] = useState('')

  // 地区归属表单
  const [newRegionName, setNewRegionName] = useState('')
  const [newRegionTarget, setNewRegionTarget] = useState('')

  // 地区归属展开编辑
  const [editingArea, setEditingArea] = useState<string | null>(null)
  const [newCountryForArea, setNewCountryForArea] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = () => {
    settingsApi.getAssignRules().then(res => {
      setRules({
        schedule_regions: res.data.schedule_regions || [],
        continent_overrides: res.data.continent_overrides || {},
      })
    }).catch(() => {})
    settingsApi.getCountryStaff().then(res => setCountryStaff(res.data)).catch(() => {})
    settingsApi.getStaffDuty().then(res => {
      const regions = [...new Set(res.data.staff.map((s: StaffItem) => s.region))]
      setAllRegions(regions)
    }).catch(() => {})
  }

  const handleSaveRules = async () => {
    setSaving(true)
    try {
      await settingsApi.updateAssignRules(rules)
      toast.success('分配规则已保存')
    } catch { toast.error('保存失败') }
    finally { setSaving(false) }
  }

  const toggleScheduleRegion = (region: string) => {
    setRules(prev => ({
      ...prev,
      schedule_regions: prev.schedule_regions.includes(region)
        ? prev.schedule_regions.filter(r => r !== region)
        : [...prev.schedule_regions, region],
    }))
  }

  // 地区归属管理（新格式：含国家列表）
  const addRegionMapping = () => {
    if (!newRegionName.trim() || !newRegionTarget) {
      toast.error('请填写地区名称和归属大区')
      return
    }
    setRules(prev => ({
      ...prev,
      continent_overrides: {
        ...prev.continent_overrides,
        [newRegionName.trim()]: { region: newRegionTarget, countries: [] },
      },
    }))
    setNewRegionName('')
    setNewRegionTarget('')
    toast.success(`已添加地区"${newRegionName.trim()}"`)
  }

  const removeRegionMapping = (name: string) => {
    setRules(prev => {
      const overrides = { ...prev.continent_overrides }
      delete overrides[name]
      return { ...prev, continent_overrides: overrides }
    })
    if (editingArea === name) setEditingArea(null)
  }

  // 修改地区归属的目标大区
  const updateAreaRegion = (areaName: string, newTarget: string) => {
    setRules(prev => ({
      ...prev,
      continent_overrides: {
        ...prev.continent_overrides,
        [areaName]: {
          ...(prev.continent_overrides[areaName] as any),
          region: newTarget,
        },
      },
    }))
  }

  // 为地区添加国家
  const addCountryToArea = (areaName: string) => {
    if (!newCountryForArea.trim()) return
    const current = rules.continent_overrides[areaName]
    if (!current) return
    const countries = [...((current as any).countries || []), newCountryForArea.trim()]
    setRules(prev => ({
      ...prev,
      continent_overrides: {
        ...prev.continent_overrides,
        [areaName]: { ...current, countries },
      },
    }))
    setNewCountryForArea('')
  }

  // 从地区移除国家
  const removeCountryFromArea = (areaName: string, country: string) => {
    const current = rules.continent_overrides[areaName]
    if (!current) return
    const countries = ((current as any).countries || []).filter((c: string) => c !== country)
    setRules(prev => ({
      ...prev,
      continent_overrides: {
        ...prev.continent_overrides,
        [areaName]: { ...current, countries },
      },
    }))
  }

  // 国家专属分配
  const handleAddCountryStaff = async () => {
    if (!newCountry.trim() || !newStaffName.trim()) {
      toast.error('国家和业务员名称不能为空')
      return
    }
    try {
      await settingsApi.addCountryStaff({ country: newCountry.trim(), staff_name: newStaffName.trim(), staff_email: newStaffEmail.trim() })
      toast.success('已添加')
      setNewCountry(''); setNewStaffName(''); setNewStaffEmail('')
      settingsApi.getCountryStaff().then(res => setCountryStaff(res.data))
    } catch { toast.error('添加失败') }
  }

  const handleDeleteCountryStaff = async (country: string) => {
    try {
      await settingsApi.deleteCountryStaff(country)
      toast.success('已删除')
      setCountryStaff(prev => prev.filter(cs => cs.country !== country))
    } catch { toast.error('删除失败') }
  }

  const overrides = rules.continent_overrides || {}

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-slate-800">分配规则</h1>
          <p className="text-slate-400 text-xs mt-0.5">配置业务员分配优先级和特殊规则</p>
        </div>
      </div>

      {/* 1. 排班区域 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-700 mb-1">排班区域</h3>
        <p className="text-xs text-slate-400 mb-4">勾选的大区将使用排班表分配业务员，未勾选的大区按权重随机分配</p>
        <div className="flex flex-wrap gap-3">
          {allRegions.map(region => (
            <label key={region}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer border transition-all ${
                rules.schedule_regions.includes(region)
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
              }`}>
              <input type="checkbox" checked={rules.schedule_regions.includes(region)} onChange={() => toggleScheduleRegion(region)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
              <span className="text-sm font-medium">{region}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 2. 地区归属设置（含国家列表管理） */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-700 mb-1">地区归属设置</h3>
        <p className="text-xs text-slate-400 mb-4">
          自定义特殊地区的归属大区和包含的国家。例如将"中东"归属为"欧非"，并列出沙特阿拉伯、阿联酋等国家。设置后，这些国家的大洲字段将显示为该地区名。
        </p>

        {/* 已有地区归属 */}
        {Object.keys(overrides).length > 0 && (
          <div className="mb-4 space-y-3">
            {Object.entries(overrides).map(([areaName, areaConfig]) => {
              const config = areaConfig as any
              const targetRegion = config?.region || ''
              const countries: string[] = config?.countries || []
              const isEditing = editingArea === areaName

              return (
                <div key={areaName} className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden group">
                  {/* 地区标题行 */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-sm font-semibold text-slate-700">{areaName}</span>
                    <span className="text-slate-300">&rarr;</span>
                    {/* 可编辑的目标大区 */}
                    <select value={targetRegion}
                      onChange={e => updateAreaRegion(areaName, e.target.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        REGION_COLORS[targetRegion] || 'bg-slate-100 text-slate-600 border-slate-200'
                      } focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400`}>
                      {allRegions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <div className="flex-1"></div>
                    <span className="text-[11px] text-slate-400">{countries.length} 个国家</span>
                    <button onClick={() => setEditingArea(isEditing ? null : areaName)}
                      className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'bg-indigo-50 text-indigo-500' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100 opacity-0 group-hover:opacity-100'}`}>
                      {isEditing ? <ChevronDown className="w-4 h-4" /> : <Edit2 className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => removeRegionMapping(areaName)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 展开的国家列表 */}
                  {isEditing && (
                    <div className="border-t border-slate-100 bg-white px-4 py-3">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">包含的国家</div>
                      {countries.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {countries.map((c, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium">
                              {c}
                              <button onClick={() => removeCountryFromArea(areaName, c)}
                                className="hover:text-red-500 transition-colors ml-0.5">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <input type="text" value={newCountryForArea}
                          onChange={e => setNewCountryForArea(e.target.value)}
                          placeholder="输入国家名称，如：也门"
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                          onKeyDown={e => { if (e.key === 'Enter') addCountryToArea(areaName) }} />
                        <button onClick={() => addCountryToArea(areaName)}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-lg hover:bg-indigo-100 transition-colors">
                          <Plus className="w-3 h-3" />
                          添加
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 非编辑模式下简要显示国家 */}
                  {!isEditing && countries.length > 0 && (
                    <div className="border-t border-slate-100 px-4 py-2">
                      <div className="flex flex-wrap gap-1.5">
                        {countries.slice(0, 8).map((c, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-white text-slate-500 rounded text-[11px] border border-slate-100">{c}</span>
                        ))}
                        {countries.length > 8 && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-[11px]">+{countries.length - 8}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 新增地区归属 */}
        <div className="flex items-end gap-3 pt-4 border-t border-slate-100">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">地区名称</label>
            <input type="text" value={newRegionName} onChange={e => setNewRegionName(e.target.value)} placeholder="如：中东、北非"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              onKeyDown={e => { if (e.key === 'Enter') addRegionMapping() }} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">归属大区</label>
            <select value={newRegionTarget} onChange={e => setNewRegionTarget(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
              <option value="">选择大区...</option>
              {allRegions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button onClick={addRegionMapping}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-xl hover:bg-indigo-100 transition-colors">
            <Plus className="w-4 h-4" />
            添加地区
          </button>
        </div>
      </div>

      {/* 3. 国家专属分配 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-700 mb-1">国家专属分配</h3>
        <p className="text-xs text-slate-400 mb-4">某些国家的询盘固定分配给指定业务员（优先级最高）</p>

        {countryStaff.length > 0 && (
          <div className="mb-4 space-y-2">
            {countryStaff.map(cs => (
              <div key={cs.country} className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 group">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm font-medium text-slate-700">{cs.country}</span>
                <span className="text-slate-300">&rarr;</span>
                <span className="text-sm text-indigo-600 font-medium">{cs.staff_name}</span>
                {cs.staff_email && <span className="text-xs text-slate-400">({cs.staff_email})</span>}
                <div className="flex-1"></div>
                <button onClick={() => handleDeleteCountryStaff(cs.country)}
                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-3 pt-4 border-t border-slate-100">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">国家</label>
            <input type="text" value={newCountry} onChange={e => setNewCountry(e.target.value)} placeholder="如：巴西"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">业务员</label>
            <input type="text" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} placeholder="如：Rainbow"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">邮箱（可选）</label>
            <input type="text" value={newStaffEmail} onChange={e => setNewStaffEmail(e.target.value)} placeholder="业务员邮箱"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <button onClick={handleAddCountryStaff}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-xl hover:bg-indigo-100 transition-colors">
            <Plus className="w-4 h-4" />
            添加
          </button>
        </div>
      </div>

      {/* 保存 */}
      <div className="flex justify-end">
        <button onClick={handleSaveRules} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all disabled:opacity-50 shadow-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          保存分配规则
        </button>
      </div>
    </div>
  )
}

// ========== 字典管理 ==========
function DictTab() {
  const [categories, setCategories] = useState<string[]>([])
  const [itemsMap, setItemsMap] = useState<Record<string, DictItem[]>>({})
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 字典项表单 Modal
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItem, setEditingItem] = useState<DictItem | null>(null)
  const [itemForm, setItemForm] = useState({ name: '', sort_order: 0 })

  // 新增分类 Modal
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryCode, setNewCategoryCode] = useState('')

  // 字典分类标签中文映射
  const CATEGORY_LABELS: Record<string, string> = {
    continent: '大洲',
    region: '大区',
    product_category: '产品需求类型',
    channel: '渠道',
  }

  // 分类对应图标
  function getCategoryIcon(code: string) {
    switch (code) {
      case 'continent':
        return <Globe className="w-4 h-4" />
      case 'region':
        return <MapPin className="w-4 h-4" />
      case 'product_category':
        return <Database className="w-4 h-4" />
      case 'channel':
        return <Mail className="w-4 h-4" />
      default:
        return <BookOpen className="w-4 h-4" />
    }
  }

  const getCategoryLabel = (cat: string) => CATEGORY_LABELS[cat] || cat

  const fetchCategories = useCallback(() => {
    setLoading(true)
    settingsApi.getDictCategories().then(res => {
      const cats = res.data as string[]
      setCategories(cats)
      cats.forEach(c => fetchItems(c))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const fetchItems = (category: string) => {
    settingsApi.getDictItems(category).then(res => {
      setItemsMap(prev => ({ ...prev, [category]: res.data }))
    })
  }

  useEffect(() => { fetchCategories() }, [fetchCategories])

  // 新增字典分类
  const handleCreateCategory = async () => {
    if (!newCategoryCode.trim() || !newCategoryName.trim()) {
      toast.error('分类编码和名称不能为空')
      return
    }
    if (categories.includes(newCategoryCode.trim())) {
      toast.error('该分类编码已存在')
      return
    }
    try {
      // 通过添加一个种子项来创建新分类
      await settingsApi.addDictItem({
        category: newCategoryCode.trim(),
        name: newCategoryName.trim(),
        sort_order: 0,
      })
      toast.success('分类创建成功')
      setShowCategoryForm(false)
      setNewCategoryCode('')
      setNewCategoryName('')
      fetchCategories()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || '创建失败')
    }
  }

  // 删除字典分类（删除该分类下所有项）
  const handleDeleteCategory = async (cat: string) => {
    const items = itemsMap[cat] || []
    if (items.length === 0) {
      // 空分类无法直接删除（dict表无独立分类表），提示用户
      toast.error('该分类下无字典项，无法删除空分类')
      return
    }
    if (!confirm(`确定删除分类"${getCategoryLabel(cat)}"及其所有 ${items.length} 个字典项？`)) return
    try {
      for (const item of items) {
        await settingsApi.deleteDictItem(item.id)
      }
      toast.success('分类已删除')
      if (expandedCategory === cat) setExpandedCategory(null)
      fetchCategories()
    } catch { toast.error('删除失败') }
  }

  // 字典项操作
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expandedCategory) return
    if (!itemForm.name.trim()) { toast.error('名称不能为空'); return }
    try {
      await settingsApi.addDictItem({ category: expandedCategory, name: itemForm.name.trim(), sort_order: itemForm.sort_order })
      toast.success('已添加')
      setShowItemForm(false); setItemForm({ name: '', sort_order: 0 })
      fetchItems(expandedCategory)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || '添加失败')
    }
  }

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    if (!itemForm.name.trim()) return
    try {
      await settingsApi.updateDictItem(editingItem.id, { name: itemForm.name.trim(), sort_order: itemForm.sort_order })
      toast.success('已更新')
      setShowItemForm(false); setEditingItem(null); setItemForm({ name: '', sort_order: 0 })
      if (expandedCategory) fetchItems(expandedCategory)
    } catch { toast.error('更新失败') }
  }

  const handleEditItem = (item: DictItem) => {
    setEditingItem(item)
    setItemForm({ name: item.name, sort_order: item.sort_order })
    setShowItemForm(true)
  }

  const handleDeleteItem = async (id: number) => {
    if (!confirm('确定删除该字典项？')) return
    try {
      await settingsApi.deleteDictItem(id)
      toast.success('已删除')
      if (expandedCategory) fetchItems(expandedCategory)
    } catch { toast.error('删除失败') }
  }

  const toggleExpand = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category)
    setShowItemForm(false)
    setEditingItem(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-slate-800">字典管理</h1>
            <p className="text-slate-400 text-xs mt-0.5">管理系统字典数据，用于询盘字段的下拉选项配置</p>
          </div>
        </div>
        <button onClick={() => setShowCategoryForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100">
          <FolderPlus className="w-4 h-4" />
          新增分类
        </button>
      </div>

      {/* 新增分类 Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-500">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <h3 className="font-display font-semibold text-lg text-slate-800">新增字典分类</h3>
              </div>
              <button onClick={() => setShowCategoryForm(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  分类编码 <span className="text-red-400">*</span>
                </label>
                <input type="text" value={newCategoryCode} onChange={e => setNewCategoryCode(e.target.value)}
                  placeholder="如：info_source（英文，用于API标识）" autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-300 font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  显示名称 <span className="text-red-400">*</span>
                </label>
                <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="如：信息来源（中文，用于界面显示）"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-300" />
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowCategoryForm(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium">
                  取消
                </button>
                <button onClick={handleCreateCategory}
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl text-sm hover:from-indigo-600 hover:to-violet-600 transition-all font-medium shadow-sm">
                  创建分类
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 字典项表单 Modal */}
      {showItemForm && expandedCategory && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${editingItem ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                  {editingItem ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <h3 className="font-display font-semibold text-lg text-slate-800">
                  {editingItem ? '编辑字典项' : '新增字典项'}
                </h3>
                <span className="text-xs text-slate-400 ml-1">
                  ({getCategoryLabel(expandedCategory)})
                </span>
              </div>
              <button onClick={() => { setShowItemForm(false); setEditingItem(null) }}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={editingItem ? handleUpdateItem : handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  显示名称 <span className="text-red-400">*</span>
                </label>
                <input type="text" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="如：4线设备、中东、亚太"
                  required autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">排序</label>
                <input type="number" value={itemForm.sort_order} onChange={e => setItemForm({ ...itemForm, sort_order: Number(e.target.value) })}
                  min={0}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => { setShowItemForm(false); setEditingItem(null) }}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium">
                  取消
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl text-sm hover:from-indigo-600 hover:to-violet-600 transition-all font-medium shadow-sm">
                  {editingItem ? '保存修改' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 字典分类卡片列表 */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400 text-sm">加载中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {categories.map(catCode => {
            const isExpanded = expandedCategory === catCode
            const items = itemsMap[catCode] || []

            return (
              <div key={catCode}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'border-indigo-200 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-100'
                    : 'border-slate-100 hover:border-slate-200 hover:shadow-sm'
                }`}>
                {/* 分类标题 */}
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer select-none transition-colors"
                  onClick={() => toggleExpand(catCode)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isExpanded
                        ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {getCategoryIcon(catCode)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">{getCategoryLabel(catCode)}</span>
                        <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[10px] rounded-md font-mono tracking-wide">{catCode}</span>
                      </div>
                      <span className="text-xs text-slate-400">{items.length} 项</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(catCode) }}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                      title="删除分类">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isExpanded ? 'bg-indigo-50 text-indigo-500 rotate-180' : 'text-slate-300'
                    }`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* 展开的字典项 */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between px-5 py-3">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">字典项列表</span>
                      <button
                        onClick={() => { setShowItemForm(true); setEditingItem(null); setItemForm({ name: '', sort_order: items.length + 1 }) }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-indigo-600 text-xs font-medium rounded-lg hover:bg-indigo-50 transition-colors border border-indigo-100 shadow-sm">
                        <Plus className="w-3 h-3" />
                        添加
                      </button>
                    </div>

                    {items.length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <p className="text-sm text-slate-400">暂无字典项</p>
                      </div>
                    ) : (
                      <div className="px-5 pb-4">
                        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                          {items.map((item, idx) => (
                            <div key={item.id}
                              className={`flex items-center justify-between px-4 py-3 transition-colors group ${
                                idx < items.length - 1 ? 'border-b border-slate-50' : ''
                              } hover:bg-slate-50/50`}>
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-[11px] font-semibold text-slate-400 shrink-0">
                                  {item.sort_order || idx + 1}
                                </span>
                                <span className="text-sm font-medium text-slate-700 truncate">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <button onClick={() => handleEditItem(item)}
                                  className="p-1.5 rounded-lg hover:bg-indigo-50 transition-colors text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
