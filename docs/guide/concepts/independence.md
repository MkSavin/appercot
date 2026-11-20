# Why independence matters

**The main goal of Appercot is to provide an independent service.** The project is not primarily trying to imitate Telegram's interface. It gives a team or community a messenger and bot runtime that they can deploy, inspect, modify, back up, and retire on their own terms.

## Where Appercot is better than Telegram

| Concern                    | Telegram                                        | Appercot                                                      |
| -------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| Service ownership          | Operated by Telegram                            | Operated by you                                               |
| Primary database and files | Held by the hosted service                      | Held in your SQLite and media storage                         |
| Bot account dependency     | Requires Telegram's bot platform                | Uses accounts and tokens on your server                       |
| Feature and API policy     | Controlled by the hosted platform               | Controlled by your deployment and source revision             |
| Availability policy        | Subject to an external service and network path | Set by your infrastructure and operations                     |
| Custom server behavior     | Not available                                   | Available in the same open codebase                           |
| Backup and retention       | Platform-defined                                | Your backup, retention, and deletion policy                   |
| Platform subscription      | Telegram defines its product terms              | No Appercot subscription; you pay for your own infrastructure |
| Audit and modification     | Limited to public clients and APIs              | Server, SDK, protocol, and PWA can be inspected together      |

This is better when independence is a requirement: private deployments, custom authentication and retention policies, controlled upgrades, local data governance, or bots that must keep working under your own service policy rather than another platform's decisions.

## Where Telegram is better

Telegram already provides a global user network, mature native clients, large-scale delivery infrastructure, and immediate reach to existing Telegram users. Appercot does not replace those advantages. A self-hosted service makes you responsible for uptime, TLS, backups, abuse controls, updates, and capacity.

Choose Telegram when reach and managed operation matter more than ownership. Choose Appercot when the service itself must be yours.

## Independence has boundaries

Self-hosting removes the messenger-platform dependency; it does not remove every external dependency. DNS, hosting, certificate issuance, S3 providers, and browser vendor push services may still participate depending on your configuration. Bots and users also need a network path to your server.

Appercot does not claim that self-hosting alone provides anonymity or end-to-end encryption. Protect the host, database, media, credentials, and TLS termination as one system.

## Architectural consequence

The server, protocol, SDK, PWA, and test environment live together so an installation can be understood and changed as a whole. The test CLI runs the real server rather than imitating Telegram-compatible APIs. That makes behavior reproducible within a revision you control.

Next: [architecture](architecture.md) and [security model](security.md).
