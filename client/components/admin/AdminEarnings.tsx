'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  Wallet, TrendingUp, Users, Lock, AlertCircle,
  ArrowUpRight, ArrowDownRight, Loader2, RefreshCw,
  Download, ChevronRight, CheckCircle2, Clock, Zap,
  BarChart2, Car, Star
} from 'lucide-react'
import api from '@/lib/api'

// ── Recharts client-side only ────────────────────────────────
const BarChart   = dynamic(() => import('recharts').then(m => ({ default: m.BarChart   })), { ssr: false })
const Bar        = dynamic(() => import('recharts').then(m => ({ default: m.Bar        })), { ssr: false })
const PieChart   = dynamic(() => import('recharts').then(m => ({ default: m.PieChart   })), { ssr: false })
const Pie        = dynamic(() => import('recharts').then(m => ({ default: m.Pie        })), { ssr: false })
const Cell       = dynamic(() => import('recharts').then(m => ({ default: m.Cell       })), { ssr: false })
const XAxis      = dynamic(() => import('recharts').then(m => ({ default: m.XAxis      })), { ssr: false })
const YAxis      = dynamic(() => import('recharts').then(m => ({ default: m.YAxis      })), { ssr: false })
const Tooltip    = dynamic(() => import('recharts').then(m => ({ default: m.Tooltip    })), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false })

type Period = 'week' | 'month' | 'quarter' | 'all'

interface EarningsData {
  kpis: {
    gross: number; platformRevenue: number; driverPayout: number
    escrowHeld: number; pendingRefunds: number; pendingRefundCount: number; growth: number
  }
  revenueOverTime: { label: string; gross: number; platform: number }[]
  revenueSplit: { driverPct: number; platformPct: number; total: number }
  topDrivers: { id: string; name: string; photo: string; earned: number; trips: number }[]
  highRevenueRoutes: { route: string; revenue: number; count: number; pct: number }[]
  insights: { avgFare: number; completionRate: number; activeDrivers: number }
  escrowSummary: {
    held:     { total: number; count: number }
    released: { total: number; count: number }
    disputed: { total: number; count: number }
  }
  recentTransactions: {
    id: string; type: string; passenger: string; driver: string
    route: string; amount: number; date: string; status: string
  }[]
}

// ── Helpers ───────────────────────────────────────────────────
function formatINR(n: number) {
  const abs = Math.abs(n)
  const prefix = n < 0 ? '-₹' : '₹'
  if (abs >= 100000) return `${prefix}${(abs / 100000).toFixed(2)}L`
  if (abs >= 1000)   return `${prefix}${(abs / 1000).toFixed(1)}k`
  return `${prefix}${abs}`
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ── Tooltips ─────────────────────────────────────────────────
function RevTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e2333] border border-white/10 rounded-xl px-3 py-2.5 shadow-xl text-xs space-y-1">
      <p className="text-gray-400 font-semibold mb-1">{label}</p>
      <p className="text-blue-400">Gross: ₹{payload[0]?.value?.toLocaleString('en-IN')}</p>
      <p className="text-purple-400">Platform: ₹{payload[1]?.value?.toLocaleString('en-IN')}</p>
    </div>
  )
}

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, iconColor, growth, loading }: {
  label: string; value: string; sub?: string; icon: any; iconColor: string
  growth?: number; loading?: boolean
}) {
  return (
    <div className="bg-[#13172a] border border-white/8 rounded-2xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColor}`}>
          <Icon size={16} />
        </div>
        {growth !== undefined && (
          <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            growth >= 0 ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
          }`}>
            {growth >= 0 ? <ArrowUpRight size={9}/> : <ArrowDownRight size={9}/>}
            {Math.abs(growth)}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-7 w-24 bg-white/5 rounded animate-pulse mb-1" />
      ) : (
        <p className="text-xl font-black text-white leading-none mb-0.5" style={{ fontFamily:"'Outfit',sans-serif" }}>{value}</p>
      )}
      <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">{label}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function AdminEarningsPage() {
  const [period, setPeriod]       = useState<Period>('week')
  const [data, setData]           = useState<EarningsData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]         = useState('')

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/earnings/overview', { 
        params: { period },
        headers: { 'Cache-Control': 'no-cache' } // Prevent caching
      })
      if (res.data.success) setData(res.data.data)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load earnings')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [period])

  // ── Initial fetch ──────────────────────────────────────────
  useEffect(() => { fetchData() }, [fetchData])

  // ── Auto-refresh every 30 seconds ──────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData()
    }, 30000) // 30 seconds
    
    return () => clearInterval(interval)
  }, [fetchData])

  // ── Refresh when tab becomes visible ──────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchData])

  const SPLIT_DATA = data ? [
    { name: 'Driver Payouts', value: data.revenueSplit.driverPct,   color: '#3b82f6' },
    { name: 'Platform Fee',   value: data.revenueSplit.platformPct, color: '#a855f7' },
  ] : []

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight" style={{ fontFamily:"'Outfit',sans-serif" }}>
            Earnings & Finance
          </h1>
          <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-widest font-semibold">
            Platform Revenue, Driver Payouts, and Escrow Management
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-xl p-1">
            {(['week','month','quarter','all'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${
                  period === p ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}>
                {p === 'week' ? 'Week' : p === 'month' ? 'Month' : p === 'quarter' ? 'Quarter' : 'All'}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/8 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl transition">
            <Download size={13} /> Export CSV
          </button>
          <button
            onClick={() => fetchData(true)} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-900/30">
            <Zap size={13} /> Withdraw to Bank
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
          {error} <button onClick={() => fetchData()} className="ml-2 underline">Retry</button>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard icon={Wallet}       iconColor="bg-blue-500/15 text-blue-400"
          label="Total Gross Revenue"
          value={data ? formatINR(data.kpis.gross) : '—'}
          growth={data?.kpis.growth} loading={loading} />
        <KpiCard icon={TrendingUp}   iconColor="bg-purple-500/15 text-purple-400"
          label="Platform Revenue (5%)"
          value={data ? formatINR(data.kpis.platformRevenue) : '—'}
          sub="Net commission earned" loading={loading} />
        <KpiCard icon={Users}        iconColor="bg-green-500/15 text-green-400"
          label="Driver Payouts"
          value={data ? formatINR(data.kpis.driverPayout) : '—'}
          sub="Released to drivers" loading={loading} />
        <KpiCard icon={Lock}         iconColor="bg-amber-500/15 text-amber-400"
          label="Escrow Held"
          value={data ? formatINR(data.kpis.escrowHeld) : '—'}
          sub="Pending release" loading={loading} />
        <KpiCard icon={AlertCircle}  iconColor="bg-red-500/15 text-red-400"
          label="Pending Refunds"
          value={data ? formatINR(data.kpis.pendingRefunds) : '—'}
          sub={data ? `${data.kpis.pendingRefundCount} open` : ''} loading={loading} />
      </div>

      {/* ── Main 3-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">

        {/* LEFT — charts + table */}
        <div className="space-y-5">

          {/* Revenue over time */}
          <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
              <div>
                <p className="text-sm font-bold text-white">Revenue Over Time</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Daily gross vs platform commission earnings</p>
              </div>
              <div className="flex items-center gap-4 text-[10px]">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-5 h-0.5 bg-blue-500 rounded inline-block" /> Gross Revenue
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-5 h-0.5 bg-purple-500 rounded inline-block" /> Platform Fees
                </span>
              </div>
            </div>
            <div className="p-5" style={{ height: '240px' }}>
              {loading || !data ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-blue-500" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueOverTime} barGap={2} barSize={14}>
                    <XAxis dataKey="label" tick={{ fill:'#4b5563', fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<RevTooltip />} cursor={{ fill:'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="gross"    radius={[3,3,0,0]} fill="#2563eb">
                      {data.revenueOverTime.map((_,i) => (
                        <Cell key={i} fill={i === data.revenueOverTime.length-1 ? '#3b82f6' : '#1d4ed8'} />
                      ))}
                    </Bar>
                    <Bar dataKey="platform" radius={[3,3,0,0]} fill="#a855f7" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Revenue Split donut + Escrow summary side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Revenue split donut */}
            <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/5">
                <p className="text-sm font-bold text-white">Revenue Split</p>
              </div>
              <div className="p-5 flex flex-col items-center">
                {loading || !data ? (
                  <div className="h-40 flex items-center justify-center w-full">
                    <Loader2 size={20} className="animate-spin text-blue-500" />
                  </div>
                ) : (
                  <>
                    <div className="relative" style={{ width:160, height:160 }}>
                      <PieChart width={160} height={160}>
                        <Pie data={SPLIT_DATA} cx={75} cy={75} innerRadius={48} outerRadius={70}
                          dataKey="value" strokeWidth={2} stroke="#0a0d14">
                          {SPLIT_DATA.map((s,i) => <Cell key={i} fill={s.color} />)}
                        </Pie>
                        <Tooltip
                          formatter={(v: any) => [`${v}%`]}
                          contentStyle={{ background:'#1e2333', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, fontSize:11 }}
                        />
                      </PieChart>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <p className="text-base font-black text-white" style={{ fontFamily:"'Outfit',sans-serif" }}>
                          {formatINR(data.revenueSplit.total)}
                        </p>
                        <p className="text-[9px] text-gray-500">Total</p>
                      </div>
                    </div>
                    <div className="w-full space-y-2 mt-3">
                      {SPLIT_DATA.map(s => (
                        <div key={s.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background:s.color }} />
                            <span className="text-xs text-gray-400">{s.name}</span>
                          </div>
                          <span className="text-xs font-bold text-gray-300">{s.value}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Escrow summary */}
            <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/5">
                <p className="text-sm font-bold text-white">Escrow Summary</p>
              </div>
              <div className="p-5 space-y-3">
                {loading || !data ? (
                  <div className="h-40 flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-blue-500" />
                  </div>
                ) : (
                  <>
                    {[
                      { label:'Released', sub:'Successfully paid to drivers', icon: CheckCircle2, color:'text-green-400', bg:'bg-green-500/10', value: data.escrowSummary.released.total, count: data.escrowSummary.released.count },
                      { label:'Held',     sub:'Awaiting trip completion',     icon: Lock,         color:'text-amber-400', bg:'bg-amber-500/10', value: data.escrowSummary.held.total,     count: data.escrowSummary.held.count     },
                      { label:'Disputed', sub:'Under admin review',           icon: AlertCircle,  color:'text-red-400',   bg:'bg-red-500/10',   value: data.escrowSummary.disputed.total, count: data.escrowSummary.disputed.count },
                    ].map(item => (
                      <div key={item.label} className={`flex items-center gap-3 p-3 rounded-xl ${item.bg}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.bg} ${item.color}`}>
                          <item.icon size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold ${item.color}`}>{item.label}</p>
                          <p className="text-[10px] text-gray-500">{item.sub}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-white">{formatINR(item.value)}</p>
                          <p className="text-[10px] text-gray-600">{item.count} bookings</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
              <p className="text-sm font-bold text-white">Recent Transactions</p>
              <Link href="/admin/bookings">
                <button className="text-[10px] text-blue-400 hover:underline font-semibold">View All →</button>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    <th className="text-left px-5 py-3">Transaction ID</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Route</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-right px-5 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading || !data ? (
                    <tr><td colSpan={5} className="px-5 py-8 text-center">
                      <Loader2 size={20} className="animate-spin text-blue-500 mx-auto" />
                    </td></tr>
                  ) : data.recentTransactions.map((t, i) => (
                    <tr key={i} className="hover:bg-white/3 transition">
                      <td className="px-5 py-3">
                        <p className="text-[11px] font-mono text-gray-400">#{t.id}</p>
                        <p className="text-[10px] text-gray-600">{t.passenger}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.type === 'REFUND' ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'
                        }`}>{t.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-300 font-medium truncate max-w-[160px]">{t.route}</p>
                        <p className="text-[10px] text-gray-600">{t.driver}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(t.date)}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`text-sm font-black ${t.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {formatINR(t.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT sidebar */}
        <div className="space-y-4">

          {/* Top Earning Drivers */}
          <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/5">
              <p className="text-sm font-bold text-white">Top Earning Drivers</p>
            </div>
            <div className="p-4 space-y-3">
              {loading || !data ? (
                <div className="h-32 flex items-center justify-center">
                  <Loader2 size={18} className="animate-spin text-blue-500" />
                </div>
              ) : data.topDrivers.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">No data yet</p>
              ) : data.topDrivers.map((d, i) => (
                <div key={d.id} className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    {d.photo ? (
                      <img src={d.photo} alt={d.name} className="w-9 h-9 rounded-xl object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                        {initials(d.name)}
                      </div>
                    )}
                    {i < 3 && (
                      <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center ${
                        i === 0 ? 'bg-amber-400 text-black' : i === 1 ? 'bg-gray-300 text-black' : 'bg-amber-700 text-white'
                      }`}>{i+1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-200 truncate">{d.name}</p>
                    <p className="text-[10px] text-gray-600">{d.trips} trips</p>
                  </div>
                  <p className="text-xs font-black text-green-400 shrink-0">{formatINR(d.earned)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* High Revenue Routes */}
          <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/5">
              <p className="text-sm font-bold text-white">High Revenue Routes</p>
            </div>
            <div className="p-4 space-y-3">
              {loading || !data ? (
                <div className="h-24 flex items-center justify-center">
                  <Loader2 size={18} className="animate-spin text-blue-500" />
                </div>
              ) : data.highRevenueRoutes.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">No data yet</p>
              ) : data.highRevenueRoutes.map((r, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-300 font-medium truncate max-w-[160px]">{r.route}</p>
                    <span className="text-xs font-black text-blue-400 ml-2 shrink-0">{formatINR(r.revenue)}</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width:`${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Insights */}
          <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/5">
              <p className="text-sm font-bold text-white">Quick Insights</p>
            </div>
            <div className="p-4 divide-y divide-white/5">
              {loading || !data ? (
                <div className="h-24 flex items-center justify-center">
                  <Loader2 size={18} className="animate-spin text-blue-500" />
                </div>
              ) : [
                { label:'Avg Trip Value',   value:`₹${data.insights.avgFare}` },
                { label:'Completion Rate',  value:`${data.insights.completionRate}%`, green: true },
                { label:'Active Drivers',   value:data.insights.activeDrivers.toLocaleString('en-IN') },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2.5">
                  <span className="text-xs text-gray-400">{item.label}</span>
                  <span className={`text-xs font-bold ${item.green ? 'text-green-400' : 'text-gray-200'}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payout Queue */}
          <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-blue-400" />
              <p className="text-sm font-bold text-white">Payout Queue</p>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              {loading || !data ? '—' : `${data.escrowSummary.held.count} bookings pending escrow release`}
            </p>
            <Link href="/admin/bookings">
              <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5">
                <Zap size={12} /> Process All Payouts
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}