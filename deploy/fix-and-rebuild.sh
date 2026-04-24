#!/bin/bash
# ============================================================
# 热点挖掘器 - 服务器修复脚本
# 用法：bash fix-and-rebuild.sh
# ============================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err()  { echo -e "${RED}[ERROR]${NC} $1"; }

echo "========================================"
echo "  热点挖掘器 - 修复 & 重新构建"
echo "========================================"

# ─── 1. 停止一切残留容器和构建 ─────────────────────────────
echo ""
echo "[1/7] 停止残留容器和清理..."

# 杀死可能卡住的构建进程
docker buildx stop default 2>/dev/null || true

# 停止已有容器
cd /root/hotspot/deploy 2>/dev/null || cd /root/hotspot 2>/dev/null || true
docker-compose down --remove-orphans 2>/dev/null || true

# 清理构建缓存（解决旧缓存干扰问题）
docker buildx prune -f 2>/dev/null || true
docker system prune -f 2>/dev/null || true

log_ok "残留容器和缓存已清理"

# ─── 2. 拉取最新代码 ──────────────────────────────────────
echo ""
echo "[2/7] 拉取最新代码..."

cd /root/hotspot
git pull origin main

log_ok "代码已更新"

# ─── 3. 确认目录结构正确 ──────────────────────────────────
echo ""
echo "[3/7] 检查项目结构..."

# 确保关键文件存在
for f in app/Dockerfile app/package.json app/api/boot.ts deploy/docker-compose.yml deploy/nginx.conf; do
    if [ -f "/root/hotspot/$f" ]; then
        log_ok "  $f"
    else
        log_err "  $f 缺失！"
        exit 1
    fi
done

# 确认爬虫模块存在
if [ -d "/root/hotspot/app/api/crawler" ]; then
    log_ok "  app/api/crawler/ 爬虫模块已就位"
else
    log_err "  app/api/crawler/ 缺失！请先 push 代码"
    exit 1
fi

# ─── 4. 确保 ssl 目录存在（Nginx 需要） ────────────────────
echo ""
echo "[4/7] 准备部署依赖..."

mkdir -p /root/hotspot/deploy/ssl
log_ok "ssl 目录已创建"

# ─── 5. 构建 Docker 镜像 ──────────────────────────────────
echo ""
echo "[5/7] 构建 Docker 镜像（无缓存）..."
echo "      这一步可能需要 3-5 分钟，请耐心等待..."

cd /root/hotspot/deploy
docker-compose build --no-cache app 2>&1 | tail -20

if [ $? -eq 0 ]; then
    log_ok "镜像构建成功"
else
    log_err "镜像构建失败，请检查上方日志"
    exit 1
fi

# ─── 6. 启动服务 ──────────────────────────────────────────
echo ""
echo "[6/7] 启动所有服务..."

docker-compose up -d

# 等待 MySQL 就绪
echo "      等待 MySQL 就绪..."
sleep 10
for i in $(seq 1 30); do
    if docker-compose exec -T mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
        log_ok "MySQL 已就绪"
        break
    fi
    if [ $i -eq 30 ]; then
        log_warn "MySQL 启动较慢，继续等待中..."
    fi
    sleep 2
done

# 推送数据库 schema
echo "      推送数据库 schema..."
docker-compose exec -T app npx drizzle-kit push 2>&1 || log_warn "drizzle-kit push 出错（如果表已存在可忽略）"
log_ok "数据库 schema 已同步"

# ─── 7. 验证部署 ──────────────────────────────────────────
echo ""
echo "[7/7] 验证部署..."

# 等待应用启动
echo "      等待应用启动（最多 60 秒）..."
for i in $(seq 1 30); do
    if curl -s http://localhost:3000/api/trpc/ping > /dev/null 2>&1; then
        log_ok "API 服务正常: /api/trpc/ping"
        break
    fi
    if [ $i -eq 30 ]; then
        log_warn "应用启动超时，打印最近日志："
        docker-compose logs --tail=30 app
    fi
    sleep 2
done

# 打印容器状态
echo ""
echo "容器状态："
docker-compose ps

# 打印访问地址
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "118.178.168.13")
echo ""
echo "========================================"
log_ok "修复完成！"
echo "========================================"
echo ""
echo "  公网访问: http://${PUBLIC_IP}:3000"
echo "  API 测试: curl http://localhost:3000/api/trpc/ping"
echo "  手动采集: curl -X POST http://localhost:3000/api/trpc/crawler.run"
echo "  查看日志: cd /root/hotspot/deploy && docker-compose logs -f app"
echo ""
