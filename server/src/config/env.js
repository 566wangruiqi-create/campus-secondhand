const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const serverRoot = path.resolve(__dirname, "../..");
const configuredSqlitePath = process.env.SQLITE_PATH || "data/campus-secondhand.sqlite";

module.exports = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || "campus_secondhand_secret",
  dbDriver: process.env.DB_DRIVER || "sqlite",
  sqlitePath: path.isAbsolute(configuredSqlitePath)
    ? configuredSqlitePath
    : path.resolve(serverRoot, configuredSqlitePath),
  db: {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "campus_secondhand",
    port: Number(process.env.DB_PORT || 3306)
  }
};
