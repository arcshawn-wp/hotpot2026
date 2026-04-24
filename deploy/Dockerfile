# ============================================================
# 热点挖掘器 - 生产 Dockerfile（deploy 目录备份）
# ============================================================

# ── 阶段 1：安装全部依赖 + 构建 ──────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm config set registry https://registry.npmmirror.com \
    && npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ── 阶段 2：生产镜像 ─────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache wget

COPY package.json package-lock.json ./
RUN npm config set registry https://registry.npmmirror.com \
    && npm ci --omit=dev --no-audit --no-fund \
    && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/trpc/ping || exit 1

CMD ["node", "dist/boot.js"]
