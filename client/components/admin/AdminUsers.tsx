'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Search, Download, UserPlus, Star, ChevronLeft, ChevronRight,
  TrendingUp, ShieldCheck, AlertCircle, Globe, X, Loader2, Ban,
  CheckCircle, Eye, Calendar,
} from 'lucide-react'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminUser {
  id: string
  shortId: string
  name: string
  email: string
  phone: string
  profilePhoto: string
  role: 'DRIVER' | 'PASSENGER' | 'ADMIN'
  rating: number
  totalRatings: number
  trips: number
  joinedDate: string
  status: 'ACTIVE' | 'UNVERIFIED' | 'SUSPENDED'
  isSuspended: boolean
}

interface Stats {
  total: number
  growth: number
  verified: number
  pending: number
  suspended: number
  regions: number
}

// ─── Config ───────────────────────────────────────────────────────────────────
const ROLE_BADGE: Record<string, string> = {
  DRIVER:    'bg-blue-500/15 text-blue-400 border-blue-500/20',
  PASSENGER: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  ADMIN:     'bg-amber-500/15 text-amber-400 border-amber-500/20',
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:     'bg-green-500/15 text-green-400',
  UNVERIFIED: 'bg-amber-500/15 text-amber-400',
  SUSPENDED:  'bg-red-500/15 text-red-400',
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Add User Modal ───────────────────────────────────────────────────────────
function AddUserModal({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState('')
  const [phone,      setPhone]      = useState('')
  const [password,   setPassword]   = useState('')
  const [gender,     setGender]     = useState('male')
  const [role,       setRole]       = useState('user')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')

  if (!open) return null

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Name, email, and password are required.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post('/admin/users', { name, email, phone, password, gender, role })
      if (res.data.success) {
        onCreated()
        onClose()
        setName(''); setEmail(''); setPhone(''); setPassword('')
        setGender('male'); setRole('user')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create user.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#13172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="font-bold text-white text-base">Add User</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">{error}</div>
          )}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition">
                <option value="male"   className="bg-[#13172a]">Male</option>
                <option value="female" className="bg-[#13172a]">Female</option>
                <option value="other"  className="bg-[#13172a]">Other</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Account Type</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition">
                <option value="user"  className="bg-[#13172a]">User</option>
                <option value="admin" className="bg-[#13172a]">Admin</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-gray-500">Account will be created as email-verified immediately.</p>
        </div>
        <div className="px-5 py-4 border-t border-white/5 flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-400 border border-white/10 rounded-lg hover:bg-white/5 transition">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 disabled:bg-blue-800">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Add User
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminUsers() {
  const [users,       setUsers]       = useState<AdminUser[]>([])
  const [stats,       setStats]       = useState<Stats | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [addOpen,     setAddOpen]     = useState(false)
  const [suspendingId,setSuspendingId]= useState<string | null>(null)
  const [exporting,   setExporting]   = useState(false)

  // Filters
  const [searchInput, setSearchInput] = useState('')
  const [search,      setSearch]      = useState('')
  const [role,        setRole]        = useState('all')
  const [status,      setStatus]      = useState('all')
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')
  const [page,        setPage]        = useState(1)
  const [totalPages,  setTotalPages]  = useState(1)
  const [total,       setTotal]       = useState(0)
  const limit = 10

  // Debounce search input
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [searchInput])

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params: Record<string, string> = {
        search, role, status, page: String(page), limit: String(limit),
      }
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo)   params.dateTo   = dateTo

      const res = await api.get('/admin/users', { params })
      if (res.data.success) {
        setUsers(res.data.data.users)
        setStats(res.data.data.stats)
        setTotalPages(res.data.data.pagination.totalPages)
        setTotal(res.data.data.pagination.total)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [search, role, status, dateFrom, dateTo, page])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const clearFilters = () => {
    setSearchInput(''); setSearch(''); setRole('all'); setStatus('all')
    setDateFrom(''); setDateTo(''); setPage(1)
  }

  const handleSuspendToggle = async (user: AdminUser) => {
    const willSuspend = !user.isSuspended
    if (!confirm(willSuspend ? `Suspend ${user.name}?` : `Reactivate ${user.name}?`)) return
    setSuspendingId(user.id)
    try {
      const res = await api.put(`/admin/users/${user.id}/suspend`, { suspend: willSuspend })
      if (res.data.success) {
        setUsers(prev => prev.map(u =>
          u.id === user.id
            ? { ...u, isSuspended: willSuspend, status: willSuspend ? 'SUSPENDED' : 'ACTIVE' }
            : u
        ))
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update user status')
    } finally {
      setSuspendingId(null)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const params: Record<string, string> = { search, role, status }
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo)   params.dateTo   = dateTo
      const res = await api.get('/admin/users/export', { params, responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `users-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to export users')
    } finally {
      setExporting(false)
    }
  }

  const hasActiveFilters = search || role !== 'all' || status !== 'all' || dateFrom || dateTo

  // Pagination page numbers
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    let p = i + 1
    if (totalPages > 5 && page > 3) {
      p = page - 2 + i
      if (p > totalPages) p = totalPages - (4 - i)
    }
    return p
  }).filter(p => p >= 1 && p <= totalPages)

  return (
    <div className="space-y-5">
      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={fetchUsers} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight" style={{ fontFamily: "'Outfit',sans-serif" }}>
            Users
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage and monitor platform participants across all regions.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/8 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl transition disabled:opacity-50">
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Export CSV
          </button>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition">
            <UserPlus size={13} /> Add User
          </button>
        </div>
      </div>

      {/* ── Filters — two rows so nothing overflows ─────────────────────────── */}
      <div className="bg-[#13172a] border border-white/8 rounded-2xl p-4 space-y-3">

        {/* Row 1: Search + Role + Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
              Search Database
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Name, email, or phone..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Role</label>
            <select
              value={role}
              onChange={e => { setRole(e.target.value); setPage(1) }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition appearance-none cursor-pointer"
            >
              <option value="all"       className="bg-[#13172a]">All Roles</option>
              <option value="driver"    className="bg-[#13172a]">Driver</option>
              <option value="passenger" className="bg-[#13172a]">Passenger</option>
              <option value="admin"     className="bg-[#13172a]">Admin</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Status</label>
            <select
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1) }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition appearance-none cursor-pointer"
            >
              <option value="all"        className="bg-[#13172a]">All Statuses</option>
              <option value="active"     className="bg-[#13172a]">Active</option>
              <option value="unverified" className="bg-[#13172a]">Unverified</option>
              <option value="suspended"  className="bg-[#13172a]">Suspended</option>
            </select>
          </div>
        </div>

        {/* Row 2: Date range + Clear */}
        <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wide self-center shrink-0">
            <Calendar size={12} /> Joined Date Range
          </div>

          <div className="flex items-end gap-2 flex-1 min-w-0">
            <div className="flex-1 min-w-[120px] max-w-[200px]">
              <label className="text-[10px] text-gray-600 block mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1) }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
              />
            </div>
            <span className="text-gray-600 text-xs shrink-0 pb-2">→</span>
            <div className="flex-1 min-w-[120px] max-w-[200px]">
              <label className="text-[10px] text-gray-600 block mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1) }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition shrink-0"
            >
              <X size={13} /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex items-center gap-2">
          {error}
          <button onClick={fetchUsers} className="ml-2 underline hover:no-underline text-xs">Try again</button>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead>
              <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Rating</th>
                <th className="text-left px-4 py-3">Trips</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center">
                    <Loader2 size={24} className="animate-spin text-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-gray-500 text-sm">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition group">

                  {/* Name + Avatar */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      {u.profilePhoto ? (
                        <img src={u.profilePhoto} alt={u.name}
                          className="w-8 h-8 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {initials(u.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-200 leading-tight truncate">{u.name}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5 font-mono">#{u.shortId}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className="text-xs text-gray-400 truncate block max-w-[160px]">{u.email}</span>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className="text-xs text-gray-400 whitespace-nowrap">{u.phone || '—'}</span>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${ROLE_BADGE[u.role] || ''}`}>
                      {u.role}
                    </span>
                  </td>

                  <td className="px-4 py-3.5">
                    {u.totalRatings > 0 ? (
                      <span className="flex items-center gap-1 text-xs text-gray-300 font-semibold">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        {u.rating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5">
                    <span className="text-xs font-bold text-gray-200">{u.trips}</span>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(u.joinedDate)}</span>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${STATUS_BADGE[u.status] || ''}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {u.status}
                    </span>
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/users/${u.id}`}>
                        <button title="View user"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition">
                          <Eye size={14} />
                        </button>
                      </Link>
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleSuspendToggle(u)}
                          disabled={suspendingId === u.id}
                          title={u.isSuspended ? 'Reactivate' : 'Suspend'}
                          className={`p-1.5 rounded-lg transition ${
                            u.isSuspended
                              ? 'text-gray-500 hover:text-green-400 hover:bg-green-500/10'
                              : 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
                          }`}
                        >
                          {suspendingId === u.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : u.isSuspended ? <CheckCircle size={14} /> : <Ban size={14} />
                          }
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/5">
          <span className="text-[11px] text-gray-500">
            {total === 0
              ? 'No users'
              : `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total.toLocaleString('en-IN')} users`
            }
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={12} /> Prev
            </button>

            {pageNumbers.map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded-lg transition ${
                  page === p ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/5'
                }`}>
                {p}
              </button>
            ))}

            {totalPages > 5 && page < totalPages - 2 && (
              <span className="text-gray-600 text-xs px-1">…</span>
            )}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom stat cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Growth', icon: TrendingUp,
            value: stats ? `${stats.growth >= 0 ? '+' : ''}${stats.growth}%` : '—',
            color: 'bg-blue-500/15 text-blue-400',
            valueColor: stats && stats.growth >= 0 ? 'text-green-400' : 'text-red-400',
          },
          {
            label: 'Verified', icon: ShieldCheck,
            value: stats ? stats.verified.toLocaleString('en-IN') : '—',
            color: 'bg-green-500/15 text-green-400', valueColor: 'text-white',
          },
          {
            label: 'Pending', icon: AlertCircle,
            value: stats ? stats.pending.toLocaleString('en-IN') : '—',
            color: 'bg-amber-500/15 text-amber-400', valueColor: 'text-white',
          },
          {
            label: 'Regions', icon: Globe,
            value: stats ? String(stats.regions) : '—',
            color: 'bg-purple-500/15 text-purple-400', valueColor: 'text-white',
          },
        ].map(s => (
          <div key={s.label} className="bg-[#13172a] border border-white/8 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{s.label}</p>
              <p className={`text-lg font-black mt-0.5 ${s.valueColor}`} style={{ fontFamily: "'Outfit',sans-serif" }}>
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}