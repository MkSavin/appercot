# Operations

## Routine inspection

```bash
docker compose ps
docker compose logs app
docker compose logs minio minio-init
docker compose logs caddy
```

Check certificate issuance, free disk space, database growth, media bucket growth, and failing bot reconnects. Avoid logging full bot WebSocket URLs because the SDK places its token in the connection query string.

## Data retention

A background task runs hourly and removes:

- Synchronization updates older than 30 days.
- Bot outbox entries older than 7 days.
- Files that have remained unattached to a message for more than 24 hours.

When chat history is cleared or deleted, the file retention interval starts at that deletion. Image updates preserve Compose volumes; retention is separate from backup and does not replace it.

## Releases

CI checks the project, builds the production SPA and standalone server, and builds the Docker image. It also packs the SDK and protocol as JavaScript with TypeScript declarations and verifies installation in an independent project under Node.js and Bun.

Set the repository Actions secret `NPM_TOKEN` to an [npm granular access token](https://docs.npmjs.com/creating-and-viewing-access-tokens/) with write access to the `@appercot` scope and bypass 2FA enabled for unattended publishing.

The root [package.json](../../../package.json) defines the release version. When that version reaches `master` for the first time, GitHub Actions publishes `@appercot/protocol` and then `@appercot/chat`, pushes the versioned image to `ghcr.io/<owner>/appercot`, and creates the GitHub release and tag with the Linux x64 standalone archive. Prereleases use the npm `beta` tag. Stable releases update `latest` on npm and GHCR.

Change the root version through a normal pull request to start the next release. Subsequent pushes at the same released version publish the development image tags `master` and `sha-<commit>`. If a release fails partway through publication, rerun the failed GitHub Actions run. Published npm archives are reused only when their integrity matches the archives from that run.

Pin and review an image before production rollout rather than automatically following a moving tag. Keep a rollback image and a compatible backup. Database migrations can make an older application incompatible with newer data.

## Capacity and availability

The current architecture uses one Bun application process with SQLite. Vertical capacity and external S3 storage are supported; multi-node active-active SQLite deployment is not documented or guaranteed. Put independent test workloads on separate test installations.

A self-hosted deployment has no external Appercot operator to restore it. Define restart policy, monitoring, backup schedule, restore drills, credential rotation, and an upgrade owner before relying on it.

For the project's current technical gaps, see [open gaps](../../../.agents/todo.md).
