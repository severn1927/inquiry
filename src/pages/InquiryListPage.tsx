import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { inquiryApi, dictApi } from '@/services/api'
import type { Inquiry, DictOption } from '@/types'
import { formatDate } from '@/utils'
import { ExportModal } from '@/components/ExportModal'

// 格式化纯日期为 YYYY/M/D 格式（如 2026/5/13）
const formatOnlyDate = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}
import {
  Search, Filter, PlusCircle, Star, Eye, Trash2, Mail,
  ChevronLeft, ChevronRight, RefreshCw, ChevronDown, Zap, Download,
} from 'lucide-react'

export function InquiryListPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [continentFilter, setContinentFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [iStatusFilter, setIStatusFilter] = useState('')
  const [isUseFilter, setIsUseFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [dictOptions, setDictOptions] = useState<Record<string, DictOption[]>>({})
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null)
  const [showExport, setShowExport] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const pageSize = 20

  // 加载字典
  useEffect(() => {
    Promise.all(
      ['channel', 'continent', 'region', 'product_category', 'i_status', 'is_use'].map(code => dictApi.getOptions(code))
    ).then(results => {
      const codes = ['channel', 'continent', 'region', 'product_category', 'i_status', 'is_use']
      const opts: Record<string, DictOption[]> = {}
      results.forEach((res, i) => {
        opts[codes[i]] = res.data
      })
      setDictOptions(opts)
    }).catch(() => {})
  }, [])

  const fetchData = () => {
    setLoading(true)
    inquiryApi.getList({
      page,
      page_size: pageSize,
      search: search || undefined,
    }).then((res) => {
      setInquiries(res.data.items)
      setTotal(res.data.total)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchData()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条询盘吗？')) return
    await inquiryApi.delete(id)
    fetchData()
  }

  // 内联修改字段
  const handleCellUpdate = useCallback(async (id: number, field: string, value: any) => {
    const prev = inquiries.find(i => i.id === id)
    if (!prev) return
    // 乐观更新
    setInquiries(items => items.map(i => i.id === id ? { ...i, [field]: value } : i))
    setEditingCell(null)
    try {
      await inquiryApi.update(id, { [field]: value })
    } catch {
      // 回滚
      setInquiries(items => items.map(i => i.id === id ? prev : i))
      alert('更新失败，请重试')
    }
  }, [inquiries])

  // 前端筛选（字典字段）
  const filteredInquiries = useMemo(() => {
    return inquiries.filter(item => {
      if (continentFilter && item.continent !== continentFilter) return false
      if (regionFilter && item.region !== regionFilter) return false
      if (channelFilter && item.channel !== channelFilter) return false
      if (iStatusFilter && item.i_status !== iStatusFilter) return false
      if (isUseFilter !== '' && String(item.is_use) !== isUseFilter) return false
      return true
    })
  }, [inquiries, continentFilter, regionFilter, channelFilter, iStatusFilter, isUseFilter])

  // 字典值 → 标签
  const getDictLabel = (code: string, value: string): string => {
    if (!value) return '-'
    const options = dictOptions[code] || []
    const found = options.find(o => o.value === value)
    return found ? found.label : value
  }

  // 导出用的当前筛选条件
  const exportFilters = useMemo(() => ({
    continent: continentFilter || undefined,
    region: regionFilter || undefined,
    channel: channelFilter || undefined,
    i_status: iStatusFilter || undefined,
  }), [continentFilter, regionFilter, channelFilter, iStatusFilter])

  // 可选择的行（用于导出弹窗）
  const selectableRows = useMemo(() =>
    filteredInquiries.map(item => ({
      id: item.id,
      inquiry_no: item.inquiry_no,
      customer_name: item.customer_name,
      company_name: item.company_name,
    })),
    [filteredInquiries]
  )

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInquiries.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredInquiries.map(i => i.id)))
    }
  }

  const toggleSelectRow = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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

  // 渠道徽章颜色
  const getChannelBadgeClass = (value: string) => {
    if (!value) return ''
    if (value.includes('官网') || value.includes('独立站')) return 'bg-blue-50 text-blue-700'
    if (value.includes('阿里')) return 'bg-orange-50 text-orange-700'
    if (value.includes('社媒') || value.includes('Reach')) return 'bg-purple-50 text-purple-700'
    return 'bg-slate-50 text-slate-600'
  }

  // 大区颜色
  const getRegionBadgeClass = (value: string) => {
    const map: Record<string, string> = {
      '美洲': 'bg-blue-50 text-blue-700 border-blue-200',
      '欧非': 'bg-purple-50 text-purple-700 border-purple-200',
      '亚太': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }
    return map[value] || 'bg-slate-50 text-slate-600 border-slate-200'
  }

  // 统计有效询盘数
  const stats = useMemo(() => {
    const valid = filteredInquiries.filter(i => i.is_use === 1).length
    return { valid, total: filteredInquiries.length }
  }, [filteredInquiries])

  const totalPages = Math.ceil(total / pageSize)

  // 筛选下拉组件
  const FilterSelect = ({ value, onChange, options, placeholder, allLabel = '全部', label }: {
    value: string; onChange: (v: string) => void;
    options: DictOption[]; placeholder: string; allLabel?: string; label?: string
  }) => (
    <div className="flex items-center gap-1.5">
      {label && <span className="text-xs text-slate-500 whitespace-nowrap">{label}</span>}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-3 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 hover:border-slate-300 transition-colors"
        >
          <option value="">{allLabel}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  )

  // 内联可编辑单元格 - 跟进状态
  const EditableStatusCell = ({ item }: { item: Inquiry }) => {
    const isEditing = editingCell?.id === item.id && editingCell?.field === 'i_status'
    const options = dictOptions['i_status'] || []

    if (isEditing) {
      return (
        <select
          autoFocus
          value={item.i_status || ''}
          onChange={(e) => handleCellUpdate(item.id, 'i_status', e.target.value)}
          onBlur={() => setEditingCell(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setEditingCell(null) }}
          className="w-full px-2 py-1 text-xs bg-white border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/30 shadow-sm"
        >
          <option value="">-</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )
    }

    return (
      <div
        onClick={() => setEditingCell({ id: item.id, field: 'i_status' })}
        className="cursor-pointer hover:bg-primary-50 rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors group/status"
        title="点击修改"
      >
        {item.i_status ? (
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${getIStatusBadgeClass(item.i_status)} group-hover/status:ring-2 group-hover/status:ring-primary-300/50`}>
            {getDictLabel('i_status', item.i_status)}
          </span>
        ) : (
          <span className="text-slate-400 group-hover/status:text-slate-500">-</span>
        )}
      </div>
    )
  }

  // 内联可编辑单元格 - 有效询盘
  const EditableUseCell = ({ item }: { item: Inquiry }) => {
    const isEditing = editingCell?.id === item.id && editingCell?.field === 'is_use'

    if (isEditing) {
      return (
        <select
          autoFocus
          value={String(item.is_use)}
          onChange={(e) => handleCellUpdate(item.id, 'is_use', e.target.value === '1' ? 1 : 0)}
          onBlur={() => setEditingCell(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setEditingCell(null) }}
          className="px-2 py-1 text-xs bg-white border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/30 shadow-sm text-center"
        >
          <option value="1">有效</option>
          <option value="0">无效</option>
        </select>
      )
    }

    return (
      <div
        onClick={() => setEditingCell({ id: item.id, field: 'is_use' })}
        className="flex items-center justify-center cursor-pointer hover:bg-primary-50 rounded-full w-6 h-6 mx-auto transition-colors"
        title={item.is_use === 1 ? '点击设为无效' : '点击设为有效'}
      >
        {item.is_use === 1 ? (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold hover:bg-emerald-200 transition-colors">Y</span>
        ) : (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 text-xs hover:bg-slate-200 transition-colors">-</span>
        )}
      </div>
    )
  }

  const allOnPage = filteredInquiries.length > 0 && selectedIds.size === filteredInquiries.length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">询盘列表</h1>
          <p className="text-slate-500 text-sm mt-1">
            共 {total} 条 | 本页显示 {stats.total} 条
            {stats.valid > 0 && <span className="ml-2 text-emerald-600">有效 {stats.valid}</span>}
            {selectedIds.size > 0 && <span className="ml-2 text-primary-600">已选 {selectedIds.size} 条</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExport(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 hover:border-primary-300 hover:text-primary-600 transition-all"
            title="导出Excel"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            title="刷新"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/inquiries/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium rounded-lg hover:from-primary-600 hover:to-accent-600 transition-all shadow-md shadow-primary-500/20 btn-glow"
          >
            <PlusCircle className="w-4 h-4" />
            新增询盘
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* 搜索 */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索客户名、公司、邮箱..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 transition-colors">
              搜索
            </button>
          </form>

          {/* 分隔线 */}
          <div className="w-px h-6 bg-slate-200" />

          {/* 字典筛选 */}
          <FilterSelect value={continentFilter} onChange={(v) => setContinentFilter(v)}
            options={dictOptions['continent'] || []} placeholder="大洲" label="大洲" />
          <FilterSelect value={regionFilter} onChange={(v) => setRegionFilter(v)}
            options={dictOptions['region'] || []} placeholder="大区" label="大区" />
          <FilterSelect value={channelFilter} onChange={(v) => setChannelFilter(v)}
            options={dictOptions['channel'] || []} placeholder="渠道" label="渠道" />
          <FilterSelect value={iStatusFilter} onChange={(v) => setIStatusFilter(v)}
            options={dictOptions['i_status'] || []} placeholder="跟进状态" label="跟进状态" />
          <FilterSelect value={isUseFilter} onChange={(v) => setIsUseFilter(v)}
            options={dictOptions['is_use'] || []} placeholder="有效询盘" label="有效" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
            加载中...
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">暂无询盘数据</p>
            <Link to="/inquiries/new" className="text-sm text-primary-500 hover:text-primary-600">
              立即创建第一条询盘
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-stripe text-sm" style={{minWidth: '1500px'}}>
              <thead>
                <tr className="bg-gradient-to-r from-primary-500 to-accent-500">
                  <th className="px-2 py-2.5 text-center w-10">
                    <input
                      type="checkbox"
                      checked={allOnPage}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-white/50 text-primary-500 bg-white/20 focus:ring-primary-500/30 cursor-pointer"
                      title={allOnPage ? '取消全选' : '全选本页'}
                    />
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">编号</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">业务员</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">大洲/大区</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">客户</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">公司</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">国家</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">渠道</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">联系方式</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">产品类别</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">跟进状态</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-center">有效</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-center">星级</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">询盘日期</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">创建时间</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInquiries.map((item) => (
                  <tr key={item.id} className={`hover:bg-primary-50/30 transition-colors group ${selectedIds.has(item.id) ? 'bg-primary-50/60' : ''}`}>
                    {/* 行选择 */}
                    <td className="px-2 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelectRow(item.id)}
                        className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500/30 cursor-pointer"
                      />
                    </td>
                    {/* 编号 */}
                    <td className="px-3 py-2.5">
                      <Link to={`/inquiries/${item.id}`} className="text-xs font-mono text-primary-600 hover:text-primary-700">
                        {item.inquiry_no}
                      </Link>
                    </td>
                    {/* 业务员 */}
                    <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap font-medium">{item.sales_person || '-'}</td>
                    {/* 大洲/大区 */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {item.region ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getRegionBadgeClass(item.region)}`}>
                          {item.continent && <Zap className="w-2.5 h-2.5" />}
                          {item.region}
                        </span>
                      ) : item.continent ? (
                        <span className="text-xs text-slate-500">{item.continent}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    {/* 客户 */}
                    <td className="px-3 py-2.5">
                      <Link to={`/inquiries/${item.id}`} className="text-slate-800 font-medium hover:text-primary-600 truncate block max-w-[140px]">
                        {item.customer_name || '-'}
                      </Link>
                      {item.email && (
                        <div className="text-xs text-slate-400 truncate max-w-[140px]">{item.email}</div>
                      )}
                    </td>
                    {/* 公司 */}
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap max-w-[120px] truncate">{item.company_name || '-'}</td>
                    {/* 国家 */}
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{item.country || '-'}</td>
                    {/* 渠道 - 字典标签 */}
                    <td className="px-3 py-2.5">
                      {item.channel ? (
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getChannelBadgeClass(item.channel)}`}>
                          {getDictLabel('channel', item.channel)}
                        </span>
                      ) : '-'}
                    </td>
                    {/* 联系方式 */}
                    <td className="px-3 py-2.5">
                      <div className="text-slate-600 whitespace-nowrap max-w-[130px] truncate">{item.contact || '-'}</div>
                      {item.other_contact && (
                        <div className="text-xs text-slate-400 truncate max-w-[130px]">{item.other_contact}</div>
                      )}
                    </td>
                    {/* 产品类别 - 字典标签 */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {item.product_category ? (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-violet-50 text-violet-700">
                          {getDictLabel('product_category', item.product_category)}
                        </span>
                      ) : '-'}
                    </td>
                    {/* 跟进状态 - 可编辑 */}
                    <td className="px-3 py-2.5">
                      <EditableStatusCell item={item} />
                    </td>
                    {/* 有效 - 可点击切换 */}
                    <td className="px-3 py-2.5 text-center">
                      <EditableUseCell item={item} />
                    </td>
                    {/* 星级 */}
                    <td className="px-3 py-2.5 text-center">
                      {item.is_star && <Star className="w-4 h-4 text-amber-400 fill-amber-400 mx-auto" />}
                    </td>
                    {/* 询盘日期 */}
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap text-xs">
                      {item.inquiry_date ? formatOnlyDate(item.inquiry_date) : <span className="text-slate-400">-</span>}
                    </td>
                    {/* 创建时间 */}
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap text-xs">{formatDate(item.created_at)}</td>
                    {/* 操作 */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          to={`/inquiries/${item.id}`}
                          className="p-1.5 rounded hover:bg-slate-100 transition-colors opacity-60 group-hover:opacity-100"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4 text-slate-400 hover:text-primary-500" />
                        </Link>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded hover:bg-red-50 transition-colors opacity-60 group-hover:opacity-100"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              第 {page} / {totalPages} 页
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        filters={exportFilters}
        getDictLabel={getDictLabel}
        selectableRows={selectableRows}
      />
    </div>
  )
}
