import { useState, useEffect, useCallback, useRef } from "react"
import { useSocket } from "./useSocket"
import api from "@/lib/api"

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  link: string
  read: boolean
  createdAt: string
}

export function useNotifications() {
  const socket = useSocket()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [socketReady, setSocketReady] = useState(false) // ✅ NEW: Track socket state
  
  // ✅ NEW: Track if initial load is done
  const initialLoadDone = useRef(false)

  // ✅ FIX 1: Track socket connection state
  useEffect(() => {
    if (!socket) {
      setSocketReady(false)
      return
    }

    const onConnect = () => setSocketReady(true)
    const onDisconnect = () => setSocketReady(false)

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)

    if (socket.connected) {
      setSocketReady(true)
    }

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
    }
  }, [socket])

  // Load from REST on mount
  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.get("/notifications")
      if (res.data.success) {
        setNotifications(res.data.data)
        setUnreadCount(res.data.unreadCount)
      }
    } catch (error) {
      console.error("Failed to load notifications:", error)
    } finally {
      setLoading(false)
      initialLoadDone.current = true
    }
  }, [])

  useEffect(() => { 
    loadNotifications() 
  }, [loadNotifications])

  // ✅ FIX 2: Real-time notifications with proper handling
  useEffect(() => {
    if (!socket || !socketReady) return

    // ✅ FIX 3: Handle new notification with deduplication
    const handler = (notif: AppNotification) => {
      setNotifications((prev) => {
        // Check if notification already exists (deduplicate)
        if (prev.some((n) => n.id === notif.id)) return prev
        return [notif, ...prev]
      })
      setUnreadCount((c) => c + 1)
    }

    // ✅ FIX 4: Handle all read
    const allReadHandler = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    }

    // ✅ FIX 5: Handle individual read from socket
    const notificationReadHandler = ({ notificationId }: { notificationId: string }) => {
      setNotifications((prev) =>
        prev.map((n) => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    }

    // ✅ FIX 6: Handle unread count updates from server
    const unreadCountHandler = ({ count }: { count: number }) => {
      setUnreadCount(count)
    }

    socket.on("new_notification", handler)
    socket.on("all_notifications_read", allReadHandler)
    socket.on("notification_read", notificationReadHandler)
    socket.on("unread_count_updated", unreadCountHandler)

    return () => {
      socket.off("new_notification", handler)
      socket.off("all_notifications_read", allReadHandler)
      socket.off("notification_read", notificationReadHandler)
      socket.off("unread_count_updated", unreadCountHandler)
    }
  }, [socket, socketReady])

  // ✅ FIX 7: Mark notification as read with optimistic update
  const markRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    setUnreadCount((c) => Math.max(0, c - 1))

    try {
      await api.put(`/notifications/${id}/read`)
      socket?.emit("mark_notification_read", { notificationId: id })
    } catch (error) {
      // Rollback on error
      console.error("Failed to mark notification as read:", error)
      setNotifications((prev) =>
        prev.map((n) => 
          n.id === id ? { ...n, read: false } : n
        )
      )
      setUnreadCount((c) => c + 1)
      // Re-fetch to ensure consistency
      await loadNotifications()
    }
  }, [socket, loadNotifications])

  // ✅ FIX 8: Mark all as read with optimistic update
  const markAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)

    try {
      await api.put("/notifications/read-all")
      socket?.emit("mark_all_notifications_read")
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
      // Rollback and re-fetch
      await loadNotifications()
    }
  }, [socket, loadNotifications])

  // ✅ FIX 9: Reload notifications with proper state management
  const reload = useCallback(async () => {
    setLoading(true)
    await loadNotifications()
  }, [loadNotifications])

  // ✅ FIX 10: Clear notifications (optional - for logout)
  const clearNotifications = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
    setLoading(false)
    initialLoadDone.current = false
  }, [])

  return { 
    notifications, 
    unreadCount, 
    loading, 
    socketReady, // ✅ NEW: Expose socket state
    markRead, 
    markAllRead, 
    reload,
    clearNotifications, // ✅ NEW: Clear all notifications
  }
}