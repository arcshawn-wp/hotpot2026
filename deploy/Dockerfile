# 热点挖掘器 - Dockerfile
# 构建命令: docker build -t hotspot-app .

FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package.json package-lock.json ./
RUN npm ci

# 复制源码并构建
COPY . .
RUN npm run build

# 生产镜像
FROM node:20-alpine AS production

WORKDIR /app

# 安装生产依赖
COPY package.json package-lock.json ./
RUN npm ci --production && npm cache clean --force

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/api ./api
COPY --from=builder /app/contracts ./contracts
COPY --from=builder /app/db ./db
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/tsconfig.server.json ./

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/trpc/ping || exit 1

# 启动
CMD ["node", "dist/server.js"]
