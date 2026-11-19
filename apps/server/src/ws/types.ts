export type AppWebSocketData =
  | { kind: 'bot'; botId: string | null; awaitConfiguration?: boolean }
  | { kind: 'client'; userId: string | null; sessionId: string | null; expiresAt: number }
