FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web
COPY prisma ./prisma
RUN pnpm install
RUN pnpm --filter @cc/web build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
COPY --from=base /app/apps/web ./apps/web
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/prisma ./prisma
EXPOSE 3000
CMD ["pnpm", "--filter", "@cc/web", "start"]
