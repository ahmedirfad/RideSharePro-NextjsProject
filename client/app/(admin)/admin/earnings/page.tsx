'use client'

import { withAuth } from '@/components/hoc'
import AdminEarningsPage from '@/components/admin/AdminEarnings'

function AdminEarnings() {
  return <AdminEarningsPage />
}

export default withAuth(AdminEarnings)