'use client'

import { useParams } from 'next/navigation'
import CheckoutPage from '@/components/user/CheckoutPage'

export default function CheckoutRoutePage() {
  const params = useParams()
  const tripId = params.id as string

  return <CheckoutPage tripId={tripId} />
}