#!/bin/bash
# ================================================================
#  热点挖掘器 - 阿里云 ECS 一键部署脚本
#  用法:  bash deploy-hotpot.sh          (部署 + 建表)
#         bash deploy-hotpot.sh --seed   (部署 + 建表 + 导入种子数据)
# ================================================================
set -e

# ---------- 配置 ----------
REPO_URL="https://github.com/arcshawn-wp/hotpot2026.git"
PROJECT_DIR="/root/hotpot2026"
APP_DIR="${PROJECT_DIR}/app"
DEPLOY_DIR="${PROJECT_DIR}/deploy"
DB_URL="mysql://hotpot_user:HotPot@2026Secure!@mysql:3306/hotpot2026"

SEED_DATA=false
[[ "${1:-}" == "--seed" ]] && SEED_DATA=true

# ---------- 颜色输出 ----------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[!!]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }
step() { echo -e "\n${GREEN}========== $1 ==========${NC}"; }

# ===================== 0. 环境检查 =====================
step "0/7  环境检查"

# Docker
if command -v docker &>/dev/null; then
  ok "Docker: $(docker --version)"
else
  fail "未安装 Docker！请先运行: curl -fsSL https://get.docker.com | sh && systemctl enable --now docker"
fi

# Docker Compose (v2 plugin 或 v1 standalone)
if docker compose version &>/dev/null; then
  DC="docker compose"
  ok "Docker Compose (v2 plugin): $(docker compose version --short)"
elif command -v docker-compose &>/dev/null; then
  DC="docker-compose"
  ok "Docker Compose (v1): $(docker-compose --version)"
else
  fail "未安装 Docker Compose！请先运行: apt-get install -y docker-compose-plugin"
fi

# Git
if command -v git &>/dev/null; then
  ok "Git: $(git --version)"
else
  warn "未安装 Git，正在安装..."
  apt-get update -qq && apt-get install -y -qq git
  ok "Git 已安装"
fi

# 磁盘空间检查 (至少需要 3GB)
AVAIL_KB=$(df /root --output=avail | tail -1 | tr -d ' ')
AVAIL_GB=$((AVAIL_KB / 1024 / 1024))
if [ "$AVAIL_GB" -lt 3 ]; then
  warn "磁盘剩余 ${AVAIL_GB}GB，建议至少 3GB。继续部署可能空间不足"
else
  ok "磁盘剩余: ${AVAIL_GB}GB"
fi

# 端口检查
for PORT in 80 3000 3306; do
  if ss -tlnp | grep -q ":${PORT} "; then
    warn "端口 ${PORT} 已被占用，可能与 Docker 容器冲突"
    ss -tlnp | grep ":${PORT} " || true
  fi
done

# ===================== 1. 获取代码 =====================
step "1/7  获取代码"

if [ -d "${PROJECT_DIR}/.git" ]; then
  ok "仓库已存在，拉取最新代码..."
  cd "$PROJECT_DIR"
  git fetch origin main
  git reset --hard origin/main
  ok "代码已更新到最新: $(git log -1 --format='%h %s')"
else
  ok "首次部署，克隆仓库..."
  git clone "$REPO_URL" "$PROJECT_DIR"
  cd "$PROJECT_DIR"
  ok "克隆完成: $(git log -1 --format='%h %s')"
fi

# ===================== 2. 停止旧容器 =====================
step "2/7  停止旧容器"

cd "$DEPLOY_DIR"
$DC down --remove-orphans 2>/dev/null && ok "旧容器已停止" || ok "无需停止（没有运行中的容器）"

# ===================== 3. 清理旧镜像 =====================
step "3/7  清理旧镜像和缓存"

docker image prune -f 2>/dev/null || true
# 删除旧的 hotspot 相关镜像
OLD_IMAGES=$(docker images --filter "reference=*hotspot*" -q 2>/dev/null || true)
if [ -n "$OLD_IMAGES" ]; then
  docker rmi $OLD_IMAGES 2>/dev/null || true
  ok "旧镜像已清理"
else
  ok "无旧镜像需要清理"
fi
# 也删除名为 deploy-app 的旧构建镜像
OLD_BUILD=$(docker images --filter "reference=*deploy*app*" -q 2>/dev/null || true)
[ -n "$OLD_BUILD" ] && docker rmi $OLD_BUILD 2>/dev/null || true

ok "清理完成"

# ===================== 4. 构建并启动 =====================
step "4/7  构建并启动容器 (首次构建约 3-8 分钟)"

cd "$DEPLOY_DIR"
$DC up --build --no-cache -d 2>&1 | tail -20

ok "容器已启动，等待服务就绪..."

# ===================== 5. 等待服务就绪 =====================
step "5/7  等待 MySQL 和 App 就绪"

# 等待 MySQL (最多 120 秒)
echo -n "  等待 MySQL."
for i in $(seq 1 60); do
  if docker exec hotspot-mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
    echo ""
    ok "MySQL 已就绪 (${i}x2 秒)"
    break
  fi
  echo -n "."
  sleep 2
  if [ $i -eq 60 ]; then
    echo ""
    fail "MySQL 启动超时！请检查: $DC logs mysql"
  fi
done

# 等待 App (最多 180 秒)
echo -n "  等待 App."
for i in $(seq 1 60); do
  if docker exec hotspot-app wget --quiet --tries=1 --spider http://localhost:3000/api/trpc/ping 2>/dev/null; then
    echo ""
    ok "App 已就绪 (${i}x3 秒)"
    break
  fi
  echo -n "."
  sleep 3
  if [ $i -eq 60 ]; then
    echo ""
    warn "App 健康检查超时，继续执行（可能正在启动中）..."
    echo "  最近日志:"
    $DC logs --tail=15 app
  fi
done

# ===================== 6. 数据库迁移 =====================
step "6/7  数据库表结构同步 (drizzle-kit push)"

# 用 builder 阶段的镜像来运行 drizzle-kit push（因为 drizzle-kit 是 devDependency）
ok "构建迁移工具镜像..."
docker build --target builder -t hotspot-builder -f "${APP_DIR}/Dockerfile" "${APP_DIR}" 2>&1 | tail -5

# 获取 docker compose 创建的网络名称
NETWORK=$(docker network ls --filter name=hotspot-network --format '{{.Name}}' | head -1)
if [ -z "$NETWORK" ]; then
  fail "找不到 hotspot-network 网络！请检查容器状态"
fi
ok "使用网络: ${NETWORK}"

# 执行 drizzle-kit push（自动确认）
ok "同步表结构到数据库..."
docker run --rm \
  --network "$NETWORK" \
  -e DATABASE_URL="$DB_URL" \
  hotspot-builder \
  sh -c "yes 2>/dev/null | npx drizzle-kit push 2>&1" | tail -20

ok "表结构同步完成"

# 种子数据（可选）
if [ "$SEED_DATA" = true ]; then
  ok "导入种子数据..."
  docker run --rm \
    --network "$NETWORK" \
    -e DATABASE_URL="$DB_URL" \
    hotspot-builder \
    sh -c "npx tsx db/seed.ts 2>&1" | tail -20
  ok "种子数据导入完成"
fi

# 清理 builder 镜像
docker rmi hotspot-builder 2>/dev/null || true

# ===================== 7. 验证部署 =====================
step "7/7  验证部署"

echo ""
echo "--- 容器状态 ---"
$DC ps

echo ""
echo "--- App 启动日志 ---"
$DC logs --tail=20 app 2>&1 | grep -E "(Server running|Scheduler|Error|error)" || $DC logs --tail=10 app

echo ""
# 测试 HTTP 访问
if curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
  ok "HTTP 访问正常 (localhost:3000)"
else
  warn "HTTP 访问异常，应用可能仍在启动中"
fi

if curl -sf -o /dev/null http://localhost:80/ 2>/dev/null; then
  ok "Nginx 代理正常 (localhost:80)"
else
  warn "Nginx 可能尚未就绪（App 健康检查通过后才会启动）"
fi

# 最终汇总
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  访问地址:"
echo "    - 直连:  http://118.178.168.13:3000"
echo "    - Nginx: http://118.178.168.13"
echo ""
echo "  常用命令:"
echo "    查看日志:  cd ${DEPLOY_DIR} && $DC logs -f app"
echo "    重启应用:  cd ${DEPLOY_DIR} && $DC restart app"
echo "    停止所有:  cd ${DEPLOY_DIR} && $DC down"
echo "    查看状态:  cd ${DEPLOY_DIR} && $DC ps"
echo ""
echo "  验证爬虫:"
echo "    docker exec hotspot-app wget -qO- http://localhost:3000/api/trpc/crawler.status | head -100"
echo ""
echo "  如果 App 仍在重启，检查完整日志:"
echo "    cd ${DEPLOY_DIR} && $DC logs --tail=50 app"
echo ""
