# Web app (apps/web, production build) served by Caddy, which is also the HTTPS
# front for the API. Build from the repository root:
#   docker build -f infra/deploy/web.Dockerfile -t datascratch-web .
# The image contains no secrets: the web app talks to the API on its own origin.
ARG NODE_IMAGE=node:22-bookworm-slim
ARG CADDY_IMAGE=caddy:2-alpine

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
COPY --from=build /repo/apps/web/dist /srv
COPY infra/deploy/Caddyfile /etc/caddy/Caddyfile
