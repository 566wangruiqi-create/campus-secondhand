const express = require("express");
const { pool, withTransaction } = require("../config/database");
const asyncHandler = require("../utils/async-handler");
const httpError = require("../utils/http-error");
const { success } = require("../utils/response");
const { ORDER_STATUSES, isAllowed } = require("../utils/enums");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const orderSelect = `
  SELECT
    o.id,
    o.goods_id,
    o.buyer_id,
    o.seller_id,
    o.price,
    o.buyer_contact,
    o.seller_contact,
    o.place_location,
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
`;

function contactOf(user) {
  return [user.name, user.phone, user.email].filter(Boolean).join(" / ");
}

async function findOrderById(db, id) {
  const [rows] = await db.execute(
    `${orderSelect} WHERE o.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

function ensureOrderVisible(order, user) {
  if (user.role === "admin") return;
  if (Number(order.buyer_id) === Number(user.id)) return;
  if (Number(order.seller_id) === Number(user.id)) return;
  throw httpError(403, "无权访问该订单");
}

function ensureStatusPermission(order, user, nextStatus) {
  if (user.role === "admin") return;

  const isBuyer = Number(order.buyer_id) === Number(user.id);
  const isSeller = Number(order.seller_id) === Number(user.id);

  if (nextStatus === "seller_placed" && isSeller) return;
  if (["buyer_received", "completed"].includes(nextStatus) && isBuyer) return;
  if (["cancelled", "disputed"].includes(nextStatus) && (isBuyer || isSeller)) return;

  throw httpError(403, "无权更新该订单状态");
}

router.post("/", authenticate, asyncHandler(async (req, res) => {
  const { goods_id, buyer_contact } = req.body || {};

  if (!goods_id) {
    throw httpError(400, "商品 ID 不能为空");
  }

  const order = await withTransaction(async (connection) => {
    const [goodsRows] = await connection.execute(
      `SELECT
        g.id,
        g.seller_id,
        g.price,
        g.contact,
        g.status,
        seller.name AS seller_name,
        seller.phone AS seller_phone,
        seller.email AS seller_email
       FROM goods g
       INNER JOIN users seller ON seller.id = g.seller_id
       WHERE g.id = ?
       LIMIT 1
       FOR UPDATE`,
      [goods_id]
    );

    const goods = goodsRows[0];
    if (!goods) {
      throw httpError(404, "商品不存在");
    }

    if (goods.status !== "available") {
      throw httpError(400, "商品当前不可购买");
    }

    if (Number(goods.seller_id) === Number(req.user.id)) {
      throw httpError(400, "不能购买自己发布的商品");
    }

    const [buyerRows] = await connection.execute(
      `SELECT id, name, phone, email
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.user.id]
    );

    const buyer = buyerRows[0];
    const sellerContact = goods.contact || contactOf({
      name: goods.seller_name,
      phone: goods.seller_phone,
      email: goods.seller_email
    });

    const [orderResult] = await connection.execute(
      `INSERT INTO orders
        (goods_id, buyer_id, seller_id, price, buyer_contact, seller_contact, status)
       VALUES (?, ?, ?, ?, ?, ?, 'waiting_seller_place')`,
      [
        goods.id,
        req.user.id,
        goods.seller_id,
        goods.price,
        buyer_contact || contactOf(buyer),
        sellerContact
      ]
    );

    await connection.execute(
      `UPDATE goods
       SET status = 'locked'
       WHERE id = ?`,
      [goods.id]
    );

    await connection.execute(
      `INSERT INTO payments (order_id, user_id, amount, status)
       VALUES (?, ?, ?, 'paid')`,
      [orderResult.insertId, req.user.id, goods.price]
    );

    return findOrderById(connection, orderResult.insertId);
  });

  return success(res, order, "订单创建成功", 201);
}));

router.get("/", authenticate, asyncHandler(async (req, res) => {
  const conditions = [];
  const params = [];
  const { buyer_id, seller_id, status } = req.query;

  if (req.user.role !== "admin") {
    conditions.push("(o.buyer_id = ? OR o.seller_id = ?)");
    params.push(req.user.id, req.user.id);
  } else {
    if (buyer_id) {
      conditions.push("o.buyer_id = ?");
      params.push(buyer_id);
    }
    if (seller_id) {
      conditions.push("o.seller_id = ?");
      params.push(seller_id);
    }
  }

  if (status) {
    if (!isAllowed(status, ORDER_STATUSES)) {
      throw httpError(400, "订单状态不合法");
    }
    conditions.push("o.status = ?");
    params.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.execute(
    `${orderSelect} ${where} ORDER BY o.created_at DESC`,
    params
  );

  return success(res, rows);
}));

router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const order = await findOrderById(pool, req.params.id);

  if (!order) {
    throw httpError(404, "订单不存在");
  }

  ensureOrderVisible(order, req.user);
  return success(res, order);
}));

router.patch("/:id/status", authenticate, asyncHandler(async (req, res) => {
  const { status, place_location } = req.body || {};

  if (!isAllowed(status, ORDER_STATUSES)) {
    throw httpError(400, "订单状态不合法");
  }

  const order = await withTransaction(async (connection) => {
    const [orderRows] = await connection.execute(
      `SELECT *
       FROM orders
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [req.params.id]
    );

    const currentOrder = orderRows[0];
    if (!currentOrder) {
      throw httpError(404, "订单不存在");
    }

    ensureStatusPermission(currentOrder, req.user, status);

    const transitions = {
      waiting_seller_place: ["seller_placed", "cancelled", "disputed"],
      seller_placed: ["buyer_received", "completed", "cancelled", "disputed"],
      buyer_received: ["completed", "disputed"],
      disputed: ["completed", "cancelled"],
      completed: [],
      cancelled: []
    };
    if (!transitions[currentOrder.status]?.includes(status) && req.user.role !== "admin") {
      throw httpError(400, "当前订单状态不能执行该操作");
    }

    if (status === "seller_placed" && !String(place_location || "").trim()) {
      throw httpError(400, "请填写商品放置地点");
    }

    await connection.execute(
      `UPDATE orders
       SET status = ?, place_location = COALESCE(?, place_location), updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, String(place_location || "").trim() || null, req.params.id]
    );

    if (status === "completed") {
      await connection.execute(
        `UPDATE goods
         SET status = 'sold'
         WHERE id = ?`,
        [currentOrder.goods_id]
      );
    }

    if (status === "cancelled") {
      await connection.execute(
        `UPDATE goods
         SET status = 'available'
         WHERE id = ?`,
        [currentOrder.goods_id]
      );
    }

    return findOrderById(connection, req.params.id);
  });

  return success(res, order);
}));

module.exports = router;
