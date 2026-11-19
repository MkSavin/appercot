import { z } from 'zod'

export const ShortcutSchema = z
  .string()
  .regex(/^(?:(?:Mod|Ctrl|Meta)\+(?:Alt\+)?(?:Shift\+)?|Alt\+(?:Shift\+)?)[A-Z0-9]$/)
