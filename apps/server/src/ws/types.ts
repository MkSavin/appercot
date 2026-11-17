export type AppWebSocketData =
  | { kind: 'bot'; botId: string | null }
  | { kind: 'client'; userId: string | null }
