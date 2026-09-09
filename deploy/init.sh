#!/usr/bin/env bash
# 境外 VPS 一次性初始化脚本（Ubuntu/Debian，root 或 sudo）
set -euo pipefail

echo "==> 1/6 更新系统并安装 Node.js 20 + pm2"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git
npm install -g pm2

echo "==> 2/6 克隆/上传代码"
# 方式A（git）: git clone <你的仓库地址> /opt/supply-chain-ai
# 方式B（scp）: 在本地执行 scp -r 项目目录 root@服务器IP:/opt/supply-chain-ai
# 本脚本假设代码已在 /opt/supply-chain-ai
cd /opt/supply-chain-ai || { echo "请先把代码放到 /opt/supply-chain-ai"; exit 1; }

echo "==> 3/6 安装依赖"
npm ci

echo "==> 4/6 配置环境变量"
if [ ! -f .env ]; then
  cp deploy/.env.production.example .env
  echo "!! 请编辑 .env 填入真实密钥后再继续:  nano /opt/supply-chain-ai/.env"
  exit 1
fi

echo "==> 5/6 生成 Prisma 客户端 + 建表 + 生产构建"
npx prisma generate
npx prisma db push
npm run build

echo "==> 6/6 用 pm2 启动并开机自启"
pm2 start "npm run start" --name supply-chain-ai
pm2 save
pm2 startup systemd

echo ""
echo "完成！浏览器访问 http://服务器IP:3000"
echo "若有域名并想上 HTTPS：安装 Caddy（caddy init），配置见 deploy/Caddyfile.example"