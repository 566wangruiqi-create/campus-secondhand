const express = require("express");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");
const { jwtSecret } = require("../config/env");
const asyncHandler = require("../utils/async-handler");
const httpError = require("../utils/http-error");
const { success } = require("../utils/response");
const { authenticate } = require("../middleware/auth");
const { hashPassword, verifyPassword } = require("../utils/password");

const router = express.Router();

const userProfileSelect = `
  SELECT
    u.id,
    u.username,
    u.name,
    u.phone,
    u.email,
    u.wechat,
    u.role,
    u.status,
    u.created_at,
    u.updated_at,
    (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.target_user_id = u.id) AS rating_score,
    (SELECT COUNT(*) FROM reviews r WHERE r.target_user_id = u.id) AS rating_count
  FROM users u
`;

function publicUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    },
    jwtSecret,
    { expiresIn: "7d" }
  );
}

router.post("/register", asyncHandler(async (req, res) => {
  const { username, password, name, phone, email, wechat } = req.body || {};
  const cleanUsername = String(username || "").trim();
  const cleanName = String(name || "").trim();

  if (!/^[a-zA-Z0-9_-]{3,24}$/.test(cleanUsername)) {
    throw httpError(400, "账号需为 3-24 位字母、数字、下划线或短横线");
  }
  if (String(password || "").length < 6) {
    throw httpError(400, "密码至少需要 6 位");
  }
  if (!cleanName) {
    throw httpError(400, "请填写昵称");
  }

  const [existing] = await pool.execute(
    "SELECT id FROM users WHERE username = ? LIMIT 1",
    [cleanUsername]
  );
  if (existing[0]) {
    throw httpError(409, "该账号已被注册");
  }

  const [result] = await pool.execute(
    `INSERT INTO users (username, password, name, phone, email, wechat, role, status)
     VALUES (?, ?, ?, ?, ?, ?, 'user', 'active')`,
    [
      cleanUsername,
      hashPassword(password),
      cleanName,
      String(phone || "").trim() || null,
      String(email || "").trim() || null,
      String(wechat || "").trim() || null
    ]
  );
  const [rows] = await pool.execute(
    `${userProfileSelect} WHERE u.id = ? LIMIT 1`,
    [result.insertId]
  );
  const user = rows[0];
  return success(res, { token: createToken(user), user }, "注册成功", 201);
}));

router.post("/login", asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    throw httpError(400, "请输入账号和密码");
  }

  const [rows] = await pool.execute(
    `SELECT id, username, password, name, phone, email, wechat, role, status, created_at, updated_at
     FROM users
     WHERE username = ?
     LIMIT 1`,
    [username]
  );

  const user = rows[0];
  if (!user || !verifyPassword(password, user.password)) {
    throw httpError(401, "账号或密码错误");
  }

  if (user.status !== "active") {
    throw httpError(403, "账号已被禁用");
  }

  if (!user.password.startsWith("scrypt$")) {
    await pool.execute("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [
      hashPassword(password),
      user.id
    ]);
  }

  return success(res, { token: createToken(user), user: publicUser(user) }, "登录成功");
}));

router.get("/me", authenticate, asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `${userProfileSelect} WHERE u.id = ? LIMIT 1`,
    [req.user.id]
  );

  if (!rows[0] || rows[0].status !== "active") {
    throw httpError(401, "登录用户不存在或已被禁用");
  }

  return success(res, rows[0]);
}));

router.patch("/me", authenticate, asyncHandler(async (req, res) => {
  const { name, phone, email, wechat, password } = req.body || {};
  const cleanName = String(name || "").trim();
  if (!cleanName) {
    throw httpError(400, "昵称不能为空");
  }

  if (password && String(password).length < 6) {
    throw httpError(400, "新密码至少需要 6 位");
  }

  if (password) {
    await pool.execute(
      `UPDATE users
       SET name = ?, phone = ?, email = ?, wechat = ?, password = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        cleanName,
        String(phone || "").trim() || null,
        String(email || "").trim() || null,
        String(wechat || "").trim() || null,
        hashPassword(password),
        req.user.id
      ]
    );
  } else {
    await pool.execute(
      `UPDATE users
       SET name = ?, phone = ?, email = ?, wechat = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        cleanName,
        String(phone || "").trim() || null,
        String(email || "").trim() || null,
        String(wechat || "").trim() || null,
        req.user.id
      ]
    );
  }

  const [rows] = await pool.execute(
    `${userProfileSelect} WHERE u.id = ? LIMIT 1`,
    [req.user.id]
  );
  return success(res, rows[0], "资料已更新");
}));

module.exports = router;
