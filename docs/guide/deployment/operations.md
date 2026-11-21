# Operations

## Routine inspection

```bash
docker compose ps
docker compose logs app
docker compose logs garage
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

The npm job authenticates through [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/). In the npm settings for both packages, trust the GitHub owner and repository (`MkSavin/appercot`) and workflow filename `release.yml`. Leave the environment field empty and enable direct `npm publish` for automatic releases. Publish a new version through that workflow within 48 hours of creating each trust configuration.

For a new package name, use [staged publishing](https://docs.npmjs.com/staged-publishing/) with a separate bootstrap version to create npm's `0.0.0-stage` placeholder. Set up trust on the package and let CI publish the real release version. After the OIDC release succeeds, reject the bootstrap entries and select **Require two-factor authentication and disallow tokens** in each package's publishing access settings. Revoke and remove any former npm publishing token.

The root [package.json](../../../package.json) defines the release version. When that version reaches `master` for the first time, GitHub Actions publishes `@appercot/protocol` and then `@appercot/chat`, pushes the versioned image to `ghcr.io/<owner>/appercot`, and creates the GitHub release and tag with the Linux x64 standalone archive. Prereleases use the npm `beta` tag. Stable releases update `latest` on npm and GHCR.

Change the root version through a normal pull request to start the next release. Subsequent pushes at the same released version publish the development image tags `master` and `sha-<commit>`. If a release fails after publication starts, rerun the failed GitHub Actions run. Published npm archives are reused only when their integrity matches the archives from that run. If neither npm version exists and the draft has no Git tag or assets, a new push to `master` can move the draft forward to include a workflow fix.

If npm and GHCR succeeded and only GitHub release finalization failed, an updated workflow on `master` can finish the draft using the standalone archive from the original run. The draft stays on the original commit. The workflow uploads and finalizes it by release ID, even when GitHub assigns the draft an `untagged-*` name. GitHub can deny the final update when workflow files at that commit differ from the default branch. A maintainer with workflow write access can publish the existing draft at its original commit after verifying that the archive was uploaded. [GitHub release update permissions](https://docs.github.com/en/rest/releases/releases#update-a-release)

Pin and review an image before production rollout rather than automatically following a moving tag. Keep a rollback image and a compatible backup. Database migrations can make an older application incompatible with newer data.

## Capacity and availability

The current architecture uses one Bun application process with SQLite. Vertical capacity and external S3 storage are supported; multi-node active-active SQLite deployment is not documented or guaranteed. Put independent test workloads on separate test installations.

A self-hosted deployment has no external Appercot operator to restore it. Define restart policy, monitoring, backup schedule, restore drills, credential rotation, and an upgrade owner before relying on it.

For the project's current technical gaps, see [open gaps](../../../.agents/todo.md).
