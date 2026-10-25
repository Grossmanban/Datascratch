# Datascratch server image. Build from the repository root:
#   docker build -f infra/Dockerfile -t datascratch-server .
ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter "@datascratch/server..."
RUN pnpm --filter "@datascratch/server..." run build
RUN pnpm --filter @datascratch/server deploy --prod /out

FROM ${NODE_IMAGE}
ENV NODE_ENV=production PORT=8080 STORAGE_DIR=/data/files
WORKDIR /app
COPY --from=build /out /app
RUN mkdir -p /data/files && chown -R node:node /data
USER node
VOLUME ["/data/files"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/v1/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/index.js"]
