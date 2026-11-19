import type { fetchAdminBot, fetchBotInvitations, fetchBotMemberships } from '@/entities/bot'

export type AdminBot = Awaited<ReturnType<typeof fetchAdminBot>>
export type BotMemberships = Awaited<ReturnType<typeof fetchBotMemberships>>
export type BotInvitation = Awaited<ReturnType<typeof fetchBotInvitations>>[number]
export type RunBotOperation = (operation: () => Promise<void>) => Promise<void>
