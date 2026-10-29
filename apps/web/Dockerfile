# Imagem da web para a implantação (Coolify). Compilada pelo workflow
# "Implantação", a partir da raiz do repositório, uma por ambiente: o endereço da
# API e o nome do ambiente entram no build.
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.clinica.fbr.edu.br \
#     --build-arg NEXT_PUBLIC_AMBIENTE=producao .
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS podado
COPY . .
RUN npx turbo@2.11.10 prune @clinica/web --docker

FROM base AS build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_AMBIENTE
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
  NEXT_PUBLIC_AMBIENTE=$NEXT_PUBLIC_AMBIENTE \
  NEXT_TELEMETRY_DISABLED=1
COPY --from=podado /app/out/json/ .
# O prepare da raiz só liga os hooks do git, que não existe na imagem.
RUN npm pkg delete scripts.prepare && pnpm install --frozen-lockfile
COPY --from=podado /app/out/full/ .
RUN test -n "$NEXT_PUBLIC_API_URL" \
  && pnpm turbo run build --filter=@clinica/web...

# Só o servidor standalone do Next e os arquivos estáticos.
FROM node:24-alpine
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  PORT=3000 \
  HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" > /dev/null || exit 1
CMD ["node", "apps/web/server.js"]
