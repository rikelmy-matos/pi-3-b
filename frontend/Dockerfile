# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite reads VITE_API_URL at build time; set to empty so Nginx proxy handles it
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: serve with Nginx (unprivileged) ──────────────────────────────────
# Frontend Dockerfile S1: use nginx-unprivileged — runs as non-root on port 8080
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy built assets from stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# nginxinc/nginx-unprivileged listens on 8080 by default
EXPOSE 8080

# B1: HEALTHCHECK
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
