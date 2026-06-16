'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ShieldCheck, AlertCircle, Plus, Upload, X, ChevronRight,
  ChevronDown, Mail, Phone, MessageCircle, Clock, FileText,
  HelpCircle, Car, Search, CreditCard, Star, Shield,
  CheckCircle2, XCircle, Loader2, ExternalLink, Siren,
  Users, MapPin, AlertTriangle
} from 'lucide-react'
import api from '@/lib/api'

// ─── Types ──────────────────────────────────────────────
interface Dispute {
  id: string
  tripId?: string
  route: string
  date: string
  reason: string
  description: string
  status: 'open' | 'under_review' | 'resolved' | 'dismissed'
  resolution: string
  adminNotes: string
  evidence: string[]
  raisedByMe: boolean
  otherParty?: string
  createdAt: string
  resolvedAt?: string
}

// ─── Static content ────────────────────────────────────
const TABS = [
  { id: 'disputes', label: 'Disputes', icon: AlertCircle },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'contact', label: 'Contact Support', icon: MessageCircle },
  { id: 'policies', label: 'Terms & Policies', icon: FileText },
  { id: 'safety', label: 'Safety Center', icon: Shield },
]

const DISPUTE_REASON_LABELS: Record<string, string> = {
  driver_no_show: 'Driver did not show up',
  passenger_no_show: 'Passenger did not show up',
  payment_issue: 'Payment issue',
  misconduct: 'Misconduct',
  wrong_route: 'Wrong route taken',
  vehicle_mismatch: 'Vehicle mismatch',
  other: 'Other',
}

const DISPUTE_STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-amber-100 text-amber-700', icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  dismissed: { label: 'Dismissed', color: 'bg-gray-100 text-gray-500', icon: XCircle },
}

const FAQ_SECTIONS = [
  {
    title: 'Hosting a Trip',
    items: [
      {
        q: 'How do I host a trip?',
        a: 'Go to "Host a Ride" from your dashboard, enter your route, departure time, available seats, and price per seat. Add waypoints if your route has stops along the way. Once posted, passengers can find and book your trip.',
      },
      {
        q: 'Can I edit a trip after posting it?',
        a: 'Yes, as long as the trip status is "upcoming" and hasn\'t started yet. You can update the time, seats, and price. Trips that have already begun or completed cannot be edited.',
      },
      {
        q: 'How is my fare per km calculated?',
        a: 'Your fare per km is automatically calculated from your total price divided by the total route distance. When passengers book partial segments, they\'re charged proportionally based on the distance they travel.',
      },
    ],
  },
  {
    title: 'Booking a Ride',
    items: [
      {
        q: 'How do I book a ride?',
        a: 'Search for your route on the "Find a Ride" page, select a trip that matches your schedule, choose your boarding and alighting points, pick a seat, and proceed to checkout.',
      },
      {
        q: 'Can I book just part of a route?',
        a: 'Yes. If a driver has added waypoints along their route, you can select any boarding and alighting point between those stops, and your fare is calculated only for that segment.',
      },
      {
        q: 'What happens after I book?',
        a: 'Your seat is reserved immediately and payment is held securely until the trip is completed. You\'ll see the trip in "My Trips" with the driver\'s contact details.',
      },
    ],
  },
  {
    title: 'Cancellations & Refunds',
    items: [
      {
        q: 'What is the cancellation policy?',
        a: 'Passengers can cancel a booking for a full refund up to 24 hours before departure. Cancellations within 24 hours may be subject to a partial refund. Drivers who cancel a posted trip automatically refund all passengers in full.',
      },
      {
        q: 'How long do refunds take?',
        a: 'Refunds are processed within 5-7 business days back to your original payment method once a cancellation or dispute resolution is confirmed.',
      },
      {
        q: 'My driver cancelled — what now?',
        a: 'You\'ll be notified immediately and automatically refunded in full. We recommend searching for an alternative trip on the same route and date.',
      },
    ],
  },
  {
    title: 'Payments',
    items: [
      {
        q: 'How does payment work?',
        a: 'Payments are held securely in escrow when you book. Funds are only released to the driver after the trip is marked completed, protecting both riders and drivers.',
      },
      {
        q: 'What payment methods are accepted?',
        a: 'We support UPI, debit/credit cards, and major digital wallets. You can manage your saved payment methods from Settings → Payment Methods.',
      },
    ],
  },
  {
    title: 'Safety',
    items: [
      {
        q: 'How are drivers and passengers verified?',
        a: 'All users complete email verification at signup. Drivers additionally verify their government ID and vehicle documents before their first trip is approved.',
      },
      {
        q: 'What should I do in an emergency?',
        a: 'Use the SOS button available during an active trip to alert our safety team and share your live location with emergency contacts. See the Safety Center tab for full details.',
      },
    ],
  },
  {
    title: 'Ratings',
    items: [
      {
        q: 'How does the rating system work?',
        a: 'After each completed trip, both drivers and passengers can rate each other from 1 to 5 stars. Your average rating is visible on your profile and helps build trust in the community.',
      },
      {
        q: 'Can I change a rating after submitting it?',
        a: 'Ratings are final once submitted to keep the system fair and trustworthy for everyone. Please rate thoughtfully after each trip.',
      },
    ],
  },
]

// ─── Sub-components ─────────────────────────────────────

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 py-3.5 text-left group"
      >
        <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition">{q}</span>
        <ChevronDown
          size={16}
          className={`text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-blue-500' : ''}`}
        />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-40 pb-4' : 'max-h-0'}`}>
        <p className="text-sm text-gray-500 leading-relaxed pr-6">{a}</p>
      </div>
    </div>
  )
}

// ─── File Dispute Modal ─────────────────────────────────
function FileDisputeModal({ open, onClose, onSubmitted }: { open: boolean; onClose: () => void; onSubmitted: () => void }) {
  const [bookingId, setBookingId] = useState('')
  const [reason, setReason] = useState('driver_no_show')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const newFiles = Array.from(e.target.files).slice(0, 5 - files.length)
    setFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (!bookingId.trim() || !description.trim()) {
      setError('Booking ID and description are required.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const evidence = files.map((f) => f.name)

      const res = await api.post('/disputes', {
        bookingId: bookingId.trim(),
        reason,
        description: description.trim(),
        evidence,
      })

      if (res.data.success) {
        onSubmitted()
        onClose()
        setBookingId(''); setDescription(''); setFiles([]); setReason('driver_no_show')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to file dispute. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-base">File a Dispute</h2>
            <p className="text-xs text-gray-400 mt-0.5">Our team typically responds within 24 hours</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-red-600 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Booking ID</label>
            <input
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="e.g. 6a25274cb01ef07835623be8"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <p className="text-[11px] text-gray-400 mt-1">Find this on the trip's details page under "My Trips"</p>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              {Object.entries(DISPUTE_REASON_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened in detail..."
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">
              Evidence <span className="text-gray-300 font-normal">(optional, max 5 files)</span>
            </label>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-5 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition">
              <Upload size={16} className="text-gray-400" />
              <span className="text-sm text-gray-500">Click to upload screenshots</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} disabled={files.length >= 5} />
            </label>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-600">
                    <FileText size={12} />
                    <span className="max-w-[140px] truncate">{f.name}</span>
                    <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 transition"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 disabled:bg-blue-400"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <AlertCircle size={14} />}
            File Dispute
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dispute Detail Modal ────────────────────────────────
function DisputeDetailModal({ dispute, onClose }: { dispute: Dispute | null; onClose: () => void }) {
  if (!dispute) return null
  const statusCfg = DISPUTE_STATUS_CONFIG[dispute.status]
  const StatusIcon = statusCfg.icon

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base">Dispute Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900 text-sm">{dispute.route}</p>
              <p className="text-xs text-gray-400 mt-0.5">{dispute.date}</p>
            </div>
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.color}`}>
              <StatusIcon size={12} />{statusCfg.label}
            </span>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Reason</p>
              <p className="text-sm text-gray-900 font-medium">{DISPUTE_REASON_LABELS[dispute.reason] || dispute.reason}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-gray-600 leading-relaxed">{dispute.description}</p>
            </div>
            {dispute.otherParty && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                  {dispute.raisedByMe ? 'Filed against' : 'Filed by'}
                </p>
                <p className="text-sm text-gray-900">{dispute.otherParty}</p>
              </div>
            )}
          </div>

          {dispute.evidence?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Evidence ({dispute.evidence.length})</p>
              <div className="flex flex-wrap gap-2">
                {dispute.evidence.map((e, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-600">
                    <FileText size={12} />{e}
                  </div>
                ))}
              </div>
            </div>
          )}

          {dispute.status === 'resolved' && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1">Resolution</p>
              <p className="text-sm text-green-800 font-medium capitalize">{dispute.resolution.replace(/_/g, ' ')}</p>
              {dispute.adminNotes && <p className="text-xs text-green-600 mt-1.5">{dispute.adminNotes}</p>}
              {dispute.resolvedAt && (
                <p className="text-[11px] text-green-500 mt-2">
                  Resolved on {new Date(dispute.resolvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          )}

          {dispute.status === 'open' && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
              <Clock size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Your dispute is in queue for review. Our support team will reach out if more information is needed.
              </p>
            </div>
          )}

          {dispute.status === 'under_review' && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Our team is actively reviewing this dispute. You'll be notified by email once a decision is made.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════
export default function HelpCenter() {
  const [activeTab, setActiveTab] = useState('disputes')
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loadingDisputes, setLoadingDisputes] = useState(true)
  const [disputeError, setDisputeError] = useState('')
  const [fileModalOpen, setFileModalOpen] = useState(false)
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [disputeFilter, setDisputeFilter] = useState<'all' | Dispute['status']>('all')

  // Contact form state
  const [contactSubject, setContactSubject] = useState('Account Access')
  const [contactTripId, setContactTripId] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [contactSent, setContactSent] = useState(false)

  const fetchDisputes = async () => {
    setLoadingDisputes(true)
    setDisputeError('')
    try {
      const res = await api.get('/disputes/my')
      if (res.data.success) setDisputes(res.data.data)
    } catch (err: any) {
      setDisputeError(err?.response?.data?.message || 'Failed to load disputes')
    } finally {
      setLoadingDisputes(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'disputes') fetchDisputes()
  }, [activeTab])

  const filteredDisputes = disputes.filter((d) => disputeFilter === 'all' || d.status === disputeFilter)

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault()
    setContactSent(true)
    setTimeout(() => setContactSent(false), 4000)
    setContactMessage('')
    setContactTripId('')
  }

  return (
    <div>
      <FileDisputeModal open={fileModalOpen} onClose={() => setFileModalOpen(false)} onSubmitted={fetchDisputes} />
      <DisputeDetailModal dispute={selectedDispute} onClose={() => setSelectedDispute(null)} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Help Center</h1>
          <p className="text-gray-500 text-sm mt-1">Get support, file disputes, and find answers to common questions</p>
        </div>
        {activeTab === 'disputes' && (
          <button
            onClick={() => setFileModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm shadow-blue-200"
          >
            <Plus size={16} /> File New Dispute
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
              }`}
            >
              <Icon size={15} />{tab.label}
            </button>
          )
        })}
      </div>

      {/* ════════ DISPUTES TAB ════════ */}
      {activeTab === 'disputes' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {(['all', 'open', 'under_review', 'resolved', 'dismissed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setDisputeFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  disputeFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? 'All' : DISPUTE_STATUS_CONFIG[s].label}
                {s !== 'all' && (
                  <span className="ml-1.5 opacity-70">
                    {disputes.filter((d) => d.status === s).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {disputeError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{disputeError}</p>
              <button onClick={fetchDisputes} className="mt-2 text-red-600 text-xs hover:underline">Try again</button>
            </div>
          )}

          {loadingDisputes ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="text-blue-500 animate-spin" />
            </div>
          ) : filteredDisputes.length === 0 ? (
            <SectionCard className="p-10 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ShieldCheck size={24} className="text-gray-300" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {disputeFilter === 'all' ? 'No disputes filed' : `No ${DISPUTE_STATUS_CONFIG[disputeFilter as Dispute['status']]?.label.toLowerCase()} disputes`}
              </h3>
              <p className="text-gray-400 text-sm">
                {disputeFilter === 'all'
                  ? 'If something went wrong on a trip, you can file a dispute and our team will look into it.'
                  : 'Try a different filter to see other disputes.'}
              </p>
            </SectionCard>
          ) : (
            <div className="space-y-3">
              {filteredDisputes.map((dispute) => {
                const cfg = DISPUTE_STATUS_CONFIG[dispute.status]
                const StatusIcon = cfg.icon
                return (
                  <SectionCard key={dispute.id} className="p-4 hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>
                            <StatusIcon size={10} />{cfg.label}
                          </span>
                          {!dispute.raisedByMe && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                              Filed against you
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">Trip #{dispute.tripId?.toString().slice(-6).toUpperCase() || '------'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{dispute.route} · {dispute.date}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-3">
                      "{dispute.description}"
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{DISPUTE_REASON_LABELS[dispute.reason]}</span>
                      <button
                        onClick={() => setSelectedDispute(dispute)}
                        className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"
                      >
                        View Details <ChevronRight size={14} />
                      </button>
                    </div>
                  </SectionCard>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════ FAQ TAB ════════ */}
      {activeTab === 'faq' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {FAQ_SECTIONS.map((section) => (
            <SectionCard key={section.title} className="p-5">
              <h3 className="font-bold text-gray-900 text-sm mb-1">{section.title}</h3>
              <div className="mt-2">
                {section.items.map((item) => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      {/* ════════ CONTACT SUPPORT TAB ════════ */}
      {activeTab === 'contact' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <SectionCard className="p-6">
              <h3 className="font-bold text-gray-900 mb-1">Submit a Support Ticket</h3>
              <p className="text-sm text-gray-400 mb-4">We typically respond within 4 hours during business hours</p>

              {contactSent && (
                <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-600" />
                  <p className="text-sm text-green-700 font-medium">Ticket sent! We'll get back to you shortly.</p>
                </div>
              )}

              <form onSubmit={handleSendTicket} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Subject</label>
                    <select
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <option>Account Access</option>
                      <option>Booking Issue</option>
                      <option>Payment & Refunds</option>
                      <option>Trip Dispute</option>
                      <option>Safety Concern</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">
                      Associated Trip ID <span className="text-gray-300 font-normal">(optional)</span>
                    </label>
                    <input
                      value={contactTripId}
                      onChange={(e) => setContactTripId(e.target.value)}
                      placeholder="#RS-00000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Description</label>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="How can we help you today?"
                    rows={5}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Attachments allowed (Max 10MB)</p>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm shadow-blue-200"
                >
                  Send Ticket
                </button>
              </form>
            </SectionCard>
          </div>

          <div className="space-y-4">
            <SectionCard className="p-5">
              <h3 className="font-bold text-gray-900 text-sm mb-4">Other Ways to Reach Us</h3>
              <div className="space-y-3">
                <a href="mailto:support@ridesharepro.com" className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center"><Mail size={16} className="text-blue-600" /></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Email Support</p>
                    <p className="text-xs text-gray-400">support@ridesharepro.com</p>
                  </div>
                </a>
                <a href="tel:+918001234567" className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                  <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center"><Phone size={16} className="text-green-600" /></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Phone Support</p>
                    <p className="text-xs text-gray-400">+91 800-123-4567</p>
                  </div>
                </a>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center"><MessageCircle size={16} className="text-purple-600" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Live Chat</p>
                    <p className="text-xs text-gray-400">Avg. response: 4 minutes</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
              </div>
            </SectionCard>

            <SectionCard className="p-5 bg-gradient-to-br from-blue-600 to-blue-700 border-0">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-blue-200" />
                <h3 className="font-bold text-white text-sm">Response Times</h3>
              </div>
              <ul className="space-y-1.5 text-xs text-blue-100">
                <li className="flex justify-between"><span>Live chat</span><span className="font-semibold text-white">~4 mins</span></li>
                <li className="flex justify-between"><span>Email tickets</span><span className="font-semibold text-white">~4 hours</span></li>
                <li className="flex justify-between"><span>Disputes</span><span className="font-semibold text-white">~24 hours</span></li>
              </ul>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ════════ TERMS & POLICIES TAB ════════ */}
      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Terms of Service', desc: 'The rules that govern your use of RideSharePro, including account responsibilities and prohibited activities.', icon: FileText },
            { title: 'Privacy Policy', desc: 'How we collect, use, and protect your personal data, including location information during trips.', icon: ShieldCheck },
            { title: 'Refund Policy', desc: 'Details on when and how refunds are issued for cancelled or disputed trips.', icon: CreditCard },
            { title: 'Cancellation Policy', desc: 'Timeframes and conditions for cancelling a booking or a hosted trip without penalty.', icon: XCircle },
            { title: 'Community Guidelines', desc: 'Standards of conduct expected from all drivers and passengers to keep the community safe and respectful.', icon: Users },
          ].map((p) => {
            const Icon = p.icon
            return (
              <SectionCard key={p.title} className="p-5 hover:shadow-md transition cursor-pointer group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition">
                    <Icon size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 text-sm">{p.title}</h3>
                      <ExternalLink size={13} className="text-gray-300 group-hover:text-blue-400 transition" />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              </SectionCard>
            )
          })}
          <SectionCard className="p-5 bg-gray-50 border-dashed">
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              Last updated June 2026 · By using RideSharePro, you agree to our policies above. Questions? Reach out via Contact Support.
            </p>
          </SectionCard>
        </div>
      )}

      {/* ════════ SAFETY CENTER TAB ════════ */}
      {activeTab === 'safety' && (
        <div className="space-y-5">
          <SectionCard className="p-5 bg-gradient-to-br from-red-50 to-orange-50 border-red-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                <Siren size={22} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">SOS Feature</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  During an active trip, tap the SOS button to instantly alert our safety team and share your live
                  location with your emergency contacts. Your trip details, current location, and driver/passenger
                  info are sent automatically — no need to explain your situation while you're focused on staying safe.
                </p>
              </div>
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-blue-600" />
                <h3 className="font-bold text-gray-900 text-sm">Safety Tips for Riders</h3>
              </div>
              <ul className="space-y-2.5 text-sm text-gray-600">
                {[
                  'Always verify the driver\'s name, photo, and vehicle plate before getting in.',
                  'Share your trip details with a friend or family member.',
                  'Sit in the back seat when riding alone.',
                  'Trust your instincts — if something feels wrong, exit safely and contact support.',
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-blue-500 shrink-0 mt-0.5" />{tip}
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Car size={16} className="text-blue-600" />
                <h3 className="font-bold text-gray-900 text-sm">Safety Tips for Drivers</h3>
              </div>
              <ul className="space-y-2.5 text-sm text-gray-600">
                {[
                  'Verify passenger names match their profile before departure.',
                  'Keep your vehicle documents and license up to date.',
                  'Take regular breaks on long routes to avoid fatigue.',
                  'Report any uncomfortable behavior using the dispute system.',
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-blue-500 shrink-0 mt-0.5" />{tip}
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>

          <SectionCard className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-500" />
              <h3 className="font-bold text-gray-900 text-sm">Emergency Contacts</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'RideSharePro Safety Line', value: '+91 800-123-4567', icon: Phone },
                { label: 'National Emergency', value: '112', icon: Siren },
                { label: 'Women\'s Helpline', value: '1091', icon: Shield },
              ].map((c) => {
                const Icon = c.icon
                return (
                  <div key={c.label} className="bg-gray-50 rounded-xl p-4 text-center">
                    <Icon size={18} className="text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-1">{c.label}</p>
                    <p className="font-bold text-gray-900">{c.value}</p>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  )
}