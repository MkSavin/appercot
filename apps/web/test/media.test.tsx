import '../src/shared/config/i18n'
import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { MediaGallery } from '../src/entities/message'
import { Composer } from '../src/features/send-message'

describe('media messages', () => {
  test('renders preview triggers and delays originals until explicitly opened', () => {
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
    expect(markup).toContain('aria-label="Preview"')
    expect(markup).toContain('Воспроизвести видео')
    expect(markup).not.toContain('src="/api/files/image%201"')
    expect(markup).not.toContain('<video')
    expect(markup).toContain('controls=""')
    expect(markup).toContain('<audio')
    expect(markup).toContain('href="/api/files/document-1?download=1&amp;v=2"')
    expect(markup).toContain('Specification')
    expect(markup).toContain('Скачать файл')
  })

  test('offers an accessible attachment control in the composer', () => {
    const markup = renderToStaticMarkup(<Composer chatId="chat-1" />)
    expect(markup).toContain('type="file"')
    expect(markup).toContain('Прикрепить файл')
  })

  test('keeps the multiple file input accessible', () => {
    const markup = renderToStaticMarkup(<Composer chatId="chat-1" />)
    expect(markup).toContain('multiple=""')
  })
})
