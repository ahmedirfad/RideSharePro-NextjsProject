'use client'

import { withAuth } from '@/components/hoc'
import AdminBookings from '@/components/admin/AdminBookings'

function AdminBookingsPage() {
  return <AdminBookings />
}

export default withAuth(AdminBookingsPage, true)