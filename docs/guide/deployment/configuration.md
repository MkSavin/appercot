# Configuration reference

Empty optional environment variables are treated as unset. Never publish `.env` or bot tokens.

| Variable                   | Default                               | Purpose                                                                       |
| -------------------------- | ------------------------------------- | ----------------------------------------------------------------------------- |
| `PORT`                     | `3000`                                | HTTP and WebSocket port                                                       |
| `DATA_DIR`                 | `.data`; `/data` in Docker            | SQLite, local files, and the TOTP key                                         |
| `PUBLIC_URL`               | `http://localhost:3000`               | Public origin for invitations and push                                        |
| `DOMAIN`                   | —                                     | Domain required by Compose and Caddy                                          |
| `ADMIN_USERNAME`           | `admin`                               | Initial owner username                                                        |
| `ADMIN_PASSWORD`           | —                                     | Initial owner password, minimum eight characters                              |
| `BOOTSTRAP_INVITE`         | —                                     | Optional invitation for first registration                                    |
| `ALLOW_REGISTRATION`       | `true`                                | Set `false` to disable registration                                           |
| `ALLOW_USER_INVITES`       | `true`                                | Set `false` to disable registration-invite creation and editing               |
| `MEDIA_MAX_BYTES`          | `2147483648`                          | Per-upload application limit; `0` removes it                                  |
| `MEDIA_UPLOADS_PER_ACTOR`  | `3`                                   | Concurrent uploads per user or bot                                            |
| `MEDIA_ORIGINALS_PER_USER` | `4`                                   | Concurrent original-file requests per user                                    |
| `MEDIA_TRUSTED_HOSTS`      | —                                     | Comma-separated exact internal URL-import hosts, including ports when present |
| `MEDIA_FFMPEG`             | `ffmpeg` from `PATH`                  | FFmpeg executable for thumbnails                                              |
| `S3_ENDPOINT`              | —                                     | S3-compatible endpoint for a standalone binary; empty selects local disk      |
| `S3_BUCKET`                | `appercot`                            | Existing bucket for standalone S3 storage                                     |
| `S3_REGION`                | `us-east-1`                           | Bucket region                                                                 |
| `S3_ACCESS_KEY_ID`         | —                                     | Standalone S3 access key                                                      |
| `S3_SECRET_ACCESS_KEY`     | —                                     | Standalone S3 secret key                                                      |
| `MINIO_ROOT_USER`          | `appercot`                            | Compose MinIO root user                                                       |
| `MINIO_ROOT_PASSWORD`      | —                                     | Required Compose MinIO root password                                          |
| `VAPID_PUBLIC_KEY`         | —                                     | Web Push public key; configure both keys together                             |
| `VAPID_PRIVATE_KEY`        | —                                     | Web Push private key; configure both keys together                            |
| `NODE_ENV`                 | `development`; `production` in Docker | Disables GraphQL Playground in production                                     |
| `APPERCOT_CONFIG`          | —                                     | Optional JSON launch configuration path                                       |

Generate VAPID keys:

```bash
bun -e "import { generateVAPIDKeys } from 'web-push'; console.log(generateVAPIDKeys())"
```

## JSON launch configuration

The normal server accepts launch settings through `APPERCOT_CONFIG`: `server`, `registration`, `admin`, `bootstrapInvite`, `media`, `s3`, `vapid`, and `nodeEnv`. It rejects test fixture sections. The test CLI additionally accepts `users`, `bots`, `chats`, and `test`.

Use `MEDIA_TRUSTED_HOSTS` narrowly for private bot media imports. It is not a general proxy allowlist and should not contain broad domain suffixes.

For the full test-only schema, see [test fixtures](../testing/fixtures.md). For key and media persistence, see [backup and recovery](backup-and-recovery.md).
