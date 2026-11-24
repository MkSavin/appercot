# Docker deployment

The production Compose stack runs the GHCR application image and Garage. It publishes Appercot on the host's `PORT`, `3000` by default, so it can run directly or behind an existing reverse proxy. SQLite and legacy local files use the `appercot-data` volume; attachments and thumbnails use `garage-data`.

## 1. Create the environment file

Install Docker with Compose and OpenSSL, clone this repository, and enter its directory. Then copy the defaults:

```bash
cp .env.example .env
```

`APPERCOT_VERSION=next`, `PORT=3000`, `ADMIN_USERNAME=admin`, the Garage bucket, limits, and registration settings are already filled in. The non-secret Garage access key ID also has a valid default. The only required values without defaults are the owner password and two independent secrets.

## 2. Generate and insert credentials

Run this block once from the repository root. It generates a fresh Garage-compatible access key as well as the three required secrets and replaces the corresponding lines in `.env`:

```bash
access_key="GK$(openssl rand -hex 16)"
admin_password=$(openssl rand -hex 24)
s3_secret=$(openssl rand -hex 32)
garage_rpc_secret=$(openssl rand -hex 32)

sed -i \
  -e "s|^S3_ACCESS_KEY_ID=.*|S3_ACCESS_KEY_ID=$access_key|" \
  -e "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$admin_password|" \
  -e "s|^S3_SECRET_ACCESS_KEY=.*|S3_SECRET_ACCESS_KEY=$s3_secret|" \
  -e "s|^GARAGE_RPC_SECRET=.*|GARAGE_RPC_SECRET=$garage_rpc_secret|" \
  .env

unset access_key admin_password s3_secret garage_rpc_secret
```

Keep `.env` out of version control and off public volumes. Garage's default key and bucket settings initialize a new metadata directory; subsequent credential rotation uses Garage administration rather than automatic Compose initialization.

## 3. Choose the address and version

For a local installation, keep the defaults and open `http://localhost:3000` after startup. Change `PORT` in `.env` if host port `3000` is already occupied.

When accessing Appercot through another host, uncomment `PUBLIC_URL` in `.env` and set the exact external origin, including scheme and any nonstandard port:

```dotenv
# Direct access through a server address:
PUBLIC_URL=http://appercot.example.com:3000

# Or HTTPS terminated by an existing reverse proxy:
PUBLIC_URL=https://appercot.example.com
```

Use only one of these examples. A reverse proxy must forward HTTP and WebSocket requests to `http://127.0.0.1:3000` on the Docker host. TLS is configured in that proxy, not in this Compose stack. `PUBLIC_URL` is used for invitation links, Web Push, and the `Secure` cookie flag; leaving it as localhost on a remote installation produces incorrect links and cookie behavior.

`APPERCOT_VERSION=next` follows the most recently published GHCR release, including prereleases, while `latest` follows only stable releases. To make upgrades and rollbacks explicit, replace it with a published tag such as `v0.1.0-beta.1`. Development commits update neither moving release tag.

The GHCR package must be publicly readable. If it is private, authenticate with a GitHub account that can read it before pulling:

```bash
docker login ghcr.io
```

## 4. Pull and start

```bash
docker compose pull
docker compose up -d
```

Garage configures its single-node layout, access key, and bucket automatically. The application waits for Garage health and then starts on the configured host port.

The single-node Garage topology has no redundancy. The previous MinIO `appercot-media` volume is not migrated or mounted; keep it separately if it contains data you still need.

## 5. Check the stack

```bash
docker compose ps
docker compose logs app garage
curl --fail http://localhost:3000/healthz
```

Replace `3000` with the configured `PORT`. Sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD`, then create or configure bots from settings. If registration is public, set `ALLOW_REGISTRATION=false` after the intended accounts exist or use invitations from the beginning.

## Update a production deployment

Back up first. If you pin releases, set the new `APPERCOT_VERSION` in `.env`; `next` and `latest` need no edit. Then run:

```bash
docker compose pull
docker compose up -d
```

Persistent volumes remain across image updates. Verify login, message history, bot delivery, and media afterward. Database migrations can make an older application incompatible with newer data, so keep a compatible backup before rolling back.

## Build from source instead

`docker-compose.dev.yml` is the development stack. It builds the application locally and uses the same Garage image, environment defaults, and host-port mapping:

```bash
docker compose -f docker-compose.dev.yml up --build -d
```

After pulling new source code, repeat that command to rebuild and restart the application. The standalone binary can instead leave S3 unset and store new files under `DATA_DIR/files`. See [configuration](configuration.md) and [backup and recovery](backup-and-recovery.md).
