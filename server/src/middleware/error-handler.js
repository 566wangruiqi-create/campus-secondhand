const { failure } = require("../utils/response");

function notFound(req, res) {
  return failure(res, 404, "接口不存在");
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || error.status || 500;
  const message = statusCode >= 500 ? "服务器内部错误" : error.message;

  if (statusCode >= 500) {
    console.error(error);
  }

  return failure(res, statusCode, message || "操作失败");
}

module.exports = {
  notFound,
  errorHandler
};
