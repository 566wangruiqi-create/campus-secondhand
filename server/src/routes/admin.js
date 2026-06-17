const express = require("express");
const { pool } = require("../config/database");
const asyncHandler = require("../utils/async-handler");
const httpError = require("../utils/http-error");
const { success } = require("../utils/response");
const { DISPUTE_STATUSES, isAllowed } = require("../utils/enums");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get("/users", asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, username, name, phone, email, role, status, created_at, updated_at
     FROM users
     ORDER BY created_at DESC`
  );

  return success(res, rows);
}));

router.get("/goods", asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT
      g.id,
      g.seller_id,
      g.category_id,
      g.title,
      g.description,
      g.price,
      g.image_url,
      g.pickup_location,
      g.contact,
      g.status,
      g.created_at,
      g.updated_at,
      c.name AS category_name,
      u.name AS seller_name
     FROM goods g
     INNER JOIN categories c ON c.id = g.category_id
     INNER JOIN users u ON u.id = g.seller_id
     ORDER BY g.created_at DESC`
  );

  return success(res, rows);
}));

router.get("/orders", asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT
      o.id,
      o.goods_id,
      o.buyer_id,
      o.seller_id,
      o.price,
      o.buyer_contact,
      o.seller_contact,
      o.status,
      o.created_at,
      o.updated_at,
      g.title AS goods_title,
      buyer.name AS buyer_name,
      seller.name AS seller_name
     FROM orders o
     INNER JOIN goods g ON g.id = o.goods_id
     INNER JOIN users buyer ON buyer.id = o.buyer_id
     INNER JOIN users seller ON seller.id = o.seller_id
     ORDER BY o.created_at DESC`
  );

  return success(res, rows);
}));

router.get("/disputes", asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT
      d.id,
      d.order_id,
      d.complainant_id,
      d.reason,
      d.evidence,
      d.status,
      d.admin_reply,
      d.created_at,
      d.updated_at,
      u.name AS complainant_name,
      o.status AS order_status,
      g.title AS goods_title
     FROM disputes d
     INNER JOIN users u ON u.id = d.complainant_id
     INNER JOIN orders o ON o.id = d.order_id
     INNER JOIN goods g ON g.id = o.goods_id
     ORDER BY d.created_at DESC`
  );

  return success(res, rows);
}));

router.patch("/disputes/:id", asyncHandler(async (req, res) => {
  const { status, admin_reply } = req.body || {};

  if (!isAllowed(status, DISPUTE_STATUSES)) {
    throw httpError(400, "争议状态不合法");
  }

  const [result] = await pool.execute(
    `UPDATE disputes
     SET status = ?, admin_reply = ?
     WHERE id = ?`,
    [status, admin_reply || null, req.params.id]
  );

  if (result.affectedRows === 0) {
    throw httpError(404, "争议不存在");
  }

  await pool.execute(
    `INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail)
     VALUES (?, 'update_dispute', 'disputes', ?, ?)`,
    [req.user.id, req.params.id, admin_reply || `争议状态更新为 ${status}`]
  );

  const [rows] = await pool.execute(
    `SELECT
      d.id,
      d.order_id,
      d.complainant_id,
      d.reason,
      d.evidence,
      d.status,
      d.admin_reply,
      d.created_at,
      d.updated_at,
      u.name AS complainant_name
     FROM disputes d
     INNER JOIN users u ON u.id = d.complainant_id
     WHERE d.id = ?
     LIMIT 1`,
    [req.params.id]
  );

  return success(res, rows[0]);
}));

router.get("/dashboard", asyncHandler(async (req, res) => {
  const [
    [userRows],
    [goodsRows],
    [orderRows],
    [disputeRows],
    [reviewRows],
    [paymentRows]
  ] = await Promise.all([
    pool.query(
      `SELECT
        COUNT(*) AS total,
        COALESCE(SUM(role = 'admin'), 0) AS admins,
        COALESCE(SUM(role = 'user'), 0) AS users,
        COALESCE(SUM(status = 'active'), 0) AS active,
        COALESCE(SUM(status = 'disabled'), 0) AS disabled
       FROM users`
    ),
    pool.query(
      `SELECT
        COUNT(*) AS total,
        COALESCE(SUM(status = 'pending'), 0) AS pending,
        COALESCE(SUM(status = 'available'), 0) AS available,
        COALESCE(SUM(status = 'locked'), 0) AS locked,
        COALESCE(SUM(status = 'sold'), 0) AS sold,
        COALESCE(SUM(status = 'removed'), 0) AS removed,
        COALESCE(SUM(status = 'rejected'), 0) AS rejected
       FROM goods`
    ),
    pool.query(
      `SELECT
        COUNT(*) AS total,
        COALESCE(SUM(status = 'waiting_seller_place'), 0) AS waiting_seller_place,
        COALESCE(SUM(status = 'seller_placed'), 0) AS seller_placed,
        COALESCE(SUM(status = 'buyer_received'), 0) AS buyer_received,
        COALESCE(SUM(status = 'completed'), 0) AS completed,
        COALESCE(SUM(status = 'disputed'), 0) AS disputed,
        COALESCE(SUM(status = 'cancelled'), 0) AS cancelled
       FROM orders`
    ),
    pool.query(
      `SELECT
        COUNT(*) AS total,
        COALESCE(SUM(status = 'pending'), 0) AS pending,
        COALESCE(SUM(status = 'processing'), 0) AS processing,
        COALESCE(SUM(status = 'resolved'), 0) AS resolved,
        COALESCE(SUM(status = 'rejected'), 0) AS rejected
       FROM disputes`
    ),
    pool.query("SELECT COUNT(*) AS total FROM reviews"),
    pool.query(
      `SELECT
        COUNT(*) AS total,
        COALESCE(SUM(status = 'paid'), 0) AS paid_count,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid_amount
       FROM payments`
    )
  ]);

  return success(res, {
    users: userRows[0],
    goods: goodsRows[0],
    orders: orderRows[0],
    disputes: disputeRows[0],
    reviews: reviewRows[0],
    payments: paymentRows[0]
  });
}));

module.exports = router;
