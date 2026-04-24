# 热点挖掘器 - 阿里云部署包

## 文件说明

| 文件 | 说明 |
|------|------|
| `Dockerfile` | Docker镜像构建文件 |
| `docker-compose.yml` | Docker Compose编排配置 |
| `nginx.conf` | Nginx反向代理配置 |
| `deploy.sh` | 一键部署脚本 |
| `aliyun-deploy-guide.md` | 完整部署指南 |

## 快速开始（3步部署）

### 第1步：准备ECS
- 购买阿里云ECS（2核4G推荐）
- 安全组开放端口：22, 80, 443
- 系统：CentOS 8 / Ubuntu 22.04

### 第2步：上传文件
```bash
# 在本地打包项目
cd /mnt/agents/output/app
npm run build
cd ..
tar czf hotspot-deploy.tar.gz app/ deploy/

# 上传到ECS
scp hotspot-deploy.tar.gz root@你的ECS公网IP:/root/
```

### 第3步：执行部署
```bash
# SSH连接到ECS
ssh root@你的ECS公网IP

# 解压
tar xzf /root/hotspot-deploy.tar.gz -C /root/
cd /root/deploy

# 给脚本执行权限
chmod +x deploy.sh

# 一键部署
bash deploy.sh
```

部署完成后访问：`http://你的ECS公网IP`

## 手动部署（不用脚本）

```bash
# 1. 安装Docker
curl -fsSL https://get.docker.com | bash
systemctl start docker

# 2. 进入项目目录
cd /root/deploy

# 3. 复制项目文件到部署目录
cp -r /root/app/* .

# 4. 构建并启动
docker-compose up --build -d

# 5. 等待MySQL启动，然后初始化数据库
sleep 15
docker-compose exec app npx drizzle-kit push
docker-compose exec app npx tsx db/seed.ts

# 6. 验证
curl http://localhost:3000/api/trpc/ping
```

## 常用命令

```bash
# 查看日志
docker-compose logs -f app

# 重启服务
docker-compose restart

# 停止所有服务
docker-compose down

# 重新构建
docker-compose up --build -d

# 进入数据库
docker-compose exec mysql mysql -uhotspot -pHotspotUser2024! hotspot_db

# 备份数据库
docker exec hotspot-mysql mysqldump -uroot -pHotspotDB2024! hotspot_db > backup.sql

# 恢复数据库
docker exec -i hotspot-mysql mysql -uroot -pHotspotDB2024! hotspot_db < backup.sql
```

## 配置HTTPS

1. 申请阿里云免费SSL证书
2. 下载证书文件到 `deploy/ssl/`
3. 编辑 `nginx.conf` 取消HTTPS server注释
4. 重启Nginx：`docker-compose restart nginx`

## 配置真实数据采集

编辑 `docker-compose.yml`，在 `app` 服务的 `environment` 中添加：

```yaml
environment:
  DATABASE_URL: mysql://hotspot:HotspotUser2024!@mysql:3306/hotspot_db
  CRAWLER_WEIBO_COOKIE: "你的微博Cookie"
  CRAWLER_DOUYIN_COOKIE: "你的抖音Cookie"  
  CRAWLER_WEATHER_API_KEY: "你的和风天气API密钥"
```

然后重启：`docker-compose restart app`

## 技术支持

部署遇到问题？
- 查看应用日志：`docker-compose logs -f app`
- 查看Nginx日志：`docker-compose logs -f nginx`
- 查看数据库状态：`docker-compose exec mysql mysqladmin -uroot -pHotspotDB2024! status`
