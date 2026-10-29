# Imagem da API para a implantação (Coolify). Compilada pelo workflow
# "Implantação", a partir da raiz do repositório:
#   docker build -f apps/api/Dockerfile .
# A mesma imagem roda a API (padrão) e o migrador (node dist/scripts/migrar.js).
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

# Só os pacotes de que a API depende.
FROM base AS podado
COPY . .
RUN npx turbo@2.11.10 prune @clinica/api --docker

FROM base AS build
COPY --from=podado /app/out/json/ .
# O prepare da raiz só liga os hooks do git, que não existe na imagem.
RUN npm pkg delete scripts.prepare && pnpm install --frozen-lockfile
COPY --from=podado /app/out/full/ .
RUN pnpm turbo run build --filter=@clinica/api...
# Tira as dependências de desenvolvimento, mantendo o que foi compilado.
RUN rm -rf node_modules apps/*/node_modules packages/*/node_modules \
  && npm pkg delete scripts.prepare \
  && pnpm install --frozen-lockfile --prod --offline

FROM node:24-alpine
# Commit da imagem, mostrado no /health.
ARG VERSAO=local
ENV NODE_ENV=production \
  VERSAO=$VERSAO
WORKDIR /app
COPY --from=build --chown=node:node /app .
WORKDIR /app/apps/api
USER node
EXPOSE 3333
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${API_PORT:-3333}/health" > /dev/null || exit 1
CMD ["node", "dist/main.js"]
