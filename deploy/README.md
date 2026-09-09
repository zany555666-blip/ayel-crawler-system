# 供应链 AI 系统 —— 境外 VPS 部署指南

生产构建已验证通过（`npm run build` 成功，全部路由编译 OK），代码无需改动。

## 你需要准备
1. 一台境外 VPS（Ubuntu/Debian，2G 内存以上），开放 **3000 端口**
2. （可选）域名解析到服务器 IP —— 不用域名也能用 IP 直接访问

## 部署步骤

### 1. 上传代码到服务器
本地（Windows PowerShell，在项目目录）：
```powershell
scp -r . root@服务器IP:/opt/supply-chain-ai
```
（若用 git 仓库，在服务器上 `git clone` 更方便；`.next`、`node_modules` 不用传）

### 2. 服务器上执行初始化
```bash
chmod +x deploy/init.sh && ./deploy/init.sh
```
脚本会自动装 Node 20、pm2，按提示填 `.env`（模板在 `deploy/.env.production.example`，照抄本地 `.env` 的值，只改 `NEXT_PUBLIC_APP_URL` 为服务器地址），然后建表、构建、启动。

### 3. 验证
浏览器访问 `http://服务器IP:3000`，用现有账号登录。

### 4. （推荐）域名 + HTTPS
- 域名解析 A 记录到服务器 IP
- 装 Caddy（自动签发证书），配置见 `deploy/Caddyfile.example`
- 把 `.env` 里 `NEXT_PUBLIC_APP_URL` 改成 `https://你的域名`
- 重启：`pm2 restart supply-chain-ai`

## 重要事项
- **保留现有数据**：本地 `prisma/dev.db` 里有账号、客户、14 条知识库等全部数据。
  - 方法一：不传 `.next`/`node_modules`，但**必须传 `prisma/dev.db`**，服务器上别跑 `db push` 以外的重置
  - 方法二：先空库部署，再把本地 db 覆盖到服务器 `prisma/dev.db`，然后 `pm2 restart supply-chain-ai`（需 `chmod 644`）
- **升级更新**：本地改完代码 → 重新上传（不传 node_modules/.next）→ 服务器执行：
  ```bash
  cd /opt/supply-chain-ai && npm ci && npx prisma generate && npx prisma db push && npm run build && pm2 restart supply-chain-ai
  ```
- **常用运维**：`pm2 logs supply-chain-ai` 看日志；`pm2 stop/restart` 控制；`pm2 status` 看状态
- **安全**：改掉默认账号密码；`.env` 不要放进 git 仓库
- **邮件发送**：生产环境推荐在系统配置里为每个账号设置发件邮箱+SMTP（QQ 需 16 位授权码）
- **爬虫**：境外 VPS 访问 TradeWheel/ImportYeti 顺畅；若某些站点需代理，在 `.env` 配 `CRAWLER_PROXY`

## 备份（每周做一次）
```bash
pm2 stop supply-chain-ai && cp prisma/dev.db prisma/dev.db.bak && pm2 start supply-chain-ai
```