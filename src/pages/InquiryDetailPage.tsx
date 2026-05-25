import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { inquiryApi, settingsApi } from '@/services/api'
import type { Inquiry, StaffItem, StaffDutyConfig, AssignRules } from '@/types'
import { formatDate, normalizeContinent, CONTINENT_TO_REGION } from '@/utils'
import { useDicts } from '@/hooks/useDict'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Star, Mail, Globe, Phone, UserCheck, Loader2, Zap,
  Building2, Tag, MessageSquare, FileText, Calendar, Save,
} from 'lucide-react'

// ===== 权重随机分配（美洲/欧非）=====
function weightedRandom(persons: StaffItem[]): StaffItem | null {
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

// ===== 排班查表分配（亚太）=====
function getSchedulePerson(
  duty: StaffDutyConfig['duty'] | null,
  staffList: StaffItem[],
): StaffItem | null {
  if (!duty || !duty.staff_order.length) return weightedRandom(staffList)

  const baseDate = new Date(duty.base_date)
  const today = new Date()
  const diffDays = Math.floor((today.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysPerPerson = duty.days_per_person || 2

  if (diffDays < 0) return weightedRandom(staffList)

  const cycleLength = duty.staff_order.length * daysPerPerson
  const posInCycle = diffDays % cycleLength
  const personIndex = Math.floor(posInCycle / daysPerPerson) % duty.staff_order.length
  const personName = duty.staff_order[personIndex]

  return staffList.find(p => p.name === personName) || weightedRandom(staffList)
}

// ===== 核心分配函数 =====
function assignPerson(
  region: string,
  regionStaff: StaffItem[],
  duty: StaffDutyConfig['duty'] | null,
): StaffItem | null {
  if (regionStaff.length === 0) return null
  if (regionStaff.length === 1) return regionStaff[0]

  if (region === '亚太') {
    return getSchedulePerson(duty, regionStaff)
  }
  return weightedRandom(regionStaff)
}

export function InquiryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [inquiry, setInquiry] = useState<Inquiry | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [staffConfig, setStaffConfig] = useState<StaffDutyConfig | null>(null)
  const [assignRules, setAssignRules] = useState<AssignRules>({ schedule_regions: [], continent_overrides: {} })

  // 字典数据驱动下拉菜单
  const dictData = useDicts(['continent', 'region'])
  const continents = dictData.continent || []
  const regions = dictData.region || []

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      inquiryApi.getById(Number(id)),
      settingsApi.getStaffDuty(),
      settingsApi.getAssignRules(),
    ]).then(([inqRes, staffRes, rulesRes]) => {
      setInquiry(inqRes.data)
      setStaffConfig(staffRes.data)
      setAssignRules({
        schedule_regions: rulesRes.data.schedule_regions || [],
        continent_overrides: rulesRes.data.continent_overrides || {},
      })
      setLoading(false)
    }).catch(() => {
      toast.error('加载询盘详情失败')
      setLoading(false)
    })
  }, [id])

  // 获取大洲到区域映射（考虑覆盖规则）
  const getRegionForContinent = (continent: string): string => {
    if (!continent) return ''
    const override = assignRules.continent_overrides?.[continent]
    if (override && typeof override === 'object' && 'region' in override) {
      return (override as any).region
    }
    if (typeof override === 'string') return override
    return CONTINENT_TO_REGION[continent] || ''
  }

  // 按大区分组的业务员
  const groupedStaff: Record<string, StaffItem[]> = {}
  if (staffConfig) {
    regions.forEach(r => {
      const persons = staffConfig.staff.filter(p => p.region === r)
      if (persons.length > 0) groupedStaff[r] = persons
    })
  }

  const doLocalAssign = (region: string): StaffItem | null => {
    if (!staffConfig) return null
    const persons = staffConfig.staff.filter(p => p.region === region)
    return assignPerson(region, persons, staffConfig.duty)
  }

  const handleUpdate = async (field: string, value: string | boolean | number | null) => {
    if (!inquiry) return
    setSaving(true)
    try {
      const res = await inquiryApi.update(inquiry.id, { [field]: value })
      setInquiry(res.data)
      toast.success('已保存')
    } catch {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleBlurUpdate = (field: string, value: string) => {
    if (inquiry && inquiry[field as keyof Inquiry] !== value) {
      handleUpdate(field, value)
    }
  }

  // 大洲变更 → 自动映射大区 → 本地分配业务员
  const handleContinentChange = async (value: string) => {
    if (!inquiry) return
    const normalized = normalizeContinent(value)
    const updated = { ...inquiry, continent: normalized }
    setInquiry(updated)

    try {
      await inquiryApi.update(inquiry.id, { continent: normalized })
    } catch {
      toast.error('保存失败')
      return
    }

    const region = getRegionForContinent(normalized)
    if (region) {
      const person = doLocalAssign(region)
      if (person) {
        const newInquiry = { ...updated, region, staff: person.name, staff_email: person.email }
        setInquiry(newInquiry)
        try {
          await inquiryApi.update(inquiry.id, { region, staff: person.name, staff_email: person.email })
        } catch {
          toast.error('分配业务员失败')
        }
      } else {
        setInquiry({ ...updated, region })
        try {
          await inquiryApi.update(inquiry.id, { region })
        } catch {
          toast.error('保存失败')
        }
      }
    }
  }

  // 大区手动变更 → 本地分配
  const handleRegionChange = async (value: string) => {
    if (!inquiry) return
    if (value) {
      const person = doLocalAssign(value)
      if (person) {
        const updated = { ...inquiry, region: value, staff: person.name, staff_email: person.email }
        setInquiry(updated)
        try {
          await inquiryApi.update(inquiry.id, { region: value, staff: person.name, staff_email: person.email })
        } catch {
          toast.error('保存失败')
        }
      } else {
        setInquiry({ ...inquiry, region: value })
        await inquiryApi.update(inquiry.id, { region: value })
      }
    } else {
      setInquiry({ ...inquiry, region: value })
      await inquiryApi.update(inquiry.id, { region: value })
    }
  }

  // 手动重新分配
  const handleReAssign = async () => {
    if (!inquiry || !inquiry.region) return
    setAssigning(true)
    setTimeout(async () => {
      const person = doLocalAssign(inquiry.region)
      if (person) {
        const updated = { ...inquiry, staff: person.name, staff_email: person.email }
        setInquiry(updated)
        try {
          await inquiryApi.update(inquiry.id, { staff: person.name, staff_email: person.email })
          toast.success(`已重新分配给 ${person.name}`)
        } catch {
          toast.error('分配失败')
        }
      }
      setAssigning(false)
    }, 300)
  }

  // 垃圾邮件标记切换
  const handleSpamToggle = async () => {
    if (!inquiry) return
    const newIsSpam = inquiry.is_spam ? 0 : 1
    setSaving(true)
    try {
      const res = await inquiryApi.update(inquiry.id, { is_spam: !!newIsSpam })
      setInquiry({ ...res.data, is_spam: newIsSpam })
      toast.success(newIsSpam ? '已标记为垃圾邮件' : '已取消垃圾邮件标记')
    } catch {
      toast.error('操作失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  if (!inquiry) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 mb-2">询盘不存在</p>
        <button onClick={() => navigate('/inquiries')} className="text-indigo-500 text-sm hover:underline">
          返回列表
        </button>
      </div>
    )
  }

  // 状态徽章样式
  const statusBadge = inquiry.is_spam
    ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200'

  const statusLabel = inquiry.is_spam ? '垃圾邮件' : '有效询盘'

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
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              {formatDate(inquiry.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSpamToggle}
            disabled={saving}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              inquiry.is_spam
                ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                : 'border-red-200 text-red-600 hover:bg-red-50'
            }`}
          >
            {inquiry.is_spam ? '取消垃圾标记' : '标记为垃圾'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* 归属区域 */}
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-indigo-500" />
              <h2 className="font-display font-semibold text-lg text-slate-800">归属区域</h2>
              {inquiry.continent && inquiry.region && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 ml-2">
                  {inquiry.continent} → {inquiry.region}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">大洲</label>
                <select
                  value={inquiry.continent}
                  onChange={(e) => handleContinentChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 appearance-none cursor-pointer"
                >
                  <option value="">请选择大洲</option>
                  {continents.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  大区
                  {inquiry.continent && getRegionForContinent(inquiry.continent) && (
                    <span className="ml-1.5 text-indigo-500 font-normal">(自动)</span>
                  )}
                </label>
                <select
                  value={inquiry.region}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 appearance-none cursor-pointer"
                >
                  <option value="">请选择大区</option>
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">业务员</label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1 min-w-0">
                    <select
                      value={inquiry.staff}
                      onChange={(e) => {
                        const val = e.target.value
                        const person = staffConfig?.staff.find(p => p.name === val)
                        setInquiry({ ...inquiry, staff: val, staff_email: person?.email || '' })
                        handleUpdate('staff', val)
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 appearance-none cursor-pointer pr-8"
                    >
                      <option value="">{inquiry.region ? '请选择' : '请先选择大区'}</option>
                      {Object.entries(groupedStaff).map(([region, persons]) => (
                        <optgroup key={region} label={region}>
                          {persons.map(p => (
                            <option key={p.name + p.region} value={p.name}>
                              {p.name} ({p.email}) {p.weight > 1 ? `[权重:${p.weight}]` : ''}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <svg className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  <button
                    type="button"
                    onClick={handleReAssign}
                    disabled={assigning || !inquiry.region}
                    title="重新随机分配"
                    className="shrink-0 px-2.5 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-lg hover:from-indigo-600 hover:to-violet-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 客户信息 */}
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-violet-500" />
              <h2 className="font-display font-semibold text-lg text-slate-800">客户信息</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="客户名字" value={inquiry.customer_name} onChange={(v) => setInquiry({ ...inquiry, customer_name: v })} onBlur={(v) => handleBlurUpdate('customer_name', v)} />
              <InputField label="公司名字" value={inquiry.company_name} onChange={(v) => setInquiry({ ...inquiry, company_name: v })} onBlur={(v) => handleBlurUpdate('company_name', v)} />
              <InputField label="Email" value={inquiry.email} onChange={(v) => setInquiry({ ...inquiry, email: v })} onBlur={(v) => handleBlurUpdate('email', v)} icon={<Mail className="w-4 h-4" />} />
              <InputField label="电话" value={inquiry.phone} onChange={(v) => setInquiry({ ...inquiry, phone: v })} onBlur={(v) => handleBlurUpdate('phone', v)} icon={<Phone className="w-4 h-4" />} />
              <InputField label="其他联系方式" value={inquiry.other_contact} onChange={(v) => setInquiry({ ...inquiry, other_contact: v })} onBlur={(v) => handleBlurUpdate('other_contact', v)} />
              <InputField label="国家" value={inquiry.country} onChange={(v) => setInquiry({ ...inquiry, country: v })} onBlur={(v) => handleBlurUpdate('country', v)} icon={<Globe className="w-4 h-4" />} />
            </div>
          </div>

          {/* 需求信息 */}
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              <h2 className="font-display font-semibold text-lg text-slate-800">需求信息</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1.5">客户需求 (整理后)</label>
                <textarea
                  value={inquiry.visitor_need}
                  onChange={(e) => setInquiry({ ...inquiry, visitor_need: e.target.value })}
                  onBlur={(e) => handleBlurUpdate('visitor_need', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1.5">客户需求原文</label>
                <textarea
                  value={inquiry.raw_need}
                  onChange={(e) => setInquiry({ ...inquiry, raw_need: e.target.value })}
                  onBlur={(e) => handleBlurUpdate('raw_need', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
                />
              </div>
              <InputField label="产品类别" value={inquiry.product_category} onChange={(v) => setInquiry({ ...inquiry, product_category: v })} onBlur={(v) => handleBlurUpdate('product_category', v)} icon={<Tag className="w-4 h-4" />} />
              <InputField label="邮件主题" value={inquiry.email_subject} onChange={(v) => setInquiry({ ...inquiry, email_subject: v })} onBlur={(v) => handleBlurUpdate('email_subject', v)} />
              <InputField label="发件人" value={inquiry.sender} onChange={(v) => setInquiry({ ...inquiry, sender: v })} onBlur={(v) => handleBlurUpdate('sender', v)} />
              <InputField label="订单号" value={inquiry.order_no} onChange={(v) => setInquiry({ ...inquiry, order_no: v })} onBlur={(v) => handleBlurUpdate('order_no', v)} />
              <InputField label="销售订单编号" value={inquiry.sale_order_no} onChange={(v) => setInquiry({ ...inquiry, sale_order_no: v })} onBlur={(v) => handleBlurUpdate('sale_order_no', v)} />
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">备注</label>
              <textarea
                value={inquiry.remark}
                onChange={(e) => setInquiry({ ...inquiry, remark: e.target.value })}
                onBlur={(e) => handleBlurUpdate('remark', e.target.value)}
                rows={2}
                placeholder="添加备注..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
              />
            </div>
          </div>

          {/* 垃圾邮件信息 */}
          {inquiry.is_spam && (
            <div className="bg-red-50 rounded-xl border border-red-100 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 text-red-500" />
                <h2 className="font-display font-semibold text-lg text-red-700">垃圾邮件信息</h2>
              </div>
              <InputField label="垃圾原因" value={inquiry.spam_reason} onChange={(v) => setInquiry({ ...inquiry, spam_reason: v })} onBlur={(v) => handleBlurUpdate('spam_reason', v)} />
            </div>
          )}
        </div>

        {/* Right sidebar - Info summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h3 className="font-display font-semibold text-slate-800 mb-4">基本信息</h3>
            <div className="space-y-3">
              <InfoRow label="询盘编号" value={inquiry.inquiry_no} />
              <InfoRow label="邮件时间" value={inquiry.inquiry_time ? formatDate(inquiry.inquiry_time) : '-'} />
              <InfoRow label="登记时间" value={formatDate(inquiry.created_at)} />
              <InfoRow label="更新时间" value={formatDate(inquiry.updated_at)} />
              <InfoRow label="询盘月份" value={inquiry.inquiry_month} />
              <InfoRow label="状态" value={statusLabel} />
              <InfoRow label="信息来源" value={inquiry.info_source || '-'} />
              <InfoRow label="渠道" value={inquiry.channel || '-'} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h3 className="font-display font-semibold text-slate-800 mb-4">分配信息</h3>
            <div className="space-y-3">
              <InfoRow label="大区" value={inquiry.region || '-'} />
              <InfoRow label="大洲" value={inquiry.continent || '-'} />
              <InfoRow label="业务员" value={inquiry.staff || '-'} />
              <InfoRow label="业务员邮箱" value={inquiry.staff_email || '-'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== Sub-components =====

function InputField({
  label,
  value,
  onChange,
  onBlur,
  icon,
  textarea = false,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur: (v: string) => void
  icon?: React.ReactNode
  textarea?: boolean
  rows?: number
}) {
  const baseClass = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onBlur(e.target.value)}
          rows={rows}
          className={`${baseClass} resize-none`}
        />
      ) : (
        <div className="relative">
          {icon && (
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </div>
          )}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={(e) => onBlur(e.target.value)}
            className={`${baseClass} ${icon ? 'pl-9' : ''}`}
          />
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm text-slate-700 font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  )
}
