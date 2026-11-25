import { useState } from 'react'
import { useLocation } from 'wouter'
import { addBotRequest, type BotDetails } from '@/entities/bot'
import { useChatStore } from '@/entities/chat'
import { showRequestError } from '@/shared/api'

export const useOpenBotChat = () => {
  const [pending, setPending] = useState(false)
  const [, navigate] = useLocation()
  const upsertChat = useChatStore((state) => state.upsertChat)

  const openChat = async (bot: BotDetails) => {
    setPending(true)
    try {
      const chat = await addBotRequest(bot.username)
      upsertChat(chat)
      navigate(`/c/${chat.id}`)
      return true
    } catch (error) {
      showRequestError(error)
      return false
    } finally {
      setPending(false)
    }
  }

  return { pending, openChat }
}
