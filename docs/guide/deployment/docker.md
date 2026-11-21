# Docker deployment with HTTPS

The production Compose stack runs the GHCR application image, Garage, and Caddy. SQLite and legacy local files use the `appercot-data` volume; new attachments and thumbnails use `garage-data`.

## 1. Prepare DNS and credentials

Point the domain's A/AAAA records at the server and open ports 80 and 443. Copy the environment template:

```bash
cp .env.example .env
```

Set at least:

```dotenv
APPERCOT_VERSION=v0.1.0-beta.1
DOMAIN=appercot.example.com
ADMIN_PASSWORD='a-long-unique-owner-password'
S3_ACCESS_KEY_ID='GKreplace-with-16-random-hex-bytes'
S3_SECRET_ACCESS_KEY='replace-with-32-random-hex-bytes'
GARAGE_RPC_SECRET='replace-with-a-different-32-random-hex-bytes'
```

Generate the Garage access key and two independent secrets on the operator's machine:

```bash
printf 'GK%s\n' "$(openssl rand -hex 16)"
openssl rand -hex 32
openssl rand -hex 32
```

Use a release tag such as `v0.1.0-beta.1`, or another published tag from `ghcr.io/mksavin/appercot`. Pinning an exact release makes updates and rollbacks explicit. Stable releases also publish the moving `latest` tag; prereleases and development commits do not update it.

The GHCR package must be publicly readable. If it is private, authenticate with a GitHub account that can read it before pulling:

```bash
docker login ghcr.io
```

Do not reuse passwords or secrets. Keep `.env` out of version control and off public volumes. Garage's default key and bucket settings initialize a new metadata directory; subsequent credential rotation uses Garage administration rather than automatic Compose initialization.

`DOMAIN` configures Caddy and certificate issuance. The application uses `PUBLIC_URL` for invitations, push, and secure cookies; Compose derives it as `https://${DOMAIN}`.

## 2. Pull and start

```bash
docker compose pull
docker compose up -d
```

Compose downloads all images. Garage configures its single-node layout, access key, and bucket automatically, the application waits for Garage health, and Caddy starts after application health succeeds. Caddy obtains and renews the TLS certificate automatically. Open `https://DOMAIN` after DNS and certificate issuance complete.

The single-node Garage topology has no redundancy. The previous MinIO `appercot-media` volume is not migrated or mounted; keep it separately if it contains data you still need.

## 3. Check the stack

```bash
docker compose ps
docker compose logs app garage caddy
```

Sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD`, then create or configure bots from settings. If registration is public, set `ALLOW_REGISTRATION=false` after the intended accounts exist or use invitations from the beginning.

## Update a production deployment

Back up first, then set the new `APPERCOT_VERSION` in `.env` and run:

```bash
docker compose pull
docker compose up -d
```

Persistent volumes remain across image updates. Verify login, message history, bot delivery, and media afterward. Database migrations can make an older application incompatible with newer data, so keep a compatible backup before rolling back.

## Build from source instead

`docker-compose.dev.yml` is the development stack. It builds the application locally and uses the same Garage image and configuration:

```bash
docker compose -f docker-compose.dev.yml up --build -d
```

After pulling new source code, repeat that command to rebuild and restart the application. The standalone binary can instead leave S3 unset and store new files under `DATA_DIR/files`. See [configuration](configuration.md) and [backup and recovery](backup-and-recovery.md).
