import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyzeApi, inquiryApi, settingsApi } from '@/services/api'
import type { AIAnalysisResult, StaffItem } from '@/types'
import { fileToBase64, CONTINENT_TO_REGION, normalizeContinent } from '@/utils'
import {
  Sparkles, Save, ArrowLeft, Loader2,
  Image as ImageIcon, AlertTriangle, CheckCircle,
  FileText, X, ChevronDown, UserCheck, Zap, RefreshCw,
} from 'lucide-react'

// ===== 权重随机分配 =====
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

// ===== 排班分配（亚太） =====
function assignAsiaDuty(persons: StaffItem[], dutyConfig: { base_date: string; staff_order: string[]; days_per_person: number }): StaffItem | null {
  if (!dutyConfig.staff_order.length || !persons.length) return null
  try {
    const base = new Date(dutyConfig.base_date)
    const now = new Date()
    const days = Math.floor((now.getTime() - base.getTime()) / (1000 * 60 * 60 * 24))
    if (days < 0) days = 0
    const cycle = dutyConfig.staff_order.length * dutyConfig.days_per_person
    const pos = days % cycle
    const idx = Math.floor(pos / dutyConfig.days_per_person) % dutyConfig.staff_order.length
    const name = dutyConfig.staff_order[idx]
    return persons.find(p => p.name === name) || persons[0]
  } catch {
    return persons[0] || null
  }
}

const PRODUCT_CATEGORIES = [
  "4线设备", "视频", "软件", "SIM", "未知", "硬件", "纯无线",
  "OBD", "宠物", "多线（录音&SOS&测油）", "卫星类",
  "Tag类", "其他/技术/售后", "OBD2", "太阳能"
]

const CONTINENTS = ["亚洲", "欧洲", "非洲", "北美洲", "南美洲", "大洋洲", "中东"]

export function NewInquiryPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [textInput, setTextInput] = useState('')
  const [inputType, setInputType] = useState<'image' | 'text' | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null)
  const [ocrText, setOcrText] = useState<string>('')
  const [showOcrEdit, setShowOcrEdit] = useState(false)
  const [editedOcrText, setEditedOcrText] = useState('')
  const [error, setError] = useState('')
  const [showRaw, setShowRaw] = useState(false)

  // 业务员数据
  const [staffByRegion, setStaffByRegion] = useState<Record<string, StaffItem[]>>({})
  const [dutyConfig, setDutyConfig] = useState<{ base_date: string; staff_order: string[]; days_per_person: number }>({ base_date: '2026-05-05', staff_order: [], days_per_person: 2 })

  const [formData, setFormData] = useState({
    customer_name: '', company_name: '', email: '', phone: '',
    other_contact: '', continent: '', country: '', region: '',
    visitor_need: '', raw_need: '', product_category: '',
    email_subject: '', sender: '', staff: '', staff_email: '',
    is_spam: false, spam_reason: '', remark: '',
  })

  // 加载业务员配置
  useEffect(() => {
    settingsApi.getStaffDuty().then(res => {
      const byRegion: Record<string, StaffItem[]> = {}
      for (const s of res.data.staff) {
        if (!byRegion[s.region]) byRegion[s.region] = []
        byRegion[s.region].push(s)
      }
      setStaffByRegion(byRegion)
      if (res.data.duty) setDutyConfig(res.data.duty)
    }).catch(() => {})
  }, [])

  // 本地分配业务员
  const doLocalAssign = (region: string): StaffItem | null => {
    const persons = staffByRegion[region] || []
    if (!persons.length) return null
    if (region === '亚太') {
      return assignAsiaDuty(persons, dutyConfig) || weightedRandom(persons)
    }
    return weightedRandom(persons)
  }

  // 大洲变更 → 映射大区 → 分配
  const handleContinentChange = (value: string) => {
    const normalized = normalizeContinent(value)
    setFormData(prev => ({ ...prev, continent: normalized }))
    if (normalized && CONTINENT_TO_REGION[normalized]) {
      const region = CONTINENT_TO_REGION[normalized]
      setFormData(prev => ({ ...prev, continent: normalized, region }))
      const person = doLocalAssign(region)
      if (person) {
        setFormData(prev => ({ ...prev, staff: person.name, staff_email: person.email }))
      }
    }
  }

  // 大区手动变更
  const handleRegionChange = (value: string) => {
    setFormData(prev => ({ ...prev, region: value }))
    if (value) {
      const person = doLocalAssign(value)
      if (person) {
        setFormData(prev => ({ ...prev, staff: person.name, staff_email: person.email }))
      }
    }
  }

  const handleReAssign = () => {
    if (!formData.region) return
    const person = doLocalAssign(formData.region)
    if (person) {
      setFormData(prev => ({ ...prev, staff: person.name, staff_email: person.email }))
    }
  }

  // 粘贴处理
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          if (imagePreview) URL.revokeObjectURL(imagePreview)
          setImagePreview(URL.createObjectURL(file))
          fileToBase64(file).then((b64) => setImageBase64(b64))
          setInputType('image')
          setError('')
          setAnalysisResult(null)
          setOcrText('')
        }
        return
      }
    }
    if (inputType === 'text') return
    const text = e.clipboardData?.getData('text/plain')
    if (text?.trim()) {
      e.preventDefault()
      setInputType('text')
      setTextInput(text)
      setError('')
      setAnalysisResult(null)
      setOcrText('')
    }
  }, [inputType, imagePreview])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setAnalysisResult(null); setOcrText('')
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(URL.createObjectURL(file))
    setImageBase64(await fileToBase64(file))
    setInputType('image')
  }

  const clearInput = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null); setImageBase64(null); setTextInput(''); setInputType(null)
    setError(''); setAnalysisResult(null); setOcrText('')
  }

  // AI 分析
  const handleAnalyze = async () => {
    if (!inputType || (inputType === 'text' && !textInput.trim()) || (inputType === 'image' && !imageBase64)) {
      setError(inputType ? '请提供分析内容' : '请先粘贴邮件截图或输入邮件内容')
      return
    }
    setError(''); setAnalyzing(true); setAnalysisResult(null); setOcrText(''); setShowOcrEdit(false)
    try {
      const res = await analyzeApi.analyze({
        text: inputType === 'text' ? textInput : '',
        image: inputType === 'image' ? imageBase64 : null,
      })
      const data = res.data
      setAnalysisResult(data)
      const ocrResult = data.ocr_text || ''
      if (inputType === 'image' && ocrResult) { setOcrText(ocrResult); setEditedOcrText(ocrResult) }

      if (!data.is_inquiry) {
        // 垃圾邮件
        setFormData(prev => ({
          ...prev, is_spam: true, spam_reason: data.spam_reason || 'AI判定为垃圾邮件',
          customer_name: data.extracted?.customer_name || prev.customer_name,
          company_name: data.extracted?.company_name || prev.company_name,
          email: data.extracted?.email || prev.email,
          phone: data.extracted?.phone || prev.phone,
        }))
      } else {
        const ext = data.extracted || {}
        const continent = normalizeContinent(ext.continent || '')
        const region = ext.region || (continent ? CONTINENT_TO_REGION[continent] || '' : '')

        // 分配业务员
        let staff = ext.staff || ''
        let staffEmail = ext.staff_email || ''
        if (region && !staff) {
          const person = doLocalAssign(region)
          if (person) { staff = person.name; staffEmail = person.email }
        }

        setFormData(prev => ({
          ...prev,
          customer_name: ext.customer_name || prev.customer_name,
          company_name: ext.company_name || prev.company_name,
          email: ext.email || prev.email,
          phone: ext.phone || prev.phone,
          other_contact: ext.other_contact || prev.other_contact,
          continent: continent || prev.continent,
          country: ext.country || prev.country,
          region: region || prev.region,
          visitor_need: ext.visitor_need || prev.visitor_need,
          raw_need: ext.raw_need || prev.raw_need,
          product_category: ext.product_category || prev.product_category,
          email_subject: ext.email_subject || prev.email_subject,
          sender: ext.sender || prev.sender,
          staff: staff || prev.staff,
          staff_email: staffEmail || prev.staff_email,
          is_spam: false, spam_reason: '',
        }))
      }
    } catch (err: unknown) {
      setError(`AI 分析失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setAnalyzing(false)
    }
  }

  // OCR修正后重新分析
  const handleReAnalyze = async () => {
    if (!editedOcrText.trim()) { setError('修正后的文字不能为空'); return }
    setError(''); setAnalyzing(true); setAnalysisResult(null)
    try {
      const res = await analyzeApi.analyze({ text: editedOcrText, image: null })
      const data = res.data
      setAnalysisResult(data); setOcrText(editedOcrText); setShowOcrEdit(false)
      if (!data.is_inquiry) {
        setFormData(prev => ({ ...prev, is_spam: true, spam_reason: data.spam_reason }))
      } else {
        const ext = data.extracted || {}
        const continent = normalizeContinent(ext.continent || '')
        const region = ext.region || (continent ? CONTINENT_TO_REGION[continent] || '' : '')
        let staff = '', staffEmail = ''
        if (region) {
          const person = doLocalAssign(region)
          if (person) { staff = person.name; staffEmail = person.email }
        }
        setFormData(prev => ({
          ...prev,
          customer_name: ext.customer_name || prev.customer_name,
          company_name: ext.company_name || prev.company_name,
          email: ext.email || prev.email,
          phone: ext.phone || prev.phone,
          other_contact: ext.other_contact || prev.other_contact,
          continent: continent || prev.continent,
          country: ext.country || prev.country,
          region: region || prev.region,
          visitor_need: ext.visitor_need || prev.visitor_need,
          raw_need: ext.raw_need || prev.raw_need,
          product_category: ext.product_category || prev.product_category,
          staff: staff || prev.staff,
          staff_email: staffEmail || prev.staff_email,
          is_spam: false, spam_reason: '',
        }))
      }
    } catch (err: unknown) {
      setError(`AI 分析失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await inquiryApi.create(formData)
      navigate('/inquiries')
    } catch {
      setError('保存失败')
    }
    finally { setSaving(false) }
  }

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
            <h1 className="font-display text-2xl font-bold text-slate-800">新增询盘</h1>
            <p className="text-slate-500 text-sm mt-1">粘贴邮件截图或文字，AI 自动提取信息并分配业务员</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium rounded-lg hover:from-primary-600 hover:to-accent-600 transition-all disabled:opacity-50 shadow-md shadow-primary-500/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          保存询盘
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Input Area */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-semibold text-slate-700 text-sm">邮件内容输入</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { setInputType('image'); setError(''); setAnalysisResult(null) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${inputType === 'image' ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                  <ImageIcon className="w-3.5 h-3.5 inline mr-1" />截图
                </button>
                <button onClick={() => { setInputType('text'); setError(''); setAnalysisResult(null) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${inputType === 'text' ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                  <FileText className="w-3.5 h-3.5 inline mr-1" />文字
                </button>
              </div>
            </div>

            <div className="p-5" onPaste={handlePaste}>
              {inputType === 'image' ? (
                <div className="space-y-3">
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="邮件截图" className="w-full max-h-[400px] object-contain rounded-lg border border-slate-200 bg-slate-50" />
                      <button onClick={clearInput} className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg hover:bg-white shadow-sm transition-colors">
                        <X className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center hover:border-primary-300 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}>
                      <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">点击上传或 <span className="text-primary-500 font-medium">Ctrl+V 粘贴</span> 邮件截图</p>
                      <p className="text-slate-400 text-xs mt-1">支持 PNG, JPG, BMP 格式</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>
              ) : inputType === 'text' ? (
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="在此粘贴邮件原文内容..."
                  rows={16}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
                />
              ) : (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-16 text-center">
                  <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">选择输入方式后，在此区域粘贴邮件截图或文字</p>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={handleAnalyze}
                  disabled={analyzing || !inputType || (inputType === 'text' && !textInput.trim()) || (inputType === 'image' && !imageBase64)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium rounded-lg hover:from-primary-600 hover:to-accent-600 transition-all disabled:opacity-50 shadow-md shadow-primary-500/20 btn-glow">
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {analyzing ? 'AI 分析中...' : 'AI 智能分析'}
                </button>
                {clearInput && (imagePreview || textInput) && (
                  <button onClick={clearInput} className="px-3 py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                    清除
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* OCR 结果 */}
          {ocrText && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">OCR 识别结果</h3>
                <div className="flex items-center gap-2">
                  {!showOcrEdit ? (
                    <button onClick={() => { setShowOcrEdit(true); setEditedOcrText(ocrText) }}
                      className="text-xs text-primary-500 hover:text-primary-600 font-medium">修正后重分析</button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={handleReAnalyze} disabled={analyzing}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-500 text-white text-xs rounded-lg hover:bg-primary-600 disabled:opacity-50">
                        {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        重新分析
                      </button>
                      <button onClick={() => setShowOcrEdit(false)} className="text-xs text-slate-500">取消</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4">
                {showOcrEdit ? (
                  <textarea value={editedOcrText} onChange={(e) => setEditedOcrText(e.target.value)}
                    rows={8} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none" />
                ) : (
                  <pre className="text-xs text-slate-600 whitespace-pre-wrap max-h-[200px] overflow-y-auto">{ocrText}</pre>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Right: Form */}
        <div className="space-y-4">
          {/* 垃圾邮件标记 */}
          {formData.is_spam && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="font-semibold text-red-700 text-sm">垃圾邮件</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-red-600">原因:</label>
                <input value={formData.spam_reason} onChange={(e) => updateField('spam_reason', e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm bg-white border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300/30" />
              </div>
            </div>
          )}

          {/* 客户信息 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-700 text-sm mb-4 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary-500" /> 客户信息
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">客户名字</label>
                <input type="text" value={formData.customer_name} onChange={(e) => updateField('customer_name', e.target.value)}
                  placeholder="客户姓名" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">公司名字</label>
                <input type="text" value={formData.company_name} onChange={(e) => updateField('company_name', e.target.value)}
                  placeholder="公司名称" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
                <input type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)}
                  placeholder="email@example.com" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">电话</label>
                <input type="text" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="电话号码" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">其他联系方式</label>
                <input type="text" value={formData.other_contact} onChange={(e) => updateField('other_contact', e.target.value)}
                  placeholder="WhatsApp / WeChat / Skype" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">发件人</label>
                <input type="text" value={formData.sender} onChange={(e) => updateField('sender', e.target.value)}
                  placeholder="邮件发件人" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
              </div>
            </div>
          </div>

          {/* 地区信息 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-700 text-sm mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-500" /> 地区与分配
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">大洲</label>
                <div className="relative">
                  <select value={formData.continent} onChange={(e) => handleContinentChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 pr-8">
                    <option value="">请选择</option>
                    {CONTINENTS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">国家</label>
                <input type="text" value={formData.country} onChange={(e) => updateField('country', e.target.value)}
                  placeholder="国家" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">大区</label>
                <div className="relative">
                  <select value={formData.region} onChange={(e) => handleRegionChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 pr-8">
                    <option value="">请选择</option>
                    {['美洲', '欧非', '亚太'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">产品类别</label>
                <div className="relative">
                  <select value={formData.product_category} onChange={(e) => updateField('product_category', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 pr-8">
                    <option value="">请选择</option>
                    {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* 业务员分配 */}
            <div className="mt-4 p-3 bg-primary-50/50 rounded-lg border border-primary-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-primary-700">业务员分配</span>
                {formData.region && (
                  <button onClick={handleReAssign} className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> 重新分配
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input type="text" value={formData.staff} onChange={(e) => updateField('staff', e.target.value)}
                    placeholder="业务员姓名" className="w-full px-3 py-1.5 bg-white border border-primary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
                </div>
                <input type="text" value={formData.staff_email} onChange={(e) => updateField('staff_email', e.target.value)}
                  placeholder="业务员邮箱" className="flex-1 px-3 py-1.5 bg-white border border-primary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
              </div>
            </div>
          </div>

          {/* 需求信息 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-700 text-sm mb-4">需求信息</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">访客需求（中文摘要）</label>
                <textarea value={formData.visitor_need} onChange={(e) => updateField('visitor_need', e.target.value)}
                  rows={3} placeholder="客户需求中文摘要"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-500">客户需求原文</label>
                  <button onClick={() => setShowRaw(!showRaw)} className="text-xs text-primary-500 hover:text-primary-600">
                    {showRaw ? '收起' : '展开'}
                  </button>
                </div>
                {showRaw ? (
                  <textarea value={formData.raw_need} onChange={(e) => updateField('raw_need', e.target.value)}
                    rows={4} placeholder="客户需求原文"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none" />
                ) : (
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-400 max-h-[40px] overflow-hidden">{formData.raw_need || '暂无'}</div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">邮件主题</label>
                <input type="text" value={formData.email_subject} onChange={(e) => updateField('email_subject', e.target.value)}
                  placeholder="邮件主题" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">备注</label>
                <input type="text" value={formData.remark} onChange={(e) => updateField('remark', e.target.value)}
                  placeholder="备注信息" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
              </div>
            </div>
          </div>

          {/* AI Analysis Summary */}
          {analysisResult && (
            <div className={`rounded-xl border p-4 ${analysisResult.is_inquiry ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {analysisResult.is_inquiry ? (
                  <><CheckCircle className="w-4 h-4 text-emerald-500" /><span className="text-sm font-semibold text-emerald-700">有效询盘</span></>
                ) : (
                  <><AlertTriangle className="w-4 h-4 text-amber-500" /><span className="text-sm font-semibold text-amber-700">垃圾邮件</span></>
                )}
              </div>
              {analysisResult.is_inquiry && (
                <div className="text-xs text-emerald-600 space-y-1">
                  <p>客户: {formData.customer_name || '-'} | 公司: {formData.company_name || '-'}</p>
                  <p>国家: {formData.country || '-'} | 大区: {formData.region || '-'} | 业务员: {formData.staff || '-'}</p>
                  <p>产品: {formData.product_category || '-'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
