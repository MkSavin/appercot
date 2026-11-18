# syntax=docker/dockerfile:1

FROM oven/bun:1.4.3-debian AS build
WORKDIR /src

COPY package.json bun.lock tsconfig.base.json biome.json steiger.config.ts ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/protocol/package.json packages/protocol/
COPY packages/chat/package.json packages/chat/
COPY examples/echo-bot/package.json examples/echo-bot/
COPY examples/wizard-bot/package.json examples/wizard-bot/
RUN bun install --frozen-lockfile --ignore-scripts

COPY apps apps
COPY packages packages
COPY examples examples
RUN bun run build

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl sqlite3 \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin appercot \
  && mkdir -p /data \
  && chown appercot:appercot /data
WORKDIR /app
COPY --from=build /src/apps/server/dist/appercot /app/appercot
COPY --from=build /src/apps/server/dist/public /app/public
COPY --from=build /src/apps/server/dist/drizzle /app/drizzle
ENV NODE_ENV=production \
  PORT=3000 \
  DATA_DIR=/data
USER appercot
EXPOSE 3000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["curl", "--fail", "--silent", "http://localhost:3000/healthz"]
ENTRYPOINT ["/app/appercot"]
