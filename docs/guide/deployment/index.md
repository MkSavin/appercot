# Deployment

A production installation owns more than the application process: it also owns DNS, TLS, database and media persistence, credentials, backup, and restoration.

- [Docker deployment](docker.md): the supported all-in-one Compose stack with Caddy and MinIO.
- [Configuration reference](configuration.md): environment variables, storage, registration, media, and push.
- [Backup and recovery](backup-and-recovery.md): consistent SQLite, media, and 2FA key restoration.
- [Operations](operations.md): updates, logs, retention, and release images.

For a standalone binary, first follow the [local build guide](../getting-started/local-development.md). Keep the executable, `public`, and `drizzle` together and configure the same environment variables.

Before exposing a service, read the [security model](../concepts/security.md). Do not run the test CLI or expose its control token in production.
