const express = require("express");
const { pool } = require("../config/database");
const asyncHandler = require("../utils/async-handler");
const { success } = require("../utils/response");

const router = express.Router();

router.get("/home", asyncHandler(async (req, res) => {
  const [[goodsRows], [categoryRows], [userRows]] = await Promise.all([
    pool.query("SELECT COUNT(*) AS total FROM goods WHERE status = 'available'"),
    pool.query("SELECT COUNT(*) AS total FROM categories"),
    pool.query("SELECT COUNT(*) AS total FROM users WHERE role = 'user' AND status = 'active'")
  ]);

  return success(res, {
    available_goods: Number(goodsRows[0]?.total || 0),
    categories: Number(categoryRows[0]?.total || 0),
    active_users: Number(userRows[0]?.total || 0)
  });
}));

module.exports = router;
