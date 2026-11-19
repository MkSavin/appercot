import { z } from 'zod'

export const PushPayloadSchema = z.strictObject({
  title: z.string().min(1),
  body: z.string(),
  tag: z.string().min(1),
  url: z.string().regex(/^\/c\/[^/]+$/),
  silent: z.boolean().optional(),
})

export type PushPayload = z.infer<typeof PushPayloadSchema>
