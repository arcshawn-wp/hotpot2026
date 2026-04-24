# ============================================================
# 热点挖掘器 - 生产 Dockerfile（阿里云 ECS 构建用）
# ============================================================

# ── 阶段 1：安装全部依赖 + 构建 ──────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖（包含 devDependencies，build 需要）
COPY package.json package-lock.json ./
RUN npm config set registry https://registry.npmmirror.com \
    && npm ci --no-audit --no-fund

# 复制源码并构建
COPY . .
RUN npm run build

# ── 阶段 2：生产镜像（只复制运行时必需文件） ────────────────
FROM node:20-alpine AS production

WORKDIR /app

# 安装 wget（健康检查要用）
RUN apk add --no-cache wget

# 安装生产依赖
COPY package.json package-lock.json ./
RUN npm config set registry https://registry.npmmirror.com \
    && npm ci --omit=dev --no-audit --no-fund \
    && npm cache clean --force

# 复制构建产物
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# 健康检查（start-period 给够 120s，首次启动慢也不会误杀）
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/trpc/ping || exit 1

# 启动（对应 package.json 中 "start": "NODE_ENV=production node dist/boot.js"）
CMD ["node", "dist/boot.js"]
