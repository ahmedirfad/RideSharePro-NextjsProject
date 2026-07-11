'use client'

import { useParams } from 'next/navigation'
import { withAuth } from '@/components/hoc'
import TripDetail from '@/components/user/TripDetail'

function TripDetailPage() {
  const params = useParams()
  const tripId = params.id as string

  return <TripDetail />
}

export default withAuth(TripDetailPage)