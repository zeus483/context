FROM mcr.microsoft.com/playwright:v1.49.1-jammy AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY prisma ./prisma
COPY content ./content
RUN pnpm install
RUN pnpm --filter @cc/api build

FROM mcr.microsoft.com/playwright:v1.49.1-jammy AS runner
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
COPY --from=base /app/apps/api ./apps/api
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/content ./content
EXPOSE 4000
CMD ["pnpm", "--filter", "@cc/api", "start"]
