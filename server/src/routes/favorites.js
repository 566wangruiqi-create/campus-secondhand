const express = require("express");
const { pool } = require("../config/database");
const asyncHandler = require("../utils/async-handler");
const httpError = require("../utils/http-error");
const { success } = require("../utils/response");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

const favoriteSelect = `
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
    g.status,
    g.view_count,
    g.created_at,
    u.name AS seller_name,
    f.created_at AS favorited_at
  FROM favorites f
  INNER JOIN goods g ON g.id = f.goods_id
  INNER JOIN users u ON u.id = g.seller_id
`;

router.get("/", asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `${favoriteSelect} WHERE f.user_id = ? ORDER BY f.created_at DESC`,
    [req.user.id]
  );
  return success(res, rows);
}));

router.get("/:goodsId/status", asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT id FROM favorites WHERE user_id = ? AND goods_id = ? LIMIT 1",
    [req.user.id, req.params.goodsId]
  );
  return success(res, { favorited: Boolean(rows[0]) });
}));

router.post("/:goodsId", asyncHandler(async (req, res) => {
  const [goodsRows] = await pool.execute(
    "SELECT id FROM goods WHERE id = ? LIMIT 1",
    [req.params.goodsId]
  );
  if (!goodsRows[0]) {
    throw httpError(404, "商品不存在");
  }
  const [existing] = await pool.execute(
    "SELECT id FROM favorites WHERE user_id = ? AND goods_id = ? LIMIT 1",
    [req.user.id, req.params.goodsId]
  );
  if (!existing[0]) {
    await pool.execute(
      "INSERT INTO favorites (user_id, goods_id) VALUES (?, ?)",
      [req.user.id, req.params.goodsId]
    );
  }
  return success(res, { favorited: true }, "已收藏");
}));

router.delete("/:goodsId", asyncHandler(async (req, res) => {
  await pool.execute(
    "DELETE FROM favorites WHERE user_id = ? AND goods_id = ?",
    [req.user.id, req.params.goodsId]
  );
  return success(res, { favorited: false }, "已取消收藏");
}));

module.exports = router;
