import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { inquiryApi } from '@/services/api'
import type { DashboardStats } from '@/types'
import { formatOnlyDate } from '@/utils'
import {
  Mail, CheckCircle, XCircle, Star, TrendingUp,
  PlusCircle, ArrowRight, Zap, CalendarDays, CalendarRange, Users,
} from 'lucide-react'

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    inquiryApi.getStats().then((res) => {
      setStats(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-slate-800">仪表盘</h1>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-slate-100 animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-slate-100 mb-3" />
              <div className="h-8 bg-slate-100 rounded mb-2" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const statCards = [
    { label: '总询盘', value: stats.total_inquiries, icon: Mail, color: 'text-primary-500', bg: 'bg-primary-50' },
    { label: '有效询盘', value: stats.valid_count, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: '无效询盘', value: stats.invalid_count, icon: XCircle, color: 'text-slate-400', bg: 'bg-slate-50' },
    { label: '星级客户', value: stats.star_count, icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: '本月新增', value: stats.this_month_count, icon: CalendarDays, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: '本周新增', value: stats.this_week_count, icon: CalendarRange, color: 'text-violet-500', bg: 'bg-violet-50' },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">仪表盘</h1>
          <p className="text-slate-500 text-sm mt-1">询盘数据概览与快速操作</p>
        </div>
        <Link
          to="/inquiries/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium rounded-lg hover:from-primary-600 hover:to-accent-600 transition-all shadow-md shadow-primary-500/20 btn-glow"
        >
          <PlusCircle className="w-4 h-4" />
          新增询盘
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-xl p-5 border border-slate-100 card-hover">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className="text-2xl font-bold text-slate-800 font-display">{card.value}</div>
              <div className="text-sm text-slate-500 mt-1">{card.label}</div>
            </div>
          )
        })}
      </div>

      {/* Recent Inquiries */}
      <div className="bg-white rounded-xl border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            <h2 className="font-display font-semibold text-slate-800">最近询盘</h2>
          </div>
          <Link to="/inquiries" className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1">
            查看全部 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">编号</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">客户</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">公司</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">国家</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">大区</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">业务员</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">产品类别</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">跟进状态</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">询盘日期</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recent_inquiries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    暂无询盘数据
                  </td>
                </tr>
              ) : (
                stats.recent_inquiries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <Link to={`/inquiries/${item.id}`} className="text-sm font-mono font-medium text-primary-600 hover:text-primary-700">
                        {item.inquiry_no}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-700">{item.customer_name || '-'}</td>
                    <td className="px-6 py-3 text-sm text-slate-500 max-w-[140px] truncate">{item.company_name || '-'}</td>
                    <td className="px-6 py-3 text-sm text-slate-500">{item.country || '-'}</td>
                    <td className="px-6 py-3">
                      {item.region ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${
                          item.region === '美洲' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          item.region === '欧非' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          item.region === '亚太' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {item.continent && <Zap className="w-2.5 h-2.5" />}
                          {item.region}
                        </span>
                      ) : item.continent ? (
                        <span className="text-xs text-slate-500">{item.continent}</span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-700 font-medium">{item.sales_person || '-'}</td>
                    <td className="px-6 py-3">
                      {item.product_category ? (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-violet-50 text-violet-700">
                          {item.product_category}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-3">
                      {item.i_status ? (
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${
                          item.i_status === '建立联系' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          item.i_status === '待沟通' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          item.i_status === '放弃' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                          item.i_status === '成交(含寄样）' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {item.i_status}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-400 whitespace-nowrap">
                      {item.inquiry_date ? formatOnlyDate(item.inquiry_date) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
