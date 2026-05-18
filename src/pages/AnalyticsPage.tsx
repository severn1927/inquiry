import { useEffect, useState } from 'react'
import { dashboardApi } from '@/services/api'
import type { AnalyticsOverview, AnalyticsTrend } from '@/types'
import {
  BarChart3, TrendingUp, Globe2, Package, Users, RefreshCw,
  Calendar, PieChart,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart as RechartsPie, Pie, Cell,
} from 'recharts'

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c084fc', '#818cf8', '#6d28d9', '#4f46e5', '#7c3aed', '#5b21b6', '#4c1d95']
const REGION_COLORS: Record<string, string> = {
  '亚太': '#6366f1',
  '美洲': '#22c55e',
  '欧非': '#f59e0b',
}

interface StatCard {
  title: string
  value: number | string
  icon: React.ReactNode
  color: string
  bg: string
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-slate-100 text-sm">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      {payload.map((item: any, i: number) => (
        <p key={i} style={{ color: item.color }}>
          {item.name}: <span className="font-semibold">{item.value}</span>
        </p>
      ))}
    </div>
  )
}

export function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [trend, setTrend] = useState<AnalyticsTrend | null>(null)
  const [trendPeriod, setTrendPeriod] = useState<'monthly' | 'weekly'>('monthly')
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate

      const [overviewRes, trendRes] = await Promise.all([
        dashboardApi.getAnalyticsOverview(params),
        dashboardApi.getAnalyticsTrend({ period: trendPeriod, ...params }),
      ])
      setOverview(overviewRes.data)
      setTrend(trendRes.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAnalytics() }, [trendPeriod, startDate, endDate])

  const statCards: StatCard[] = [
    {
      title: '总询盘数',
      value: overview?.total || 0,
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: '大区数',
      value: overview?.by_region.length || 0,
      icon: <Globe2 className="w-5 h-5" />,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      title: '产品类别数',
      value: overview?.by_product.length || 0,
      icon: <Package className="w-5 h-5" />,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: '业务员数',
      value: overview?.by_staff.length || 0,
      icon: <Users className="w-5 h-5" />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">询盘分析</h1>
          <p className="text-slate-500 text-sm mt-1">多维度数据统计与趋势分析</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
            <span className="text-slate-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={fetchAnalytics}
            className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            title="刷新"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-slate-800">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center ${card.color}`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 p-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
          加载中...
        </div>
      ) : overview ? (
        <>
          {/* 趋势图 */}
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold text-slate-800">询盘趋势</h3>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                {(['monthly', 'weekly'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setTrendPeriod(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      trendPeriod === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {p === 'monthly' ? '月度' : '周度'}
                  </button>
                ))}
              </div>
            </div>
            {trend && trend.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trend.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="count" name="询盘数" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">暂无趋势数据</div>
            )}
          </div>

          {/* 两列图表 */}
          <div className="grid grid-cols-2 gap-6">
            {/* 大区分布 */}
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe2 className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold text-slate-800">大区分布</h3>
              </div>
              {overview.by_region.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <RechartsPie>
                    <Pie
                      data={overview.by_region}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="name"
                    >
                      {overview.by_region.map((_, i) => (
                        <Cell key={i} fill={REGION_COLORS[overview.by_region[i].name] || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => <span className="text-xs text-slate-600">{value}</span>}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">暂无数据</div>
              )}
            </div>

            {/* 大洲分布 */}
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe2 className="w-5 h-5 text-violet-500" />
                <h3 className="font-semibold text-slate-800">大洲分布</h3>
              </div>
              {overview.by_continent.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={overview.by_continent} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" name="询盘数" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">暂无数据</div>
              )}
            </div>

            {/* 产品类别 */}
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-slate-800">产品需求类别</h3>
              </div>
              {overview.by_product.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={overview.by_product}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" name="询盘数" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">暂无数据</div>
              )}
            </div>

            {/* 业务员分配 */}
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-emerald-500" />
                <h3 className="font-semibold text-slate-800">业务员分配</h3>
              </div>
              {overview.by_staff.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={overview.by_staff} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" name="询盘数" fill="#22c55e" radius={[0, 4, 4, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">暂无数据</div>
              )}
            </div>
          </div>

          {/* 渠道分布 */}
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-slate-800">渠道分布</h3>
            </div>
            {overview.by_channel.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={overview.by_channel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="count" name="询盘数" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {overview.by_channel.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">暂无数据</div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 p-12 text-center text-slate-400">
          暂无数据
        </div>
      )}
    </div>
  )
}
