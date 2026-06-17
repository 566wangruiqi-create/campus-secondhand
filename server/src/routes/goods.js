const express = require("express");
const { pool } = require("../config/database");
const asyncHandler = require("../utils/async-handler");
const httpError = require("../utils/http-error");
const { success } = require("../utils/response");
const { GOODS_STATUSES, isAllowed } = require("../utils/enums");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

const goodsSelect = `
  SELECT
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
    u.name AS seller_name,
    u.phone AS seller_phone,
    u.email AS seller_email
  FROM goods g
  INNER JOIN categories c ON c.id = g.category_id
  INNER JOIN users u ON u.id = g.seller_id
`;

async function findGoodsById(id) {
  const [rows] = await pool.execute(
    `${goodsSelect} WHERE g.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

router.get("/", asyncHandler(async (req, res) => {
  const conditions = [];
  const params = [];
  const { category_id, seller_id, status, keyword, include_all } = req.query;

  if (status) {
    if (!isAllowed(status, GOODS_STATUSES)) {
      throw httpError(400, "商品状态不合法");
    }
    conditions.push("g.status = ?");
    params.push(status);
  } else if (include_all !== "true") {
    conditions.push("g.status = 'available'");
  }

  if (category_id) {
    conditions.push("g.category_id = ?");
    params.push(category_id);
  }

  if (seller_id) {
    conditions.push("g.seller_id = ?");
    params.push(seller_id);
  }

  if (keyword) {
    conditions.push("(g.title LIKE ? OR g.description LIKE ? OR c.name LIKE ?)");
    const likeKeyword = `%${keyword}%`;
    params.push(likeKeyword, likeKeyword, likeKeyword);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.execute(
    `${goodsSelect} ${where} ORDER BY g.created_at DESC`,
    params
  );

  return success(res, rows);
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const goods = await findGoodsById(req.params.id);

  if (!goods) {
    throw httpError(404, "商品不存在");
  }

  return success(res, goods);
}));

router.post("/", authenticate, asyncHandler(async (req, res) => {
  const {
    category_id,
    title,
    description,
    price,
    image_url,
    pickup_location,
    contact
  } = req.body || {};

  if (!category_id || !title || price === undefined || price === null) {
    throw httpError(400, "分类、标题和价格不能为空");
  }

  const [result] = await pool.execute(
    `INSERT INTO goods
      (seller_id, category_id, title, description, price, image_url, pickup_location, contact, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      req.user.id,
      category_id,
      title,
      description || null,
      Number(price),
      image_url || null,
      pickup_location || null,
      contact || null
    ]
  );

  const goods = await findGoodsById(result.insertId);
  return success(res, goods, "商品已提交审核", 201);
}));

router.patch("/:id/status", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { status } = req.body || {};

  if (!isAllowed(status, GOODS_STATUSES)) {
    throw httpError(400, "商品状态不合法");
  }

  const [result] = await pool.execute(
    `UPDATE goods
     SET status = ?
     WHERE id = ?`,
    [status, req.params.id]
  );

  if (result.affectedRows === 0) {
    throw httpError(404, "商品不存在");
  }

  await pool.execute(
    `INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail)
     VALUES (?, ?, 'goods', ?, ?)`,
    [req.user.id, "update_goods_status", req.params.id, `商品状态更新为 ${status}`]
  );

  const goods = await findGoodsById(req.params.id);
  return success(res, goods);
}));

module.exports = router;
