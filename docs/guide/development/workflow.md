# Verification workflow

## During development

```bash
bun run dev
```

Exercise the actual scenario in the browser or through a bot connection. Imports and typechecking alone do not prove event delivery, synchronization, media, or reset behavior.

## Before completing a change

```bash
bun run check
bun run build
```

`check` includes documentation checks, Biome, Feature-Sliced layer analysis, GraphQL generation checks, TypeScript, and tests. Run `bun run codegen` after intentional GraphQL schema or operation changes and commit generated output with the source.

Use focused tests while diagnosing a failure, then run the full standard checks on the final deliverable. Do not call a change complete while a covering test is red or a relevant scenario has not been exercised.

## Test environment changes

For changes affecting the test CLI, SDK reconnect, cleanup, or browser selectors, also run:

```bash
bun packages/test/scripts/run-compatibility.ts --with-browser
```

This covers Bun, Vitest, Jest, and headless Chromium against the real environment.

## S3 media tests

With Docker running, execute the disk and MinIO media tests from the repository root.

```bash
bun run test:minio
```

The runner builds the project's pinned MinIO image, starts a temporary container on a loopback port selected by Docker, creates a test bucket, and removes the container and its data when the tests end. The first build downloads the base images and Go dependencies. With FFmpeg available on the host, the tests also verify thumbnail generation.

To use an existing test instance instead, set `APPERCOT_TEST_S3_ENDPOINT` and run `bun test apps/server/test/media-transfer.test.ts`. That instance must have the bucket and disposable credentials from [the MinIO test configuration](../../../apps/server/test/minio-config.ts).

## Documentation changes

Run `bun run docs:check` first for fast link and structure feedback, then `bun run check`. If a change modifies behavior described in `AGENTS.md`, `.agents`, the public guide, or README, update those documents in the same change.

When generated workaround indexes change, use:

```bash
bun run docs:index
```

After publishing public documentation, refresh and query Context7 as described in [Context7 setup](../ai/context7.md).
