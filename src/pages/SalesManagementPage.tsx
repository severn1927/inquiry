import { useEffect, useState, useCallback } from 'react'
import { salesApi } from '@/services/api'
import type { SalesPerson, ScheduleRule, ScheduleDate } from '@/types'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, horizontalListSortingStrategy, useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Users, UserPlus, Trash2, Edit2, X, Calendar, CalendarClock,
  ChevronLeft, ChevronRight, RefreshCw, Sliders, Mail, MapPin, Weight,
  Database, GripVertical, ToggleLeft, ToggleRight, Check, Loader2, AlertCircle,
} from 'lucide-react'

const REGIONS = ['美洲', '欧非', '亚太']
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const REGION_COLORS: Record<string, string> = {
  '美洲': 'bg-blue-50 text-blue-600 border-blue-200',
  '欧非': 'bg-purple-50 text-purple-600 border-purple-200',
  '亚太': 'bg-amber-50 text-amber-600 border-amber-200',
}
const REGION_GRADIENTS: Record<string, string> = {
  '美洲': 'from-blue-500 to-cyan-500',
  '欧非': 'from-purple-500 to-pink-500',
  '亚太': 'from-amber-500 to-orange-500',
}

// ==========================================
// 可拖拽的排班规则卡片
// ==========================================
function SortableRuleCard({ rule, index }: { rule: ScheduleRule; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id })

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
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border-2 transition-all cursor-default select-none
        ${isDragging ? 'border-primary-400 bg-primary-50 shadow-lg shadow-primary-200 scale-105' :
          rule.is_active ? `${REGION_COLORS[rule.region]} hover:shadow-md` :
          'bg-slate-50 text-slate-400 border-slate-200'}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex flex-col items-center justify-center gap-0.5 cursor-grab active:cursor-grabbing px-0.5 py-1 rounded-md hover:bg-black/5 transition-colors"
        title="拖拽调整轮值顺序"
      >
        <GripVertical className="w-4 h-4 text-amber-400/70" />
      </div>

      {/* Order number */}
      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-400/20 text-amber-700 text-xs font-bold">
        {index + 1}
      </span>

      {/* Name */}
      <span className="text-sm font-semibold">{rule.sales_person_name}</span>

      {/* Days per turn */}
      <span className="text-[10px] text-amber-500/80 font-medium">{rule.days_per_turn}天/轮</span>

      {!rule.is_active && <span className="text-[10px] text-red-400 ml-1">已禁用</span>}
    </div>
  )
}

// ==========================================
// 排班规则拖拽容器
// ==========================================
function DraggableRuleList({
  rules,
  onReorder,
}: {
  rules: ScheduleRule[]
  onReorder: (rules: ScheduleRule[]) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = rules.findIndex(r => r.id === active.id)
    const newIndex = rules.findIndex(r => r.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newRules = arrayMove(rules, oldIndex, newIndex)
    // 更新 sort_order
    const updated = newRules.map((r, i) => ({ ...r, sort_order: i + 1 }))
    onReorder(updated)
  }

  if (rules.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-slate-400">
        <AlertCircle className="w-4 h-4 mr-2" />
        暂无排班规则
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={rules.map(r => r.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div className="flex flex-wrap gap-3">
          {rules.map((rule, idx) => (
            <SortableRuleCard key={rule.id} rule={rule} index={idx} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

// ==========================================
// 主页面
// ==========================================
export function SalesManagementPage() {
  const [activeTab, setActiveTab] = useState<'persons' | 'schedule'>('persons')
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-slate-800">业务员管理</h1>
          <p className="text-slate-400 text-xs mt-0.5">管理业务员信息、随机权重分配和排班轮值</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('persons')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'persons' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          业务员列表
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'schedule' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          排班管理
        </button>
      </div>

      {activeTab === 'persons' ? <PersonsTab /> : <ScheduleTab />}
    </div>
  )
}

// ==========================================
// 业务员列表 Tab
// ==========================================
function PersonsTab() {
  const [persons, setPersons] = useState<SalesPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SalesPerson | null>(null)
  const [form, setForm] = useState({ name: '', name_en: '', email: '', region: '美洲', weight: 1.0, sort_order: 0 })
  const [filterRegion, setFilterRegion] = useState<string>('')

  const fetchPersons = useCallback(() => {
    setLoading(true)
    salesApi.getPersons(filterRegion || undefined).then(res => {
      setPersons(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [filterRegion])

  useEffect(() => { fetchPersons() }, [fetchPersons])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      await salesApi.updatePerson(editing.id, form)
    } else {
      await salesApi.createPerson(form)
    }
    setShowForm(false); setEditing(null)
    setForm({ name: '', name_en: '', email: '', region: '美洲', weight: 1.0, sort_order: 0 })
    fetchPersons()
  }

  const handleEdit = (p: SalesPerson) => {
    setEditing(p)
    setForm({ name: p.name, name_en: p.name_en, email: p.email, region: p.region, weight: p.weight, sort_order: p.sort_order })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该业务员？')) return
    await salesApi.deletePerson(id)
    fetchPersons()
  }

  const handleInit = async () => {
    await salesApi.initPersons()
    fetchPersons()
  }

  const grouped = REGIONS.reduce<Record<string, SalesPerson[]>>((acc, r) => { acc[r] = []; return acc }, {})
  persons.forEach(p => { if (grouped[p.region]) grouped[p.region].push(p) })

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setFilterRegion('')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!filterRegion ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >全部</button>
            {REGIONS.map(r => (
              <button key={r} onClick={() => setFilterRegion(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterRegion === r ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >{r}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {persons.length === 0 && (
            <button onClick={handleInit} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm">
              <Database className="w-3.5 h-3.5" />初始化默认数据
            </button>
          )}
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', name_en: '', email: '', region: '美洲', weight: 1.0, sort_order: 0 }) }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-xs font-medium rounded-xl hover:from-primary-600 hover:to-accent-600 transition-all shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />添加业务员
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-semibold text-lg text-slate-800">{editing ? '编辑业务员' : '新增业务员'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">中文姓名 <span className="text-red-400">*</span></label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="罗佳凤"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all placeholder:text-slate-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">英文名</label>
                  <input type="text" value={form.name_en} onChange={e => setForm({...form, name_en: e.target.value})} placeholder="Poppy"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all placeholder:text-slate-300" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">邮箱</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="sales13@seeworld.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all placeholder:text-slate-300" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">分管区域 <span className="text-red-400">*</span></label>
                  <select value={form.region} onChange={e => setForm({...form, region: e.target.value})} required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all">
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">分配权重</label>
                  <input type="number" step="0.1" min="0.1" value={form.weight} onChange={e => setForm({...form, weight: parseFloat(e.target.value) || 1})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">排序</label>
                  <input type="number" min="0" value={form.sort_order} onChange={e => setForm({...form, sort_order: parseInt(e.target.value) || 0})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all" />
                </div>
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium">取消</button>
                <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm hover:from-primary-600 hover:to-accent-600 transition-all font-medium shadow-sm">
                  {editing ? '保存修改' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cards by region */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400 text-sm">加载中...</p>
        </div>
      ) : persons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium mb-1">暂无业务员数据</p>
          <p className="text-slate-400 text-sm mb-4">点击初始化按钮导入默认业务员信息</p>
          <button onClick={handleInit} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium rounded-xl hover:from-primary-600 hover:to-accent-600 transition-all shadow-md shadow-primary-500/20">
            <Database className="w-4 h-4" />初始化默认业务员数据
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {REGIONS.map(region => {
            const list = grouped[region] || []
            if (filterRegion && filterRegion !== region) return null
            const regionWeight = list.reduce((s, p) => s + p.weight, 0).toFixed(1)
            return (
              <div key={region} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className={`px-5 py-4 bg-gradient-to-r ${REGION_GRADIENTS[region]} text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="font-semibold text-sm">{region}</span>
                      <span className="text-white/70 text-xs">({list.length}人)</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-md text-[10px]">
                      <Weight className="w-3 h-3" />
                      权重合计 {regionWeight}
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-slate-50">
                  {list.map(p => (
                    <div key={p.id} className={`flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors group ${!p.is_active ? 'opacity-40' : ''}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">{p.name}</span>
                          <span className="text-xs text-slate-400">{p.name_en}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Mail className="w-3 h-3" />
                            {p.email}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${REGION_COLORS[region]}`}>x{p.weight}</span>
                        <button onClick={() => handleEdit(p)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-300 hover:text-primary-500 opacity-0 group-hover:opacity-100">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-1 rounded-lg hover:bg-red-50 transition-colors text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && <div className="px-5 py-8 text-center text-sm text-slate-300">暂无人员</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

// ==========================================
// 排班管理 Tab
// ==========================================
function ScheduleTab() {
  const [selectedRegion, setSelectedRegion] = useState('亚太')
  const [rules, setRules] = useState<ScheduleRule[]>([])
  const [dates, setDates] = useState<ScheduleDate[]>([])
  const [loading, setLoading] = useState(true)
  const [savingOrder, setSavingOrder] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [orderChanged, setOrderChanged] = useState(false)

  // 生成排班参数
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 90)
    return d.toISOString().split('T')[0]
  })
  const [daysPerTurn, setDaysPerTurn] = useState(2)

  // 日历视图月份
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([
      salesApi.getScheduleRules(selectedRegion),
      salesApi.getScheduleDates(selectedRegion),
    ]).then(([rulesRes, datesRes]) => {
      setRules(rulesRes.data)
      setDates(datesRes.data)
      setLoading(false)
      setOrderChanged(false)
    }).catch(() => setLoading(false))
  }, [selectedRegion])

  useEffect(() => { fetchData() }, [fetchData])

  // 拖拽调整排班顺序后保存
  const handleReorder = async (newRules: ScheduleRule[]) => {
    setRules(newRules)
    setOrderChanged(true)
    setSavingOrder(true)
    try {
      // 逐个更新 sort_order
      for (let i = 0; i < newRules.length; i++) {
        await salesApi.updateScheduleRule(newRules[i].id, { sort_order: i + 1 })
      }
    } catch {
      // 回退
      fetchData()
    } finally {
      setSavingOrder(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await salesApi.generateSchedule({
        region: selectedRegion,
        start_date: startDate,
        end_date: endDate,
        days_per_turn: daysPerTurn,
      })
      fetchData()
    } catch {
      // ignore
    } finally {
      setGenerating(false)
    }
  }

  const handleClear = async () => {
    if (!confirm(`确定清空 ${selectedRegion} 区域的所有排班数据？`)) return
    await salesApi.clearScheduleDates(selectedRegion)
    fetchData()
  }

  // 日历视图计算
  const [year, month] = viewMonth.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < startDow; i++) calendarDays.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) calendarDays.push(d)

  const getScheduleForDay = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return dates.find(d => d.schedule_date === dateStr)
  }

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1)
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const nextMonth = () => {
    const d = new Date(year, month, 1)
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const personOptions = rules.filter(r => r.is_active).map(r => ({
    id: r.sales_person_id,
    name: r.sales_person_name,
  }))

  // 轮值顺序预览文字
  const orderPreview = rules.filter(r => r.is_active).map(r => r.sales_person_name).join(' → ')

  return (
    <>
      {/* Region selector + Controls */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {REGIONS.map(r => (
              <button key={r} onClick={() => setSelectedRegion(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${selectedRegion === r ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {r}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-200"></div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">起始：</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
            <span className="text-xs text-slate-500">截止：</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
            <span className="text-xs text-slate-500">每轮：</span>
            <input type="number" min="1" max="7" value={daysPerTurn} onChange={e => setDaysPerTurn(parseInt(e.target.value) || 2)}
              className="w-16 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
            <span className="text-xs text-slate-500">天</span>
          </div>

          <div className="flex-1"></div>

          <div className="flex items-center gap-2">
            <button onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-500 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 className="w-3 h-3" />清空排班
            </button>
            <button onClick={handleGenerate} disabled={generating}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-xs font-medium rounded-lg hover:from-primary-600 hover:to-accent-600 transition-all shadow-sm disabled:opacity-50">
              {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {generating ? '生成中...' : '生成排班'}
            </button>
          </div>
        </div>
      </div>

      {/* Schedule rules - 拖拽排序 */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">{selectedRegion} - 轮值顺序</span>
              <span className="text-xs text-slate-400">({rules.length}人)</span>
            </div>
            <div className="flex items-center gap-2">
              {savingOrder && (
                <span className="flex items-center gap-1 text-xs text-primary-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  保存中...
                </span>
              )}
              {orderChanged && !savingOrder && (
                <span className="flex items-center gap-1 text-xs text-amber-500">
                  <Check className="w-3 h-3" />
                  顺序已更新，点击「生成排班」应用
                </span>
              )}
            </div>
          </div>
          {rules.length > 0 && (
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <GripVertical className="w-3 h-3" />
              拖拽卡片调整轮值顺序，当前轮值：{orderPreview}
            </p>
          )}
        </div>
        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <DraggableRuleList rules={rules} onReorder={handleReorder} />
          )}
        </div>
      </div>

      {/* Calendar view */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-semibold text-slate-700">排班日历</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${REGION_COLORS[selectedRegion]}`}>{selectedRegion}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input type="month" value={viewMonth} onChange={e => setViewMonth(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-xl overflow-hidden">
            {WEEKDAYS.map(wd => (
              <div key={wd} className={`py-2.5 text-center text-xs font-semibold text-slate-500 bg-slate-50 ${(wd === '周六' || wd === '周日') ? 'bg-amber-50 text-amber-500' : ''}`}>
                {wd}
              </div>
            ))}
            {calendarDays.map((day, idx) => {
              const schedule = day ? getScheduleForDay(day) : null
              const isWeekend = day && (() => {
                const d = new Date(year, month - 1, day)
                return d.getDay() === 0 || d.getDay() === 6
              })()
              const isToday = day && (() => {
                const today = new Date()
                return day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()
              })()

              return (
                <div key={idx} className={`min-h-[72px] p-1.5 transition-colors ${!day ? 'bg-white' : isToday ? 'bg-primary-50/50' : 'bg-white'} ${(isWeekend && day) ? 'bg-amber-50/30' : ''}`}>
                  {day && (
                    <>
                      <div className={`text-[11px] font-medium mb-1 ${isToday ? 'text-primary-600 font-bold' : isWeekend ? 'text-amber-500' : 'text-slate-500'}`}>
                        {day}
                      </div>
                      {schedule && (
                        <select
                          value={schedule.sales_person_id}
                          onChange={e => {
                            const name = e.target.options[e.target.selectedIndex].text
                            salesApi.updateScheduleDate(schedule.id, parseInt(e.target.value), name).then(() => fetchData())
                          }}
                          className={`w-full text-[10px] font-medium px-1 py-0.5 rounded border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-300 ${
                            schedule.is_manual ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {personOptions.map(po => (
                            <option key={po.id} value={po.id}>{po.name}</option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-primary-200"></span>今天</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-200"></span>周末</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-200"></span>自动排班</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-200"></span>手动调整</span>
          </div>
        </div>
      </div>
    </>
  )
}
