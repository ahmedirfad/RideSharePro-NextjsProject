'use client'

import { withAuth } from '@/components/hoc'
import AdminAnalytics from '@/components/admin/AdminAnalytics'  // ← matches

function AdminAnalyticsPage() {
  return <AdminAnalytics />  // ← matches
}

export default withAuth(AdminAnalyticsPage, true)