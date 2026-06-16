'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Loader2 } from 'lucide-react'

export function withoutAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function PublicComponent(props: P) {
    const router = useRouter()
    const { isAuthenticated, _hasHydrated } = useAuthStore()

    useEffect(() => {
      if (_hasHydrated && isAuthenticated) {
        router.replace('/dashboard')
      }
    }, [isAuthenticated, _hasHydrated, router])

    // Not hydrated yet — show loader, render nothing
    if (!_hasHydrated) {
      return <Spinner />
    }

    // Hydrated + authenticated — still show loader while replace() runs
    // This prevents /login from ever painting in the browser
    // so no history entry is created
    if (isAuthenticated) {
      return <Spinner />
    }

    // Not authenticated — safe to show the page
    return <WrappedComponent {...props} />
  }
}

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <Loader2 size={32} className="text-blue-500 animate-spin" />
    </div>
  )
}