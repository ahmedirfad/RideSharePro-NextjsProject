import ProtectedRoute from '@/components/ProtectedRoute'
import MyTrips from '@/components/user/MyTrips'

export default function MyTripsPage() {
  return (
    <ProtectedRoute>
      <MyTrips />
    </ProtectedRoute>
  )
}