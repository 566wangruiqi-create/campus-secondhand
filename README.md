# 校园闲置物品交易系统

## 项目简介

校园闲置物品交易系统是一个面向课程展示的前后端分离项目。系统支持学生发布闲置商品、浏览和购买商品、查看订单流程、提交交易争议，管理员可以在后台审核商品、查看用户和订单、处理争议并查看统计数据。

## 技术栈

- 前端：HTML、CSS、JavaScript
- 后端：Node.js、Express
- 数据库：MySQL
- 接口：RESTful API
- 代码管理：Git

## 系统角色

- 普通用户：登录系统、浏览商品、发布商品、购买商品、查看订单、提交争议。
- 管理员：登录后台、查看数据概览、管理用户、审核商品、查看订单、处理争议。

## 核心业务流程

1. 用户登录后发布闲置商品。
2. 商品进入待审核状态。
3. 管理员审核通过后，商品进入可购买状态。
4. 买家购买商品后生成订单，商品进入已下单状态。
5. 卖家确认商品已放置。
6. 买家确认已取到商品，订单完成。
7. 交易异常时，买家或卖家可以提交争议，由管理员处理。

## 功能模块

- 用户端首页和分类浏览
- 商品搜索和商品详情
- 用户登录和个人中心
- 商品发布
- 订单列表和订单详情
- 争议提交
- 管理员登录
- 后台数据概览
- 用户管理
- 商品审核和下架
- 订单管理
- 争议处理
- 统计日志

## 项目目录结构

```text
campus-secondhand/
├─ assets/
│  ├─ css/
│  │  └─ styles.css
│  └─ js/
│     ├─ app.js
│     ├─ api.js
│     └─ config.js
├─ database/
│  ├─ mysql/
│  │  ├─ schema.sql
│  │  └─ seed.sql
│  └─ legacy/
│     └─ 历史迁移 SQL 文件，不参与当前 MySQL 运行
├─ server/
│  ├─ package.json
│  ├─ package-lock.json
│  ├─ .env.example
│  └─ src/
│     ├─ index.js
│     ├─ app.js
│     ├─ config/
│     ├─ middleware/
│     ├─ routes/
│     └─ utils/
├─ index.html
├─ login.html
├─ product.html
├─ publish.html
├─ orders.html
├─ order-detail.html
├─ dispute.html
├─ rate.html
├─ profile.html
├─ admin-login.html
├─ admin-dashboard.html
├─ admin-users.html
├─ admin-products.html
├─ admin-orders.html
├─ admin-disputes.html
├─ admin-logs.html
├─ README.md
└─ .gitignore
```

## MySQL 数据库导入

先确认本机已经安装并启动 MySQL。

在项目根目录依次执行：

```powershell
cmd /c "mysql --default-character-set=utf8mb4 -u root -p < database\mysql\schema.sql"
cmd /c "mysql --default-character-set=utf8mb4 -u root -p < database\mysql\seed.sql"
```

检查数据库：

```powershell
mysql -u root -p -D campus_secondhand -e "SHOW TABLES;"
mysql -u root -p -D campus_secondhand -e "SELECT username, role, status FROM users;"
```

## 后端启动方法

进入后端目录：

```powershell
cd server
npm.cmd install
Copy-Item .env.example .env
```

打开 `server/.env`，根据本机 MySQL 配置修改数据库账号和密码，重点检查：

```text
DB_USER=root
DB_PASSWORD=
DB_NAME=campus_secondhand
DB_PORT=3306
PORT=3000
```

启动后端：

```powershell
npm.cmd start
```

开发时也可以使用：

```powershell
npm.cmd run dev
```

后端默认地址：

```text
http://localhost:3000
```

健康检查：

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

## 前端打开方法

前端页面保留在项目根目录。推荐在项目根目录启动静态服务：

```powershell
python -m http.server 8080
```

浏览器访问：

```text
http://localhost:8080/index.html
```

使用前请确认后端已经运行在 `http://localhost:3000`。

## 测试账号

管理员：

```text
admin / 123456
```

普通用户：

```text
user1 / 123456
user2 / 123456
```

## 主要接口

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/goods`
- `GET /api/goods/:id`
- `POST /api/goods`
- `PATCH /api/goods/:id/status`
- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id/status`
- `POST /api/disputes`
- `GET /api/admin/users`
- `GET /api/admin/goods`
- `GET /api/admin/orders`
- `GET /api/admin/disputes`
- `PATCH /api/admin/disputes/:id`
- `GET /api/admin/dashboard`

## 常见问题

### 1. 前端页面没有商品数据

确认后端是否已启动，并检查：

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

### 2. 后端提示数据库连接失败

检查 `server/.env` 中的 `DB_HOST`、`DB_USER`、`DB_PASSWORD`、`DB_NAME` 和 `DB_PORT` 是否与本机 MySQL 一致。

### 3. 登录失败

确认已经导入 `database/mysql/seed.sql`，并使用测试账号登录。

### 4. 端口被占用

如果 `3000` 端口被占用，可以修改 `server/.env` 中的 `PORT`，同时需要同步修改 `assets/js/config.js` 中的 API 地址。

### 5. 静态页面直接双击打开异常

建议使用 `python -m http.server 8080` 启动静态服务后访问页面。
