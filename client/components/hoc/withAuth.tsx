'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Loader2 } from 'lucide-react'

export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requireAdmin: boolean = false 
) {
  return function AuthenticatedComponent(props: P) {
    const router = useRouter()
    const { isAuthenticated, _hasHydrated, user } = useAuthStore()

    useEffect(() => {
      if (_hasHydrated) {
        if (!isAuthenticated) {
          router.replace('/login')
          return
        }
        
        if (requireAdmin && user?.role !== 'admin') {
          router.replace('/dashboard')  
        }
      }
    }, [isAuthenticated, _hasHydrated, user, router])

    if (!_hasHydrated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 size={32} className="text-blue-500 animate-spin" />
        </div>
      )
    }

    if (!isAuthenticated) {
      return null
    }

    if (requireAdmin && user?.role !== 'admin') {
      return null
    }

    return <WrappedComponent {...props} />
  }
}