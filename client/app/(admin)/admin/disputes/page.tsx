'use client'

import { withAuth } from '@/components/hoc'
import AdminDisputes from '@/components/admin/AdminDisputes'

function AdminDisputePage() {
  return <AdminDisputes />
}

export default withAuth(AdminDisputePage, true)