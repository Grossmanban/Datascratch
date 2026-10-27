# Web app (apps/web, production build) served by Caddy, which is also the HTTPS
# front for the API. Build from the repository root:
#   docker build -f infra/deploy/web.Dockerfile -t datascratch-web .
# The image contains no secrets: the web app talks to the API on its own origin.
ARG NODE_IMAGE=node:22-bookworm-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d
ARG CADDY_IMAGE=caddy:2-alpine@sha256:eb4d35b7452d1ab6171fbdbe8d9275b2301dad6dad92115d91e19fb9b24d510f

FROM ${NODE_IMAGE} AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN corepack enable
WORKDIR /repo
# Only what the web build needs, so infra changes keep the build cache.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages packages
COPY apps/web apps/web
RUN pnpm install --frozen-lockfile --filter "@datascratch/web..."
RUN pnpm --filter "@datascratch/web..." run build

FROM ${CADDY_IMAGE}
# Caddy runs as an unprivileged user. Docker lets containers bind ports below 1024 without
# root (ip_unprivileged_port_start=0). Volumes from older deployments are chowned once by
# deploy.sh; fresh volumes take the ownership of these directories.
RUN addgroup -S -g 10001 caddy && adduser -S -D -H -u 10001 -G caddy caddy \
  && mkdir -p /data/caddy /config/caddy && chown -R caddy:caddy /data /config
COPY --from=build /repo/apps/web/dist /srv
COPY infra/deploy/Caddyfile /etc/caddy/Caddyfile
USER caddy
# The admin endpoint answers once Caddy has loaded its configuration.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=4 CMD wget -q -O /dev/null http://127.0.0.1:2019/config/ || exit 1
