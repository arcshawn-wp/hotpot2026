#!/bin/bash
# ============================================================================
# 热点挖掘器 - 阿里云ECS一键部署脚本
# ============================================================================
# 使用方法:
#   1. 购买阿里云ECS（CentOS 8 / Ubuntu 22.04）
#   2. 安全组开放 22, 80, 443, 3306 端口
#   3. 上传本脚本到ECS: scp deploy.sh root@你的IP:/root/
#   4. SSH连接: ssh root@你的IP
#   5. 执行: bash /root/deploy.sh
# ============================================================================

set -e  # 遇到错误立即退出

# ============================================
# 配置项
# ============================================
PROJECT_NAME="hotspot"
PROJECT_DIR="/root/${PROJECT_NAME}"
DB_ROOT_PASS="HotspotDB2024!"
DB_USER_PASS="HotspotUser2024!"
APP_PORT=3000

# ============================================
# 颜色输出
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================
# 步骤1: 系统初始化
# ============================================
step1_system_init() {
    log_info "步骤 1/8: 系统初始化..."
    
    # 更新系统
    if command -v apt &> /dev/null; then
        apt update -y && apt upgrade -y
        apt install -y curl wget git vim net-tools
    elif command -v yum &> /dev/null; then
        yum update -y
        yum install -y curl wget git vim net-tools
    fi
    
    # 设置时区
    timedatectl set-timezone Asia/Shanghai
    
    log_ok "系统初始化完成"
}

# ============================================
# 步骤2: 安装Docker
# ============================================
step2_install_docker() {
    log_info "步骤 2/8: 安装Docker..."
    
    if command -v docker &> /dev/null; then
        log_warn "Docker已安装，跳过"
    else
        curl -fsSL https://get.docker.com | bash
        systemctl start docker
        systemctl enable docker
        log_ok "Docker安装完成"
    fi
    
    # 安装Docker Compose
    if command -v docker-compose &> /dev/null; then
        log_warn "Docker Compose已安装，跳过"
    else
        curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" \
            -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
        log_ok "Docker Compose安装完成"
    fi
    
    docker -v
    docker-compose -v
}

# ============================================
# 步骤3: 创建项目目录
# ============================================
step3_create_project() {
    log_info "步骤 3/8: 创建项目目录..."
    
    mkdir -p ${PROJECT_DIR}
    mkdir -p ${PROJECT_DIR}/ssl
    mkdir -p /root/backups
    
    log_ok "项目目录创建完成: ${PROJECT_DIR}"
}

# ============================================
# 步骤4: 创建配置文件
# ============================================
step4_create_configs() {
    log_info "步骤 4/8: 创建配置文件..."
    
    # 创建 docker-compose.yml
    cat > ${PROJECT_DIR}/docker-compose.yml << 'COMPOSE_EOF'
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: hotspot-mysql
    environment:
      MYSQL_ROOT_PASSWORD: HotspotDB2024!
      MYSQL_DATABASE: hotspot_db
      MYSQL_USER: hotspot
      MYSQL_PASSWORD: HotspotUser2024!
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    command: >
      --default-authentication-plugin=mysql_native_password
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-pHotspotDB2024!"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    restart: always
    networks:
      - hotspot-network

  app:
    build: .
    container_name: hotspot-app
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: mysql://hotspot:HotspotUser2024!@mysql:3306/hotspot_db
      NODE_ENV: production
      PORT: 3000
    depends_on:
      mysql:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/trpc/ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    restart: always
    networks:
      - hotspot-network

  nginx:
    image: nginx:alpine
    container_name: hotspot-nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      app:
        condition: service_healthy
    restart: always
    networks:
      - hotspot-network

volumes:
  mysql_data:

networks:
  hotspot-network:
    driver: bridge
COMPOSE_EOF

    # 创建 nginx.conf
    cat > ${PROJECT_DIR}/nginx.conf << 'NGINX_EOF'
events { worker_connections 1024; }
http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    sendfile on;
    tcp_nopush on;
    keepalive_timeout 65;
    
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml text/javascript;

    upstream hotspot_backend {
        server app:3000;
    }

    server {
        listen 80;
        server_name _;
        
        location / {
            proxy_pass http://hotspot_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            proxy_pass http://hotspot_backend;
            expires 1d;
            add_header Cache-Control "public, immutable";
        }

        location /health {
            access_log off;
            proxy_pass http://hotspot_backend/api/trpc/ping;
        }
    }
}
NGINX_EOF

    log_ok "配置文件创建完成"
}

# ============================================
# 步骤5: 复制项目文件
# ============================================
step5_copy_project() {
    log_info "步骤 5/8: 准备项目文件..."
    
    log_warn "请确保已将项目文件上传到 ${PROJECT_DIR}"
    log_info "如果还没有上传，请在新终端执行:"
    log_info "  scp -r /本地路径/app/* root@$(curl -s ifconfig.me):${PROJECT_DIR}/"
    
    # 检查必要文件
    if [ ! -f "${PROJECT_DIR}/package.json" ]; then
        log_error "未找到 package.json，请先上传项目文件"
        exit 1
    fi
    
    log_ok "项目文件准备完成"
}

# ============================================
# 步骤6: 构建和启动
# ============================================
step6_build_and_start() {
    log_info "步骤 6/8: 构建Docker镜像..."
    
    cd ${PROJECT_DIR}
    
    # 构建镜像
    docker-compose build --no-cache
    
    log_ok "Docker镜像构建完成"
    
    # 启动服务
    log_info "启动服务..."
    docker-compose up -d
    
    # 等待MySQL启动
    log_info "等待MySQL启动..."
    sleep 15
    
    # 检查MySQL状态
    until docker-compose exec -T mysql mysqladmin ping -h localhost -u root -p${DB_ROOT_PASS} --silent; do
        log_warn "MySQL未就绪，等待5秒..."
        sleep 5
    done
    
    log_ok "MySQL已就绪"
}

# ============================================
# 步骤7: 初始化数据库
# ============================================
step7_init_database() {
    log_info "步骤 7/8: 初始化数据库..."
    
    cd ${PROJECT_DIR}
    
    # 推送schema
    log_info "推送数据库Schema..."
    docker-compose exec -T app npx drizzle-kit push
    
    # 插入种子数据
    log_info "插入种子数据..."
    docker-compose exec -T app npx tsx db/seed.ts
    
    log_ok "数据库初始化完成"
}

# ============================================
# 步骤8: 验证部署
# ============================================
step8_verify() {
    log_info "步骤 8/8: 验证部署..."
    
    cd ${PROJECT_DIR}
    
    # 等待应用启动
    sleep 5
    
    # 测试API
    local PUBLIC_IP=$(curl -s ifconfig.me)
    
    if curl -s http://localhost:3000/api/trpc/ping > /dev/null 2>&1; then
        log_ok "tRPC API 正常"
    else
        log_error "tRPC API 测试失败"
        docker-compose logs app --tail=30
        exit 1
    fi
    
    # 显示服务状态
    log_info "服务状态:"
    docker-compose ps
    
    log_ok "========================================"
    log_ok "  热点挖掘器部署成功!"
    log_ok "========================================"
    log_info "公网访问: http://${PUBLIC_IP}"
    log_info "API测试: http://${PUBLIC_IP}/api/trpc/ping"
    log_info "管理命令:"
    log_info "  查看日志: cd ${PROJECT_DIR} && docker-compose logs -f app"
    log_info "  重启服务: cd ${PROJECT_DIR} && docker-compose restart"
    log_info "  备份数据: docker exec hotspot-mysql mysqldump -uroot -p${DB_ROOT_PASS} hotspot_db > backup.sql"
    log_info "  更新部署: cd ${PROJECT_DIR} && docker-compose down && docker-compose up --build -d"
}

# ============================================
# 设置自动备份
# ============================================
setup_backup() {
    log_info "设置自动备份..."
    
    cat > /root/backup.sh << BACKUP_EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
mkdir -p /root/backups
docker exec hotspot-mysql mysqldump -uroot -p${DB_ROOT_PASS} hotspot_db > /root/backups/hotspot_\${DATE}.sql
find /root/backups -name "*.sql" -mtime +7 -delete
echo "[\$(date)] 备份完成: hotspot_\${DATE}.sql"
BACKUP_EOF
    
    chmod +x /root/backup.sh
    
    # 每天凌晨3点备份
    (crontab -l 2>/dev/null; echo "0 3 * * * /root/backup.sh >> /root/backup.log 2>&1") | crontab -
    
    log_ok "自动备份已设置（每天3点）"
}

# ============================================
# 主流程
# ============================================
main() {
    echo "========================================"
    echo "  热点挖掘器 - 阿里云ECS部署脚本"
    echo "========================================"
    echo ""
    
    step1_system_init
    step2_install_docker
    step3_create_project
    step4_create_configs
    step5_copy_project
    step6_build_and_start
    step7_init_database
    step8_verify
    setup_backup
    
    echo ""
    log_ok "全部完成!"
}

# 运行
main "$@"
