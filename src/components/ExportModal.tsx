import { useState, useEffect } from 'react'
import { inquiryApi } from '@/services/api'
import { X, Download, ArrowUp, ArrowDown, Loader2, CheckSquare, Square } from 'lucide-react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

interface ExportField {
  key: string
  label: string
  checked: boolean
  order: number
}

// 按目标Excel表格的列顺序定义字段，去掉审核/垃圾/有效/创建时间等非必要字段
const ALL_FIELDS: Omit<ExportField, 'checked' | 'order'>[] = [
  { key: 'sales_person', label: '业务员' },
  { key: 'inquiry_no', label: '询盘编号' },
  { key: 'region', label: '大区' },
  { key: 'customer_name', label: '客户名字' },
  { key: 'company_name', label: '公司名字' },
  { key: 'info_source', label: '信息来源' },
  { key: 'channel', label: '渠道' },
  { key: 'contact', label: '联系方式' },
  { key: 'email', label: 'Email' },
  { key: 'other_contact', label: '其他联系方式' },
  { key: 'continent', label: '大洲' },
  { key: 'country', label: '国家' },
  { key: 'visitor_need_cn', label: '访客需求' },
  { key: 'product_category', label: '产品需求类别' },
  { key: 'inquiry_date', label: '询盘月份' },
  { key: 'is_star', label: '是否星级' },
  { key: 'i_status', label: '状态' },
]

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  /** 当前页面的筛选条件 */
  filters?: {
    status?: string
    continent?: string
    region?: string
    channel?: string
    i_status?: string
    is_use?: string
  }
  /** 字典值翻译函数 */
  getDictLabel?: (code: string, value: string) => string
  /** 允许选择导出的行（传空数组表示"导出全部"模式） */
  selectableRows?: Array<{
    id: number
    inquiry_no?: string
    customer_name?: string
    company_name?: string
  }>
}

export function ExportModal({ isOpen, onClose, filters = {}, getDictLabel, selectableRows }: ExportModalProps) {
  const [fields, setFields] = useState<ExportField[]>([])
  const [exporting, setExporting] = useState(false)
  // exportMode: 'all' 导出全部筛选数据 | 'selected' 仅导出选中的行
  const [exportMode, setExportMode] = useState<'all' | 'selected'>('all')
  // 当 exportMode='selected' 时，记录用户勾选的行ID
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (isOpen) {
      setFields(ALL_FIELDS.map((f, i) => ({ ...f, checked: true, order: i })))
      // 如果没有可选行，默认导出全部
      if (selectableRows && selectableRows.length > 0) {
        setExportMode('all')
        setSelectedRowIds(new Set())
      } else {
        setExportMode('all')
      }
    }
  }, [isOpen, selectableRows])

  const toggleField = (key: string) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, checked: !f.checked } : f))
  }

  const toggleAll = (checked: boolean) => {
    setFields(prev => prev.map(f => ({ ...f, checked })))
  }

  const moveField = (idx: number, direction: 'up' | 'down') => {
    setFields(prev => {
      const arr = [...prev]
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= arr.length) return arr
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr.map((f, i) => ({ ...f, order: i }))
    })
  }

  // 切换行选择
  const toggleRow = (id: number) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllRows = (checked: boolean) => {
    if (selectableRows) {
      setSelectedRowIds(checked ? new Set(selectableRows.map(r => r.id)) : new Set())
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const params: Record<string, any> = {}
      if (filters.continent) params.continent = filters.continent
      if (filters.region) params.region = filters.region
      if (filters.channel) params.channel = filters.channel
      if (filters.i_status) params.i_status = filters.i_status

      // 如果是选中行模式，传入ID列表
      if (exportMode === 'selected' && selectedRowIds.size > 0) {
        params.ids = Array.from(selectedRowIds).join(',')
      }

      const res = await inquiryApi.exportData(params)
      let data = res.data
      if (!data || data.length === 0) {
        alert('没有可导出的数据')
        setExporting(false)
        return
      }

      // 字典值翻译
      const dictFields = ['channel', 'continent', 'region', 'product_category', 'i_status', 'info_source']
      const translated = data.map((row: Record<string, any>) => {
        const r: Record<string, any> = {}
        // 只保留需要的字段
        const selectedFields = fields.filter(f => f.checked)
        selectedFields.forEach(f => {
          let val = row[f.key] ?? ''
          // 字典值翻译
          if (dictFields.includes(f.key) && val && getDictLabel) {
            val = getDictLabel(f.key, val)
          }
          // 星级转换
          if (f.key === 'is_star') {
            val = val ? 'Y' : ''
          }
          // 询盘日期格式化
          if (f.key === 'inquiry_date' && val) {
            try {
              const d = new Date(val)
              if (!isNaN(d.getTime())) {
                val = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
              }
            } catch { /* keep original */ }
          }
          r[f.key] = val
        })
        return r
      })

      // 按字段顺序生成表头和数据行
      const selectedFields = fields.filter(f => f.checked)
      const headers = selectedFields.map(f => f.label)
      const rows = translated.map((row: Record<string, any>) =>
        selectedFields.map(f => row[f.key] ?? '')
      )

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      // 设置列宽
      ws['!cols'] = selectedFields.map(f => {
        if (f.key === 'visitor_need_cn') return { wch: 45 }
        if (f.key === 'customer_name' || f.key === 'company_name') return { wch: 22 }
        return { wch: 14 }
      })

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '询盘数据')

      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `询盘数据_${new Date().toISOString().slice(0, 10)}.xlsx`)
      onClose()
    } catch {
      alert('导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  if (!isOpen) return null

  const selectedFieldCount = fields.filter(f => f.checked).length
  const hasSelectableRows = selectableRows && selectableRows.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[540px] max-h-[85vh] flex flex-col animate-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-semibold text-slate-800">导出询盘数据</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* 导出范围选择 */}
          {hasSelectableRows && (
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs font-medium text-slate-500 mb-2">导出范围</div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="exportMode"
                    checked={exportMode === 'all'}
                    onChange={() => setExportMode('all')}
                    className="w-4 h-4 text-primary-500 border-slate-300 focus:ring-primary-500/30"
                  />
                  <span className="text-sm text-slate-700">导出全部筛选结果</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="exportMode"
                    checked={exportMode === 'selected'}
                    onChange={() => setExportMode('selected')}
                    className="w-4 h-4 text-primary-500 border-slate-300 focus:ring-primary-500/30"
                  />
                  <span className="text-sm text-slate-700">
                    仅导出选中行
                    <span className="ml-1 text-xs text-slate-400">({selectedRowIds.size}/{selectableRows!.length})</span>
                  </span>
                </label>
              </div>

              {/* 选中行列表 */}
              {exportMode === 'selected' && (
                <div className="mt-3 max-h-[180px] overflow-y-auto border border-slate-200 rounded-lg">
                  <div className="sticky top-0 bg-slate-100 px-3 py-1.5 flex items-center gap-3 border-b border-slate-200">
                    <button
                      onClick={() => toggleAllRows(selectedRowIds.size !== selectableRows!.length)}
                      className="text-xs text-primary-500 hover:text-primary-600 font-medium"
                    >
                      {selectedRowIds.size === selectableRows!.length ? '取消全选' : '全选'}
                    </button>
                    <span className="text-xs text-slate-400">{selectedRowIds.size} 项已选</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {selectableRows!.map(row => (
                      <label
                        key={row.id}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-primary-50/30 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRowIds.has(row.id)}
                          onChange={() => toggleRow(row.id)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-primary-500 focus:ring-primary-500/30"
                        />
                        <span className="text-xs text-slate-600 font-medium">{row.inquiry_no || `#${row.id}`}</span>
                        <span className="text-xs text-slate-400 truncate">
                          {row.customer_name || row.company_name || '-'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 字段选择 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">导出字段</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  已选 <span className="font-semibold text-primary-600">{selectedFieldCount}</span> / {fields.length}
                </span>
                <span className="text-slate-300">|</span>
                <button onClick={() => toggleAll(true)} className="text-xs text-primary-500 hover:text-primary-600 font-medium">
                  全选
                </button>
                <span className="text-slate-300">|</span>
                <button onClick={() => toggleAll(false)} className="text-xs text-slate-400 hover:text-slate-500 font-medium">
                  取消
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {fields.map((field, idx) => (
                <div
                  key={field.key}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors ${
                    field.checked ? 'bg-primary-50/50' : 'opacity-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={field.checked}
                    onChange={() => toggleField(field.key)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-primary-500 focus:ring-primary-500/30 shrink-0"
                  />
                  <span className="text-sm text-slate-700 flex-1 truncate">{field.label}</span>
                  <div className="flex flex-col items-center gap-0 shrink-0">
                    <button
                      onClick={() => moveField(idx, 'up')}
                      disabled={idx === 0}
                      className="p-0 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"
                      title="上移"
                    >
                      <ArrowUp className="w-3 h-3 text-slate-400" />
                    </button>
                    <button
                      onClick={() => moveField(idx, 'down')}
                      disabled={idx === fields.length - 1}
                      className="p-0 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"
                      title="下移"
                    >
                      <ArrowDown className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={selectedFieldCount === 0 || exporting || (exportMode === 'selected' && selectedRowIds.size === 0)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium rounded-lg hover:from-primary-600 hover:to-accent-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary-500/20"
          >
            {exporting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 导出中...</>
            ) : (
              <><Download className="w-4 h-4" /> 导出 Excel</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
