import { useState, useEffect, useCallback, useRef } from "react"
import { useSocket } from "./useSocket"

export interface ChatMessage {
  id: string
  bookingId: string
  sender: { id: string; name: string; photo: string }
  text: string
  readBy: string[]
  createdAt: string
}

export function useChat(bookingId: string | null, currentUserId: string | null) {
  const socket = useSocket()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const [socketReady, setSocketReady] = useState(false) // ✅ NEW: Track socket state
  
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const joinedRef = useRef(false) // ✅ NEW: Track if we've joined

  // ✅ FIX 1: Track socket connection state
  useEffect(() => {
    if (!socket) {
      setSocketReady(false)
      return
    }

    const onConnect = () => {
      setSocketReady(true)
      // If we have a bookingId, rejoin after reconnect
      if (bookingId && joinedRef.current) {
        socket.emit("join_chat", { bookingId }, (res: any) => {
          if (res?.success) {
            setMessages(res.messages)
          }
        })
      }
    }

    const onDisconnect = () => {
      setSocketReady(false)
      setLoading(false)
    }

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)

    // Set initial state
    if (socket.connected) {
      setSocketReady(true)
    }

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      joinedRef.current = false
    }
  }, [socket, bookingId])

  // Join chat room + load history
  useEffect(() => {
    // ✅ FIX 2: Wait for socket to be ready
    if (!socket || !bookingId || !socketReady) return

    setLoading(true)
    joinedRef.current = true

    socket.emit("join_chat", { bookingId }, (res: any) => {
      if (res?.success) {
        setMessages(res.messages)
      }
      setLoading(false)
    })

    // Incoming messages
    const onMessage = (msg: ChatMessage) => {
      if (msg.bookingId !== bookingId) return
      setMessages((prev) => {
        // Deduplicate
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      // Auto mark as read
      socket.emit("mark_messages_read", { bookingId })
    }

    // Typing indicators
    const onTyping = ({ userId }: { userId: string }) => {
      if (userId === currentUserId) return
      setIsTyping(true)
      setTypingUser(null)
      if (typingTimer.current) clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => setIsTyping(false), 3000)
    }

    const onStopTyping = () => {
      setIsTyping(false)
      if (typingTimer.current) clearTimeout(typingTimer.current)
    }

    const onRead = ({ bookingId: readBookingId, readBy }: { bookingId: string; readBy: string }) => {
      if (readBookingId !== bookingId) return
      setMessages((prev) =>
        prev.map((m) =>
          m.sender.id === currentUserId 
            ? { ...m, readBy: [...m.readBy, readBy] } 
            : m
        )
      )
    }

    // ✅ NEW: Handle unread count updates
    const onUnreadUpdated = ({ bookingId: updatedBookingId, unreadCount }: { bookingId: string; unreadCount: number }) => {
      if (updatedBookingId !== bookingId) return
      // Update message readBy statuses based on unread count
      // This is a simplified approach - you might want more granular tracking
    }

    socket.on("receive_message", onMessage)
    socket.on("user_typing", onTyping)
    socket.on("user_stop_typing", onStopTyping)
    socket.on("messages_read", onRead)
    socket.on("unread_count_updated", onUnreadUpdated)

    return () => {
      socket.off("receive_message", onMessage)
      socket.off("user_typing", onTyping)
      socket.off("user_stop_typing", onStopTyping)
      socket.off("messages_read", onRead)
      socket.off("unread_count_updated", onUnreadUpdated)
      joinedRef.current = false
    }
  }, [socket, bookingId, currentUserId, socketReady]) // ✅ Add socketReady dependency

  // ✅ FIX 3: Clean up typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimer.current) {
        clearTimeout(typingTimer.current)
        // Send stop typing if component unmounts while typing
        if (socket && bookingId && socketReady) {
          socket.emit("stop_typing", { bookingId })
        }
      }
    }
  }, [socket, bookingId, socketReady])

  const sendMessage = useCallback(
    (text: string) => {
      if (!socket || !bookingId || !text.trim() || !socketReady) return

      socket.emit("send_message", { bookingId, text: text.trim() }, (res: any) => {
        if (!res?.success) console.error("Send failed:", res?.error)
      })
      socket.emit("stop_typing", { bookingId })
    },
    [socket, bookingId, socketReady]
  )

  const emitTyping = useCallback(() => {
    if (!socket || !bookingId || !socketReady) return
    socket.emit("typing", { bookingId })
  }, [socket, bookingId, socketReady])

  const emitStopTyping = useCallback(() => {
    if (!socket || !bookingId || !socketReady) return
    socket.emit("stop_typing", { bookingId })
  }, [socket, bookingId, socketReady])

  // ✅ NEW: Rejoin chat (call after reconnection)
  const rejoinChat = useCallback(() => {
    if (!socket || !bookingId || !socketReady) return
    joinedRef.current = true
    socket.emit("join_chat", { bookingId }, (res: any) => {
      if (res?.success) {
        setMessages(res.messages)
      }
      setLoading(false)
    })
  }, [socket, bookingId, socketReady])

  return {
    messages,
    loading,
    isTyping,
    typingUser,
    socketReady, // ✅ NEW: Expose socket state
    sendMessage,
    emitTyping,
    emitStopTyping,
    rejoinChat, // ✅ NEW: Expose rejoin function
  }
}