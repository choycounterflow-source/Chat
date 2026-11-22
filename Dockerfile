FROM node:22-alpine
WORKDIR /app

# Install dependencies (including devDependencies for Vite + PWA build)
COPY package.json package-lock.json* .npmrc ./
RUN npm install --include=dev --legacy-peer-deps --no-audit --no-fund --loglevel=error

# Copy app source and build production bundle (dist/ + PWA manifest & SW)
COPY . .
RUN npm run build

# Render production runtime settings
ENV NODE_ENV=production
ENV PORT=10000
ENV HOST=0.0.0.0
ENV DISABLE_HMR=true
ENV APP_NAME="Choy Chat"
ENV APP_VERSION="2.6.0"
ENV STORAGE_PROVIDER="Supabase Cloud Storage"
ENV STORAGE_QUOTA_GB="1"
ENV SUPABASE_BUCKET="choychat-media"
ENV PWA_THEME_COLOR="#022c22"
ENV CACHE_MODE="lightweight-auto"

EXPOSE 10000

CMD ["node", "server.ts"]
