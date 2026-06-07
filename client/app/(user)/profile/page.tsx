import ProtectedRoute from '@/components/ProtectedRoute'
import ProfilePage from '@/components/user/ProfilePage'

export default function Profile() {
  return (
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  )
}