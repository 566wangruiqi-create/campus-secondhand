function success(res, data = {}, message = "操作成功", statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

function failure(res, statusCode = 500, message = "操作失败", data = {}) {
  return res.status(statusCode).json({
    success: false,
    message,
    data
  });
}

module.exports = {
  success,
  failure
};
