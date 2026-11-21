# Stage 1: Build Vite + PWA assets
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --include=dev

COPY . .
RUN npm run build

# Stage 2: Production runtime for Render
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000
ENV HOST=0.0.0.0
ENV DISABLE_HMR=true
ENV APP_NAME="Choy Chat"
ENV APP_VERSION="2.5.0"
ENV STORAGE_PROVIDER="Google One 5TB"
ENV STORAGE_QUOTA_GB="5120"
ENV SUPABASE_BUCKET="choychat-media"
ENV PWA_THEME_COLOR="#022c22"
ENV CACHE_MODE="lightweight-auto"

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY server.ts ./server.ts

EXPOSE 10000

CMD ["node", "server.ts"]
