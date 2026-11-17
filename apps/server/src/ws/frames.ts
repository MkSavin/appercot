import { BotToServerFrameSchema } from '@appercot/protocol'

export const parseBotFrame = (frame: string) => {
  const json: unknown = JSON.parse(frame)
  return BotToServerFrameSchema.safeParse(json)
}

export const getFrameRequestId = (frame: string) => {
  try {
    const value: unknown = JSON.parse(frame)
    if (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      typeof value.id === 'string'
    ) {
      return value.id
    }
  } catch {
    return null
  }
  return null
}
