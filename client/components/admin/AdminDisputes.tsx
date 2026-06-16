'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  AlertTriangle, Search, Filter, ChevronRight, ChevronLeft,
  Clock, CheckCircle, XCircle, Eye, ShieldCheck, MessageSquare,
  MoreHorizontal, RefreshCw, Download, MapPin, Calendar,
  User, TrendingUp, TrendingDown, Loader2, X, Check,
  ChevronDown, AlertCircle, FileText, Image, Send,
} from 'lucide-react'
import api from '@/lib/api'

// ─── Types (matching your Dispute model exactly) ──────────────────────────────
type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'dismissed'
type DisputeReason =
  | 'driver_no_show' | 'passenger_no_show' | 'payment_issue'
  | 'misconduct' | 'wrong_route' | 'vehicle_mismatch' | 'other'
type DisputeResolution =
  | 'refund_passenger' | 'release_to_driver' | 'partial_refund' | 'none'

interface Dispute {
  _id: string
  tripId: { _id: string; from: string; to: string; departureDate: string; departureTime: string } | null
  bookingId: string
  raisedBy: { _id: string; name: string }
  against:  { _id: string; name: string }
  reason: DisputeReason
  description: string
  evidence: string[]
  status: DisputeStatus
  resolution: DisputeResolution
  adminNotes: string
  resolvedAt?: string
  createdAt: string
  updatedAt: string
}

interface DisputeStats {
  total: number
  open: number
  under_review: number
  resolved: number
  dismissed: number
  byReason: { reason: string; count: number }[]
  avgResolveTimeHours: number
}

// ─── Config maps ──────────────────────────────────────────────────────────────
const STATUS_CFG: Record<DisputeStatus, { label: string; color: string; dot: string; icon: any }> = {
  open:         { label: 'Open',         color: 'bg-amber-500/15 text-amber-400 border-amber-500/25',   dot: 'bg-amber-400',  icon: AlertTriangle },
  under_review: { label: 'Under Review', color: 'bg-blue-500/15 text-blue-400 border-blue-500/25',     dot: 'bg-blue-400',   icon: Clock         },
  resolved:     { label: 'Resolved',     color: 'bg-green-500/15 text-green-400 border-green-500/25',  dot: 'bg-green-400',  icon: CheckCircle   },
  dismissed:    { label: 'Dismissed',    color: 'bg-gray-500/15 text-gray-400 border-gray-500/25',     dot: 'bg-gray-500',   icon: XCircle       },
}

const REASON_LABELS: Record<DisputeReason, string> = {
  driver_no_show:    'Driver No-Show',
  passenger_no_show: 'Passenger No-Show',
  payment_issue:     'Payment Issue',
  misconduct:        'Misconduct',
  wrong_route:       'Wrong Route',
  vehicle_mismatch:  'Vehicle Mismatch',
  other:             'Other',
}

const REASON_COLORS: Record<DisputeReason, string> = {
  driver_no_show:    'bg-red-500/15 text-red-400',
  passenger_no_show: 'bg-red-500/15 text-red-400',
  payment_issue:     'bg-amber-500/15 text-amber-400',
  misconduct:        'bg-purple-500/15 text-purple-400',
  wrong_route:       'bg-orange-500/15 text-orange-400',
  vehicle_mismatch:  'bg-cyan-500/15 text-cyan-400',
  other:             'bg-gray-500/15 text-gray-400',
}

const RESOLUTION_LABELS: Record<DisputeResolution, string> = {
  refund_passenger:  'Refund Passenger',
  release_to_driver: 'Release to Driver',
  partial_refund:    'Partial Refund',
  none:              'No Action',
}

// ─── Urgency: disputes open > 48h ────────────────────────────────────────────
function hoursAgo(dateStr: string) {
  return (Date.now() - new Date(dateStr).getTime()) / 36e5
}

function isUrgent(d: Dispute) {
  return (d.status === 'open' || d.status === 'under_review') && hoursAgo(d.createdAt) > 48
}

function timeAgo(dateStr: string) {
  const h = Math.floor(hoursAgo(dateStr))
  if (h < 1)  return 'Just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Resolve Modal ────────────────────────────────────────────────────────────
function ResolveModal({
  dispute, onClose, onResolved,
}: { dispute: Dispute; onClose: () => void; onResolved: (id: string, status: DisputeStatus, resolution: DisputeResolution, notes: string) => void }) {
  const [status,     setStatus]     = useState<DisputeStatus>('resolved')
  const [resolution, setResolution] = useState<DisputeResolution>('none')
  const [notes,      setNotes]      = useState(dispute.adminNotes || '')
  const [saving,     setSaving]     = useState(false)

  const handle = async () => {
    setSaving(true)
    try {
      const res = await api.put(`/admin/disputes/${dispute._id}/resolve`, { 
        status, 
        resolution, 
        adminNotes: notes 
      })
      if (res.data.success) {
        onResolved(dispute._id, status, resolution, notes)
        onClose()
      }
    } catch (error) {
      console.error('Failed to resolve dispute:', error)
      alert('Failed to resolve dispute. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-[#13172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="font-bold text-white">Resolve Dispute <span className="text-gray-500 font-mono text-sm">#{dispute._id}</span></h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 transition"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Route context */}
          <div className="bg-white/5 border border-white/8 rounded-xl p-3 text-xs text-gray-400">
            <p className="font-semibold text-white mb-0.5">
              {dispute.tripId ? `${dispute.tripId.from} → ${dispute.tripId.to}` : 'Route unavailable'}
            </p>
            <p>{dispute.raisedBy.name} vs {dispute.against.name} · {REASON_LABELS[dispute.reason]}</p>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Update Status</label>
            <div className="grid grid-cols-2 gap-2">
              {(['resolved','dismissed','under_review','open'] as DisputeStatus[]).map(s => {
                const cfg = STATUS_CFG[s]
                return (
                  <button key={s} onClick={() => setStatus(s)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition ${
                      status === s ? cfg.color + ' border-current' : 'border-white/10 text-gray-500 hover:border-white/20'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} /> {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Resolution */}
          {status === 'resolved' && (
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Resolution Action</label>
              <select value={resolution} onChange={e => setResolution(e.target.value as DisputeResolution)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition">
                {(Object.entries(RESOLUTION_LABELS) as [DisputeResolution, string][]).map(([val, label]) => (
                  <option key={val} value={val} className="bg-[#13172a]">{label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Admin notes */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Admin Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Add internal notes about this resolution..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/8 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-400 border border-white/10 rounded-xl hover:bg-white/5 transition">
            Cancel
          </button>
          <button onClick={handle} disabled={saving}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition flex items-center gap-1.5 disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? 'Saving…' : 'Save Resolution'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function DetailDrawer({
  dispute, onClose, onResolve,
}: { dispute: Dispute; onClose: () => void; onResolve: (d: Dispute) => void }) {
  const cfg = STATUS_CFG[dispute.status]
  const Icon = cfg.icon

  const timeline = [
    { label: 'Dispute Filed',   time: dispute.createdAt,   done: true,  color: 'bg-blue-500'  },
    { label: 'Under Review',    time: dispute.status !== 'open' ? dispute.updatedAt : null, done: dispute.status !== 'open', color: 'bg-amber-500' },
    { label: 'Resolution',      time: dispute.resolvedAt || null, done: !!dispute.resolvedAt, color: 'bg-green-500' },
  ]

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50" onClick={onClose} />
      {/* Panel */}
      <div className="w-full max-w-[420px] bg-[#0d1117] border-l border-white/8 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div>
            <p className="text-xs text-gray-500 font-mono">Case #{dispute._id}</p>
            <h3 className="font-bold text-white mt-0.5">
              {dispute.tripId ? `${dispute.tripId.from} → ${dispute.tripId.to}` : 'Route unavailable'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.color}`}>
              <Icon size={10} /> {cfg.label}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 transition"><X size={15} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Parties */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Parties Involved</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Filed By', person: dispute.raisedBy, color: 'from-blue-600 to-blue-800', role: 'Claimant' },
                { label: 'Against',  person: dispute.against,  color: 'from-red-600 to-red-800',   role: 'Respondent' },
              ].map(({ label, person, color, role }) => (
                <div key={label} className="bg-white/5 border border-white/8 rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 mb-2">{label}</p>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} text-white text-xs font-bold flex items-center justify-center mb-2`}>
                    {person.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <p className="text-sm font-semibold text-white">{person.name}</p>
                  <p className="text-[10px] text-gray-500">{role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Issue */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Issue</p>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${REASON_COLORS[dispute.reason]}`}>
                {REASON_LABELS[dispute.reason]}
              </span>
            </div>
            <div className="bg-white/5 border border-white/8 rounded-xl p-3">
              <p className="text-sm text-gray-300 leading-relaxed italic">"{dispute.description}"</p>
            </div>
          </div>

          {/* Trip info */}
          {dispute.tripId && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Trip Details</p>
              <div className="bg-white/5 border border-white/8 rounded-xl p-3 space-y-1.5 text-xs text-gray-400">
                <div className="flex justify-between"><span>Route</span><span className="text-white font-semibold">{dispute.tripId.from} → {dispute.tripId.to}</span></div>
                <div className="flex justify-between"><span>Date</span><span className="text-white">{new Date(dispute.tripId.departureDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span></div>
                <div className="flex justify-between"><span>Time</span><span className="text-white">{dispute.tripId.departureTime}</span></div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Timeline</p>
            <div className="relative pl-6">
              <div className="absolute left-2 top-1 bottom-1 w-px bg-white/10" />
              {timeline.map((t, i) => (
                <div key={i} className="relative mb-4 last:mb-0">
                  <span className={`absolute -left-4 top-0.5 w-3 h-3 rounded-full border-2 border-[#0d1117] ${t.done ? t.color : 'bg-gray-700'}`} />
                  <p className={`text-xs font-semibold ${t.done ? 'text-white' : 'text-gray-600'}`}>{t.label}</p>
                  {t.time && <p className="text-[10px] text-gray-500 mt-0.5">{new Date(t.time).toLocaleString('en-IN')}</p>}
                  {!t.time && !t.done && <p className="text-[10px] text-gray-600 mt-0.5">Pending</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Evidence */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Evidence</p>
            {dispute.evidence.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {dispute.evidence.map((url, i) => (
                  <div key={i} className="bg-white/5 border border-white/8 rounded-lg aspect-square flex items-center justify-center cursor-pointer hover:border-blue-500/40 transition">
                    <Image size={20} className="text-gray-500" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/5 border border-white/8 rounded-xl p-4 text-center">
                <FileText size={20} className="text-gray-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600">No evidence submitted</p>
              </div>
            )}
          </div>

          {/* Admin notes */}
          {dispute.adminNotes && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Admin Notes</p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                <p className="text-xs text-blue-300 leading-relaxed">{dispute.adminNotes}</p>
              </div>
            </div>
          )}

          {/* Resolution */}
          {dispute.status === 'resolved' && dispute.resolution !== 'none' && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Resolution</p>
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                <p className="text-xs text-green-400 font-semibold">{RESOLUTION_LABELS[dispute.resolution]}</p>
                {dispute.resolvedAt && (
                  <p className="text-[10px] text-green-600 mt-0.5">
                    Resolved {new Date(dispute.resolvedAt).toLocaleDateString('en-IN')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-white/8 space-y-2 shrink-0">
          {(dispute.status === 'open' || dispute.status === 'under_review') && (
            <button onClick={() => onResolve(dispute)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2">
              <Check size={14} /> Resolve / Update Case
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button className="py-2 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5">
              <MessageSquare size={12} /> Message Parties
            </button>
            <button className="py-2 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5">
              <Download size={12} /> Export Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminDisputePage() {
  const [disputes,     setDisputes]     = useState<Dispute[]>([])
  const [stats,        setStats]        = useState<DisputeStats | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | 'all'>('all')
  const [reasonFilter, setReasonFilter] = useState<DisputeReason | 'all'>('all')
  const [selected,     setSelected]     = useState<Dispute | null>(null)
  const [resolving,    setResolving]    = useState<Dispute | null>(null)
  const [page,         setPage]         = useState(1)
  const [refreshing,   setRefreshing]   = useState(false)
  const [error,        setError]        = useState('')
  const PER_PAGE = 10

  // ── Fetch disputes ──────────────────────────────────────────────────────────
  const fetchDisputes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(PER_PAGE),
      }
      if (statusFilter !== 'all') params.status = statusFilter
      if (reasonFilter !== 'all') params.reason = reasonFilter
      if (search) params.search = search

      const res = await api.get('/admin/disputes', { params })
      if (res.data.success) {
        setDisputes(res.data.data.disputes || [])
        setStats(res.data.data.stats || null)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load disputes')
      console.error('Fetch disputes error:', err)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, reasonFilter, search])

  // ── Fetch stats separately ──────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/disputes/stats')
      if (res.data.success) {
        setStats(res.data.data)
      }
    } catch (err) {
      console.error('Fetch stats error:', err)
    }
  }, [])

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchDisputes()
    fetchStats()
  }, [fetchDisputes, fetchStats])

  // ── Refresh handler ─────────────────────────────────────────────────────────
  const handleRefresh = () => {
    setRefreshing(true)
    Promise.all([fetchDisputes(), fetchStats()]).finally(() => {
      setTimeout(() => setRefreshing(false), 500)
    })
  }

  // ── Resolve handler ─────────────────────────────────────────────────────────
  const handleResolved = (id: string, status: DisputeStatus, resolution: DisputeResolution, notes: string) => {
    setDisputes(prev => prev.map(d =>
      d._id === id ? { 
        ...d, 
        status, 
        resolution, 
        adminNotes: notes, 
        resolvedAt: status === 'resolved' ? new Date().toISOString() : d.resolvedAt 
      } : d
    ))
    if (selected?._id === id) {
      setSelected(prev => prev ? { ...prev, status, resolution, adminNotes: notes } : null)
    }
    fetchStats() // Refresh stats after resolution
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const urgent = disputes.filter(isUrgent)
  const counts = {
    all: disputes.length,
    open: disputes.filter(d => d.status === 'open').length,
    under_review: disputes.filter(d => d.status === 'under_review').length,
    resolved: disputes.filter(d => d.status === 'resolved').length,
    dismissed: disputes.filter(d => d.status === 'dismissed').length,
  }

  const filtered = disputes.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false
    if (reasonFilter !== 'all' && d.reason !== reasonFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const route = d.tripId ? `${d.tripId.from} ${d.tripId.to}`.toLowerCase() : ''
      if (!d._id.toLowerCase().includes(q) && !d.raisedBy.name.toLowerCase().includes(q) &&
          !d.against.name.toLowerCase().includes(q) && !route.includes(q)) return false
    }
    return true
  })

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))

  // Donut chart data for stats panel
  const reasonCounts = Object.keys(REASON_LABELS).reduce((acc, r) => {
    acc[r] = disputes.filter(d => d.reason === r).length
    return acc
  }, {} as Record<string, number>)

  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  const DONUT_COLORS = ['#3b82f6','#ef4444','#f59e0b','#8b5cf6']

  return (
    <>
      {/* Detail drawer */}
      {selected && (
        <DetailDrawer
          dispute={selected}
          onClose={() => setSelected(null)}
          onResolve={d => { setSelected(null); setResolving(d) }}
        />
      )}

      {/* Resolve modal */}
      {resolving && (
        <ResolveModal
          dispute={resolving}
          onClose={() => setResolving(null)}
          onResolved={handleResolved}
        />
      )}

      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-white tracking-tight" style={{ fontFamily: "'Outfit',sans-serif" }}>
              Dispute Center
            </h1>
            {stats && stats.open > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-black bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                {stats.open} OPEN
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2 w-56 focus-within:border-blue-500/50 transition">
              <Search size={13} className="text-gray-500 shrink-0" />
              <input 
                value={search} 
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search case ID, user..."
                className="bg-transparent text-sm text-gray-300 placeholder-gray-600 outline-none flex-1 min-w-0" 
              />
            </div>
            {/* Reason filter */}
            <select 
              value={reasonFilter} 
              onChange={e => { setReasonFilter(e.target.value as any); setPage(1) }}
              className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-gray-300 outline-none focus:border-blue-500/50 transition"
            >
              <option value="all" className="bg-[#13172a]">All Reasons</option>
              {(Object.entries(REASON_LABELS) as [DisputeReason,string][]).map(([v,l]) => (
                <option key={v} value={v} className="bg-[#13172a]">{l}</option>
              ))}
            </select>
            <button onClick={handleRefresh} disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/8 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl transition disabled:opacity-50">
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-blue-400' : ''} /> Refresh
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/8 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl transition">
              <Download size={13} /> Export
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
            {error}
            <button onClick={handleRefresh} className="ml-2 underline hover:no-underline">Retry</button>
          </div>
        )}

        {/* ── Urgent cards ── */}
        {urgent.length > 0 && !loading && (
          <div className="bg-red-500/8 border border-red-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-red-400" />
              <span className="text-xs font-black text-red-400 uppercase tracking-widest">Urgent Attention Required</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {urgent.map(d => (
                <div key={d._id}
                  onClick={() => setSelected(d)}
                  className="bg-[#13172a] border border-red-500/25 rounded-xl p-4 cursor-pointer hover:border-red-500/50 transition group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-gray-400">#{d._id}</span>
                    <span className="text-[9px] font-black text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full">
                      &gt;{Math.floor(hoursAgo(d.createdAt))}H OVERDUE
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <MapPin size={10} />
                    <span>{d.tripId ? `${d.tripId.from} to ${d.tripId.to}` : 'Route unavailable'}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex -space-x-1.5">
                      {[d.raisedBy, d.against].map((p, i) => (
                        <div key={i} className={`w-6 h-6 rounded-full border-2 border-[#13172a] text-[9px] font-bold flex items-center justify-center ${i === 0 ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                          {p.name.split(' ').map(n => n[0]).join('')}
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] text-gray-500">{d.raisedBy.name} vs {d.against.name}</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setSelected(d) }}
                    className="w-full py-1.5 border border-white/10 hover:border-blue-500/40 text-gray-400 hover:text-blue-400 text-[10px] font-bold rounded-lg transition">
                    VIEW DETAILS
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Main content + sidebar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">

          {/* LEFT: Table */}
          <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center gap-0.5 px-4 py-3 border-b border-white/8 overflow-x-auto">
              {([
                ['all',          `All (${loading ? '...' : counts.all})`],
                ['open',         `Open (${loading ? '...' : counts.open})`],
                ['under_review', `Under Review (${loading ? '...' : counts.under_review})`],
                ['resolved',     `Resolved (${loading ? '...' : counts.resolved})`],
                ['dismissed',    `Dismissed (${loading ? '...' : counts.dismissed})`],
              ] as [DisputeStatus | 'all', string][]).map(([val, label]) => (
                <button key={val} onClick={() => { setStatusFilter(val); setPage(1) }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    statusFilter === val
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] text-gray-600 uppercase tracking-widest font-black">
                    {['Case ID','Filed By','Against','Issue Type','Amount','Status','Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center">
                      <Loader2 size={24} className="animate-spin text-blue-500 mx-auto" />
                    </td></tr>
                  ) : paginated.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-600 text-sm">No disputes found</td></tr>
                  )}
                  {paginated.map(d => {
                    const sc  = STATUS_CFG[d.status]
                    const SIcon = sc.icon
                    const urgent_d = isUrgent(d)
                    return (
                      <tr key={d._id}
                        onClick={() => setSelected(d)}
                        className={`hover:bg-white/3 cursor-pointer transition group ${urgent_d ? 'bg-red-500/3' : ''}`}>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            {urgent_d && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping shrink-0" />}
                            <span className="text-[11px] font-mono text-gray-400">#{d._id}</span>
                          </div>
                          <p className="text-[10px] text-gray-600 mt-0.5">
                            {d.tripId ? `${d.tripId.from} → ${d.tripId.to}` : '—'}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                              {d.raisedBy.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-200">{d.raisedBy.name}</p>
                              <span className="text-[9px] font-black bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded-full">DRIVER</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                              {d.against.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-200">{d.against.name}</p>
                              <span className="text-[9px] font-black bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded-full">PASSENGER</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${REASON_COLORS[d.reason]}`}>
                            {REASON_LABELS[d.reason]}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-bold text-gray-200">
                            {d.status === 'resolved' ? RESOLUTION_LABELS[d.resolution] : '—'}
                          </span>
                          <p className="text-[10px] text-gray-600">{timeAgo(d.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit ${sc.color}`}>
                            <SIcon size={9} /> {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => setSelected(d)}
                              className="text-[10px] text-gray-400 hover:text-blue-400 px-2 py-1 rounded-lg hover:bg-blue-500/10 transition font-semibold">
                              View
                            </button>
                            {(d.status === 'open' || d.status === 'under_review') && (
                              <button onClick={() => setResolving(d)}
                                className="text-[10px] text-gray-400 hover:text-green-400 px-2 py-1 rounded-lg hover:bg-green-500/10 transition font-semibold">
                                Resolve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/8">
              <span className="text-xs text-gray-500">
                {loading ? 'Loading...' : `Showing ${Math.min((page-1)*PER_PAGE+1, filtered.length)}–${Math.min(page*PER_PAGE, filtered.length)} of ${filtered.length} cases`}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1 || loading}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 transition">
                  <ChevronLeft size={13} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let p = i + 1
                  if (totalPages > 5 && page > 3) {
                    p = page - 2 + i
                    if (p > totalPages) p = totalPages - (4 - i)
                  }
                  if (p < 1 || p > totalPages) return null
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition ${
                        page === p ? 'bg-blue-600 text-white' : 'border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                      }`}>
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages || loading}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 transition">
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Stats panel */}
          <div className="space-y-4">
            {/* Resolution Performance */}
            <div className="bg-[#13172a] border border-white/8 rounded-2xl p-5">
              <p className="text-sm font-bold text-white mb-4">Resolution Performance</p>
              <div className="text-center mb-4">
                <p className="text-xs text-gray-500">Avg. Resolve Time</p>
                <p className="text-3xl font-black text-blue-400 mt-1" style={{ fontFamily: "'Outfit',sans-serif" }}>
                  {loading ? '—' : stats?.avgResolveTimeHours || 0} <span className="text-lg font-bold text-gray-500">Hours</span>
                </p>
                <p className="text-xs text-green-400 flex items-center justify-center gap-1 mt-1">
                  <TrendingDown size={11} /> Good SLA performance
                </p>
              </div>
              <div className="space-y-2">
                {([
                  { label: 'Resolved',     count: stats?.resolved || 0, color: 'bg-green-500', pct: stats && stats.total > 0 ? Math.round(stats.resolved / stats.total * 100) : 0 },
                  { label: 'Under Review', count: stats?.under_review || 0, color: 'bg-blue-500', pct: stats && stats.total > 0 ? Math.round(stats.under_review / stats.total * 100) : 0 },
                  { label: 'Open',         count: stats?.open || 0, color: 'bg-amber-500', pct: stats && stats.total > 0 ? Math.round(stats.open / stats.total * 100) : 0 },
                  { label: 'Dismissed',    count: stats?.dismissed || 0, color: 'bg-gray-600', pct: stats && stats.total > 0 ? Math.round(stats.dismissed / stats.total * 100) : 0 },
                ]).map(s => (
                  <div key={s.label} className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-500 w-20 shrink-0">{s.label}</span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${s.color} rounded-full transition-all duration-700`} style={{ width: `${s.pct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 w-6 text-right">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disputes by type */}
            <div className="bg-[#13172a] border border-white/8 rounded-2xl p-5">
              <p className="text-sm font-bold text-white mb-4">Disputes by Type</p>
              {/* Simple donut */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-28 h-28">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {(() => {
                      let offset = 0
                      const total = disputes.length || 1
                      return topReasons.map(([reason, count], i) => {
                        const pct = (count / total) * 100
                        const circ = 2 * Math.PI * 38
                        const dash = (pct / 100) * circ
                        const el = (
                          <circle key={reason} cx="50" cy="50" r="38"
                            fill="none" stroke={DONUT_COLORS[i]} strokeWidth="12"
                            strokeDasharray={`${dash} ${circ - dash}`}
                            strokeDashoffset={-offset * circ / 100}
                            strokeLinecap="round" />
                        )
                        offset += pct
                        return el
                      })
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xl font-black text-white">{disputes.length}</p>
                    <p className="text-[9px] text-gray-500">TOTAL</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {topReasons.map(([reason, count], i) => (
                  <div key={reason} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DONUT_COLORS[i] }} />
                      <span className="text-[10px] text-gray-400">{REASON_LABELS[reason as DisputeReason]}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-300">
                      {disputes.length > 0 ? `${Math.round(count / disputes.length * 100)}%` : '0%'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly trend */}
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/10 border border-blue-500/20 rounded-2xl p-5">
              <p className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-2">Monthly Trend</p>
              <p className="text-2xl font-black text-white" style={{ fontFamily: "'Outfit',sans-serif" }}>
                {loading ? '—' : `${disputes.length > 0 ? '+' : ''}${disputes.length}`}
              </p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Total disputes this period
              </p>
              <div className="flex items-center gap-1 mt-3">
                <TrendingUp size={12} className="text-amber-400" />
                <span className="text-[10px] text-amber-400 font-semibold">Monitor closely</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}