# Dev-friendly image that runs the TanStack Start Vite dev server.
# For production builds you can add a second stage; dev mode keeps HMR
# and avoids the Cloudflare Workers target the prod build defaults to.
FROM oven/bun:1.3-alpine AS deps
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.3-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development
ENV HOST=0.0.0.0
ENV PORT=8080
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 8080
CMD ["bun", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]
