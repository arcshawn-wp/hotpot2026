# 热点挖掘器 - 阿里云部署指南

## 架构概览

```
用户 → 阿里云ECS/Docker → Node.js应用(3000端口) → MySQL数据库
                ↓
          定时采集服务（node-cron）
                ↓
        微博/抖音/小红书/天气API
```

---

## 方案一：ECS + Docker部署（推荐）

### 1. 购买阿里云ECS

| 配置项 | 建议 |
|--------|------|
| 实例规格 | 2核4G（最低1核2G） |
| 操作系统 | CentOS 8 / Ubuntu 22.04 |
| 带宽 | 3Mbps以上 |
| 地域 | 选择离你的用户最近的节点 |
| 价格 | 约200-400元/年（新用户有优惠） |

### 2. 安全组配置

开放以下端口：

| 端口 | 用途 | 授权对象 |
|------|------|---------|
| 22 | SSH远程连接 | 你的IP |
| 80 | HTTP | 0.0.0.0/0 |
| 443 | HTTPS | 0.0.0.0/0 |
| 3000 | 应用端口（可选，如果用Nginx代理则不需要） | 0.0.0.0/0 |

### 3. 安装Docker

```bash
# 连接到你的ECS
ssh root@你的ECS公网IP

# 安装Docker（CentOS/Ubuntu通用）
curl -fsSL https://get.docker.com | bash

# 启动Docker
systemctl start docker
systemctl enable docker

# 安装Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 验证安装
docker -v
docker-compose -v
```

### 4. 准备项目文件

在你的本地电脑上，将构建好的项目打包：

```bash
# 进入项目目录
cd /mnt/agents/output/app

# 确保已构建
npm run build

# 将项目复制到一个部署目录
mkdir -p ~/hotspot-deploy
cp -r . ~/hotspot-deploy/

# 创建Dockerfile（见下文）
# 创建docker-compose.yml（见下文）
```

#### Dockerfile

```dockerfile
# 文件名: Dockerfile
FROM node:20-alpine

WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json ./

# 安装依赖
RUN npm ci --production

# 复制构建产物
COPY dist ./dist
COPY api ./api
COPY contracts ./contracts
COPY db ./db
COPY drizzle.config.ts ./

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "dist/boot.js"]
```

#### docker-compose.yml

```yaml
# 文件名: docker-compose.yml
version: '3.8'

services:
  # MySQL数据库
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
    command: --default-authentication-plugin=mysql_native_password
    restart: always

  # 热点挖掘器应用
  app:
    build: .
    container_name: hotspot-app
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: mysql://hotspot:HotspotUser2024!@mysql:3306/hotspot_db
      NODE_ENV: production
      # 可选：配置采集Cookie
      # CRAWLER_WEIBO_COOKIE: your_cookie_here
      # CRAWLER_WEATHER_API_KEY: your_api_key_here
    depends_on:
      - mysql
    restart: always

  # Nginx反向代理
  nginx:
    image: nginx:alpine
    container_name: hotspot-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: always

volumes:
  mysql_data:
```

#### nginx.conf

```nginx
# 文件名: nginx.conf
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 前端静态文件
    server {
        listen 80;
        server_name _;  # 用你的域名替换，如 hotspot.yourdomain.com

        # API请求转发到后端
        location /api/ {
            proxy_pass http://app:3000/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_cache_bypass $http_upgrade;
        }

        # 静态文件
        location / {
            proxy_pass http://app:3000/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
        }
    }
}
```

### 5. 上传并部署

```bash
# 在本地打包项目
cd ~/hotspot-deploy
tar czf hotspot.tar.gz .

# 上传到ECS
scp hotspot.tar.gz root@你的ECS公网IP:/root/

# SSH连接到ECS
ssh root@你的ECS公网IP

# 解压
cd /root
mkdir -p hotspot
tar xzf hotspot.tar.gz -C hotspot/
cd hotspot

# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps

# 等待MySQL启动后，推送数据库schema
docker-compose exec app npx drizzle-kit push

# 插入种子数据
docker-compose exec app npx tsx db/seed.ts

# 查看日志
docker-compose logs -f app
```

### 6. 配置HTTPS（SSL证书）

```bash
# 安装Certbot
yum install certbot python3-certbot-nginx -y  # CentOS
apt install certbot python3-certbot-nginx -y   # Ubuntu

# 申请证书（替换为你的域名）
certbot --nginx -d hotspot.yourdomain.com

# 自动续期
echo "0 0 * * * certbot renew --quiet" | crontab -
```

---

## 方案二：阿里云Serverless（函数计算FC）

适合轻量级使用，按调用次数付费。

### 1. 创建函数计算服务

```bash
# 安装阿里云CLI
npm install @alicloud/fun -g

# 配置账号
fun config

# 部署
fun deploy
```

### 2. 使用Custom Runtime部署

创建 `template.yml`：

```yaml
ROSTemplateFormatVersion: '2015-09-01'
Transform: 'Aliyun::Serverless-2018-04-03'
Resources:
  hotspot-service:
    Type: 'Aliyun::Serverless::Service'
    Properties:
      Description: '热点挖掘器服务'
    hotspot-function:
      Type: 'Aliyun::Serverless::Function'
      Properties:
        Handler: not-used
        Runtime: custom
        CodeUri: ./
        MemorySize: 2048
        Timeout: 60
        EnvironmentVariables:
          DATABASE_URL: ${你的数据库连接字符串}
      Events:
        http-trigger:
          Type: HTTP
          Properties:
            AuthType: ANONYMOUS
            Methods: ['GET', 'POST', 'PUT', 'DELETE']
```

---

## 方案三：阿里云容器服务ACK（Kubernetes）

适合大规模部署、需要高可用场景。

### 部署文件

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hotspot-app
spec:
  replicas: 2  # 2个副本保证高可用
  selector:
    matchLabels:
      app: hotspot-app
  template:
    metadata:
      labels:
        app: hotspot-app
    spec:
      containers:
      - name: hotspot-app
        image: registry.cn-hangzhou.aliyuncs.com/你的命名空间/hotspot:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: hotspot-secrets
              key: database-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: hotspot-service
spec:
  selector:
    app: hotspot-app
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hotspot-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: hotspot.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: hotspot-service
            port:
              number: 80
```

部署命令：

```bash
# 配置kubectl连接到ACK集群
aliyun cs GET /k8s/你的集群id/user_config | jq -r '.config' > ~/.kube/config

# 创建密钥
kubectl create secret generic hotspot-secrets \
  --from-literal=database-url='mysql://user:pass@host:3306/db'

# 部署
kubectl apply -f k8s-deployment.yaml

# 查看状态
kubectl get pods
kubectl get svc
```

---

## 数据库方案

### 选项A：ECS自建MySQL（Docker）
已在docker-compose.yml中包含，零额外成本。

### 选项B：阿里云RDS MySQL（推荐生产使用）

| 规格 | 价格 | 适用场景 |
|------|------|---------|
| 基础版 1核1G | ~100元/月 | 测试环境 |
| 高可用版 2核4G | ~400元/月 | 生产环境 |

连接字符串：
```
mysql://用户名:密码@你的RDS地址.mysql.rds.aliyuncs.com:3306/hotspot_db
```

### 选项C：阿里云PolarDB MySQL
适合高并发场景，读写分离。

---

## 配置数据采集Cookie

### 获取微博Cookie

1. 用Chrome登录微博
2. F12打开开发者工具 → Network标签
3. 刷新页面，找到任意请求
4. 右键 → Copy → Copy as cURL
5. 提取 `Cookie:` 后面的内容

### 获取抖音Cookie

1. 用Chrome登录抖音
2. F12 → Application → Cookies
3. 复制 `sessionid` 的值

### 配置到环境变量

```bash
# 编辑docker-compose.yml，在app服务environment中添加：
CRAWLER_WEIBO_COOKIE: "SUB=xxx; SUBP=yyy; ..."
CRAWLER_DOUYIN_COOKIE: "sessionid=xxx; ..."
CRAWLER_WEATHER_API_KEY: "你的和风天气API密钥"

# 重启应用
docker-compose up -d
```

---

## 域名配置

### 1. 购买域名
阿里云域名注册：https://wanwang.aliyun.com/

### 2. 解析到ECS

| 记录类型 | 主机记录 | 记录值 |
|---------|---------|--------|
| A | @ | 你的ECS公网IP |
| A | www | 你的ECS公网IP |

### 3. 配置Nginx

```bash
# 编辑nginx.conf，修改server_name
server_name hotspot.yourdomain.com www.hotspot.yourdomain.com;

# 重启Nginx
docker-compose restart nginx
```

---

## 运维管理

### 查看日志

```bash
# 应用日志
docker-compose logs -f app

# 数据库日志
docker-compose logs -f mysql

# Nginx访问日志
docker-compose logs -f nginx
```

### 自动备份数据库

```bash
# 创建备份脚本
cat > /root/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec hotspot-mysql mysqldump -uroot -pHotspotDB2024! hotspot_db > /root/backups/hotspot_$DATE.sql
find /root/backups -name "*.sql" -mtime +7 -delete
EOF
chmod +x /root/backup.sh
mkdir -p /root/backups

# 每天凌晨3点自动备份
echo "0 3 * * * /root/backup.sh" | crontab -
```

### 监控（可选）

```bash
# 安装阿里云云监控插件
wget http://update2.aegis.aliyun.com/download/quartz_install.sh
bash quartz_install.sh

# 或安装Prometheus + Grafana
docker run -d -p 9090:9090 prom/prometheus
docker run -d -p 3000:3000 grafana/grafana
```

### 更新部署

```bash
# 拉取最新代码
cd /root/hotspot
git pull

# 重新构建
docker-compose down
docker-compose up --build -d

# 推送数据库变更（如有schema更新）
docker-compose exec app npx drizzle-kit push
```

---

## 费用估算

### 最低配置（适合个人/小团队）

| 项目 | 配置 | 月费用 |
|------|------|--------|
| ECS | 1核2G，按量付费 | ~50元 |
| 带宽 | 1Mbps | ~23元 |
| RDS | 基础版1核1G | ~100元 |
| **合计** | | **~173元/月** |

### 推荐配置（生产环境）

| 项目 | 配置 | 月费用 |
|------|------|--------|
| ECS | 2核4G | ~200元 |
| 带宽 | 3Mbps | ~69元 |
| RDS | 高可用版2核4G | ~400元 |
| OSS | 图片存储 | ~10元 |
| **合计** | | **~679元/月** |

---

## 常见问题

### Q: 应用启动后数据库连接失败？
```bash
# 检查MySQL容器状态
docker-compose ps

# 查看MySQL日志
docker-compose logs mysql

# 手动测试连接
docker-compose exec mysql mysql -uhotspot -pHotspotUser2024! -e "SHOW DATABASES;"
```

### Q: 如何查看tRPC API是否正常？
```bash
# 测试ping接口
curl http://你的ECSIP:3000/api/trpc/ping

# 测试热点列表
curl "http://你的ECSIP:3000/api/trpc/hotspot.listByDate?input=%7B%22date%22%3A%222026-04-22%22%7D"
```

### Q: 如何重启采集服务？
```bash
# 进入容器
docker-compose exec app sh

# 手动触发采集
npx tsx -e "import { runFullCrawl } from './api/crawler'; runFullCrawl('2026-04-22').then(console.log);"
```

### Q: 数据库满了怎么办？
```bash
# 清理30天前的采集日志
docker-compose exec mysql mysql -uroot -pHotspotDB2024! -e "
  USE hotspot_db;
  DELETE FROM crawl_logs WHERE crawled_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
  DELETE FROM platform_discussions WHERE crawled_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
"
```

---

## 一键部署脚本

创建 `/root/deploy.sh`：

```bash
#!/bin/bash
set -e

PROJECT_DIR="/root/hotspot"
BACKUP_DIR="/root/backups"

# 颜色输出
red() { echo -e "\033[31m$1\033[0m"; }
green() { echo -e "\033[32m$1\033[0m"; }
yellow() { echo -e "\033[33m$1\033[0m"; }

yellow "=== 热点挖掘器部署脚本 ==="

# 1. 备份数据库
yellow "[1/6] 备份数据库..."
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
docker exec hotspot-mysql mysqldump -uroot -pHotspotDB2024! hotspot_db 2>/dev/null > $BACKUP_DIR/hotspot_$DATE.sql || true
green "  ✓ 备份完成"

# 2. 拉取最新代码
cd $PROJECT_DIR
yellow "[2/6] 拉取最新代码..."
git pull
green "  ✓ 代码更新完成"

# 3. 构建
green "[3/6] 构建应用..."
docker-compose build app
green "  ✓ 构建完成"

# 4. 推送数据库变更
green "[4/6] 更新数据库..."
docker-compose run --rm app npx drizzle-kit push
green "  ✓ 数据库更新完成"

# 5. 重启服务
green "[5/6] 重启服务..."
docker-compose up -d
green "  ✓ 服务已重启"

# 6. 健康检查
green "[6/6] 健康检查..."
sleep 3
if curl -s http://localhost:3000/api/trpc/ping > /dev/null; then
  green "  ✓ 服务运行正常"
else
  red "  ✗ 服务可能未正常启动，请检查日志"
  docker-compose logs app --tail=20
fi

green "=== 部署完成 ==="
green "访问地址: http://$(curl -s ifconfig.me):3000"
```

---

## 联系我们

部署过程中遇到问题？

1. 查看应用日志：`docker-compose logs -f app`
2. 查看数据库状态：`docker-compose exec mysql mysql -uroot -pHotspotDB2024! -e "SHOW PROCESSLIST;"`
3. 检查端口监听：`netstat -tlnp | grep 3000`
