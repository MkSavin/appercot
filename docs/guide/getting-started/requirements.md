# Requirements

## Local development and standalone builds

- **Bun 1.4.3**, matching the version used by CI.
- A password of at least eight characters for the initial owner account.
- A modern browser for the PWA.
- **FFmpeg** on `PATH` if you need image and video thumbnails outside Docker.

Bun runs the server, SDK, tests, and build tools. Node.js alone is not a supported replacement for this repository.

## Docker deployment

- Docker with Compose.
- A domain with A/AAAA DNS records pointing to the server.
- Inbound TCP ports 80 and 443; UDP 443 is used by the provided Caddy configuration for HTTP/3.
- Separate strong values for `ADMIN_PASSWORD`, `S3_SECRET_ACCESS_KEY`, and `GARAGE_RPC_SECRET`, plus a Garage-compatible `S3_ACCESS_KEY_ID`.

The production Compose stack downloads Appercot and Garage images, creates the media bucket automatically, and uses Caddy for automatic TLS. A single Garage node provides no redundancy, so backups are required.

## Optional services

- An S3-compatible endpoint for a standalone binary installation. Leave it unset to store files on disk.
- VAPID keys for Web Push. Generate a pair only when push is required.
- Internal media hosts listed explicitly in `MEDIA_TRUSTED_HOSTS` when bots import files from private services.

Do not place real credentials in documentation, source code, fixtures committed to version control, or AI prompts.

Next: [local development](local-development.md).
