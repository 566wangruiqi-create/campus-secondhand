const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { pool } = require("./config/database");
const asyncHandler = require("./utils/async-handler");
const { success } = require("./utils/response");
const { notFound, errorHandler } = require("./middleware/error-handler");

const authRoutes = require("./routes/auth");
const goodsRoutes = require("./routes/goods");
const ordersRoutes = require("./routes/orders");
const disputesRoutes = require("./routes/disputes");
const adminRoutes = require("./routes/admin");
const favoritesRoutes = require("./routes/favorites");
const reviewsRoutes = require("./routes/reviews");
const statsRoutes = require("./routes/stats");

const app = express();

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "2mb" }));
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
app.use("/api/favorites", favoritesRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/stats", statsRoutes);

const projectRoot = path.resolve(__dirname, "../..");
app.use("/assets", express.static(path.join(projectRoot, "assets"), {
  maxAge: process.env.NODE_ENV === "production" ? "1h" : 0
}));
app.get("/", (req, res) => res.sendFile(path.join(projectRoot, "index.html")));
app.get("/:page", (req, res, next) => {
  if (!/^[a-z0-9-]+\.html$/i.test(req.params.page)) return next();
  const target = path.join(projectRoot, req.params.page);
  if (!fs.existsSync(target)) return next();
  return res.sendFile(target);
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
