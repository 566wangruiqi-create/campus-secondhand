const express = require("express");
const { pool } = require("../config/database");
const asyncHandler = require("../utils/async-handler");
const httpError = require("../utils/http-error");
const { success } = require("../utils/response");
const { GOODS_STATUSES, isAllowed } = require("../utils/enums");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const goodsSelect = `
  SELECT
    g.id,
    g.seller_id,
    g.category_id,
    g.title,
    g.description,
    g.price,
    g.original_price,
    g.degree,
    g.image_url,
    g.pickup_location,
    g.contact,
    g.status,
    g.view_count,
    g.created_at,
    g.updated_at,
    c.name AS category_name,
    u.name AS seller_name,
    u.phone AS seller_phone,
    u.email AS seller_email,
    u.wechat AS seller_wechat,
    (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.target_user_id = g.seller_id) AS seller_score,
    (SELECT COUNT(*) FROM reviews r WHERE r.target_user_id = g.seller_id) AS seller_review_count
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
  const { category_id, seller_id, status, keyword, min_price, max_price } = req.query;

  if (status) {
    if (!isAllowed(status, GOODS_STATUSES)) {
      throw httpError(400, "商品状态不合法");
    }
    conditions.push("g.status = ?");
    params.push(status);
  } else {
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

  if (min_price !== undefined && min_price !== "") {
    conditions.push("g.price >= ?");
    params.push(Number(min_price));
  }

  if (max_price !== undefined && max_price !== "") {
    conditions.push("g.price <= ?");
    params.push(Number(max_price));
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.execute(
    `${goodsSelect} ${where} ORDER BY g.created_at DESC`,
    params
  );

  return success(res, rows);
}));

router.get("/mine", authenticate, asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `${goodsSelect} WHERE g.seller_id = ? ORDER BY g.created_at DESC`,
    [req.user.id]
  );
  return success(res, rows);
}));

router.get("/:id", asyncHandler(async (req, res) => {
  await pool.execute(
    "UPDATE goods SET view_count = view_count + 1 WHERE id = ?",
    [req.params.id]
  );
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
    original_price,
    degree,
    image_url,
    pickup_location,
    contact
  } = req.body || {};

  if (!category_id || !title || price === undefined || price === null) {
    throw httpError(400, "分类、标题和价格不能为空");
  }

  const [result] = await pool.execute(
    `INSERT INTO goods
      (seller_id, category_id, title, description, price, original_price, degree, image_url, pickup_location, contact, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      req.user.id,
      category_id,
      title,
      description || null,
      Number(price),
      original_price ? Number(original_price) : null,
      degree || null,
      image_url || null,
      pickup_location || null,
      contact || null
    ]
  );

  const goods = await findGoodsById(result.insertId);
  return success(res, goods, "商品已提交审核", 201);
}));

router.patch("/:id", authenticate, asyncHandler(async (req, res) => {
  const goods = await findGoodsById(req.params.id);
  if (!goods) {
    throw httpError(404, "商品不存在");
  }
  if (req.user.role !== "admin" && Number(goods.seller_id) !== Number(req.user.id)) {
    throw httpError(403, "无权编辑该商品");
  }
  if (req.user.role !== "admin" && ["locked", "sold"].includes(goods.status)) {
    throw httpError(400, "交易中的商品不能编辑");
  }

  const {
    category_id,
    title,
    description,
    price,
    original_price,
    degree,
    image_url,
    pickup_location,
    contact
  } = req.body || {};
  if (!category_id || !title || price === undefined || price === null) {
    throw httpError(400, "分类、标题和价格不能为空");
  }

  const nextStatus = req.user.role === "admin" ? goods.status : "pending";
  await pool.execute(
    `UPDATE goods
     SET category_id = ?, title = ?, description = ?, price = ?, original_price = ?,
         degree = ?, image_url = ?, pickup_location = ?, contact = ?, status = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      category_id,
      String(title).trim(),
      description || null,
      Number(price),
      original_price ? Number(original_price) : null,
      degree || null,
      image_url || null,
      pickup_location || null,
      contact || null,
      nextStatus,
      req.params.id
    ]
  );
  return success(res, await findGoodsById(req.params.id), "商品已更新");
}));

router.patch("/:id/status", authenticate, asyncHandler(async (req, res) => {
  const { status } = req.body || {};

  if (!isAllowed(status, GOODS_STATUSES)) {
    throw httpError(400, "商品状态不合法");
  }

  const goods = await findGoodsById(req.params.id);
  if (!goods) {
    throw httpError(404, "商品不存在");
  }

  const isAdmin = req.user.role === "admin";
  const isOwner = Number(goods.seller_id) === Number(req.user.id);
  if (!isAdmin && !isOwner) {
    throw httpError(403, "无权更新该商品");
  }
  if (!isAdmin && !["removed", "pending"].includes(status)) {
    throw httpError(403, "卖家只能下架商品或重新提交审核");
  }
  if (!isAdmin && status === "pending" && !["removed", "rejected"].includes(goods.status)) {
    throw httpError(400, "当前商品不能重新提交");
  }
  if (!isAdmin && status === "removed" && ["locked", "sold"].includes(goods.status)) {
    throw httpError(400, "交易中的商品不能下架");
  }

  const [result] = await pool.execute(
    `UPDATE goods
     SET status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [status, req.params.id]
  );

  if (result.affectedRows === 0) {
    throw httpError(404, "商品不存在");
  }

  if (isAdmin) {
    await pool.execute(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail)
       VALUES (?, ?, 'goods', ?, ?)`,
      [req.user.id, "update_goods_status", req.params.id, `商品状态更新为 ${status}`]
    );
  }

  const updatedGoods = await findGoodsById(req.params.id);
  return success(res, updatedGoods);
}));

module.exports = router;
