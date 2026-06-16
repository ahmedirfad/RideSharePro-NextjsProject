'use client'
import { withAuth } from '@/components/hoc'
import SettingsPage from '@/components/user/SettingsPage'

export const metadata = {
  title: 'Settings — RideSharePro',
  description: 'Manage your account settings, notifications, and preferences',
}

export default withAuth(SettingsPage)