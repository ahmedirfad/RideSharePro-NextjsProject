'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, Users, Car, Star,
  Leaf, Download, ArrowUpRight, ArrowDownRight,
  MoreHorizontal, RefreshCw, Loader2,
} from 'lucide-react'
import api from '@/lib/api'

// ── Recharts (client-only) ────────────────────────────────────────────────────
const ResponsiveContainer = dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false })
const AreaChart           = dynamic(() => import('recharts').then(m => ({ default: m.AreaChart           })), { ssr: false })
const Area                = dynamic(() => import('recharts').then(m => ({ default: m.Area                })), { ssr: false })
const LineChart           = dynamic(() => import('recharts').then(m => ({ default: m.LineChart           })), { ssr: false })
const Line                = dynamic(() => import('recharts').then(m => ({ default: m.Line                })), { ssr: false })
const XAxis               = dynamic(() => import('recharts').then(m => ({ default: m.XAxis               })), { ssr: false })
const YAxis               = dynamic(() => import('recharts').then(m => ({ default: m.YAxis               })), { ssr: false })
const Tooltip             = dynamic(() => import('recharts').then(m => ({ default: m.Tooltip             })), { ssr: false })
const PieChart            = dynamic(() => import('recharts').then(m => ({ default: m.PieChart            })), { ssr: false })
const Pie                 = dynamic(() => import('recharts').then(m => ({ default: m.Pie                 })), { ssr: false })
const Cell                = dynamic(() => import('recharts').then(m => ({ default: m.Cell                })), { ssr: false })
const BarChart            = dynamic(() => import('recharts').then(m => ({ default: m.BarChart            })), { ssr: false })
const Bar                 = dynamic(() => import('recharts').then(m => ({ default: m.Bar                 })), { ssr: false })
const CartesianGrid       = dynamic(() => import('recharts').then(m => ({ default: m.CartesianGrid       })), { ssr: false })

// ─── Types ────────────────────────────────────────────────────────────────────
type Period = 'week' | 'month' | 'quarter'

interface Kpis {
  totalRevenue: number
  revenueGrowth: number
  totalTrips: number
  tripsGrowth: number
  newUsers: number
  usersGrowth: number
  avgTripValue: number
  avgRating: number
  carbonSaved: number
  platformRevenue: number
}

interface RevenuePoint {
  label: string
  gross: number
  fee: number
}

interface TopRoute {
  route: string
  count: number
  revenue: number
  pct: number
}

interface UserGrowthPoint {
  label: string
  passengers: number
  drivers: number
}

interface TripStatusSlice {
  name: string
  value: number
  color: string
}

interface AnalyticsData {
  kpis: Kpis
  revenueChart: RevenuePoint[]
  topRoutes: TopRoute[]
  userGrowth: UserGrowthPoint[]
  tripStatus: TripStatusSlice[]
  totalTripDocs: number
}

// ─── Tooltip ───────────────────────────────────────────────────────────────────
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e2537] border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl text-xs">
      <p className="text-gray-400 mb-1.5 font-semibold">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-bold text-white">
            {typeof p.value === 'number' && p.name?.toLowerCase().includes('earn')
              ? `₹${p.value.toLocaleString('en-IN')}`
              : p.value.toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, change, up, icon: Icon, iconColor, sub, loading,
}: {
  label: string; value: string; change: string; up: boolean
  icon: any; iconColor: string; sub?: string; loading?: boolean
}) {
  return (
    <div className="bg-[#13172a] border border-white/8 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-blue-500/20 transition">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">{label}</p>
        {loading ? (
          <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
        ) : (
          <p className="text-xl font-black text-white leading-none" style={{ fontFamily: "'Outfit',sans-serif" }}>
            {value}
          </p>
        )}
        {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {!loading && (
        <span className={`flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
          up ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
        }`}>
          {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {change}
        </span>
      )}
    </div>
  )
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-sm font-bold text-white" style={{ fontFamily: "'Outfit',sans-serif" }}>{title}</h3>
        {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

function formatKPIValue(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`
  return `₹${n}`
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-white/5 rounded animate-pulse ${className}`} />
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function AdminAnalytics() {
  const [period, setPeriod] = useState<Period>('week')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const fetchAnalytics = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    
    try {
      const res = await api.get('/admin/analytics/overview', { params: { period } })
      if (res.data.success) {
        setData(res.data.data)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load analytics')
      console.error('Analytics fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [period])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const handleRefresh = () => {
    fetchAnalytics(true)
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    alert('Export feature coming soon')
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const totalRevenue = data?.kpis?.totalRevenue || 0
  const totalTrips = data?.kpis?.totalTrips || 0
  const newUsers = data?.kpis?.newUsers || 0
  const avgTripValue = data?.kpis?.avgTripValue || 0
  const avgRating = data?.kpis?.avgRating || 0
  const carbonSaved = data?.kpis?.carbonSaved || 0
  const platformRevenue = data?.kpis?.platformRevenue || 0
  const totalTripDocs = data?.totalTripDocs || 0

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'week',   label: 'This Week'    },
    { key: 'month',  label: 'This Month'   },
    { key: 'quarter',label: 'This Quarter' },
  ]

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight" style={{ fontFamily: "'Outfit',sans-serif" }}>
            Analytics & Reports
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Platform-wide performance across users, hosts, and trips.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-xl p-1">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${
                  period === p.key ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <button 
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/8 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl transition"
          >
            <Download size={13} className="text-gray-400" /> Export
          </button>
          <button 
            onClick={handleRefresh} 
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-3 text-sm text-red-400 flex items-center gap-3">
          <span className="shrink-0">⚠️</span>
          {error}
          <button onClick={handleRefresh} className="ml-auto text-xs text-red-300 underline">Retry</button>
        </div>
      )}

      {/* ── KPI strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#13172a] border border-white/8 rounded-2xl px-4 py-3">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-6 w-20 mb-1" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))
        ) : (
          <>
            <div className="bg-[#13172a] border border-white/8 rounded-2xl px-4 py-3 hover:border-blue-500/20 transition">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Revenue</p>
              <p className="text-xl font-black text-white" style={{ fontFamily: "'Outfit',sans-serif" }}>
                {formatKPIValue(totalRevenue)}
              </p>
              <span className={`flex items-center gap-0.5 text-[10px] font-bold mt-1 ${
                data?.kpis?.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {data?.kpis?.revenueGrowth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {Math.abs(data?.kpis?.revenueGrowth || 0)}%
              </span>
            </div>

            <div className="bg-[#13172a] border border-white/8 rounded-2xl px-4 py-3 hover:border-blue-500/20 transition">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Trips</p>
              <p className="text-xl font-black text-white" style={{ fontFamily: "'Outfit',sans-serif" }}>
                {totalTrips.toLocaleString('en-IN')}
              </p>
              <span className={`flex items-center gap-0.5 text-[10px] font-bold mt-1 ${
                data?.kpis?.tripsGrowth >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {data?.kpis?.tripsGrowth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {Math.abs(data?.kpis?.tripsGrowth || 0)}%
              </span>
            </div>

            <div className="bg-[#13172a] border border-white/8 rounded-2xl px-4 py-3 hover:border-blue-500/20 transition">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">New Users</p>
              <p className="text-xl font-black text-white" style={{ fontFamily: "'Outfit',sans-serif" }}>
                {newUsers.toLocaleString('en-IN')}
              </p>
              <span className={`flex items-center gap-0.5 text-[10px] font-bold mt-1 ${
                data?.kpis?.usersGrowth >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {data?.kpis?.usersGrowth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {Math.abs(data?.kpis?.usersGrowth || 0)}%
              </span>
            </div>

            <div className="bg-[#13172a] border border-white/8 rounded-2xl px-4 py-3 hover:border-blue-500/20 transition">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Avg Trip Value</p>
              <p className="text-xl font-black text-white" style={{ fontFamily: "'Outfit',sans-serif" }}>
                {formatINR(avgTripValue)}
              </p>
              <span className="text-[10px] text-gray-500 mt-1">per booking</span>
            </div>

            <div className="bg-[#13172a] border border-white/8 rounded-2xl px-4 py-3 hover:border-blue-500/20 transition">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Avg Rating</p>
              <p className="text-xl font-black text-white" style={{ fontFamily: "'Outfit',sans-serif" }}>
                {avgRating} <span className="text-amber-400">★</span>
              </p>
              <span className="text-[10px] text-gray-500 mt-1">from {totalTrips} trips</span>
            </div>

            <div className="bg-green-950/60 border border-green-500/20 rounded-2xl px-4 py-3 hover:border-green-500/40 transition">
              <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest mb-1">Carbon Saved</p>
              <p className="text-xl font-black text-green-400" style={{ fontFamily: "'Outfit',sans-serif" }}>
                {carbonSaved.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-green-700 mt-1">kg CO₂</p>
            </div>
          </>
        )}
      </div>

      {/* ── Revenue chart (full width) ─────────────────────────────────────── */}
      <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <SectionHeader
              title="Revenue Over Time"
              sub="Gross revenue vs platform commission fees"
            />
            <div className="flex items-center gap-4 -mt-2">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-3 h-0.5 bg-blue-500 rounded-full inline-block" /> Gross Revenue
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-3 h-0.5 bg-blue-300/40 rounded-full inline-block border-dashed" /> Platform Fees
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Period Total</p>
              {loading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <p className="text-lg font-black text-white" style={{ fontFamily: "'Outfit',sans-serif" }}>
                  {formatINR(totalRevenue)}
                </p>
              )}
            </div>
            <button className="text-gray-500 hover:text-white transition ml-2">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>
        <div className="p-5" style={{ height: 280 }}>
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.revenueChart || []}>
                <defs>
                  <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#93c5fd" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#93c5fd" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<DarkTooltip />} />
                <Area type="monotone" dataKey="gross" name="Gross Revenue"
                  stroke="#2563eb" strokeWidth={2.5} fill="url(#grossGrad)" dot={false} />
                <Area type="monotone" dataKey="fee" name="Platform Fees"
                  stroke="#93c5fd" strokeWidth={1.5} strokeDasharray="5 4"
                  fill="url(#feeGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Row: Top Routes + User Growth + Trip Status ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_280px] gap-5">

        {/* Top Routes */}
        <div className="bg-[#13172a] border border-white/8 rounded-2xl p-5">
          <SectionHeader
            title="Top 10 Routes by Bookings"
            action={
              <Link href="/admin/trips">
                <button className="text-[10px] text-blue-400 hover:underline font-semibold">View All →</button>
              </Link>
            }
          />
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-4 h-3" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))
            ) : (data?.topRoutes || []).length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-6">No route data available</p>
            ) : (
              (data?.topRoutes || []).map((r, i) => (
                <div key={r.route} className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-600 font-mono w-4 shrink-0 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-gray-300 truncate">{r.route}</p>
                      <span className="text-[11px] font-black text-white shrink-0 ml-2">{r.count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all duration-700"
                        style={{ width: `${r.pct}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 shrink-0 w-20 text-right">{formatINR(r.revenue)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* User Growth */}
        <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 pt-5">
            <SectionHeader
              title="User Growth"
              sub="New passengers vs new drivers"
            />
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Passengers
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" /> Drivers
              </div>
            </div>
          </div>
          <div style={{ height: 200 }} className="px-2">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-blue-500" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.userGrowth || []}>
                  <XAxis dataKey="label" tick={{ fill: '#4b5563', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<DarkTooltip />} />
                  <Line type="monotone" dataKey="passengers" name="Passengers"
                    stroke="#2563eb" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="drivers" name="Drivers"
                    stroke="#f97316" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Trip Status Donut */}
        <div className="bg-[#13172a] border border-white/8 rounded-2xl p-5">
          <SectionHeader title="Trip Status" />
          <div className="flex justify-center my-2">
            {loading ? (
              <div className="w-40 h-40 rounded-full border-8 border-white/5 animate-pulse" />
            ) : (
              <div className="relative" style={{ width: 160, height: 160 }}>
                <PieChart width={160} height={160}>
                  <Pie data={data?.tripStatus || []} cx={76} cy={76}
                    innerRadius={52} outerRadius={74}
                    dataKey="value" strokeWidth={3} stroke="#0d1117">
                    {(data?.tripStatus || []).map((d, i) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-2xl font-black text-white" style={{ fontFamily: "'Outfit',sans-serif" }}>
                    {totalTripDocs > 1000 ? `${(totalTripDocs / 1000).toFixed(1)}k` : totalTripDocs}
                  </p>
                  <p className="text-[10px] text-gray-500">total</p>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2 mt-2">
            {(loading ? [
              { name: 'Completed', value: 0, color: '#3b82f6' },
              { name: 'Cancelled', value: 0, color: '#ef4444' },
              { name: 'Upcoming', value: 0, color: '#6b7280' },
              { name: 'Ongoing', value: 0, color: '#22c55e' }
            ] : data?.tripStatus || []).map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-xs text-gray-400">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {loading ? (
                    <Skeleton className="h-3 w-10" />
                  ) : (
                    <>
                      <span className="text-xs font-bold text-gray-300">{d.value.toLocaleString()}</span>
                      <span className="text-[10px] text-gray-600 w-8 text-right">
                        {totalTripDocs > 0 ? `${Math.round(d.value / totalTripDocs * 100)}%` : '0%'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Top Hosts ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">

        {/* Top Hosts table */}
        <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-0">
            <SectionHeader
              title="Top Hosts by Earnings"
              sub="Most active drivers this period"
              action={
                <Link href="/admin/users?role=host">
                  <button className="text-[10px] text-blue-400 hover:underline font-semibold">View All →</button>
                </Link>
              }
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px]">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                  <th className="text-left px-5 py-2.5">#</th>
                  <th className="text-left px-4 py-2.5">Driver</th>
                  <th className="text-left px-4 py-2.5">Trips</th>
                  <th className="text-left px-4 py-2.5">Earnings</th>
                  <th className="text-left px-4 py-2.5">Rating</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3"><Skeleton className="h-3 w-6" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-6 w-28" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-3 w-8" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-3 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-3 w-12" /></td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-500 text-sm">Driver data coming soon</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Passengers table */}
        <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-0">
            <SectionHeader
              title="Top Passengers by Activity"
              sub="Most frequent riders this period"
              action={
                <Link href="/admin/users?role=passenger">
                  <button className="text-[10px] text-blue-400 hover:underline font-semibold">View All →</button>
                </Link>
              }
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[380px]">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                  <th className="text-left px-5 py-2.5">#</th>
                  <th className="text-left px-4 py-2.5">Passenger</th>
                  <th className="text-left px-4 py-2.5">Trips</th>
                  <th className="text-left px-4 py-2.5">Total Spent</th>
                  <th className="text-left px-4 py-2.5">Rating</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3"><Skeleton className="h-3 w-6" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-6 w-28" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-3 w-8" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-3 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-3 w-12" /></td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-500 text-sm">Passenger data coming soon</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Host Activity Bar + Platform Summary ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* Host activity bar chart */}
        <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <SectionHeader
              title="Daily Host Activity"
              sub="Trips completed and earnings per day"
            />
            <div className="flex items-center gap-4 -mt-2">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" /> Trips
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Earnings (₹)
              </div>
            </div>
          </div>
          <div className="p-5" style={{ height: 240 }}>
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                Host activity chart coming soon
              </div>
            )}
          </div>
        </div>

        {/* Platform Summary */}
        <div className="bg-[#13172a] border border-white/8 rounded-2xl p-5 space-y-4">
          <SectionHeader title="Platform Summary" />

          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div><Skeleton className="h-3 w-32" /><Skeleton className="h-2 w-20 mt-1" /></div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))
          ) : (
            <>
              {[
                { label: 'Total Registered Users',  value: data?.kpis?.newUsers?.toLocaleString('en-IN') || '0', sub: `↑ ${data?.kpis?.usersGrowth || 0}% this period`, color: 'text-blue-400' },
                { label: 'Active Drivers (Hosts)',   value: '—', sub: 'Coming soon', color: 'text-green-400' },
                { label: 'Platform Commission',      value: formatINR(platformRevenue), sub: '5% of gross revenue' , color: 'text-amber-400' },
                { label: 'Avg Trips / Driver',       value: '—', sub: 'Coming soon', color: 'text-purple-400' },
                { label: 'Dispute Resolution Rate',  value: '—', sub: 'Coming soon', color: 'text-cyan-400' },
                { label: 'Carbon Offset (CO₂)',      value: `${carbonSaved.toLocaleString()}kg`, sub: `equivalent to ${Math.round(carbonSaved / 21)} trees`, color: 'text-emerald-400' },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-[11px] text-gray-400 font-medium">{s.label}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{s.sub}</p>
                  </div>
                  <span className={`text-sm font-black shrink-0 ${s.color}`} style={{ fontFamily: "'Outfit',sans-serif" }}>
                    {s.value}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

    </div>
  )
}