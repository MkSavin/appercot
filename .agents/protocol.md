# Protocol

`@appercot/protocol` owns the wire schemas and inferred types used by the server, web client and SDK.

```text
Zod schemas -> inferred types -> server / web / SDK
GraphQL schema -> generated operations -> web GraphQL client
```

- User content rejects bot keyboards. Checked: INV:content/rejects-keyboards.
- Callback limits count UTF-8 bytes. Checked: INV:content/counts-bytes.
- Unknown update types and invalid sequence numbers fail decoding. Checked: INV:client-updates/rejects-frames.

After changing GraphQL types or operations, run `bun run codegen` and commit the generated output with the source.
