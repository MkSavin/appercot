# Docker deployment with HTTPS

The provided Compose stack runs Appercot, MinIO, a one-shot bucket initializer, and Caddy. SQLite and legacy local files use the `appercot-data` volume; new attachments and thumbnails use `appercot-media`.

## 1. Prepare DNS and credentials

Point the domain's A/AAAA records at the server and open ports 80 and 443. Copy the environment template:

```bash
cp .env.example .env
```

Set at least:

```dotenv
DOMAIN=appercot.example.com
ADMIN_PASSWORD='a-long-unique-owner-password'
MINIO_ROOT_PASSWORD='a-different-long-random-password'
```

Do not reuse the owner password for MinIO. Keep `.env` out of version control and off public volumes.

## 2. Build and start

```bash
docker compose up --build -d
```

Compose builds a pinned MinIO release, creates the configured bucket, waits for application health, and starts Caddy. Caddy obtains and renews the TLS certificate automatically. Open `https://DOMAIN` after DNS and certificate issuance complete.

## 3. Check the stack

```bash
docker compose ps
docker compose logs app minio minio-init caddy
```

Sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD`, then create or configure bots from settings. If registration is public, set `ALLOW_REGISTRATION=false` after the intended accounts exist or use invitations from the beginning.

## Update a local source deployment

```bash
git pull
docker compose up --build -d
```

Persistent volumes remain across image updates. Take a [backup](backup-and-recovery.md) before upgrades that change stored data, and verify login, message history, bot delivery, and media afterward.

The standalone binary can instead leave S3 unset and store new files under `DATA_DIR/files`. See [configuration](configuration.md).
