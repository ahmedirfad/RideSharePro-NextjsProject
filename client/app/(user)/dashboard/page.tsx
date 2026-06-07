import ProtectedRoute from '@/components/ProtectedRoute'
import Dashboard from '@/components/user/Dashboard'

export default function Home() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}