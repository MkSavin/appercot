# Garage storage and Compose naming

## Context

Appercot uses Bun's S3 client with path-style URLs, multipart uploads, ranged reads, deletion, and presigned download URLs. The current Compose stack builds an archived MinIO Community release locally and uses a second container to create the bucket. Production uses a GHCR application image, while the source-development stack builds the application locally.

Garage v2.5.0 is the selected replacement. It provides the required S3 operations, publishes an official Docker image, and can initialize a single-node cluster, access key, and bucket without a separate initializer. SeaweedFS and RustFS were rejected for this deployment because their additional storage and protocol features are not needed. Existing MinIO data will not be migrated.

## Compose layout

- Rename `docker-compose.prod.yml` to `docker-compose.yml`; this remains the default production deployment using `ghcr.io/mksavin/appercot:${APPERCOT_VERSION}`.
- Rename the existing source-building `docker-compose.yml` to `docker-compose.dev.yml`.
- Replace `minio` and `minio-init` with one `garage` service using `dxflrs/garage:v2.5.0`.
- Run Garage with `server --single-node --default-bucket`. The application waits for a successful `/garage status` health check.
- Mount the new `garage-data` volume at `/var/lib/garage`. Do not mount or remove the old `appercot-media` volume automatically.
- Remove `Dockerfile.minio` after its final Compose and test consumers are gone.

The single-node topology has no redundancy, as did the previous single-node MinIO deployment. Backups remain mandatory. Replication and multi-node operation are outside this change.

## Garage configuration and credentials

Add a static `garage.toml` containing no secrets:

- metadata under `/var/lib/garage/meta` with SQLite and automatic metadata snapshots;
- data under `/var/lib/garage/data`;
- replication factor `1`;
- RPC bound to port `3901` without host publication;
- S3 API bound to port `3900`, region `garage`, without website or public administration endpoints.

Pass `GARAGE_RPC_SECRET` through the environment. Configure `GARAGE_DEFAULT_ACCESS_KEY`, `GARAGE_DEFAULT_SECRET_KEY`, and `GARAGE_DEFAULT_BUCKET` from the same S3 values supplied to the application. The application uses `S3_ENDPOINT=http://garage:3900` and `S3_REGION=garage`.

Replace `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` in `.env.example` and documentation with `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `GARAGE_RPC_SECRET`. Document generation of a Garage-compatible access key and cryptographically random secrets. The default credentials initialize a new Garage metadata directory; later credential rotation is not an automatic Compose operation.

`DOMAIN` remains a Compose/Caddy input. `PUBLIC_URL` remains the application's public origin for invitations, push, and secure cookies. Compose derives `PUBLIC_URL=https://${DOMAIN}`, while standalone installations can set `PUBLIC_URL` independently.

## Tests and operations

- Rename the MinIO test configuration, runner, package script, and test labels to Garage equivalents.
- Start the official Garage image on an ephemeral loopback port with a temporary named volume or anonymous volume and dispose of the container and data afterward.
- Wait for single-node and default-bucket initialization, then run the existing real media round trip and multipart/ranged-read tests against `APPERCOT_TEST_S3_ENDPOINT`.
- Add an explicit fetch from `storage.source(...)` so presigned downloads are tested even when FFmpeg is unavailable; retain coverage for multipart uploads and reads across a part boundary.
- Update deployment, configuration, backup, operations, development workflow, requirements, architecture notes, and AI prompting references to Garage and the new Compose filenames.
- Document backup and restore of both Garage metadata and data. Do not describe copying only object blocks as a complete backup.

## Verification

1. Run `docker compose config` for production and development files with disposable environment values.
2. Run the Garage Docker media integration tests and confirm multipart, ranged reads, and presigned downloads pass.
3. Start the development Compose stack and verify application health, bucket initialization, and a real media round trip.
4. Validate the production configuration and pull its GHCR application image when registry access permits; report any remaining registry restriction explicitly.
5. Run documentation checks, formatting/lint for changed TypeScript files, and the broader project checks covering renamed scripts and references.

## Out of scope

- Conversion or automatic migration of MinIO volumes.
- Multi-node Garage clusters, erasure coding, public S3 endpoints, and Garage web administration.
- Changes to application S3 APIs or media authorization behavior.
