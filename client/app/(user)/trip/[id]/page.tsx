'use client'

import { useParams } from 'next/navigation'
import TripDetail from '@/components/user/TripDetail'

export default function TripDetailPage() {
  const params = useParams()
  const tripId = params.id as string

  return <TripDetail tripId={tripId} />
}