# Messages and media

## Text and structured content

```ts
await context.reply('Plain text or **Markdown**')
await context.reply({
  text: 'Choose an option',
  buttons: [[{ text: 'Open', callback: 'open' }]],
})
```

Bot Markdown supports GFM in the PWA without rendering raw HTML. Do not rely on HTML tags or scripts in message text.

Use the API for operations outside the current event:

```ts
const message = await bot.api.sendMessage({
  chatId,
  content: { text: 'Status updated' },
  replyTo: optionalMessageId,
})

await bot.api.editMessage({
  chatId,
  messageId: message.id,
  content: { text: 'Updated again' },
})
await bot.api.deleteMessage({ chatId, messageId: message.id })
await bot.api.sendTyping({ chatId })
```

Within a handler, `context.edit`, `context.delete`, and `context.typing` provide the corresponding shortcuts.

## Send bytes or a stream

```ts
await context.replyWithFile(bytes, {
  name: 'report.pdf',
  mime: 'application/pdf',
  caption: 'Latest report',
})
```

An upload source can be a `Blob`, `ArrayBuffer`, `Uint8Array`, `ReadableStream<Uint8Array>`, an HTTP(S) URL string, or a `URL`. `sendFile` infers `image`, `video`, `audio`, or generic `file` from the MIME type unless `kind` is provided.

Use `bot.api.uploadFile(chatId, source, options)` when only a file ID is needed, or `bot.api.sendFile` when the bot is not currently handling a context.

## Import a URL

```ts
await context.replyWithFile(new URL('https://media.example/clip.mp4'), {
  name: 'clip.mp4',
  mime: 'video/mp4',
})
```

Redirects and destination addresses are validated. To import from a private service, list its exact host, including a non-default port, in `MEDIA_TRUSTED_HOSTS`. Do not allowlist broad networks.

## Limits and playback

The default application upload limit is 2 GiB; `MEDIA_MAX_BYTES=0` removes the application limit. FFmpeg generates thumbnails while preserving original bytes. Video playback and seeking depend on browser codec support. Original file and Range requests still enforce chat access.

Back up media with SQLite; file metadata alone cannot restore an attachment. See [backup and recovery](../deployment/backup-and-recovery.md).
