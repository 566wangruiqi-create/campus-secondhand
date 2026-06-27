const categories = [
  { id: 1, slug: "textbooks", name: "教材资料", icon: "📚" },
  { id: 2, slug: "digital", name: "数码电子", icon: "🎧" },
  { id: 3, slug: "living", name: "生活用品", icon: "🧺" },
  { id: 4, slug: "clothing", name: "服饰鞋包", icon: "🎒" },
  { id: 5, slug: "sports", name: "运动户外", icon: "🏸" },
  { id: 6, slug: "furniture", name: "宿舍家具", icon: "🪑" },
  { id: 7, slug: "tools", name: "文具工具", icon: "✏️" },
  { id: 8, slug: "other", name: "其他闲置", icon: "✨" }
];

const goodsStatus = {
  0: "待审核",
  1: "在售",
  2: "交易中",
  3: "已售",
  4: "已下架",
  5: "审核失败"
};

const orderStatus = {
  1: "商品等待卖家放置",
  2: "卖家已经放置",
  3: "买家已经取到",
  4: "订单完成",
  5: "争议处理中",
  6: "已取消"
};

const disputeStatus = {
  0: "待处理",
  1: "处理中",
  2: "已处理"
};

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function productVisual(item, className = "product-img") {
  const imageUrl = String(item?.image_url || "").trim();
  if (imageUrl) {
    return `<div class="${className} has-image"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.goods_name || "商品图片")}" loading="lazy"></div>`;
  }
  return `<div class="${className}">${categoryById(item?.category_id).icon}</div>`;
}

function showToast(message, tone = "success") {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${tone}`;
  toast.textContent = message;
  stack.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 180);
  }, 2600);
}

function openDialog({ title, message = "", value = "", confirmText = "确认", input = false }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "dialog-backdrop";
    backdrop.innerHTML = `
      <section class="dialog card" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <h2>${escapeHtml(title)}</h2>
        ${message ? `<p>${escapeHtml(message)}</p>` : ""}
        ${input ? `<input data-dialog-input value="${escapeHtml(value)}">` : ""}
        <div class="nav-actions">
          <button class="btn" type="button" data-dialog-cancel>取消</button>
          <button class="btn primary" type="button" data-dialog-confirm>${escapeHtml(confirmText)}</button>
        </div>
      </section>
    `;
    document.body.appendChild(backdrop);
    const field = backdrop.querySelector("[data-dialog-input]");
    field?.focus();
    field?.select();
    const close = (result) => {
      backdrop.remove();
      resolve(result);
    };
    backdrop.querySelector("[data-dialog-cancel]").addEventListener("click", () => close(null));
    backdrop.querySelector("[data-dialog-confirm]").addEventListener("click", () => close(input ? field.value.trim() : true));
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close(null);
    });
    field?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") close(field.value.trim());
    });
  });
}

function formatTime(value) {
  return value ? new Date(value).toLocaleString("zh-CN") : "";
}

function money(value) {
  return `￥${Number(value || 0).toFixed(2)}`;
}

function ratingInfo(score, count) {
  const total = Number(count || 0);
  const value = total > 0 && score !== null && score !== undefined ? Number(score) : null;
  return {
    count: total,
    score: value,
    label: value === null ? "暂无评分" : `${value.toFixed(1)} 分`,
    stars: value === null ? "☆☆☆☆☆" : `${"★".repeat(Math.round(value))}${"☆".repeat(5 - Math.round(value))}`
  };
}

function ratingBadge(score, count, className = "") {
  const rating = ratingInfo(score, count);
  return `<span class="credit-badge ${className} ${rating.score === null ? "empty-credit" : ""}"><strong>${rating.score === null ? "暂无评分" : rating.score.toFixed(1)}</strong><span>${rating.stars} · ${rating.count} 条评价</span></span>`;
}

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("campus_user") || "null");
  } catch {
    return null;
  }
}

function currentAdmin() {
  try {
    return JSON.parse(localStorage.getItem("campus_admin") || "null");
  } catch {
    return null;
  }
}

function saveUser(user, token) {
  if (token) localStorage.setItem("campus_token", token);
  localStorage.setItem("campus_user", JSON.stringify(user));
  localStorage.removeItem("campus_admin");
  updateNavUser();
}

function saveAdmin(admin, token) {
  if (token) localStorage.setItem("campus_token", token);
  localStorage.setItem("campus_admin", JSON.stringify(admin));
  localStorage.removeItem("campus_user");
}

function logoutUser() {
  localStorage.removeItem("campus_token");
  localStorage.removeItem("campus_user");
  location.href = "index.html";
}

function logoutAdmin() {
  localStorage.removeItem("campus_token");
  localStorage.removeItem("campus_admin");
  location.href = "admin-login.html";
}

function requireUser(nextUrl = location.pathname.split("/").pop() + location.search) {
  const user = currentUser();
  if (user) return user;
  location.href = `login.html?next=${encodeURIComponent(nextUrl)}`;
  return null;
}

async function ensureCurrentUser(nextUrl) {
  const user = requireUser(nextUrl);
  if (!user) return null;
  try {
    const freshUser = normalizeApiUser(await apiFetch("/auth/me"));
    if (freshUser?.role === "admin") {
      throw new Error("当前账号不是普通用户。");
    }
    saveUser(freshUser);
    return freshUser;
  } catch (error) {
    localStorage.removeItem("campus_token");
    localStorage.removeItem("campus_user");
    showToast("当前登录用户已失效，请重新登录", "error");
    location.href = `login.html?next=${encodeURIComponent(nextUrl || "index.html")}`;
    return null;
  }
}

function requireAdmin() {
  const admin = currentAdmin();
  if (admin) return admin;
  location.href = `admin-login.html?next=${encodeURIComponent(location.pathname.split("/").pop() + location.search)}`;
  return null;
}

async function ensureCurrentAdmin() {
  const admin = requireAdmin();
  if (!admin) return null;
  try {
    const freshAdmin = normalizeApiUser(await apiFetch("/auth/me"));
    if (freshAdmin?.role !== "admin") {
      throw new Error("当前账号不是管理员。");
    }
    saveAdmin(freshAdmin);
    return freshAdmin;
  } catch (error) {
    localStorage.removeItem("campus_token");
    localStorage.removeItem("campus_admin");
    showToast("管理员登录状态已失效，请重新登录", "error");
    location.href = "admin-login.html";
    return null;
  }
}

function categoryById(id) {
  return categories.find((item) => String(item.id) === String(id)) || categories[0];
}

function categoryByQuery(value) {
  return categories.find((item) => item.slug === value || String(item.id) === String(value)) || categories[0];
}

function categoryName(id) {
  return categoryById(id).name;
}

const goodsStatusToNumber = {
  pending: 0,
  available: 1,
  locked: 2,
  sold: 3,
  removed: 4,
  rejected: 5
};

const goodsStatusToApi = {
  0: "pending",
  1: "available",
  2: "locked",
  3: "sold",
  4: "removed",
  5: "rejected"
};

const orderStatusToNumber = {
  waiting_seller_place: 1,
  seller_placed: 2,
  buyer_received: 3,
  completed: 4,
  disputed: 5,
  cancelled: 6
};

const orderStatusToApi = {
  1: "waiting_seller_place",
  2: "seller_placed",
  3: "buyer_received",
  4: "completed",
  5: "disputed",
  6: "cancelled"
};

const disputeStatusToNumber = {
  pending: 0,
  processing: 1,
  resolved: 2,
  rejected: 3
};

const disputeStatusToApi = {
  0: "pending",
  1: "processing",
  2: "resolved",
  3: "rejected"
};

function normalizeApiUser(row) {
  if (!row) return null;
  const status = row.status === "disabled" ? 0 : 1;
  const ratingCount = Number(row.rating_count || 0);
  return {
    ...row,
    user_id: row.id,
    admin_id: row.id,
    nickname: row.name || row.username,
    real_name: row.name || row.username,
    wechat: row.wechat || "",
    status,
    rating_count: ratingCount,
    rating_score: ratingCount > 0 && row.rating_score !== null ? Number(row.rating_score) : null
  };
}

function normalizeApiGoods(row) {
  if (!row) return null;
  const status = typeof row.status === "number" ? row.status : goodsStatusToNumber[row.status] ?? 0;
  return {
    ...row,
    goods_id: row.id,
    goods_name: row.title || row.goods_name,
    original_price: row.original_price ?? null,
    degree: row.degree || "未填写",
    location: row.pickup_location || row.location || "",
    status,
    publish_time: row.created_at || row.publish_time,
    update_time: row.updated_at || row.update_time,
    seller_name: row.seller_name || "校园用户",
    seller_phone: row.seller_phone || row.contact || "",
    seller_wechat: row.seller_wechat || "",
    seller_score: Number(row.seller_review_count || 0) > 0 && row.seller_score !== null ? Number(row.seller_score) : null,
    seller_review_count: Number(row.seller_review_count || 0),
    view_count: Number(row.view_count || 0)
  };
}

function normalizeApiOrder(row) {
  if (!row) return null;
  const status = typeof row.status === "number" ? row.status : orderStatusToNumber[row.status] ?? 1;
  return {
    ...row,
    order_id: row.id,
    order_no: row.order_no || `ORD${String(row.id).padStart(6, "0")}`,
    goods_name: row.goods_title || row.goods_name || "订单商品",
    amount: Number(row.price ?? row.amount ?? 0),
    status,
    place_location: row.place_location || "",
    buyer_phone: row.buyer_contact || "",
    buyer_wechat: "",
    seller_phone: row.seller_contact || "",
    seller_wechat: "",
    create_time: row.created_at || row.create_time,
    finish_time: row.finish_time || ""
  };
}

function normalizeApiDispute(row) {
  if (!row) return null;
  const status = typeof row.status === "number" ? row.status : disputeStatusToNumber[row.status] ?? 0;
  return {
    ...row,
    dispute_id: row.id,
    user_id: row.complainant_id,
    status,
    result: row.admin_reply || "",
    create_time: row.created_at || row.create_time,
    handle_time: row.updated_at || row.handle_time
  };
}

function applyGoodsSort(items, sortValue) {
  const sorted = [...items];
  const byTime = (item) => new Date(item.publish_time || 0).getTime();
  const sorts = {
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    "time-desc": (a, b) => byTime(b) - byTime(a),
    "time-asc": (a, b) => byTime(a) - byTime(b)
  };
  return sorted.sort(sorts[sortValue] || sorts["time-desc"]);
}

const db = {
  async login({ email, password }) {
    const username = email.trim();
    let result;
    try {
      result = await apiFetch("/auth/login", {
        method: "POST",
        body: {
          username,
          password: password || "123456"
        }
      });
    } catch (error) {
      if (!username.includes("@")) throw error;
      result = await apiFetch("/auth/login", {
        method: "POST",
        body: {
          username: username.split("@")[0],
          password: password || "123456"
        }
      });
    }
    const user = normalizeApiUser(result.user);
    saveUser(user, result.token);
    return user;
  },

  async register(data) {
    const result = await apiFetch("/auth/register", {
      method: "POST",
      body: {
        username: String(data.username || "").trim(),
        password: data.password,
        name: String(data.name || "").trim(),
        phone: String(data.phone || "").trim(),
        email: String(data.email || "").trim(),
        wechat: String(data.wechat || "").trim()
      }
    });
    const user = normalizeApiUser(result.user);
    saveUser(user, result.token);
    return user;
  },

  async updateProfile(data) {
    const updated = normalizeApiUser(await apiFetch("/auth/me", {
      method: "PATCH",
      body: data
    }));
    saveUser(updated);
    return updated;
  },

  async adminLogin({ username, password }) {
    const result = await apiFetch("/auth/login", {
      method: "POST",
      body: {
        username: username.trim(),
        password: password.trim()
      }
    });
    const admin = normalizeApiUser(result.user);
    if (admin.role !== "admin") throw new Error("当前账号不是管理员。");
    saveAdmin(admin, result.token);
    return admin;
  },

  async goods(filters = {}) {
    const keyword = filters.keyword?.trim();
    if (filters.includeAll && document.body.dataset.adminPage) {
      const rows = await apiFetch("/admin/goods");
      const items = rows.map(normalizeApiGoods).filter((item) => {
        return (!filters.category_id || String(item.category_id) === String(filters.category_id))
          && (!keyword || item.goods_name.includes(keyword) || categoryName(item.category_id).includes(keyword));
      });
      return applyGoodsSort(items, filters.sort);
    }
    const params = new URLSearchParams();
    if (filters.includeAll) params.set("include_all", "true");
    if (filters.category_id) params.set("category_id", filters.category_id);
    if (keyword) params.set("keyword", keyword);
    if (filters.min_price !== undefined && filters.min_price !== "") params.set("min_price", filters.min_price);
    if (filters.max_price !== undefined && filters.max_price !== "") params.set("max_price", filters.max_price);
    const rows = await apiFetch(`/goods${params.toString() ? `?${params}` : ""}`);
    return applyGoodsSort(rows.map(normalizeApiGoods), filters.sort);
  },

  async homeStats() {
    return apiFetch("/stats/home");
  },

  async myGoods() {
    return (await apiFetch("/goods/mine")).map(normalizeApiGoods);
  },

  async goodsOne(id) {
    return normalizeApiGoods(await apiFetch(`/goods/${id}`));
  },

  async createGoods(data) {
    const user = await ensureCurrentUser("publish.html");
    if (!user) return null;
    const category = categoryByQuery(data.category);
    const row = {
      category_id: category.id,
      title: data.goods_name,
      description: data.description,
      price: Number(data.price),
      original_price: data.original_price ? Number(data.original_price) : null,
      degree: data.degree,
      image_url: data.image_url || "",
      pickup_location: data.location,
      contact: [user.phone, user.wechat].filter(Boolean).join(" / ")
    };
    const created = await apiFetch("/goods", {
      method: "POST",
      body: row
    });
    return normalizeApiGoods(created);
  },

  async updateOwnGoodsStatus(goodsId, status) {
    return normalizeApiGoods(await apiFetch(`/goods/${goodsId}/status`, {
      method: "PATCH",
      body: { status }
    }));
  },

  async createPaymentAndOrder(goods) {
    const buyer = await ensureCurrentUser(`product.html?id=${goods.goods_id}`);
    if (!buyer) return;
    if (Number(goods.seller_id) === Number(buyer.user_id)) {
      showToast("不能购买自己发布的商品", "error");
      return;
    }
    if (Number(goods.status) !== 1) {
      showToast("该商品当前不可购买", "error");
      return;
    }
    const order = normalizeApiOrder(await apiFetch("/orders", {
      method: "POST",
      body: {
        goods_id: goods.goods_id,
        buyer_contact: [buyer.phone, buyer.wechat].filter(Boolean).join(" / ")
      }
    }));
    location.href = `order-detail.html?id=${order.order_id}`;
  },

  async orders(filters = {}) {
    if (document.body.dataset.adminPage) {
      const rows = await apiFetch("/admin/orders");
      return rows.map(normalizeApiOrder);
    }
    const params = new URLSearchParams();
    if (filters.buyer_id) params.set("buyer_id", filters.buyer_id);
    if (filters.seller_id) params.set("seller_id", filters.seller_id);
    const rows = await apiFetch(`/orders${params.toString() ? `?${params}` : ""}`);
    return rows.map(normalizeApiOrder);
  },

  async order(id) {
    return normalizeApiOrder(await apiFetch(`/orders/${id}`));
  },

  async updateOrderStatus(order, nextStatus) {
    const user = await ensureCurrentUser(`order-detail.html?id=${order.order_id}`);
    if (!user) return;
    if (nextStatus === 2 && Number(user.user_id) !== Number(order.seller_id)) {
      showToast("只有卖家可以确认已放置", "error");
      return;
    }
    if (nextStatus === 4 && Number(user.user_id) !== Number(order.buyer_id)) {
      showToast("只有买家可以确认已取到", "error");
      return;
    }
    if (nextStatus === 2 && Number(order.status) !== 1) return;
    if (nextStatus === 4 && Number(order.status) !== 2) return;
    const patch = { status: orderStatusToApi[nextStatus] };
    if (nextStatus === 2) {
      const place = await openDialog({
        title: "确认放置地点",
        message: "买家会在订单里看到这个地点，请尽量写清楼栋和位置。",
        value: order.place_location || "",
        confirmText: "确认已放置",
        input: true
      });
      if (!place) return;
      patch.place_location = place;
    }
    await apiFetch(`/orders/${order.order_id}/status`, {
      method: "PATCH",
      body: patch
    });
    showToast("订单状态已更新");
    setTimeout(() => location.reload(), 450);
  },

  async favorites() {
    return (await apiFetch("/favorites")).map(normalizeApiGoods);
  },

  async favoriteStatus(goodsId) {
    return apiFetch(`/favorites/${goodsId}/status`);
  },

  async setFavorite(goodsId, favorited) {
    return apiFetch(`/favorites/${goodsId}`, {
      method: favorited ? "POST" : "DELETE"
    });
  },

  async reviews(filters = {}) {
    const params = new URLSearchParams();
    if (filters.target_user_id) params.set("target_user_id", filters.target_user_id);
    if (filters.order_id) params.set("order_id", filters.order_id);
    return apiFetch(`/reviews${params.toString() ? `?${params}` : ""}`);
  },

  async myReviews() {
    return apiFetch("/reviews/mine");
  },

  async createReview(data) {
    return apiFetch("/reviews", { method: "POST", body: data });
  },

  async submitDispute(data) {
    const user = await ensureCurrentUser(`dispute.html?order=${data.order_id}`);
    if (!user) return;
    await apiFetch("/disputes", {
      method: "POST",
      body: {
        order_id: Number(data.order_id),
        reason: data.reason,
        evidence: data.evidence || ""
      }
    });
  },

  async users() {
    const rows = await apiFetch("/admin/users");
    return rows.map(normalizeApiUser);
  },

  async updateUserStatus(userId, status) {
    return apiFetch(`/admin/users/${userId}/status`, {
      method: "PATCH",
      body: { status }
    });
  },

  async admins() {
    return (await db.users()).filter((user) => user.role === "admin");
  },

  async disputes() {
    const rows = await apiFetch("/admin/disputes");
    return rows.map(normalizeApiDispute);
  },

  async updateGoodsStatus(goodsId, status) {
    await apiFetch(`/goods/${goodsId}/status`, {
      method: "PATCH",
      body: { status: goodsStatusToApi[status] }
    });
  },

  async updateDispute(disputeId, status, result) {
    const admin = await ensureCurrentAdmin();
    if (!admin) return;
    await apiFetch(`/admin/disputes/${disputeId}`, {
      method: "PATCH",
      body: {
        status: disputeStatusToApi[status],
        admin_reply: result
      }
    });
  },

  async dashboardStats() {
    const stats = await apiFetch("/admin/dashboard");
    return {
      userCount: Number(stats.users?.users || 0),
      goodsCount: Number(stats.goods?.total || 0),
      activeGoodsCount: Number(stats.goods?.available || 0),
      tradingGoodsCount: Number(stats.goods?.locked || 0),
      completedOrderCount: Number(stats.orders?.completed || 0),
      disputeCount: Number(stats.disputes?.total || 0)
    };
  },

  async adminLogs() {
    return apiFetch("/admin/logs");
  }
};

const adminActionName = {
  update_goods_status: "调整商品状态",
  update_user_status: "调整用户状态",
  update_dispute: "处理交易争议"
};

const adminTargetName = {
  goods: "商品",
  users: "用户",
  disputes: "争议"
};

function humanizeAdminDetail(detail) {
  return String(detail || "")
    .replace("available", "在售")
    .replace("pending", "待审核")
    .replace("removed", "已下架")
    .replace("rejected", "审核失败")
    .replace("disabled", "禁用")
    .replace("active", "正常");
}

function updateNavUser() {
  const user = currentUser();
  const currentPage = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-user-center]").forEach((el) => {
    el.textContent = user ? `${user.nickname || user.username} · 个人中心` : "登录 / 注册";
    if (!user) el.href = `login.html?next=${encodeURIComponent(currentPage + location.search)}`;
  });
}

function renderCategories() {
  const target = document.querySelector("[data-categories]");
  if (!target) return;
  target.innerHTML = categories.map((item) => `
    <a class="category-card" href="category.html?category=${item.id}">
      <span class="category-icon" aria-hidden="true">${item.icon}</span>
      <p class="category-name">${item.name}</p>
    </a>
  `).join("");
}

function renderGoodsGrid(items) {
  const target = document.querySelector("[data-products]");
  if (!target) return;
  if (!items.length) {
    target.innerHTML = `<section class="card yellow"><h2>暂无商品</h2><p>这个频道还没有在售商品。</p></section>`;
    return;
  }
  target.innerHTML = items.map((item) => `
    <article class="card product-card">
      ${productVisual(item)}
      <h3>${escapeHtml(item.goods_name)}</h3>
      <div class="meta">
        <span class="pill">${categoryName(item.category_id)}</span>
        <span class="pill">${goodsStatus[item.status]}</span>
        <span class="pill">${escapeHtml(item.degree || "未填写")}</span>
      </div>
      <p class="product-desc">${escapeHtml(item.description || "")}</p>
      <div class="price-row">
        <p class="price">${money(item.price)}</p>
        ${item.original_price ? `<span class="original-price">${money(item.original_price)}</span>` : ""}
      </div>
      <div class="seller-credit">
        <span>卖家：${escapeHtml(item.seller_name)}</span>
        ${ratingBadge(item.seller_score, item.seller_review_count, "compact-credit")}
      </div>
      <p class="muted">浏览 ${Number(item.view_count || 0)} · ${escapeHtml(item.location || "校内面交")}</p>
      <a class="btn primary full" href="product.html?id=${item.goods_id}">查看详情</a>
    </article>
  `).join("");
}

async function initHomePage() {
  const goodsTarget = document.querySelector("[data-home-products]");
  if (goodsTarget) {
    const items = await db.goods({ sort: "time-desc" });
    goodsTarget.setAttribute("data-products", "");
    renderGoodsGrid(items.slice(0, 6));
  }
  const statsTarget = document.querySelector("[data-home-stats]");
  if (statsTarget) {
    try {
      const stats = await db.homeStats();
      statsTarget.innerHTML = `
        <div><strong>${stats.available_goods}</strong><span>件好物正在等新主人</span></div>
        <div><strong>${stats.categories}</strong><span>个校园生活分类</span></div>
        <div class="user-stat"><strong>${stats.active_users}</strong><span>位用户正在闲置铺经营</span></div>
      `;
    } catch {
      statsTarget.innerHTML = `<div><strong>连接中</strong><span>正在同步校园好物</span></div>`;
    }
  }
}

async function initCategoryPage() {
  const selected = categoryByQuery(qs("category"));
  const title = document.querySelector("[data-category-title]");
  const sort = document.querySelector("#sort");
  if (title) title.textContent = selected.name;
  const load = async () => renderGoodsGrid(await db.goods({ category_id: selected.id, sort: sort?.value }));
  sort?.addEventListener("change", load);
  await load();
}

async function initSearchPage() {
  const keyword = document.querySelector("#keyword");
  const category = document.querySelector("#category");
  const sort = document.querySelector("#sort");
  const minPrice = document.querySelector("#minPrice");
  const maxPrice = document.querySelector("#maxPrice");
  const form = document.querySelector("#searchForm");
  if (keyword && qs("q") && !keyword.value) keyword.value = qs("q");
  const load = async () => {
    const selected = category?.value ? categoryByQuery(category.value).id : "";
    renderGoodsGrid(await db.goods({
      keyword: keyword?.value || qs("q") || "",
      category_id: selected,
      sort: sort?.value,
      min_price: minPrice?.value,
      max_price: maxPrice?.value
    }));
  };
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    load();
  });
  category?.addEventListener("change", load);
  sort?.addEventListener("change", load);
  await load();
}

async function initProductPage() {
  const target = document.querySelector("[data-product-detail]");
  if (!target) return;
  const goods = await db.goodsOne(qs("id"));
  if (!goods) {
    target.innerHTML = `<section class="card red"><h1>商品不存在</h1></section>`;
    return;
  }
  const reviews = await db.reviews({ target_user_id: goods.seller_id }).catch(() => []);
  const sellerRating = ratingInfo(goods.seller_score, goods.seller_review_count);
  let favorited = false;
  if (currentUser()) {
    favorited = Boolean((await db.favoriteStatus(goods.goods_id).catch(() => ({ favorited: false }))).favorited);
  }
  target.innerHTML = `
    <section class="card yellow">
      ${productVisual(goods, "product-hero-image")}
      <h1>${escapeHtml(goods.goods_name)}</h1>
      <div class="price-row">
        <p class="price">${money(goods.price)}</p>
        ${goods.original_price ? `<span class="original-price">${money(goods.original_price)}</span>` : ""}
      </div>
      <div class="meta">
        <span class="pill">${categoryName(goods.category_id)}</span>
        <span class="pill">${goodsStatus[goods.status]}</span>
        <span class="pill">${escapeHtml(goods.degree || "未填写")}</span>
        <span class="pill">浏览 ${goods.view_count}</span>
      </div>
    </section>
    <section class="card">
      <h2>商品信息</h2>
      <p>${escapeHtml(goods.description || "暂无描述")}</p>
      <p>预计放置地点：${escapeHtml(goods.location || "待卖家确认")}</p>
      <section class="credit-panel">
        <div>
          <p class="eyebrow">交易信用</p>
          <h3>${escapeHtml(goods.seller_name)}</h3>
          <p>${sellerRating.score === null ? "该用户还没有收到交易评价" : `${sellerRating.label} · 共 ${sellerRating.count} 条评价`}</p>
        </div>
        ${ratingBadge(goods.seller_score, goods.seller_review_count)}
      </section>
      <p>联系方式：订单生成后仅向买卖双方显示</p>
      <div class="action-grid">
        <button class="btn primary" data-buy="${goods.goods_id}" ${Number(goods.status) !== 1 ? "disabled" : ""}>${Number(goods.status) === 1 ? "立即下单锁定" : goodsStatus[goods.status]}</button>
        <button class="btn secondary" data-favorite="${goods.goods_id}">${favorited ? "♥ 已收藏" : "♡ 收藏"}</button>
        <button class="btn" data-share>分享给同学</button>
      </div>
      <div class="reviews">
        <h3>最近交易评价</h3>
        ${reviews.length ? reviews.slice(0, 5).map((review) => `
          <article class="review-item">
            <strong>${"★".repeat(Number(review.rating))}${"☆".repeat(5 - Number(review.rating))}</strong>
            <span>${escapeHtml(review.reviewer_name)} · ${formatTime(review.created_at)}</span>
            <p>${escapeHtml(review.comment || "这位同学没有留下文字评价。")}</p>
          </article>
        `).join("") : "<p class=\"muted\">还没有评价，期待第一笔顺利交易。</p>"}
      </div>
    </section>
  `;
  target.querySelector("[data-buy]")?.addEventListener("click", () => db.createPaymentAndOrder(goods));
  target.querySelector("[data-favorite]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    if (!currentUser()) {
      location.href = `login.html?next=${encodeURIComponent(`product.html?id=${goods.goods_id}`)}`;
      return;
    }
    favorited = !favorited;
    try {
      await db.setFavorite(goods.goods_id, favorited);
      button.textContent = favorited ? "♥ 已收藏" : "♡ 收藏";
      showToast(favorited ? "已加入收藏" : "已取消收藏");
    } catch (error) {
      favorited = !favorited;
      showToast(error.message, "error");
    }
  });
  target.querySelector("[data-share]")?.addEventListener("click", async () => {
    const shareData = { title: goods.goods_name, text: `校园闲置铺：${goods.goods_name} ${money(goods.price)}`, url: location.href };
    if (navigator.share) {
      await navigator.share(shareData).catch(() => {});
    } else {
      await navigator.clipboard.writeText(location.href);
      showToast("商品链接已复制");
    }
  });
}

async function initPublishPage() {
  const user = await ensureCurrentUser("publish.html");
  if (!user) return;
  const form = document.querySelector("#publishForm");
  const imageFile = form?.querySelector("[name='image_file']");
  const imageValue = form?.querySelector("[name='image_url']");
  const preview = document.querySelector("[data-image-preview]");
  imageFile?.addEventListener("change", async () => {
    const file = imageFile.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("请选择图片文件", "error");
      imageFile.value = "";
      return;
    }
    try {
      const dataUrl = await resizeImage(file);
      imageValue.value = dataUrl;
      if (preview) preview.innerHTML = `<img src="${dataUrl}" alt="商品图片预览">`;
      showToast("图片已压缩并加入商品");
    } catch {
      showToast("图片处理失败，请换一张重试", "error");
    }
  });
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await db.createGoods(Object.fromEntries(new FormData(form)));
      showToast("发布成功，商品已进入待审核状态");
      location.href = "profile.html";
    } catch (error) {
      showToast(`发布失败：${error.message}`, "error");
    }
  });
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const maxWidth = 1000;
        const maxHeight = 760;
        const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function splitSellerGoods(goods, orders, userId) {
  const tradingGoodsIds = new Set(orders.filter((order) => Number(order.seller_id) === Number(userId) && [1, 2, 5].includes(Number(order.status))).map((order) => order.goods_id));
  const doneGoodsIds = new Set(orders.filter((order) => Number(order.seller_id) === Number(userId) && Number(order.status) === 4).map((order) => order.goods_id));
  return {
    pending: goods.filter((item) => Number(item.seller_id) === Number(userId) && !tradingGoodsIds.has(item.goods_id) && !doneGoodsIds.has(item.goods_id)),
    trading: orders.filter((order) => Number(order.seller_id) === Number(userId) && [1, 2, 5].includes(Number(order.status))),
    done: orders.filter((order) => Number(order.seller_id) === Number(userId) && Number(order.status) === 4)
  };
}

function splitBuyerOrders(orders, userId) {
  return {
    pending: [],
    trading: orders.filter((order) => Number(order.buyer_id) === Number(userId) && [1, 2, 5].includes(Number(order.status))),
    done: orders.filter((order) => Number(order.buyer_id) === Number(userId) && Number(order.status) === 4)
  };
}

function goodsList(items, manage = false) {
  if (!items.length) return `<p>暂无记录</p>`;
  return items.map((item) => `
    <div class="list-item">
      <div>
        <a href="product.html?id=${item.goods_id}"><strong>${escapeHtml(item.goods_name)}</strong></a>
        <span>${goodsStatus[item.status]} · ${money(item.price)}</span>
      </div>
      ${manage && ![2, 3].includes(Number(item.status)) ? `
        <div class="nav-actions">
          ${[0, 1].includes(Number(item.status)) ? `<button class="btn compact secondary" data-goods-remove="${item.goods_id}">下架</button>` : ""}
          ${[4, 5].includes(Number(item.status)) ? `<button class="btn compact good" data-goods-resubmit="${item.goods_id}">重新提交</button>` : ""}
        </div>
      ` : ""}
    </div>
  `).join("");
}

function orderList(items, viewerId, reviewedOrderIds = new Set()) {
  if (!items.length) return `<p>暂无记录</p>`;
  return items.map((order) => {
    const canSellerPlace = Number(order.seller_id) === Number(viewerId) && Number(order.status) === 1;
    const canBuyerReceive = Number(order.buyer_id) === Number(viewerId) && Number(order.status) === 2;
    return `
      <div class="status-step">
        <div>
          <strong>${escapeHtml(order.goods_name)}</strong>
          <span>${orderStatus[order.status]} · ${money(order.amount)}</span>
          <span>订单号：${escapeHtml(order.order_no)}</span>
          <span>放置地点：${escapeHtml(order.place_location || "待卖家确认")}</span>
          <span>买家联系方式：${escapeHtml(order.buyer_phone || "")} ${escapeHtml(order.buyer_wechat || "")}</span>
          <span>卖家联系方式：${escapeHtml(order.seller_phone || "")} ${escapeHtml(order.seller_wechat || "")}</span>
          <div class="nav-actions">
            <a class="btn" href="order-detail.html?id=${order.order_id}">订单详情</a>
            ${canSellerPlace ? `<button class="btn good" data-order-place="${order.order_id}">确认已放置</button>` : ""}
            ${canBuyerReceive ? `<button class="btn primary" data-order-receive="${order.order_id}">确认已取到</button>` : ""}
            ${[1, 2].includes(Number(order.status)) ? `<button class="btn secondary" data-order-cancel="${order.order_id}">取消订单</button>` : ""}
            ${[1, 2].includes(Number(order.status)) ? `<a class="btn secondary" href="dispute.html?order=${order.order_id}">提交争议</a>` : ""}
            ${Number(order.status) === 4 && !reviewedOrderIds.has(Number(order.order_id)) ? `<a class="btn good" href="rate.html?order=${order.order_id}">评价交易</a>` : ""}
            ${Number(order.status) === 4 && reviewedOrderIds.has(Number(order.order_id)) ? `<span class="pill reviewed-pill">✓ 已评价</span>` : ""}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

async function initProfilePage() {
  const user = await ensureCurrentUser("profile.html");
  if (!user) return;
  const profile = document.querySelector("[data-profile]");
  const wrap = document.querySelector("[data-profile-orders]");
  const [goods, orders, favorites, myReviews] = await Promise.all([db.myGoods(), db.orders(), db.favorites(), db.myReviews()]);
  const reviewedOrderIds = new Set(myReviews.map((review) => Number(review.order_id)));
  const userRating = ratingInfo(user.rating_score, user.rating_count);
  if (profile) {
    profile.innerHTML = `
      <div class="profile-head">
        <div>
          <p class="eyebrow">MY CAMPUS MARKET</p>
          <h1>${escapeHtml(user.nickname || user.username)}</h1>
          <p>账号：${escapeHtml(user.username)} · 手机：${escapeHtml(user.phone || "未填写")} · 微信：${escapeHtml(user.wechat || "未填写")}</p>
          <div class="profile-credit">
            <span>交易信用</span>
            ${ratingBadge(user.rating_score, user.rating_count)}
            <small>${userRating.score === null ? "完成交易并获得评价后，将在这里展示信用分。" : "评分来自你作为买家或卖家收到的全部交易评价。"}</small>
          </div>
        </div>
        <div class="nav-actions">
          <button class="btn" type="button" data-edit-profile>编辑资料</button>
          <button class="btn secondary" type="button" data-logout-user>退出登录</button>
        </div>
      </div>
      <form class="form profile-form" data-profile-form hidden>
        <label>昵称<input name="name" required value="${escapeHtml(user.nickname || "")}"></label>
        <label>手机号<input name="phone" value="${escapeHtml(user.phone || "")}"></label>
        <label>邮箱<input name="email" type="email" value="${escapeHtml(user.email || "")}"></label>
        <label>微信号<input name="wechat" value="${escapeHtml(user.wechat || "")}"></label>
        <label>新密码<input name="password" type="password" minlength="6" placeholder="不修改请留空"></label>
        <button class="btn primary" type="submit">保存资料</button>
      </form>
    `;
  }
  const seller = splitSellerGoods(goods, orders, user.user_id);
  const buyer = splitBuyerOrders(orders, user.user_id);
  if (wrap) {
    wrap.innerHTML = `
      <section class="card yellow"><h2>我发布的商品</h2>${goodsList(seller.pending, true)}</section>
      <section class="card red"><h2>我发布的 · 交易中</h2>${orderList(seller.trading, user.user_id, reviewedOrderIds)}</section>
      <section class="card violet"><h2>我发布的 · 完成交易</h2>${orderList(seller.done, user.user_id, reviewedOrderIds)}</section>
      <section class="card yellow"><h2>我的收藏</h2>${favorites.length ? favorites.map((item) => `<p><a href="product.html?id=${item.goods_id}">${escapeHtml(item.goods_name)}</a> · ${money(item.price)}</p>`).join("") : "<p>还没有收藏商品。</p>"}</section>
      <section class="card red"><h2>我买到的 · 交易中</h2>${orderList(buyer.trading, user.user_id, reviewedOrderIds)}</section>
      <section class="card violet"><h2>我买到的 · 完成交易</h2>${orderList(buyer.done, user.user_id, reviewedOrderIds)}</section>
    `;
  }
  document.querySelector("[data-logout-user]")?.addEventListener("click", logoutUser);
  document.querySelector("[data-edit-profile]")?.addEventListener("click", () => {
    const form = document.querySelector("[data-profile-form]");
    form.hidden = !form.hidden;
  });
  document.querySelector("[data-profile-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget));
      if (!data.password) delete data.password;
      await db.updateProfile(data);
      showToast("个人资料已保存");
      setTimeout(() => location.reload(), 450);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.querySelectorAll("[data-order-place]").forEach((button) => {
    button.addEventListener("click", async () => db.updateOrderStatus(await db.order(button.dataset.orderPlace), 2));
  });
  document.querySelectorAll("[data-order-receive]").forEach((button) => {
    button.addEventListener("click", async () => db.updateOrderStatus(await db.order(button.dataset.orderReceive), 4));
  });
  document.querySelectorAll("[data-order-cancel]").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = await openDialog({ title: "取消这笔订单？", message: "取消后商品会重新回到在售状态。", confirmText: "确认取消" });
      if (!confirmed) return;
      await db.updateOrderStatus(await db.order(button.dataset.orderCancel), 6);
    });
  });
  document.querySelectorAll("[data-goods-remove]").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = await openDialog({ title: "下架商品？", message: "下架后同学将无法继续购买。", confirmText: "确认下架" });
      if (!confirmed) return;
      await db.updateOwnGoodsStatus(button.dataset.goodsRemove, "removed");
      showToast("商品已下架");
      setTimeout(() => location.reload(), 450);
    });
  });
  document.querySelectorAll("[data-goods-resubmit]").forEach((button) => {
    button.addEventListener("click", async () => {
      await db.updateOwnGoodsStatus(button.dataset.goodsResubmit, "pending");
      showToast("已重新提交审核");
      setTimeout(() => location.reload(), 450);
    });
  });
}

async function initOrderDetailPage() {
  const target = document.querySelector("[data-order-detail]");
  if (!target) return;
  const user = await ensureCurrentUser(`order-detail.html?id=${qs("id")}`);
  if (!user) return;
  const order = await db.order(qs("id"));
  if (!order) {
    target.innerHTML = `<section class="card red"><h1>订单不存在</h1></section>`;
    return;
  }
  const reviewedOrderIds = new Set((await db.myReviews()).map((review) => Number(review.order_id)));
  const hasReviewed = reviewedOrderIds.has(Number(order.order_id));
  const allowed = Number(user.user_id) === Number(order.buyer_id) || Number(user.user_id) === Number(order.seller_id);
  target.innerHTML = `
    <section class="card yellow">
      <h1>订单详情</h1>
      <p>订单号：${escapeHtml(order.order_no)}</p>
      <p>商品：${escapeHtml(order.goods_name)}</p>
      <p>状态：${orderStatus[order.status]}</p>
      <p>金额：${money(order.amount)}</p>
    </section>
    <section class="card">
      <h2>交易信息</h2>
      <p>放置地点：${escapeHtml(order.place_location || "待卖家确认")}</p>
      ${allowed ? `<p>买家联系方式：${escapeHtml(order.buyer_phone || "")} ${escapeHtml(order.buyer_wechat || "")}</p><p>卖家联系方式：${escapeHtml(order.seller_phone || "")} ${escapeHtml(order.seller_wechat || "")}</p>` : `<p>联系方式仅订单买卖双方可见。</p>`}
      <div class="nav-actions">
        ${Number(user.user_id) === Number(order.seller_id) && Number(order.status) === 1 ? `<button class="btn good" data-place>确认已放置</button>` : ""}
        ${Number(user.user_id) === Number(order.buyer_id) && Number(order.status) === 2 ? `<button class="btn primary" data-receive>确认已取到</button>` : ""}
        ${[1, 2].includes(Number(order.status)) ? `<button class="btn secondary" data-cancel>取消订单</button>` : ""}
        ${[1, 2].includes(Number(order.status)) ? `<a class="btn secondary" href="dispute.html?order=${order.order_id}">提交争议</a>` : ""}
        ${Number(order.status) === 4 && !hasReviewed ? `<a class="btn good" href="rate.html?order=${order.order_id}">评价这笔交易</a>` : ""}
        ${Number(order.status) === 4 && hasReviewed ? `<span class="pill reviewed-pill">✓ 已评价</span>` : ""}
      </div>
    </section>
  `;
  target.querySelector("[data-place]")?.addEventListener("click", () => db.updateOrderStatus(order, 2));
  target.querySelector("[data-receive]")?.addEventListener("click", () => db.updateOrderStatus(order, 4));
  target.querySelector("[data-cancel]")?.addEventListener("click", async () => {
    const confirmed = await openDialog({ title: "取消这笔订单？", message: "商品将重新开放给其他同学购买。", confirmText: "确认取消" });
    if (confirmed) db.updateOrderStatus(order, 6);
  });
}

async function initLoginPage() {
  const form = document.querySelector("#loginForm");
  const accountInput = form?.querySelector("[name='email']");
  if (accountInput) {
    accountInput.type = "text";
    accountInput.placeholder = "例如：user1";
  }
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await db.login(Object.fromEntries(new FormData(form)));
      location.href = qs("next") || "index.html";
    } catch (error) {
      showToast(`登录失败：${error.message}`, "error");
    }
  });

  const registerForm = document.querySelector("#registerForm");
  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await db.register(Object.fromEntries(new FormData(registerForm)));
      showToast("注册成功，欢迎加入校园闲置铺");
      location.href = qs("next") || "index.html";
    } catch (error) {
      showToast(`注册失败：${error.message}`, "error");
    }
  });

  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-auth-tab]").forEach((item) => item.classList.toggle("active", item === button));
      const mode = button.dataset.authTab;
      if (form) form.hidden = mode !== "login";
      if (registerForm) registerForm.hidden = mode !== "register";
    });
  });
}

async function initRatePage() {
  const form = document.querySelector("#rateForm");
  if (!form) return;
  const user = await ensureCurrentUser(`rate.html?order=${qs("order")}`);
  if (!user) return;
  const orderId = Number(qs("order"));
  const order = await db.order(orderId);
  const summary = document.querySelector("[data-rate-summary]");
  if (summary) {
    summary.innerHTML = `<h1>评价交易</h1><p>${escapeHtml(order.goods_name)} · ${money(order.amount)}</p>`;
  }
  const existing = await db.myReviews();
  if (existing.some((review) => Number(review.order_id) === orderId)) {
    form.innerHTML = `<section class="card good"><h2>你已经评价过了</h2><a class="btn" href="profile.html">返回个人中心</a></section>`;
    return;
  }
  const ratingText = {
    1: "1 星 · 体验不佳",
    2: "2 星 · 有待改进",
    3: "3 星 · 符合预期",
    4: "4 星 · 比较满意",
    5: "5 星 · 非常满意"
  };
  form.querySelectorAll("[name='rating']").forEach((input) => {
    input.addEventListener("change", () => {
      const hint = form.querySelector("[data-rating-hint]");
      if (hint) hint.textContent = ratingText[input.value];
    });
  });
  form.querySelector("[name='order_id']").value = orderId;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await db.createReview(Object.fromEntries(new FormData(form)));
      await ensureCurrentUser("profile.html");
      showToast("评价成功，感谢你的认真反馈");
      setTimeout(() => location.href = "profile.html", 500);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

async function initAdminLoginPage() {
  const form = document.querySelector("#adminLoginForm");
  const accountInput = form?.querySelector("[name='username']");
  if (accountInput) {
    accountInput.type = "text";
    accountInput.placeholder = "admin";
  }
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await db.adminLogin(Object.fromEntries(new FormData(form)));
      location.href = qs("next") || "admin-dashboard.html";
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function adminShellLogout() {
  document.querySelectorAll("[data-admin-logout]").forEach((button) => button.addEventListener("click", logoutAdmin));
}

async function initAdminPages() {
  if (!document.body.dataset.adminPage) return;
  const admin = await ensureCurrentAdmin();
  if (!admin) return;
  adminShellLogout();
  const statsTarget = document.querySelector("[data-admin-dashboard]");
  if (statsTarget) {
    const stats = await db.dashboardStats();
    statsTarget.innerHTML = `
      <section class="card yellow"><h2>${stats.userCount}</h2><p>用户数量</p></section>
      <section class="card red"><h2>${stats.goodsCount}</h2><p>商品总数</p></section>
      <section class="card violet"><h2>${stats.activeGoodsCount}</h2><p>在售商品</p></section>
      <section class="card yellow"><h2>${stats.tradingGoodsCount}</h2><p>交易中商品</p></section>
      <section class="card red"><h2>${stats.completedOrderCount}</h2><p>完成订单</p></section>
      <section class="card violet"><h2>${stats.disputeCount}</h2><p>争议数量</p></section>
    `;
  }
  const usersTarget = document.querySelector("[data-admin-users]");
  if (usersTarget) {
    const users = await db.users();
    usersTarget.innerHTML = users.map((user) => `
      <tr>
        <td>${user.user_id}</td>
        <td>${escapeHtml(user.nickname || user.username)}</td>
        <td>${escapeHtml(user.phone || "")}</td>
        <td>${Number(user.status) === 1 ? "正常" : "禁用"}</td>
        <td>${formatTime(user.created_at || user.create_time)}</td>
        <td>${user.role !== "admin" ? `<button class="btn compact ${Number(user.status) === 1 ? "secondary" : "good"}" data-user-status="${user.user_id}" data-next-status="${Number(user.status) === 1 ? "disabled" : "active"}">${Number(user.status) === 1 ? "禁用" : "启用"}</button>` : "管理员"}</td>
      </tr>
    `).join("");
    usersTarget.querySelectorAll("[data-user-status]").forEach((button) => {
      button.addEventListener("click", async () => {
        await db.updateUserStatus(button.dataset.userStatus, button.dataset.nextStatus);
        showToast("用户状态已更新");
        setTimeout(() => location.reload(), 400);
      });
    });
  }
  const goodsTarget = document.querySelector("[data-admin-products]");
  if (goodsTarget) {
    const goods = await db.goods({ includeAll: true });
    goodsTarget.innerHTML = goods.map((item) => `
      <tr>
        <td>${item.goods_id}</td><td>${escapeHtml(item.goods_name)}</td><td>${categoryName(item.category_id)}</td><td>${goodsStatus[item.status]}</td><td>${escapeHtml(item.seller_name)}</td>
        <td class="nav-actions">
          ${Number(item.status) === 0 ? `<button class="btn good" data-approve="${item.goods_id}">通过</button><button class="btn secondary" data-reject="${item.goods_id}">拒绝</button>` : ""}
          ${Number(item.status) === 1 ? `<button class="btn secondary" data-down="${item.goods_id}">下架</button>` : ""}
        </td>
      </tr>
    `).join("");
    goodsTarget.querySelectorAll("[data-approve]").forEach((button) => button.addEventListener("click", async () => { await db.updateGoodsStatus(button.dataset.approve, 1); location.reload(); }));
    goodsTarget.querySelectorAll("[data-reject]").forEach((button) => button.addEventListener("click", async () => { await db.updateGoodsStatus(button.dataset.reject, 5); location.reload(); }));
    goodsTarget.querySelectorAll("[data-down]").forEach((button) => button.addEventListener("click", async () => { await db.updateGoodsStatus(button.dataset.down, 4); location.reload(); }));
  }
  const ordersTarget = document.querySelector("[data-admin-orders]");
  if (ordersTarget) {
    const orders = await db.orders();
    ordersTarget.innerHTML = orders.map((order) => `<tr><td>${order.order_no}</td><td>${escapeHtml(order.goods_name)}</td><td>${escapeHtml(order.buyer_name)}</td><td>${escapeHtml(order.seller_name)}</td><td>${money(order.amount)}</td><td>${orderStatus[order.status]}</td><td>${escapeHtml(order.place_location || "")}</td></tr>`).join("");
  }
  const disputesTarget = document.querySelector("[data-admin-disputes]");
  if (disputesTarget) {
    const disputes = await db.disputes();
    disputesTarget.innerHTML = disputes.map((item) => `
      <tr>
        <td>${item.dispute_id}</td><td>${item.order_id}</td><td>${escapeHtml(item.reason)}</td><td>${disputeStatus[item.status]}</td>
        <td>${Number(item.status) !== 2 ? `<button class="btn good" data-dispute="${item.dispute_id}">标记已处理</button>` : escapeHtml(item.result || "")}</td>
      </tr>
    `).join("");
    disputesTarget.querySelectorAll("[data-dispute]").forEach((button) => button.addEventListener("click", async () => {
      const result = await openDialog({
        title: "填写争议处理结果",
        value: "管理员已处理该争议。",
        confirmText: "完成处理",
        input: true
      });
      if (!result) return;
      await db.updateDispute(button.dataset.dispute, 2, result);
      showToast("争议已处理");
      setTimeout(() => location.reload(), 400);
    }));
  }
  const logsTarget = document.querySelector("[data-admin-logs]");
  if (logsTarget) {
    const logs = await db.adminLogs();
    logsTarget.innerHTML = logs.length
      ? logs.map((item) => `<tr><td>${escapeHtml(item.admin_name)}</td><td>${escapeHtml(adminActionName[item.action] || item.action)}</td><td>${escapeHtml(adminTargetName[item.target_type] || item.target_type)} #${item.target_id || "-"}</td><td>${escapeHtml(humanizeAdminDetail(item.detail))}</td><td>${formatTime(item.created_at)}</td></tr>`).join("")
      : `<tr><td colspan="5">暂无管理日志</td></tr>`;
  }
}

async function initDisputePage() {
  const form = document.querySelector("#disputeForm");
  const orderInput = form?.querySelector("[name='order_id']");
  if (orderInput && qs("order")) orderInput.value = qs("order");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await db.submitDispute(Object.fromEntries(new FormData(form)));
      showToast("争议已提交，管理员会在后台处理");
      location.href = "profile.html";
    } catch (error) {
      showToast(`提交失败：${error.message}`, "error");
    }
  });
}

function initCategoryTrack() {
  document.querySelectorAll(".categories-track").forEach((track) => {
    track.addEventListener("wheel", (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      track.scrollBy({ left: event.deltaY, behavior: "smooth" });
    }, { passive: false });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  updateNavUser();
  renderCategories();
  initCategoryTrack();
  try {
    await initLoginPage();
    await initAdminLoginPage();
    await initAdminPages();
    if (document.body.dataset.page === "home") await initHomePage();
    if (document.body.dataset.page === "category") await initCategoryPage();
    if (document.body.dataset.page === "search") await initSearchPage();
    if (document.body.dataset.page === "product") await initProductPage();
    if (document.body.dataset.page === "publish") await initPublishPage();
    if (document.body.dataset.page === "profile") await initProfilePage();
    if (document.body.dataset.page === "order-detail") await initOrderDetailPage();
    if (document.body.dataset.page === "dispute") await initDisputePage();
    if (document.body.dataset.page === "rate") await initRatePage();
  } catch (error) {
    console.error(error);
    showToast(error.message || "页面加载失败，请稍后重试", "error");
    document.querySelectorAll("[data-products], [data-home-products]").forEach((target) => {
      if (!target.children.length) {
        target.innerHTML = `<section class="card red"><h2>暂时无法读取数据</h2><p>${escapeHtml(error.message || "请检查服务是否启动")}</p></section>`;
      }
    });
  }
});
