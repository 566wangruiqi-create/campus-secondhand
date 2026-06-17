const express = require("express");
const { pool, withTransaction } = require("../config/database");
const asyncHandler = require("../utils/async-handler");
const httpError = require("../utils/http-error");
const { success } = require("../utils/response");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

async function findDisputeById(id) {
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
    [id]
  );
  return rows[0] || null;
}

router.post("/", authenticate, asyncHandler(async (req, res) => {
  const { order_id, reason, evidence } = req.body || {};

  if (!order_id || !reason) {
    throw httpError(400, "订单 ID 和争议原因不能为空");
  }

  const disputeId = await withTransaction(async (connection) => {
    const [orderRows] = await connection.execute(
      `SELECT *
       FROM orders
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [order_id]
    );

    const order = orderRows[0];
    if (!order) {
      throw httpError(404, "订单不存在");
    }

    const isBuyer = Number(order.buyer_id) === Number(req.user.id);
    const isSeller = Number(order.seller_id) === Number(req.user.id);
    if (!isBuyer && !isSeller && req.user.role !== "admin") {
      throw httpError(403, "无权提交该订单争议");
    }

    const [result] = await connection.execute(
      `INSERT INTO disputes
        (order_id, complainant_id, reason, evidence, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [order_id, req.user.id, reason, evidence || null]
    );

    await connection.execute(
      `UPDATE orders
       SET status = 'disputed'
       WHERE id = ?`,
      [order_id]
    );

    return result.insertId;
  });

  const dispute = await findDisputeById(disputeId);
  return success(res, dispute, "争议提交成功", 201);
}));

module.exports = router;
