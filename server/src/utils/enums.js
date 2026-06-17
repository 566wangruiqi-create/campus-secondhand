const USER_ROLES = ["user", "admin"];
const USER_STATUSES = ["active", "disabled"];

const GOODS_STATUSES = [
  "pending",
  "available",
  "locked",
  "sold",
  "removed",
  "rejected"
];

const ORDER_STATUSES = [
  "waiting_seller_place",
  "seller_placed",
  "buyer_received",
  "completed",
  "disputed",
  "cancelled"
];

const DISPUTE_STATUSES = [
  "pending",
  "processing",
  "resolved",
  "rejected"
];

const PAYMENT_STATUSES = ["pending", "paid", "refunded"];

function isAllowed(value, allowedValues) {
  return allowedValues.includes(String(value || ""));
}

module.exports = {
  USER_ROLES,
  USER_STATUSES,
  GOODS_STATUSES,
  ORDER_STATUSES,
  DISPUTE_STATUSES,
  PAYMENT_STATUSES,
  isAllowed
};
