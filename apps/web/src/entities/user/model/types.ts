export interface AdminInvite {
  code: string
  uses: number
  maxUses: number | null
  url: string
}
