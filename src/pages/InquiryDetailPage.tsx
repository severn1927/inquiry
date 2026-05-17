import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { inquiryApi, dictApi, salesApi } from '@/services/api'
import type { Inquiry, DictOption, SalesPerson, ScheduleDate } from '@/types'
import { formatDate, getIStatusLabel, getIStatusBadgeClass } from '@/utils'
import { ArrowLeft, Star, Mail, Globe, Phone, ChevronDown, UserCheck, Loader2, Zap } from 'lucide-react'

// ===== 大洲 → 大区映射（固定规则，与 NewInquiryPage 一致） =====
const CONTINENT_TO_REGION: Record<string, string> = {
  '亚洲': '亚太',
  '大洋洲': '亚太',
  '非洲': '欧非',
  '欧洲': '欧非',
  '中东': '欧非',
  '北美': '美洲',
  '中南美': '美洲',
}

const REGIONS = ['美洲', '欧非', '亚太']

// ===== 权重随机分配（美洲/欧非） =====
function weightedRandom(persons: SalesPerson[]): SalesPerson | null {
  if (persons.length === 0) return null
  if (persons.length === 1) return persons[0]
  const totalWeight = persons.reduce((sum, p) => sum + p.weight, 0)
  let random = Math.random() * totalWeight
  for (const p of persons) {
    random -= p.weight
    if (random <= 0) return p
  }
  return persons[persons.length - 1]
}

// ===== 排班查表分配（亚太） - 用 person_id 匹配 =====
function getSchedulePersonId(
  scheduleDates: ScheduleDate[],
  dateStr: string
): number | null {
  const match = scheduleDates.find(d => d.schedule_date === dateStr)
  return match ? match.sales_person_id : null
}

// ===== 核心分配函数（纯前端，零 API 调用） =====
function assignPerson(
  region: string,
  regionPersons: SalesPerson[],
  scheduleDates: ScheduleDate[]
): { person: SalesPerson | null; mode: string } {
  if (regionPersons.length === 0) return { person: null, mode: 'none' }
  if (regionPersons.length === 1) return { person: regionPersons[0], mode: 'only_one' }

  if (region === '亚太') {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const scheduledId = getSchedulePersonId(scheduleDates, todayStr)
    if (scheduledId) {
      const person = regionPersons.find(p => p.id === scheduledId)
      if (person) return { person, mode: 'schedule' }
    }
    return { person: weightedRandom(regionPersons), mode: 'random_fallback' }
  }

  return { person: weightedRandom(regionPersons), mode: 'random' }
}

export function InquiryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [inquiry, setInquiry] = useState<Inquiry | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [dictOptions, setDictOptions] = useState<Record<string, DictOption[]>>({})
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([])
  const [scheduleDates, setScheduleDates] = useState<ScheduleDate[]>([])

  useEffect(() => {
    if (!id) return
    Promise.all([
      inquiryApi.getById(Number(id)),
      ...['channel', 'continent', 'product_category', 'i_status', 'is_use'].map(code => dictApi.getOptions(code)),
      salesApi.getPersons(),
      salesApi.getScheduleDates('亚太'),
    ]).then(([inqRes, ...restResults]) => {
      setInquiry(inqRes.data)
      setLoading(false)

      const opts: Record<string, DictOption[]> = {}
      const codes = ['channel', 'continent', 'product_category', 'i_status', 'is_use']
      restResults.forEach((res: any, i: number) => {
        if (i < codes.length) {
          opts[codes[i]] = res.data
        }
      })
      setDictOptions(opts)
      setSalesPersons(restResults[5].data as SalesPerson[])
      setScheduleDates(restResults[6].data as ScheduleDate[])
    }).catch(() => {
      setLoading(false)
    })
  }, [id])

  // 按大区分组的业务员（用于下拉选项）
  const groupedPersons: Record<string, SalesPerson[]> = {}
  REGIONS.forEach(r => {
    const persons = salesPersons.filter(p => p.region === r && p.is_active)
    if (persons.length > 0) groupedPersons[r] = persons
  })

  const handleUpdate = async (field: string, value: string | boolean | number | null) => {
    if (!inquiry) return
    setSaving(true)
    try {
      const res = await inquiryApi.update(inquiry.id, { [field]: value })
      setInquiry(res.data)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  // ===== 纯本地分配（零 API 调用） =====
  const doLocalAssign = (region: string): SalesPerson | null => {
    const persons = salesPersons.filter(p => p.region === region && p.is_active)
    const result = assignPerson(region, persons, scheduleDates)
    return result.person
  }

  // 大洲变更 → 自动映射大区 → 本地分配业务员
  const handleContinentChange = async (value: string) => {
    if (!inquiry) return
    const updated = { ...inquiry, continent: value }
    setInquiry(updated)
    await inquiryApi.update(inquiry.id, { continent: value })

    if (value && CONTINENT_TO_REGION[value]) {
      const region = CONTINENT_TO_REGION[value]
      const person = doLocalAssign(region)
      if (person) {
        setInquiry({ ...updated, region, sales_person: person.name_en })
        await inquiryApi.update(inquiry.id, { region, sales_person: person.name_en })
      } else {
        setInquiry({ ...updated, region })
        await inquiryApi.update(inquiry.id, { region })
      }
    }
  }

  // 大区手动变更 → 本地分配
  const handleRegionChange = async (value: string) => {
    if (!inquiry) return
    if (value) {
      const person = doLocalAssign(value)
      if (person) {
        setInquiry({ ...inquiry, region: value, sales_person: person.name_en })
        await inquiryApi.update(inquiry.id, { region: value, sales_person: person.name_en })
      } else {
        setInquiry({ ...inquiry, region: value })
        await inquiryApi.update(inquiry.id, { region: value })
      }
    } else {
      setInquiry({ ...inquiry, region: value })
      await inquiryApi.update(inquiry.id, { region: value })
    }
  }

  // 手动重新分配按钮
  const handleReAssign = async () => {
    if (!inquiry || !inquiry.region) return
    setAssigning(true)
    setTimeout(async () => {
      const person = doLocalAssign(inquiry.region)
      if (person) {
        setInquiry({ ...inquiry, sales_person: person.name_en })
        await inquiryApi.update(inquiry.id, { sales_person: person.name_en })
      }
      setAssigning(false)
    }, 300)
  }

  // i_status 徽章样式
  const getIStatusBadgeClass = (value: string) => {
    const map: Record<string, string> = {
      '建立联系': 'bg-blue-50 text-blue-700 border-blue-200',
      '待沟通': 'bg-amber-50 text-amber-700 border-amber-200',
      '放弃': 'bg-slate-100 text-slate-500 border-slate-200',
      '成交(含寄样）': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }
    return map[value] || 'bg-slate-50 text-slate-600 border-slate-200'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!inquiry) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Inquiry not found</p>
        <Link to="/inquiries" className="text-primary-500 text-sm mt-2 inline-block">Back to list</Link>
      </div>
    )
  }

  // 渲染字典下拉
  const renderDictSelect = (code: string, field: keyof Inquiry, label: string, placeholder: string, onChange?: (val: string) => void) => {
    const options = dictOptions[code] || []
    const currentValue = inquiry[field] as string
    const isInDict = options.some(o => o.value === currentValue)
    return (
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
        <div className="relative">
          <select
            value={isInDict ? currentValue : '__custom__'}
            onChange={(e) => {
              const val = e.target.value
              if (val === '__custom__') return
              setInquiry({ ...inquiry, [field]: val })
              if (onChange) onChange(val)
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 appearance-none pr-8"
          >
            <option value="">{placeholder}</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            {!isInDict && currentValue && <option value="__custom__" className="text-primary-600">保留: {currentValue}</option>}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/inquiries')} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-slate-800">{inquiry.inquiry_no}</h1>
              <span className={`badge ${getIStatusBadgeClass(inquiry.i_status)}`}>
                {getIStatusLabel(inquiry.i_status)}
              </span>

              {inquiry.is_star && (
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              )}
              {inquiry.is_use === 1 && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">有效</span>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-1">Created at {formatDate(inquiry.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg text-slate-800">询盘详情</h2>
            {inquiry.region && inquiry.continent && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-primary-50 text-primary-700 rounded-full border border-primary-200">
                <Zap className="w-3 h-3" />
                {inquiry.continent} → {inquiry.region}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {/* === 归属区域 === */}
            <div className="col-span-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                <Zap className="w-3 h-3" /> 归属区域
              </div>
            </div>
            {renderDictSelect('continent', 'continent', '大洲', '请选择大洲', (val) => handleContinentChange(val))}

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                大区
                {inquiry.continent && CONTINENT_TO_REGION[inquiry.continent] && (
                  <span className="ml-1.5 text-primary-500 font-normal">(自动)</span>
                )}
              </label>
              <div className="relative">
                <select
                  value={inquiry.region}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 appearance-none pr-8"
                >
                  <option value="">请选择大区</option>
                  {REGIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">业务员</label>
              <div className="flex gap-1.5">
                <div className="relative flex-1 min-w-0">
                  <select
                    value={inquiry.sales_person}
                    onChange={(e) => {
                      const val = e.target.value
                      setInquiry({ ...inquiry, sales_person: val })
                      handleUpdate('sales_person', val)
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 appearance-none pr-8"
                  >
                    <option value="">{inquiry.region ? '请选择业务员' : '请先选择大洲/大区'}</option>
                    {Object.entries(groupedPersons).map(([region, persons]) => (
                      <optgroup key={region} label={region}>
                        {persons.map(p => (
                          <option key={p.id} value={p.name_en}>
                            {p.name} ({p.name_en}) - {p.email}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={handleReAssign}
                  disabled={assigning || !inquiry.region}
                  title="重新随机分配"
                  className="shrink-0 px-2.5 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg hover:from-violet-600 hover:to-purple-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* === 客户信息 === */}
            <div className="col-span-2 mt-1">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100">客户信息</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">客户名字</label>
              <input type="text" value={inquiry.customer_name} onChange={(e) => setInquiry({ ...inquiry, customer_name: e.target.value })}
                onBlur={(e) => handleUpdate('customer_name', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">公司名字</label>
              <input type="text" value={inquiry.company_name} onChange={(e) => setInquiry({ ...inquiry, company_name: e.target.value })}
                onBlur={(e) => handleUpdate('company_name', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">国家</label>
              <input type="text" value={inquiry.country} onChange={(e) => setInquiry({ ...inquiry, country: e.target.value })}
                onBlur={(e) => handleUpdate('country', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            </div>

            {/* === 获客信息 === */}
            <div className="col-span-2 mt-1">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100">获客信息</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">信息来源</label>
              <input type="text" value={inquiry.info_source} onChange={(e) => setInquiry({ ...inquiry, info_source: e.target.value })}
                onBlur={(e) => handleUpdate('info_source', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            </div>
            {renderDictSelect('channel', 'channel', '渠道', '请选择渠道', (val) => handleUpdate('channel', val))}

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">询盘日期</label>
              <input
                type="date"
                value={inquiry.inquiry_date || ''}
                onChange={(e) => {
                  setInquiry({ ...inquiry, inquiry_date: e.target.value })
                  handleUpdate('inquiry_date', e.target.value || '')
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>

            {/* === 联系方式 === */}
            <div className="col-span-2 mt-1">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100">联系方式</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">联系方式</label>
              <input type="text" value={inquiry.contact} onChange={(e) => setInquiry({ ...inquiry, contact: e.target.value })}
                onBlur={(e) => handleUpdate('contact', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
              <input type="text" value={inquiry.email} onChange={(e) => setInquiry({ ...inquiry, email: e.target.value })}
                onBlur={(e) => handleUpdate('email', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">其他联系方式</label>
              <input type="text" value={inquiry.other_contact} onChange={(e) => setInquiry({ ...inquiry, other_contact: e.target.value })}
                onBlur={(e) => handleUpdate('other_contact', e.target.value)}
                placeholder="WhatsApp / Skype / Telegram 等"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            </div>

            {/* === 需求信息 === */}
            <div className="col-span-2 mt-1">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100">需求信息</div>
            </div>

            {renderDictSelect('product_category', 'product_category', '产品需求类别', '请选择类别', (val) => handleUpdate('product_category', val))}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">询盘身份</label>
              <input type="text" value={inquiry.inquiry_role} onChange={(e) => setInquiry({ ...inquiry, inquiry_role: e.target.value })}
                onBlur={(e) => handleUpdate('inquiry_role', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">车队规模</label>
              <input type="text" value={inquiry.fleet_size} onChange={(e) => setInquiry({ ...inquiry, fleet_size: e.target.value })}
                onBlur={(e) => handleUpdate('fleet_size', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">访客需求（原文）</label>
              <textarea
                value={inquiry.visitor_need || ''}
                onChange={(e) => setInquiry({ ...inquiry, visitor_need: e.target.value })}
                onBlur={(e) => handleUpdate('visitor_need', e.target.value)}
                rows={3}
                placeholder="客户原始需求描述（保留原文语言）"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">需求（中文翻译）</label>
              <textarea
                value={(inquiry as any).visitor_need_cn || ''}
                onChange={(e) => setInquiry({ ...inquiry, visitor_need_cn: e.target.value })}
                onBlur={(e) => handleUpdate('visitor_need_cn', e.target.value)}
                rows={3}
                placeholder="客户需求的中文翻译"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* 状态标记 */}
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h3 className="font-display font-semibold text-slate-800 mb-4">状态标记</h3>
            <div className="space-y-4">
              {/* 跟进状态 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">跟进状态</label>
                <div className="relative">
                  <select
                    value={inquiry.i_status}
                    onChange={(e) => {
                      setInquiry({ ...inquiry, i_status: e.target.value })
                      handleUpdate('i_status', e.target.value)
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 appearance-none pr-8"
                  >
                    <option value="">请选择</option>
                    {(dictOptions['i_status'] || []).map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* 有效询盘 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">有效询盘</label>
                <div className="relative">
                  <select
                    value={String(inquiry.is_use)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      setInquiry({ ...inquiry, is_use: val })
                      handleUpdate('is_use', val)
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 appearance-none pr-8"
                  >
                    <option value="">请选择</option>
                    {(dictOptions['is_use'] || []).map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* 审核状态 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">审核状态</label>
                <select
                  value={inquiry.status}
                  onChange={(e) => {
                    const newStatus = e.target.value as Inquiry['status']
                    setInquiry({ ...inquiry, status: newStatus })
                    handleUpdate('status', newStatus)
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                >
                  <option value="pending">待审核</option>
                  <option value="approved">已通过</option>
                  <option value="rejected">已驳回</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={inquiry.is_star}
                    onChange={(e) => { setInquiry({ ...inquiry, is_star: e.target.checked }); handleUpdate('is_star', e.target.checked) }}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500" />
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-slate-700">星级客户</span>
                </label>

              </div>
            </div>
          </div>

          {/* 联系信息 */}
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h3 className="font-display font-semibold text-slate-800 mb-4">联系信息</h3>
            <div className="space-y-3">
              {inquiry.contact && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700">{inquiry.contact}</span>
                </div>
              )}
              {inquiry.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <a href={`mailto:${inquiry.email}`} className="text-primary-600 hover:text-primary-700">{inquiry.email}</a>
                </div>
              )}
              {inquiry.other_contact && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700">{inquiry.other_contact}</span>
                </div>
              )}
              {!inquiry.contact && !inquiry.email && !inquiry.other_contact && (
                <p className="text-sm text-slate-400">暂无联系信息</p>
              )}
            </div>
          </div>

          {/* 原始邮件 */}
          {inquiry.raw_text && (
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h3 className="font-display font-semibold text-slate-800 mb-3">原始邮件内容</h3>
              <pre className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 max-h-[300px] overflow-auto whitespace-pre-wrap font-mono">
                {inquiry.raw_text}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
