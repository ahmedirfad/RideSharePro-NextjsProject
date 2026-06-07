import ProtectedRoute from '@/components/ProtectedRoute'
import HostTrip from '@/components/user/HostTrip'

export default function HostPage() {
  return (
    <ProtectedRoute>
      <HostTrip />
    </ProtectedRoute>
  )
}