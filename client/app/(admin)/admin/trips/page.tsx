'use client'

import { withAuth } from '@/components/hoc'
// Make sure this path is correct
import AdminTrips from '@/components/admin/AdminTrips'  // or AdminTrips if you have it

function AdminTripsPage() {
  return <AdminTrips/>
}

export default withAuth(AdminTripsPage, true)