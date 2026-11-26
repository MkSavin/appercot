# Media delivery

The [file routes](../../apps/server/src/http/files.ts) authorize the caller against the owning chat. Upload raw bytes or an HTTP(S) URL through the SDK. Both imports store a single original under its file ID and produce the same message attachment. URL imports have a redirect cap and pin each connection to a validated IP. Set `MEDIA_TRUSTED_HOSTS` to an exact internal host and port when a bot must import from a private service.

```ts
await bot.api.sendFile(chatId, stagedFile, {
  name: 'clip.mp4',
  mime: 'video/mp4',
  caption: 'Camera event',
})

await context.replyWithFile(signedClipUrl, {
  name: 'clip.mp4',
  mime: 'video/mp4',
})
```

`stagedFile` can be a `Blob`, byte buffer or `ReadableStream<Uint8Array>`. Spotter stages clips and sends clip bytes through its delivery transport. An integration can pass the staging stream or an HTTP(S) URL to the SDK. [Spotter media controller](https://github.com/mksavin/spotter/blob/master/apps/server/src/transport/controllers/eventMediaController.ts) · [Frigate media provider](https://github.com/mksavin/spotter/blob/master/apps/frigate/src/media/FrigateMediaProvider.ts)

- URL and byte uploads use the same access checks and video Range route. Checked: INV:media-transfer/imports-streams.
- [Storage](../../apps/server/src/domain/media-storage.ts) streams through Bun S3 in Compose. Local uploads use an incremental `FileSink` with per-chunk flushes rather than wrapping the request stream in a second `Response`. Existing local files keep their local storage marker. On standalone installs, leave `S3_ENDPOINT` empty to use disk for new uploads too.
- Multiple owned media attach to one idempotent user message. Checked: INV:file-upload-policy/sends-multiple.
- The application limits each upload to 2 GiB by default. `MEDIA_MAX_BYTES=0` removes that application limit. The streaming S3 writer uses 8 MiB parts and two concurrent part requests. With a 10,000-part backend limit, the effective streaming ceiling is approximately 78 GiB. The legacy multipart HTTP endpoint is capped at 64 MiB. Use the raw upload path for larger files.
- The chat loads thumbnails around the visible viewport. Two FFmpeg workers make bounded JPEG thumbnails on demand. Original requests start when the user opens or downloads an attachment. Resolved thumbnails are privately cached and revalidated after access checks. Originals stream through authorized GET and HEAD with Range support and opt out of HTTP caching. Upload and original-read concurrency limits are configured in the [configuration reference](../../docs/guide/deployment/configuration.md).
- FFmpeg extracts still images and thumbnails. The original stays byte-for-byte intact. Playback and seeking depend on the browser's support for the original format and codec.
- SQLite tracks attachment state. Orphaned files and files detached by chat deletion or clearing are eligible for background cleanup after 24 hours. Back up both SQLite and the corresponding media objects.

[Bun S3 API](https://bun.com/docs/runtime/s3) · [Garage quick start](https://garagehq.deuxfleurs.fr/documentation/quick-start/) · [Garage S3 compatibility](https://garagehq.deuxfleurs.fr/documentation/reference-manual/s3-compatibility/)
