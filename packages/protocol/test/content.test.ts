import { describe, expect, test } from 'bun:test'
import {
  BUTTON_CALLBACK_MAX_BYTES,
  BUTTONS_MAX_COLUMNS,
  BUTTONS_MAX_ROWS,
  MEDIA_MAX,
  MessageContentSchema,
  TEXT_MAX,
  UserContentSchema,
} from '../src'

describe('message content', () => {
  test('accepts text, media and every button variant', () => {
    const result = MessageContentSchema.safeParse({
      text: '**Hello**',
      media: [{ fileId: 'file-1', kind: 'image', caption: 'Preview' }],
      buttons: [
        [{ text: 'Callback', callback: 'action:1' }],
        [{ text: 'Open', url: 'https://example.com' }],
        [{ text: 'Start', command: '/start' }],
      ],
    })

    expect(result.success).toBe(true)
  })

  test('rejects empty content', () => {
    expect(MessageContentSchema.safeParse({}).success).toBe(false)
    expect(UserContentSchema.safeParse({}).success).toBe(false)
  })

  // @anchor INV:content/rejects-keyboards
  test('rejects buttons in user content', () => {
    const result = UserContentSchema.safeParse({
      buttons: [[{ text: 'Not allowed', callback: 'action' }]],
    })

    expect(result.success).toBe(false)
  })

  test('rejects javascript URLs', () => {
    const result = MessageContentSchema.safeParse({
      buttons: [[{ text: 'Unsafe', url: 'javascript:alert(1)' }]],
    })

    expect(result.success).toBe(false)
  })

  test('enforces the text limit', () => {
    expect(MessageContentSchema.safeParse({ text: 'a'.repeat(TEXT_MAX) }).success).toBe(true)
    expect(MessageContentSchema.safeParse({ text: 'a'.repeat(TEXT_MAX + 1) }).success).toBe(false)
  })

  test('enforces media and keyboard limits', () => {
    const media = { fileId: 'file-1', kind: 'image' }
    const button = { text: 'Action', callback: 'action' }
    const row = Array.from({ length: BUTTONS_MAX_COLUMNS }, () => button)

    expect(
      MessageContentSchema.safeParse({
        media: Array.from({ length: MEDIA_MAX + 1 }, () => media),
      }).success,
    ).toBe(false)
    expect(
      MessageContentSchema.safeParse({
        buttons: Array.from({ length: BUTTONS_MAX_ROWS + 1 }, () => row),
      }).success,
    ).toBe(false)
    expect(
      MessageContentSchema.safeParse({
        buttons: [Array.from({ length: BUTTONS_MAX_COLUMNS + 1 }, () => button)],
      }).success,
    ).toBe(false)
  })

  // @anchor INV:content/counts-bytes
  test('measures callback data in UTF-8 bytes', () => {
    const validCallback = 'a'.repeat(BUTTON_CALLBACK_MAX_BYTES)
    const oversizedCallback = '🙂'.repeat(BUTTON_CALLBACK_MAX_BYTES / 4 + 1)
    const createContent = (callback: string) => ({
      buttons: [[{ text: 'Action', callback }]],
    })

    expect(MessageContentSchema.safeParse(createContent(validCallback)).success).toBe(true)
    expect(MessageContentSchema.safeParse(createContent(oversizedCallback)).success).toBe(false)
  })
})
