'use client'

import { withAuth } from '@/components/hoc'
import AdminSettings from '@/components/admin/AdminSettings'

function AdminSettingsPage() {
  return <AdminSettings />
}

export default withAuth(AdminSettingsPage, true)