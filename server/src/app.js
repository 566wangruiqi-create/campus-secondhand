const express = require("express");
const cors = require("cors");
const { pool } = require("./config/database");
const asyncHandler = require("./utils/async-handler");
const { success } = require("./utils/response");
const { notFound, errorHandler } = require("./middleware/error-handler");

const authRoutes = require("./routes/auth");
const goodsRoutes = require("./routes/goods");
const ordersRoutes = require("./routes/orders");
const disputesRoutes = require("./routes/disputes");
const adminRoutes = require("./routes/admin");

const app = express();

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", asyncHandler(async (req, res) => {
  await pool.query("SELECT 1");
  return success(res, {
    service: "campus-secondhand-api",
    database: "connected",
    timestamp: new Date().toISOString()
  });
}));

app.use("/api/auth", authRoutes);
app.use("/api/goods", goodsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/disputes", disputesRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
