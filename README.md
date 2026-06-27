# 校园闲置铺

面向校内同学的二手交易平台。前端与 API 已合并为一个服务，部署后同学访问同一个网址即可共享商品、收藏、订单、评价和后台审核数据。

## 已实现功能

- 用户注册、密码登录、资料修改
- 首页上新、分类浏览、关键词和价格筛选
- 商品实拍图压缩上传、原价/售价/成色/面交点展示
- 商品收藏、链接分享、浏览量
- 发布审核、卖家下架与重新提交
- 下单锁定、卖家确认放置、买家确认取到、取消订单
- 完成交易后双方评价、统一交易信用动态聚合
- 商品列表和详情展示卖家交易信用，为购买决策提供参考
- 交易争议提交和管理员处理
- 管理员数据看板、商品审核、用户启停、订单/争议/日志管理
- SQLite 默认数据库，也可切换回 MySQL
- Docker 与 Railway 部署配置

> 当前“下单”是校内面交订单锁定，不接入真实支付渠道，不会产生真实扣款。

## 本地启动

需要 Node.js 22.5 或更高版本。

```powershell
cd campus-secondhand
npm.cmd ci --prefix server
npm.cmd start
```

浏览器打开：

```text
http://localhost:3000
```

默认使用 SQLite，首次启动会自动创建数据库并写入演示数据，不需要安装 MySQL。

数据库文件默认位于：

```text
server/data/campus-secondhand.sqlite
```

## 测试账号

普通用户：

```text
user1 / 123456
user2 / 123456
```

管理员：

```text
admin / 123456
```

首次使用旧演示账号登录后，明文演示密码会自动升级为 scrypt 哈希。

## 前端体验版部署

如果只需要发布一个可点击、可演示的前端模型，可以直接把仓库根目录中的静态文件部署到 Netlify、Vercel、GitHub Pages、Cloudflare Pages 等前端托管平台。前端会在没有真实 `/api` 服务时自动切换到浏览器本地体验数据。

体验版支持首页、搜索、商品详情、登录/注册、发布、收藏、下单、订单流转、评价、争议提交和管理员后台审核。数据保存在浏览器 `localStorage` 中，刷新页面不会丢失；访问任意页面时加上 `?resetDemo=1` 可以清空并重置体验数据。

可用账号与上方测试账号一致：

```text
普通用户：user1 / 123456
管理员：admin / 123456
```

如需强制使用体验版，在地址后追加 `?demo=1`；如需强制连接真实 API，在地址后追加 `?live=1`，或将 `assets/js/config.js` 中的 `demoMode` 改为 `false`。

## 部署并分享给同学

推荐使用 Railway，仓库根目录已经包含 `railway.json`。

1. 将本项目推送到 GitHub。
2. 在 Railway 新建项目并选择该 GitHub 仓库。
3. 给服务添加持久化 Volume，挂载路径设为 `/data`。
4. 添加环境变量：

```text
NODE_ENV=production
DB_DRIVER=sqlite
SQLITE_PATH=/data/campus-secondhand.sqlite
JWT_SECRET=请替换为一段足够长的随机字符串
```

5. 部署完成后，在 Railway 生成公开域名。
6. 将该 HTTPS 地址发给同学即可共同注册、发布和交易。

必须挂载持久化 Volume；否则平台重新部署或重启后，SQLite 数据可能被重置。

也可以使用仓库内的 `Dockerfile` 部署到其他支持 Docker 和持久化磁盘的平台：

```powershell
docker build -t campus-secondhand .
docker run -p 3000:3000 -v campus-data:/data -e JWT_SECRET=replace-me campus-secondhand
```

## 使用 MySQL

如需继续使用 MySQL，先执行：

```powershell
mysql --default-character-set=utf8mb4 -u root -p < database/mysql/schema.sql
mysql --default-character-set=utf8mb4 -u root -p < database/mysql/seed.sql
```

然后在 `server/.env` 中配置：

```text
DB_DRIVER=mysql
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=campus_secondhand
DB_PORT=3306
JWT_SECRET=replace-with-a-long-random-string
PORT=3000
```

## 目录

```text
campus-secondhand/
├─ assets/                 前端样式和交互
├─ database/mysql/         MySQL 建表与演示数据
├─ server/
│  ├─ data/                SQLite 数据目录（Git 忽略）
│  └─ src/                 Express API 和业务逻辑
├─ *.html                  用户端与管理端页面
├─ Dockerfile
├─ railway.json
└─ package.json
```

## 健康检查

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

返回 `database: connected` 代表服务和数据库可用。

首页统计接口：

```text
GET /api/stats/home
```

当前用户评价记录：

```text
GET /api/reviews/mine
```
