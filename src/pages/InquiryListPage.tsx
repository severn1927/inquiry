import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { inquiryApi } from '@/services/api'
import type { Inquiry } from '@/types'
import { formatDate } from '@/utils'
import {
  Search, PlusCircle, Eye, Trash2, Mail,
  ChevronLeft, ChevronRight, RefreshCw, ChevronDown, Zap, Download,
} from 'lucide-react'
import { exportApi } from '@/services/api'
import { saveAs } from 'file-saver'

const REGIONS = ['全部', '美洲', '欧非', '亚太']

const CONTINENTS = ['全部', '亚洲', '欧洲', '非洲', '北美洲', '南美洲', '大洋洲', '中东']

export function InquiryListPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [continentFilter, setContinentFilter] = useState('')
  const [isSpamFilter, setIsSpamFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const pageSize = 20

  const fetchData = () => {
    setLoading(true)
    inquiryApi.getList({
      page,
      page_size: pageSize,
      keyword: search || undefined,
      region: regionFilter || undefined,
      is_spam: isSpamFilter || undefined,
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

  const handleExport = async () => {
    try {
      const res = await exportApi.exportExcel()
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `询盘数据_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch {
      alert('导出失败')
    }
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

  const totalPages = Math.ceil(total / pageSize)

  const FilterSelect = ({ value, onChange, options, label }: {
    value: string; onChange: (v: string) => void; options: string[]; label: string
  }) => (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-slate-500 whitespace-nowrap">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-3 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 hover:border-slate-300 transition-colors"
        >
          {options.map(o => <option key={o} value={o === '全部' ? '' : o}>{o}</option>)}
        </select>
        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  )

  const validCount = inquiries.filter(i => i.is_spam === 0).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">询盘列表</h1>
          <p className="text-slate-500 text-sm mt-1">
            共 {total} 条 | 本页 {inquiries.length} 条
            {validCount > 0 && <span className="ml-2 text-emerald-600">有效 {validCount}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
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

          <div className="w-px h-6 bg-slate-200" />

          <FilterSelect value={regionFilter} onChange={(v) => { setRegionFilter(v); setPage(1) }}
            options={REGIONS} label="大区" />
          <FilterSelect value={continentFilter} onChange={(v) => { setContinentFilter(v); setPage(1) }}
            options={CONTINENTS} label="大洲" />
          <FilterSelect value={isSpamFilter} onChange={(v) => { setIsSpamFilter(v); setPage(1) }}
            options={['全部', '有效询盘', '垃圾邮件']} label="状态" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
            加载中...
          </div>
        ) : inquiries.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">暂无询盘数据</p>
            <Link to="/inquiries/new" className="text-sm text-primary-500 hover:text-primary-600">
              立即创建第一条询盘
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-stripe text-sm" style={{minWidth: '1400px'}}>
              <thead>
                <tr className="bg-gradient-to-r from-primary-500 to-accent-500">
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">编号</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">业务员</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">大洲/大区</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">客户</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">公司</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">国家</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">渠道</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">联系方式</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">产品类别</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">访客需求</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-center">状态</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-left">登记时间</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-white text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inquiries.map((item) => (
                  <tr key={item.id} className="hover:bg-primary-50/30 transition-colors group">
                    <td className="px-3 py-2.5">
                      <Link to={`/inquiries/${item.id}`} className="text-xs font-mono text-primary-600 hover:text-primary-700">
                        {item.inquiry_no}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap font-medium">{item.staff || '-'}</td>
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
                    <td className="px-3 py-2.5">
                      <Link to={`/inquiries/${item.id}`} className="text-slate-800 font-medium hover:text-primary-600 truncate block max-w-[140px]">
                        {item.customer_name || '-'}
                      </Link>
                      {item.email && (
                        <div className="text-xs text-slate-400 truncate max-w-[140px]">{item.email}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap max-w-[120px] truncate">{item.company_name || '-'}</td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{item.country || '-'}</td>
                    <td className="px-3 py-2.5">
                      {item.channel ? (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700">
                          {item.channel}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-slate-600 whitespace-nowrap max-w-[120px] truncate">{item.phone || '-'}</div>
                      {item.other_contact && (
                        <div className="text-xs text-slate-400 truncate max-w-[120px]">{item.other_contact}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {item.product_category ? (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-violet-50 text-violet-700">
                          {item.product_category}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 max-w-[200px] truncate">{item.visitor_need || '-'}</td>
                    <td className="px-3 py-2.5 text-center">
                      {item.is_spam ? (
                        <span className="badge bg-red-50 text-red-600 border border-red-200">垃圾</span>
                      ) : (
                        <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">有效</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap text-xs">{formatDate(item.created_at)}</td>
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
    </div>
  )
}
