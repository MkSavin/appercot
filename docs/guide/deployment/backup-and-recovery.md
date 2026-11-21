# Backup and recovery

Back up SQLite and its corresponding media together. If any account uses two-factor authentication, also preserve `DATA_DIR/totp.key`; restore it before starting the server and restrict access to both the key and database copy.

## Standalone binary

Stop new file writes or take the copy during low activity. SQLite's online backup creates a consistent database copy while the server runs:

```bash
mkdir -p backups/files
sqlite3 .data/appercot.sqlite ".backup 'backups/appercot.sqlite'"
cp -a .data/files/. backups/files/
cp .data/totp.key backups/totp.key
```

The last command applies only when 2FA has created the key. With S3 configured, include the bucket in the same backup and preserve object keys exactly.

## Docker Compose

```bash
mkdir -p backups
docker compose exec app sqlite3 /data/appercot.sqlite \
  ".backup '/data/appercot-backup.sqlite'"
docker compose cp app:/data/appercot-backup.sqlite backups/appercot.sqlite
docker compose cp app:/data/files/. backups/files/
docker compose exec app rm /data/appercot-backup.sqlite
```

The `files` copy preserves legacy local attachments. New Compose media lives in the `garage-data` volume. For a consistent Garage backup, stop Garage and preserve both `/var/lib/garage/meta` and `/var/lib/garage/data`; object blocks without metadata are not a complete backup. Include `/data/totp.key` when present.

## Restore in Docker

Stop the application and TLS proxy before replacing database state:

```bash
docker compose stop app garage
docker compose cp backups/appercot.sqlite app:/data/appercot.sqlite
docker compose cp backups/files/. app:/data/files/
# Restore backups/totp.key to app:/data/totp.key when applicable.
docker compose run --rm --user root --entrypoint chown app -R 10001:10001 /data
docker compose start garage app
```

Restore the matching Garage metadata and data before declaring recovery complete. Starting with a newer database and older objects leaves attachments missing even when message history looks intact.

After restoration, verify owner login, ordinary user sessions as appropriate, message history, bot connectivity, file downloads, and 2FA accounts. A backup is useful only after its restore procedure has been exercised.
