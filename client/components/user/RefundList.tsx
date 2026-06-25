'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, CheckCircle2, AlertCircle, Loader2, Wallet } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

interface Refund {
  id: string
  tripId: string
  from: string
  to: string
  departureDate: string
  departureTime: string
  seatNumber: number
  fare: number
  refundAmount: number
  platformFee: number
  refundedAt: string
  refundStatus: string
}

function formatDate(dateStr: string) {
  if (!dateStr || dateStr === 'Unknown') return 'Unknown'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`
}

export default function RefundList() {
  const { isAuthenticated } = useAuthStore()
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [totalRefunded, setTotalRefunded] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchRefunds = async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await api.get('/refunds/my')
      if (response.data.success) {
        setRefunds(response.data.data.refunds)
        setTotalRefunded(response.data.data.totalRefunded)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load refunds')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRefunds()
  }, [isAuthenticated])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={32} className="text-blue-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle size={32} className="text-red-500 mx-auto mb-2" />
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  if (refunds.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet size={24} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Refunds Yet</h3>
        <p className="text-sm text-gray-500">Refunds appear here when you cancel bookings.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-sm font-medium">Total Refunds</p>
            <p className="text-3xl font-bold">{formatCurrency(totalRefunded)}</p>
            <p className="text-blue-200 text-xs mt-1">{refunds.length} refunds processed</p>
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
            <Wallet size={28} className="text-white" />
          </div>
        </div>
      </div>

      {/* Refund List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm">Refund History</h3>
        </div>

        <div className="divide-y divide-gray-50">
          {refunds.map((refund) => (
            <div key={refund.id} className="px-5 py-4 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-blue-500 shrink-0" />
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {refund.from} <span className="text-gray-400">→</span> {refund.to}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> {formatDate(refund.departureDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      Seat {refund.seatNumber}
                    </span>
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 size={11} /> {formatDate(refund.refundedAt)}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-bold text-green-600">+{formatCurrency(refund.refundAmount)}</p>
                  <p className="text-[10px] text-gray-400">Fee: {formatCurrency(refund.platformFee)}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                    {refund.refundStatus}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}