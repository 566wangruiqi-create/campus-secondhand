const fs = require("fs");
const path = require("path");
const { db, dbDriver, sqlitePath } = require("./env");

function createMysqlStore() {
  const mysql = require("mysql2/promise");
  const pool = mysql.createPool({
    host: db.host,
    user: db.user,
    password: db.password,
    database: db.database,
    port: db.port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: false,
    timezone: "+08:00"
  });

  return {
    pool,
    async withTransaction(work) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }
  };
}

function sqliteSchema(database) {
  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      wechat TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      original_price REAL,
      degree TEXT,
      image_url TEXT,
      pickup_location TEXT,
      contact TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      view_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seller_id) REFERENCES users(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goods_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL,
      seller_id INTEGER NOT NULL,
      price REAL NOT NULL,
      buyer_contact TEXT,
      seller_contact TEXT,
      place_location TEXT,
      status TEXT NOT NULL DEFAULT 'waiting_seller_place',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (goods_id) REFERENCES goods(id),
      FOREIGN KEY (buyer_id) REFERENCES users(id),
      FOREIGN KEY (seller_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      complainant_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      evidence TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_reply TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (complainant_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL,
      target_user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(order_id, reviewer_id, target_user_id),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id),
      FOREIGN KEY (target_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      goods_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, goods_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (goods_id) REFERENCES goods(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_goods_status ON goods(status);
    CREATE INDEX IF NOT EXISTS idx_goods_category ON goods(category_id);
    CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_user_id);
  `);
}

function seedSqlite(database) {
  const count = database.prepare("SELECT COUNT(*) AS total FROM users").get().total;
  if (count) return;

  const insertUser = database.prepare(`
    INSERT INTO users (username, password, name, phone, email, wechat, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertUser.run("admin", "123456", "系统管理员", "13800000000", "admin@campus.local", "campus-admin", "admin");
  insertUser.run("user1", "123456", "李同学", "13800001111", "user1@campus.local", "wx-user1", "user");
  insertUser.run("user2", "123456", "王同学", "13800002222", "user2@campus.local", "wx-user2", "user");
  insertUser.run("user3", "123456", "陈同学", "13800003333", "user3@campus.local", "wx-user3", "user");

  const categoryNames = ["教材资料", "数码电子", "生活用品", "服饰鞋包", "运动户外", "宿舍家具", "文具工具", "其他闲置"];
  const insertCategory = database.prepare("INSERT INTO categories (name, sort_order) VALUES (?, ?)");
  categoryNames.forEach((name, index) => insertCategory.run(name, index + 1));

  const insertGoods = database.prepare(`
    INSERT INTO goods
      (seller_id, category_id, title, description, price, original_price, degree, image_url, pickup_location, contact, status, view_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertGoods.run(2, 1, "高等数学同济第七版教材", "公共课教材，书角轻微磨损，重点章节有少量笔记。", 28, 45, "八成新", "", "东校区图书馆自取柜 A-12", "李同学 13800001111 / wx-user1", "available", 35, "2026-06-20 08:30:00");
  insertGoods.run(2, 2, "罗技无线鼠标 M330", "静音鼠标，适合宿舍和图书馆使用，电池刚换。", 45, 99, "九成新", "", "北校区二号宿舍楼大厅", "李同学 13800001111 / wx-user1", "available", 68, "2026-06-21 09:00:00");
  insertGoods.run(3, 6, "宿舍折叠小桌", "可放床上使用，桌面干净，搬宿舍出闲置。", 35, 79, "八成新", "", "南校区 5 号楼门口", "王同学 13800002222 / wx-user2", "available", 51, "2026-06-22 10:20:00");
  insertGoods.run(4, 5, "羽毛球拍一对", "适合体育课练习，附赠三只训练球。", 60, 128, "九成新", "", "体育馆入口服务台", "陈同学 13800003333 / wx-user3", "pending", 8, "2026-06-23 11:00:00");
}

function createSqliteStore() {
  const { DatabaseSync } = require("node:sqlite");
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
  const database = new DatabaseSync(sqlitePath);
  sqliteSchema(database);
  seedSqlite(database);

  function normalizeSql(sql) {
    return sql
      .replace(/\s+FOR UPDATE/gi, "")
      .replace(/INSERT\s+IGNORE/gi, "INSERT OR IGNORE");
  }

  const pool = {
    async execute(sql, params = []) {
      const statement = database.prepare(normalizeSql(sql));
      const command = normalizeSql(sql).trim().split(/\s+/, 1)[0].toUpperCase();
      if (["SELECT", "PRAGMA", "WITH"].includes(command)) {
        return [statement.all(...params)];
      }
      const result = statement.run(...params);
      return [{
        insertId: Number(result.lastInsertRowid || 0),
        affectedRows: Number(result.changes || 0)
      }];
    },
    async query(sql, params = []) {
      return this.execute(sql, params);
    }
  };

  let transactionQueue = Promise.resolve();
  async function withTransaction(work) {
    const previous = transactionQueue;
    let release;
    transactionQueue = new Promise((resolve) => { release = resolve; });
    await previous;
    database.exec("BEGIN IMMEDIATE");
    try {
      const result = await work(pool);
      database.exec("COMMIT");
      return result;
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    } finally {
      release();
    }
  }

  return { pool, withTransaction };
}

const store = dbDriver === "mysql" ? createMysqlStore() : createSqliteStore();

module.exports = store;
