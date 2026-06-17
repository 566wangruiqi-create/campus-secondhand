const express = require("express");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");
const { jwtSecret } = require("../config/env");
const asyncHandler = require("../utils/async-handler");
const httpError = require("../utils/http-error");
const { success } = require("../utils/response");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

function publicUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

router.post("/login", asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    throw httpError(400, "请输入账号和密码");
  }

  const [rows] = await pool.execute(
    `SELECT id, username, password, name, phone, email, role, status, created_at, updated_at
     FROM users
     WHERE username = ?
     LIMIT 1`,
    [username]
  );

  const user = rows[0];
  if (!user || user.password !== password) {
    throw httpError(401, "账号或密码错误");
  }

  if (user.status !== "active") {
    throw httpError(403, "账号已被禁用");
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    },
    jwtSecret,
    { expiresIn: "7d" }
  );

  return success(res, { token, user: publicUser(user) }, "登录成功");
}));

router.get("/me", authenticate, asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, username, name, phone, email, role, status, created_at, updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [req.user.id]
  );

  if (!rows[0] || rows[0].status !== "active") {
    throw httpError(401, "登录用户不存在或已被禁用");
  }

  return success(res, rows[0]);
}));

module.exports = router;
