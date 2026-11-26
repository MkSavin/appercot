# Open gaps

## Web · Resumable media uploads

The composer uploads up to ten files with previews, progress, cancellation and partial retry, then sends their IDs through the durable outbox. Raw files and large Blob uploads still cannot be resumed after a browser restart. Not checked automatically: resumable or chunked upload recovery is unimplemented.

## Sync · Catch-up cost

GraphQL reads every retained update after the checkpoint. Add bounded batches and a server cursor that distinguishes a real gap from sequence numbers consumed by other accounts. Not checked automatically: there is no multi-account load benchmark.

## Server · Delivery across process interruption

Message storage, user updates and bot outbox insertion have separate commit boundaries. Move durable side effects into one transaction, then publish after commit. Not checked automatically: there is no crash-injection test for this boundary.

## Web · Browser coverage

Component markup tests leave scrolling, focus, touch layout and installed PWA behavior to manual verification. Add desktop and mobile browser scenarios that exercise those behaviors. Not checked automatically: browser tests are outside the current CI suite.
