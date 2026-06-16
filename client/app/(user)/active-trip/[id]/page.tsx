'use client'

import { withAuth } from '@/components/hoc'
import ActiveTrip from '@/components/user/ActiveTrip'

function ActiveTripPage() {
  return <ActiveTrip />
}

export default withAuth(ActiveTripPage)