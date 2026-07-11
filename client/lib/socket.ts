import { io, Socket } from "socket.io-client"

let socket: Socket | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

export function getSocket(): Socket {
  if (!socket) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken") || ""
        : ""

    socket = io(process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5002", {
      withCredentials: true,
      autoConnect: true,  // ✅ Enable auto-connect
      auth: { token },
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    // ✅ Handle reconnection
    socket.on('reconnect', () => {
      console.log('Socket reconnected')
      reconnectAttempts = 0
      
      // Re-authenticate with latest token
      const newToken = localStorage.getItem('accessToken') || ''
      if (socket) {
        socket.auth = { token: newToken }
      }
      
      // Emit event to re-join rooms (handled on server)
      socket?.emit('rejoin_rooms')
    })

    socket.on('reconnect_attempt', (attempt) => {
      reconnectAttempts = attempt
      console.log(`Reconnection attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS}`)
      
      // Update auth token on each attempt
      const newToken = localStorage.getItem('accessToken') || ''
      if (socket) {
        socket.auth = { token: newToken }
      }
    })

    socket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error)
    })

    socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect after max attempts')
      // Show toast notification to user
      if (typeof window !== 'undefined') {
        // You can integrate with your toast system here
        console.warn('Connection lost. Please refresh the page.')
      }
    })

    // ✅ Handle connection errors
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      // If token is invalid, redirect to login
      if (error.message === 'Unauthorized' || error.message === 'Authentication error') {
        localStorage.removeItem('accessToken')
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    })
  }
  return socket
}

export function connectSocket(token?: string) {
  const s = getSocket()
  if (token) {
    s.auth = { token }
    // Update auth if socket already connected
    if (s.connected) {
      s.emit('authenticate', { token })
    }
  }
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
    reconnectAttempts = 0
  }
}

// ✅ Helper to check connection status
export function isSocketConnected(): boolean {
  return socket?.connected || false
}

// ✅ Helper to get socket ID
export function getSocketId(): string | null {
  return socket?.id || null
}