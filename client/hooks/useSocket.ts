import { useEffect, useRef, useState } from "react"
import { Socket } from "socket.io-client"
import { connectSocket, getSocket } from "@/lib/socket"
import { useAuthStore } from "@/store/authStore"

export function useSocket(): Socket | null {
  const { isAuthenticated } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      // Disconnect when user logs out
      if (socketRef.current?.connected) {
        socketRef.current.disconnect()
      }
      socketRef.current = null
      setIsConnected(false)
      return
    }

    // Only create socket once
    if (!socketRef.current) {
      const s = getSocket()
      socketRef.current = s
      
      // Set up connection listeners
      s.on('connect', () => setIsConnected(true))
      s.on('disconnect', () => setIsConnected(false))
      s.on('connect_error', () => setIsConnected(false))
    }

    // Connect if not already connected
    if (!socketRef.current.connected) {
      socketRef.current.connect()
    }

    // ✅ Clean up event listeners on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.off('connect')
        socketRef.current.off('disconnect')
        socketRef.current.off('connect_error')
        // Don't disconnect - keep alive for background notifications
      }
    }
  }, [isAuthenticated]) // ✅ Remove token dependency

  // ✅ Return socket only if authenticated and connected
  return isAuthenticated ? socketRef.current : null
}