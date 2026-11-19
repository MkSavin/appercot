export interface AdminInvite {
  code: string
  uses: number
  maxUses: number | null
  url: string
  expiresAt: number | null
  revokedAt: number | null
  role: 'user' | 'admin'
}
