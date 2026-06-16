'use client'

import { withAuth } from '@/components/hoc'
import AdminUsers from '@/components/admin/AdminUsers'

function AdminUsersPage() {
  return <AdminUsers />
}

export default withAuth(AdminUsersPage, true)