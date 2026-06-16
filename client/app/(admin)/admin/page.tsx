'use client'

import { withAuth } from '@/components/hoc'
import AdminDashboard from '@/components/admin/AdminDashboard'

function AdminDashboardPage() {
  return <AdminDashboard />
}

export default withAuth(AdminDashboardPage)