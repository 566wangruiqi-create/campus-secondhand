const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const { pool } = require("../config/database");
const { failure } = require("../utils/response");

async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return failure(res, 401, "请先登录");
  }

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch (error) {
    return failure(res, 401, "登录状态已失效");
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, username, name, phone, email, role, status
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [payload.id]
    );

    if (!rows[0] || rows[0].status !== "active") {
      return failure(res, 401, "登录用户不存在或已被禁用");
    }

    req.user = rows[0];
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return failure(res, 403, "需要管理员权限");
  }
  return next();
}

module.exports = {
  authenticate,
  requireAdmin
};
