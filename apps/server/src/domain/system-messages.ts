import type { AppDatabase } from '../db/client'
import type { Hub } from '../ws/hub'
import { createMessage } from './messages'

export const createSystemMessage = (db: AppDatabase, hub: Hub, chatId: string, text: string) =>
  createMessage(db, hub, {
    chatId,
    sender: 'system',
    content: { text },
    status: 'processed',
  })
