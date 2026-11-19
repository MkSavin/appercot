# Open gaps

## Web · Offline outbox

A failed send can be retried during the current session. A durable local outbox would retain queued text across reload and reconnect. Not checked automatically: offline delivery across reload is unimplemented.

## Sync · Catch-up cost

GraphQL reads every retained update after the checkpoint. Add bounded batches and a server cursor that distinguishes a real gap from sequence numbers consumed by other accounts. Not checked automatically: there is no multi-account load benchmark.

## Server · Delivery across process interruption

Message storage, user updates and bot outbox insertion have separate commit boundaries. Move durable side effects into one transaction, then publish after commit. Not checked automatically: there is no crash-injection test for this boundary.

## Web · Browser coverage

Component markup tests leave scrolling, focus, touch layout and installed PWA behavior to manual verification. Add desktop and mobile browser scenarios that exercise those behaviors. Not checked automatically: browser tests are outside the current CI suite.
