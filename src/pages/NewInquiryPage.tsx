import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { inquiryApi, dictApi, salesApi, authApi } from '@/services/api'
import type { AIAnalysisResult, InquiryCreate, DictOption, SalesPerson, ScheduleDate, User } from '@/types'
import { fileToBase64 } from '@/utils'
import {
  Sparkles, Save, ArrowLeft, Loader2,
  Image as ImageIcon, AlertTriangle, CheckCircle, Eye, EyeOff, FileSearch,
  FileText, X, ChevronDown, UserCheck, Upload, Zap,
  Star,
  ShieldAlert,
} from 'lucide-react'

// ===== 大洲 → 大区映射（固定规则，不用 AI） =====
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

// ===== 排班查表分配（亚太） - 用 person_id 匹配，避免简称/全称不一致 =====
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

export function NewInquiryPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [textInput, setTextInput] = useState('')
  const [inputType, setInputType] = useState<'image' | 'text' | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null)
  const [ocrText, setOcrText] = useState<string>('')
  const [showOcrEdit, setShowOcrEdit] = useState(false)
  const [editedOcrText, setEditedOcrText] = useState('')
  const [error, setError] = useState('')
  const [showRaw, setShowRaw] = useState(false)

  // 字典选项
  const [dictOptions, setDictOptions] = useState<Record<string, DictOption[]>>({})
  // 业务员列表 + 排班日期缓存
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([])
  const [scheduleDates, setScheduleDates] = useState<ScheduleDate[]>([])

  const [formData, setFormData] = useState<InquiryCreate>({
    sales_person: '', region: '', customer_name: '', company_name: '',
    info_source: '', channel: '', contact: '', email: '', other_contact: '',
    continent: '', country: '', visitor_need: '', visitor_need_cn: '', product_category: '',
    inquiry_role: '', fleet_size: '', is_star: false, status: 'pending', is_spam: false,
    i_status: '', is_use: 1, inquiry_date: '', raw_text: '',
  })

  // 加载数据（字典 + 业务员 + 排班）
  useEffect(() => {
    Promise.all([
      ...['channel', 'continent', 'product_category'].map(code => dictApi.getOptions(code)),
      salesApi.getPersons(),
      salesApi.getScheduleDates('亚太'),
      authApi.getMe(),
    ]).then(results => {
      const opts: Record<string, DictOption[]> = {}
      const codes = ['channel', 'continent', 'product_category']
      results.forEach((res: any, i: number) => {
        if (i < codes.length) {
          opts[codes[i]] = res.data as DictOption[]
        }
      })
      setDictOptions(opts)
      setSalesPersons(results[3].data as SalesPerson[])
      setScheduleDates(results[4].data as ScheduleDate[])

      // 根据当前用户的channel_id自动设置渠道和信息来源
      const currentUser = results[5].data as User
      if (currentUser && currentUser.channel_id) {
        const channelOpts = opts['channel'] || []
        const matched = channelOpts.find(o => Number(o.id) === currentUser.channel_id)
        if (matched) {
          setFormData(prev => ({ ...prev, channel: matched.value, info_source: matched.value }))
        }
      }
    }).catch(() => {})
  }, [])

  // 当前大区下的业务员
  const regionPersons = formData.region
    ? salesPersons.filter(p => p.region === formData.region && p.is_active)
    : []

  // 按大区分组的业务员（下拉选项）
  const groupedPersons: Record<string, SalesPerson[]> = {}
  REGIONS.forEach(r => {
    const persons = salesPersons.filter(p => p.region === r && p.is_active)
    if (persons.length > 0) groupedPersons[r] = persons
  })

  // ===== 核心：执行本地分配（不调任何 API） =====
  const doLocalAssign = (region: string): SalesPerson | null => {
    const persons = salesPersons.filter(p => p.region === region && p.is_active)
    const result = assignPerson(region, persons, scheduleDates)
    return result.person
  }

  // 大洲变更 → 映射大区 → 本地分配业务员
  const handleContinentChange = (value: string) => {
    setFormData(prev => ({ ...prev, continent: value }))

    if (value && CONTINENT_TO_REGION[value]) {
      const region = CONTINENT_TO_REGION[value]
      setFormData(prev => ({ ...prev, region }))

      // 本地分配
      const person = doLocalAssign(region)
      if (person) {
        setFormData(prev => ({ ...prev, sales_person: person.name_en }))
      }
    }
  }

  // 大区手动变更 → 本地分配
  const handleRegionChange = (value: string) => {
    setFormData(prev => ({ ...prev, region: value }))
    if (value) {
      const person = doLocalAssign(value)
      if (person) {
        setFormData(prev => ({ ...prev, sales_person: person.name_en }))
      }
    }
  }

  // 手动重新分配按钮
  const handleReAssign = () => {
    if (!formData.region) {
      setError('请先选择大区')
      return
    }
    setAssigning(true)
    setTimeout(() => {
      const person = doLocalAssign(formData.region)
      if (person) {
        setFormData(prev => ({ ...prev, sales_person: person.name_en }))
      }
      setAssigning(false)
    }, 300)
  }

  // ===== 粘贴处理 =====
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
  }

  // ===== AI 分析结果处理 =====
  const dictFieldMap: Record<string, string> = {
    channel: 'channel', continent: 'continent', product_category: 'product_category',
  }

  const matchDictValue = (field: string, aiValue: string): string => {
    if (!aiValue) return aiValue
    const options = dictOptions[dictFieldMap[field]] || []
    const exact = options.find(o => o.label.toLowerCase() === aiValue.toLowerCase() || o.value.toLowerCase() === aiValue.toLowerCase())
    if (exact) return exact.value
    const fuzzy = options.find(o => o.label.toLowerCase().includes(aiValue.toLowerCase()) || aiValue.toLowerCase().includes(o.label.toLowerCase()))
    return fuzzy ? fuzzy.value : aiValue
  }

  const processAIResult = (extracted: Record<string, any>) => {
    // 提取邮件日期
    const aiDate = extracted.inquiry_date || ''
    if (aiDate && !formData.inquiry_date) {
      extracted.inquiry_date = aiDate
    } else {
      delete extracted.inquiry_date  // 保留用户手动填写的日期
    }

    // 匹配字典值（channel和info_source保留用户默认渠道，不覆盖）
    for (const field of Object.keys(dictFieldMap)) {
      if (field === 'channel') {
        // 渠道始终使用用户默认渠道，忽略AI推断的渠道
        if (formData.channel) {
          delete extracted.channel
          delete extracted.info_source
          continue
        }
      }
      if (extracted[field]) extracted[field] = matchDictValue(field, extracted[field])
    }
    // info_source与channel保持一致
    if (extracted.channel) {
      extracted.info_source = extracted.channel
    }

    // 大洲 → 大区（本地映射，不用 AI）
    const continent = extracted.continent || ''
    if (continent && CONTINENT_TO_REGION[continent]) {
      extracted.region = CONTINENT_TO_REGION[continent]
    }

    // 大区 → 业务员（本地分配，不调 API）
    const region = extracted.region || ''
    if (region) {
      const person = doLocalAssign(region)
      if (person) {
        extracted.sales_person = person.name_en
      }
    }

    return extracted
  }

  const handleAnalyze = async () => {
    if (!inputType || (inputType === 'text' && !textInput.trim()) || (inputType === 'image' && !imageBase64)) {
      setError(inputType ? (inputType === 'text' ? '请输入邮件内容' : '请上传或粘贴邮件截图') : '请先粘贴邮件截图或输入邮件内容')
      return
    }
    setError(''); setAnalyzing(true); setAnalysisResult(null); setOcrText(''); setShowOcrEdit(false)

    try {
      const res = await inquiryApi.analyze(
        inputType === 'text' ? textInput : undefined,
        inputType === 'image' ? imageBase64 || undefined : undefined
      )
      setAnalysisResult(res.data)
      const rawText = res.data.extracted_data.raw_text || ''
      if (inputType === 'image' && rawText) { setOcrText(rawText); setEditedOcrText(rawText) }

      if (res.data.is_spam) {
        setFormData(prev => ({ ...prev, is_spam: true, raw_text: rawText || textInput }))
      } else {
        const processed = processAIResult({ ...res.data.extracted_data })
        setFormData(prev => ({ ...prev, ...processed, is_spam: false }))
      }
    } catch (err: unknown) {
      setError(`AI 分析失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleReAnalyze = async () => {
    if (!editedOcrText.trim()) { setError('修正后的文字不能为空'); return }
    setError(''); setAnalyzing(true); setAnalysisResult(null)
    try {
      const res = await inquiryApi.analyze(editedOcrText)
      setAnalysisResult(res.data); setOcrText(editedOcrText); setShowOcrEdit(false)
      if (res.data.is_spam) {
        setFormData(prev => ({ ...prev, is_spam: true, raw_text: editedOcrText }))
      } else {
        const processed = processAIResult({ ...res.data.extracted_data })
        setFormData(prev => ({ ...prev, ...processed, raw_text: editedOcrText, is_spam: false }))
      }
    } catch (err: unknown) {
      setError(`AI 分析失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try { await inquiryApi.create(formData); navigate('/inquiries') }
    catch { setError('保存失败') }
    finally { setSaving(false) }
  }

  const updateField = (field: keyof InquiryCreate, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // 渲染字典下拉
  const renderDictSelect = (code: string, field: keyof InquiryCreate, label: string, placeholder: string, customOnChange?: (val: string) => void) => {
    const options = dictOptions[code] || []
    const currentValue = formData[field] as string
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
              updateField(field, val)
              if (customOnChange) customOnChange(val)
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

  // 渲染普通输入
  const renderInput = (field: keyof InquiryCreate, label: string, placeholder: string) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      <input type="text" value={formData[field] as string} onChange={(e) => updateField(field, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
    </div>
  )

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
            <p className="text-slate-500 text-sm mt-1">直接粘贴邮件截图或文字，AI 自动提取结构化信息并分配业务员</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !formData.customer_name}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium rounded-lg hover:from-primary-600 hover:to-accent-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary-500/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          保存询盘
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Input Area */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
                  <Upload className="w-3.5 h-3.5" /> 上传图片
                </button>
                <span className="text-xs text-slate-300">|</span>
                <span className="text-xs text-slate-400">支持 Ctrl+V 粘贴图片或文字</span>
              </div>
              {inputType && (
                <button onClick={clearInput} className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors">
                  <X className="w-3.5 h-3.5" /> 清除
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>

            {inputType === 'image' && imagePreview && (
              <div className="p-4">
                <img src={imagePreview} alt="Preview" className="w-full max-h-[400px] object-contain rounded-lg bg-slate-50" />
              </div>
            )}
            {inputType === 'text' && (
              <textarea ref={textareaRef} value={textInput} onChange={(e) => setTextInput(e.target.value)}
                placeholder="在此粘贴邮件内容..." rows={10} autoFocus
                className="w-full px-4 py-3 bg-white text-sm focus:outline-none resize-none border-none" />
            )}
            {!inputType && (
              <div className="p-12 text-center" onPaste={handlePaste}>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="flex flex-col items-center gap-1.5 px-5 py-4 rounded-lg border border-dashed border-slate-200 hover:border-primary-300 hover:bg-primary-50/30 transition-colors">
                    <ImageIcon className="w-7 h-7 text-slate-300" /><span className="text-xs text-slate-400">粘贴截图</span>
                  </div>
                  <span className="text-slate-300 text-lg font-light">或</span>
                  <div className="flex flex-col items-center gap-1.5 px-5 py-4 rounded-lg border border-dashed border-slate-200 hover:border-primary-300 hover:bg-primary-50/30 transition-colors">
                    <FileText className="w-7 h-7 text-slate-300" /><span className="text-xs text-slate-400">粘贴文字</span>
                  </div>
                </div>
                <p className="text-sm text-slate-400">在页面空白处 Ctrl+V 粘贴，或点击上方「上传图片」</p>
              </div>
            )}
          </div>

          <button onClick={handleAnalyze}
            disabled={analyzing || !inputType || (inputType === 'image' && !imageBase64) || (inputType === 'text' && !textInput.trim())}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/20 flex items-center justify-center gap-2">
            {analyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> AI 分析中...</> : <><Sparkles className="w-5 h-5" /> AI 智能分析</>}
          </button>

          {ocrText && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileSearch className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">OCR 识别结果</span>
                </div>
                {!showOcrEdit ? (
                  <button onClick={() => { setEditedOcrText(ocrText); setShowOcrEdit(true) }} className="text-xs text-primary-600 hover:text-primary-700">修正并重新分析</button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setShowOcrEdit(false); setEditedOcrText(ocrText) }} className="text-xs text-slate-500 hover:text-slate-700">取消</button>
                    <button onClick={handleReAnalyze} disabled={analyzing} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                      {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : null} 重新分析
                    </button>
                  </div>
                )}
              </div>
              {showOcrEdit ? (
                <textarea value={editedOcrText} onChange={(e) => setEditedOcrText(e.target.value)} rows={6}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none font-mono" />
              ) : (
                <pre className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 max-h-[150px] overflow-auto whitespace-pre-wrap font-mono">{ocrText}</pre>
              )}
            </div>
          )}

          {analysisResult && (
            <div className={`rounded-xl border p-4 ${analysisResult.is_spam ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {analysisResult.is_spam ? (
                  <><AlertTriangle className="w-5 h-5 text-amber-600" /><span className="font-semibold text-amber-800">垃圾邮件</span></>
                ) : (
                  <><CheckCircle className="w-5 h-5 text-emerald-600" /><span className="font-semibold text-emerald-800">有效询盘 - 信息已提取</span></>
                )}
              </div>
              {analysisResult.is_spam && analysisResult.spam_reason && (
                <p className="text-sm text-amber-700">{analysisResult.spam_reason}</p>
              )}
            </div>
          )}
        </div>

        {/* Right: Form */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg text-slate-800">询盘信息</h2>
            {formData.region && formData.continent && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-primary-50 text-primary-700 rounded-full border border-primary-200">
                <Zap className="w-3 h-3" /> {formData.continent} → {formData.region}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                {formData.continent && CONTINENT_TO_REGION[formData.continent] && <span className="ml-1.5 text-primary-500 font-normal">(自动)</span>}
              </label>
              <div className="relative">
                <select value={formData.region} onChange={(e) => handleRegionChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 appearance-none pr-8">
                  <option value="">请选择大区</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">业务员</label>
              <div className="flex gap-1.5">
                <div className="relative flex-1 min-w-0">
                  <select value={formData.sales_person} onChange={(e) => updateField('sales_person', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 appearance-none pr-8">
                    <option value="">{formData.region ? '请选择业务员' : '请先选择大洲/大区'}</option>
                    {Object.entries(groupedPersons).map(([region, persons]) => (
                      <optgroup key={region} label={region}>
                        {persons.map(p => (
                          <option key={p.id} value={p.name_en}>{p.name} ({p.name_en}) - {p.email}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <button type="button" onClick={handleReAssign} disabled={assigning || !formData.region}
                  title="重新随机分配" className="shrink-0 px-2.5 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg hover:from-violet-600 hover:to-purple-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* === 客户信息 === */}
            <div className="col-span-2 mt-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100">客户信息</div>
            </div>
            {renderInput('customer_name', '客户名字', '客户姓名')}
            {renderInput('company_name', '公司名字', '公司名称')}
            {renderInput('country', '国家', '客户所在国家')}

            {/* === 获客信息 === */}
            <div className="col-span-2 mt-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100">获客信息</div>
            </div>
            {renderInput('info_source', '信息来源', '询盘获取源头')}
            {renderDictSelect('channel', 'channel', '渠道', '请选择渠道')}

            {/* === 联系方式 === */}
            <div className="col-span-2 mt-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100">联系方式</div>
            </div>
            {renderInput('contact', '联系方式', '联系电话')}
            {renderInput('email', 'Email', '邮箱地址')}
            <div className="col-span-2">
              {renderInput('other_contact', '其他联系方式', 'WhatsApp / Skype / Telegram 等')}
            </div>

            {/* === 需求信息 === */}
            <div className="col-span-2 mt-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100">需求信息</div>
            </div>
            {renderDictSelect('product_category', 'product_category', '产品需求类别', '请选择类别')}
            {renderInput('inquiry_role', '询盘身份', '客户身份类型')}
            {renderInput('fleet_size', '车队规模', '设备数量/车队规模')}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">访客需求（原文）</label>
              <textarea value={formData.visitor_need} onChange={(e) => updateField('visitor_need', e.target.value)}
                placeholder="客户原始需求描述（保留原文语言）" rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">需求（中文翻译）</label>
              <textarea value={formData.visitor_need_cn} onChange={(e) => updateField('visitor_need_cn', e.target.value)}
                placeholder="客户需求的中文翻译" rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none" />
            </div>

            {/* === 询盘日期 === */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">询盘日期 <span className="text-slate-400 font-normal">(邮件发送日期)</span></label>
              <input type="date" value={formData.inquiry_date} onChange={(e) => updateField('inquiry_date', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            </div>

            {/* === 标记 === */}
            <div className="col-span-2 mt-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100">标记</div>
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_star} onChange={(e) => updateField('is_star', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-slate-700">星级客户</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_spam} onChange={(e) => updateField('is_spam', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-red-500 focus:ring-red-500" />
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span className="text-sm text-slate-700">垃圾邮件</span>
              </label>
            </div>
          </div>

          {formData.raw_text && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button onClick={() => setShowRaw(!showRaw)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
                {showRaw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showRaw ? '隐藏原文' : '查看原文'}
              </button>
              {showRaw && <pre className="mt-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 max-h-[200px] overflow-auto whitespace-pre-wrap font-mono">{formData.raw_text}</pre>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
