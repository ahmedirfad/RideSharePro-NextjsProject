'use client'

import { withAuth } from '@/components/hoc'
import MessagesPage from '@/components/user/MessagePage'

function Messages() {
  return <MessagesPage />
}

export default withAuth(Messages)