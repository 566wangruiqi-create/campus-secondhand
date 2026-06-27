const express = require("express");
const { pool } = require("../config/database");
const asyncHandler = require("../utils/async-handler");
const httpError = require("../utils/http-error");
const { success } = require("../utils/response");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.get("/mine", authenticate, asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT
       r.id, r.order_id, r.reviewer_id, r.target_user_id, r.rating, r.comment, r.created_at,
       u.name AS target_user_name
     FROM reviews r
     INNER JOIN users u ON u.id = r.target_user_id
     WHERE r.reviewer_id = ?
     ORDER BY r.created_at DESC`,
    [req.user.id]
  );
  return success(res, rows);
}));

router.get("/", asyncHandler(async (req, res) => {
  const { target_user_id, order_id } = req.query;
  const conditions = [];
  const params = [];
  if (target_user_id) {
    conditions.push("r.target_user_id = ?");
    params.push(target_user_id);
  }
  if (order_id) {
    conditions.push("r.order_id = ?");
    params.push(order_id);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.execute(
    `SELECT
       r.id, r.order_id, r.reviewer_id, r.target_user_id, r.rating, r.comment, r.created_at,
       u.name AS reviewer_name
     FROM reviews r
     INNER JOIN users u ON u.id = r.reviewer_id
     ${where}
     ORDER BY r.created_at DESC`,
    params
  );
  return success(res, rows);
}));

router.post("/", authenticate, asyncHandler(async (req, res) => {
  const { order_id, rating, comment } = req.body || {};
  const score = Number(rating);
  if (!order_id || !Number.isInteger(score) || score < 1 || score > 5) {
    throw httpError(400, "请选择 1-5 星评分");
  }

  const [orders] = await pool.execute(
    "SELECT * FROM orders WHERE id = ? LIMIT 1",
    [order_id]
  );
  const order = orders[0];
  if (!order) {
    throw httpError(404, "订单不存在");
  }
  if (order.status !== "completed") {
    throw httpError(400, "订单完成后才能评价");
  }

  const isBuyer = Number(order.buyer_id) === Number(req.user.id);
  const isSeller = Number(order.seller_id) === Number(req.user.id);
  if (!isBuyer && !isSeller) {
    throw httpError(403, "无权评价该订单");
  }
  const targetUserId = isBuyer ? order.seller_id : order.buyer_id;
  const [existing] = await pool.execute(
    "SELECT id FROM reviews WHERE order_id = ? AND reviewer_id = ? AND target_user_id = ? LIMIT 1",
    [order_id, req.user.id, targetUserId]
  );
  if (existing[0]) {
    throw httpError(409, "你已经评价过这笔交易");
  }

  const [result] = await pool.execute(
    `INSERT INTO reviews (order_id, reviewer_id, target_user_id, rating, comment)
     VALUES (?, ?, ?, ?, ?)`,
    [order_id, req.user.id, targetUserId, score, String(comment || "").trim() || null]
  );
  const [rows] = await pool.execute(
    `SELECT r.*, u.name AS reviewer_name
     FROM reviews r INNER JOIN users u ON u.id = r.reviewer_id
     WHERE r.id = ? LIMIT 1`,
    [result.insertId]
  );
  return success(res, rows[0], "评价成功", 201);
}));

module.exports = router;
