'use client'

import { useParams } from 'next/navigation'
import { withAuth } from '@/components/hoc'
import CheckoutPage from '@/components/user/CheckoutPage'

function CheckoutRoutePage() {
  const params = useParams()
  const tripId = params.id as string

  return <CheckoutPage />
}

export default withAuth(CheckoutRoutePage)