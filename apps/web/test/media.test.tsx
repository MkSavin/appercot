import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { MediaGallery } from '../src/entities/message'
import { Composer } from '../src/features/send-message'
import { uploadChatMedia } from '../src/features/upload-media'

describe('media messages', () => {
  test('renders protected image, video, audio and file elements', () => {
    const markup = renderToStaticMarkup(
      <MediaGallery
        media={[
          { fileId: 'image 1', kind: 'image', caption: 'Preview' },
          { fileId: 'video-1', kind: 'video' },
          { fileId: 'audio-1', kind: 'audio' },
          { fileId: 'document-1', kind: 'file', caption: 'Specification' },
        ]}
      />,
    )
    expect(markup).toContain('src="/api/files/image%201"')
    expect(markup).toContain('alt="Preview"')
    expect(markup).toContain('<video')
    expect(markup).toContain('controls=""')
    expect(markup).toContain('<audio')
    expect(markup).toContain('href="/api/files/document-1"')
    expect(markup).toContain('Specification')
    expect(markup).toContain('Скачать файл')
  })

  test('offers an accessible attachment control in the composer', () => {
    const markup = renderToStaticMarkup(<Composer chatId="chat-1" />)
    expect(markup).toContain('type="file"')
    expect(markup).toContain('Прикрепить файл')
  })

  test('uploads multipart media to the chat endpoint with credentials', async () => {
    let receivedUrl = ''
    let receivedInit: RequestInit | undefined
    const fileId = await uploadChatMedia(
      'chat-1',
      new File(['image'], 'image.png', { type: 'image/png' }),
      async (input, init) => {
        receivedUrl = String(input)
        receivedInit = init
        return Response.json({ fileId: 'file-1' }, { status: 201 })
      },
    )
    expect(fileId).toBe('file-1')
    expect(receivedUrl).toBe('/api/files')
    expect(receivedInit?.method).toBe('POST')
    expect(receivedInit?.credentials).toBe('same-origin')
    const body = receivedInit?.body
    expect(body).toBeInstanceOf(FormData)
    if (!(body instanceof FormData)) throw new Error('Expected multipart body')
    expect(body.get('chatId')).toBe('chat-1')
    expect(body.get('file')).toBeInstanceOf(File)
  })
})
