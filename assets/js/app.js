const categories = [
  { id: 1, slug: "textbooks", name: "教材资料", icon: "书" },
  { id: 2, slug: "digital", name: "数码电子", icon: "机" },
  { id: 3, slug: "living", name: "生活用品", icon: "用" },
  { id: 4, slug: "clothing", name: "服饰鞋包", icon: "包" },
  { id: 5, slug: "sports", name: "运动户外", icon: "动" },
  { id: 6, slug: "furniture", name: "宿舍家具", icon: "宿" },
  { id: 7, slug: "tools", name: "文具工具", icon: "笔" },
  { id: 8, slug: "other", name: "其他闲置", icon: "它" }
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

const mockUsers = [
  { user_id: 1, username: "lin@example.com", nickname: "林同学", real_name: "林同学", phone: "13600005531", wechat: "lin-campus", email: "lin@example.com", status: 1 },
  { user_id: 2, username: "zhou@example.com", nickname: "周同学", real_name: "周同学", phone: "13900006642", wechat: "zhou-campus", email: "zhou@example.com", status: 1 }
];

const mockAdmin = { admin_id: 1, username: "admin@example.com", name: "管理员", phone: "13800000000", role: "super" };

const mockGoods = [
  { goods_id: 1, seller_id: 1, category_id: 1, goods_name: "高等数学教材", description: "公共课教材，适合期末复习。", price: 28, original_price: 45, degree: "八成新", location: "东校区图书馆自取柜 A-12", status: 1, view_count: 0, publish_time: "2026-06-01T08:00:00Z" },
  { goods_id: 2, seller_id: 1, category_id: 2, goods_name: "机械键盘", description: "按键正常，适合宿舍学习。", price: 99, original_price: 199, degree: "九成新", location: "北校区二号宿舍大厅", status: 1, view_count: 0, publish_time: "2026-06-02T08:00:00Z" }
];

function cfg() {
  return window.CAMPUS_SUPABASE || {};
}

function hasSupabaseConfig() {
  return Boolean(cfg().url && cfg().anonKey);
}

async function supabaseFetch(path, options = {}) {
  const response = await fetch(`${cfg().url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: cfg().anonKey,
      Authorization: `Bearer ${cfg().anonKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(await response.text());
  if (response.status === 204) return null;
  return response.json();
}

async function supabaseFetchOr(path, fallback) {
  try {
    return await supabaseFetch(path);
  } catch (error) {
    console.warn("Supabase request failed:", path, error);
    return fallback;
  }
}

const API_BASE_URL = "http://localhost:3000/api";

function currentToken() {
  return localStorage.getItem("campus_token") || "";
}

async function apiFetch(path, options = {}) {
  const token = currentToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  const body = options.body && typeof options.body !== "string"
    ? JSON.stringify(options.body)
    : options.body;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || "接口请求失败");
  }
  return result?.data;
}

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

function formatTime(value) {
  return value ? new Date(value).toLocaleString("zh-CN") : "";
}

function money(value) {
  return `￥${Number(value || 0).toFixed(2)}`;
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
    alert("当前登录用户已不存在或被禁用，请重新登录。");
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
    alert("管理员登录状态已失效，请重新登录。");
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

async function loadUsersMap() {
  if (!hasSupabaseConfig()) return new Map(mockUsers.map((item) => [item.user_id, item]));
  const users = await supabaseFetchOr("user?select=*", []);
  return new Map(users.map((item) => [item.user_id, item]));
}

async function loadGoodsMap() {
  const goods = await db.goods({ includeAll: true });
  return new Map(goods.map((item) => [item.goods_id, item]));
}

function normalizeGoods(row, users = new Map()) {
  const seller = users.get(row.seller_id);
  return {
    ...row,
    price: Number(row.price || 0),
    original_price: row.original_price == null ? null : Number(row.original_price),
    seller_name: seller?.nickname || seller?.username || "校园用户",
    seller_phone: seller?.phone || "",
    seller_wechat: seller?.wechat || "",
    seller_score: 5
  };
}

function normalizeOrder(row, goodsMap = new Map(), users = new Map()) {
  const goods = goodsMap.get(row.goods_id);
  const buyer = users.get(row.buyer_id);
  const seller = users.get(row.seller_id);
  return {
    ...row,
    amount: Number(row.amount || 0),
    goods_name: goods?.goods_name || row.goods_name || "订单商品",
    buyer_name: buyer?.nickname || buyer?.username || "买家",
    seller_name: seller?.nickname || seller?.username || "卖家"
  };
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
  return {
    ...row,
    user_id: row.id,
    admin_id: row.id,
    nickname: row.name || row.username,
    real_name: row.name || row.username,
    wechat: row.wechat || "",
    status
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
    seller_score: 5
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

function makeNo() {
  return `${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`;
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
    const rows = await apiFetch(`/goods${params.toString() ? `?${params}` : ""}`);
    return applyGoodsSort(rows.map(normalizeApiGoods), filters.sort);
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
      image_url: "",
      pickup_location: data.location,
      contact: [user.phone, user.wechat].filter(Boolean).join(" / ")
    };
    const created = await apiFetch("/goods", {
      method: "POST",
      body: row
    });
    return normalizeApiGoods(created);
  },

  async createPaymentAndOrder(goods) {
    const buyer = await ensureCurrentUser(`product.html?id=${goods.goods_id}`);
    if (!buyer) return;
    if (Number(goods.seller_id) === Number(buyer.user_id)) {
      alert("不能购买自己发布的商品。");
      return;
    }
    if (Number(goods.status) !== 1) {
      alert("该商品当前不可购买。");
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
      alert("只有卖家可以确认已放置。");
      return;
    }
    if (nextStatus === 4 && Number(user.user_id) !== Number(order.buyer_id)) {
      alert("只有买家可以确认已取到。");
      return;
    }
    if (nextStatus === 2 && Number(order.status) !== 1) return;
    if (nextStatus === 4 && Number(order.status) !== 2) return;
    const patch = { status: orderStatusToApi[nextStatus] };
    if (nextStatus === 2) {
      const place = prompt("请填写商品实际放置地点", order.place_location || "");
      if (!place) return;
      patch.place_location = place;
    }
    await apiFetch(`/orders/${order.order_id}/status`, {
      method: "PATCH",
      body: patch
    });
    location.reload();
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
  }
};

function updateNavUser() {
  const user = currentUser();
  document.querySelectorAll("[data-user-center]").forEach((el) => {
    el.textContent = user ? `${user.nickname || user.username}的用户个人中心` : "用户个人中心";
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
    <article class="card">
      <div class="product-img">${categoryById(item.category_id).icon}</div>
      <h3>${escapeHtml(item.goods_name)}</h3>
      <div class="meta">
        <span class="pill">${categoryName(item.category_id)}</span>
        <span class="pill">${goodsStatus[item.status]}</span>
        <span class="pill">${escapeHtml(item.degree || "未填写")}</span>
      </div>
      <p>${escapeHtml(item.description || "")}</p>
      <p class="price">${money(item.price)}</p>
      <a class="btn primary full" href="product.html?id=${item.goods_id}">查看详情</a>
    </article>
  `).join("");
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
  const form = document.querySelector("#searchForm");
  const load = async () => {
    const selected = category?.value ? categoryByQuery(category.value).id : "";
    renderGoodsGrid(await db.goods({ keyword: keyword?.value || qs("q") || "", category_id: selected, sort: sort?.value }));
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
  target.innerHTML = `
    <section class="card yellow">
      <div class="product-img">${categoryById(goods.category_id).icon}</div>
      <h1>${escapeHtml(goods.goods_name)}</h1>
      <p class="price">${money(goods.price)}</p>
      <div class="meta">
        <span class="pill">${categoryName(goods.category_id)}</span>
        <span class="pill">${goodsStatus[goods.status]}</span>
        <span class="pill">${escapeHtml(goods.degree || "未填写")}</span>
      </div>
    </section>
    <section class="card">
      <h2>商品信息</h2>
      <p>${escapeHtml(goods.description || "暂无描述")}</p>
      <p>预计放置地点：${escapeHtml(goods.location || "待卖家确认")}</p>
      <p>卖家：${escapeHtml(goods.seller_name)}</p>
      <p>联系方式：订单生成后仅向买卖双方显示</p>
      <button class="btn primary full" data-buy="${goods.goods_id}" ${Number(goods.status) !== 1 ? "disabled" : ""}>模拟线上支付并购买</button>
    </section>
  `;
  target.querySelector("[data-buy]")?.addEventListener("click", () => db.createPaymentAndOrder(goods));
}

async function initPublishPage() {
  const user = await ensureCurrentUser("publish.html");
  if (!user) return;
  const form = document.querySelector("#publishForm");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await db.createGoods(Object.fromEntries(new FormData(form)));
      alert("发布成功，商品已进入待审核状态。");
      location.href = "profile.html";
    } catch (error) {
      alert(`发布失败：${error.message}`);
    }
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

function goodsList(items) {
  if (!items.length) return `<p>暂无记录</p>`;
  return items.map((item) => `<p><a href="product.html?id=${item.goods_id}">${escapeHtml(item.goods_name)}</a> · ${goodsStatus[item.status]} · ${money(item.price)}</p>`).join("");
}

function orderList(items, viewerId) {
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
            ${[1, 2].includes(Number(order.status)) ? `<a class="btn secondary" href="dispute.html?order=${order.order_id}">提交争议</a>` : ""}
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
  const [goods, orders] = await Promise.all([db.goods({ includeAll: true }), db.orders()]);
  if (profile) {
    profile.innerHTML = `
      <h1>${escapeHtml(user.nickname || user.username)}的用户个人中心</h1>
      <p>账号：${escapeHtml(user.username)}</p>
      <p>手机：${escapeHtml(user.phone || "未填写")}</p>
      <p>微信：${escapeHtml(user.wechat || "未填写")}</p>
      <button class="btn secondary" type="button" data-logout-user>退出登录</button>
    `;
  }
  const seller = splitSellerGoods(goods, orders, user.user_id);
  const buyer = splitBuyerOrders(orders, user.user_id);
  if (wrap) {
    wrap.innerHTML = `
      <section class="card yellow"><h2>我发布的 · 未形成交易</h2>${goodsList(seller.pending)}</section>
      <section class="card red"><h2>我发布的 · 交易中</h2>${orderList(seller.trading, user.user_id)}</section>
      <section class="card violet"><h2>我发布的 · 完成交易</h2>${orderList(seller.done, user.user_id)}</section>
      <section class="card yellow"><h2>我买到的 · 未形成交易</h2><p>未支付成功不会生成订单。</p></section>
      <section class="card red"><h2>我买到的 · 交易中</h2>${orderList(buyer.trading, user.user_id)}</section>
      <section class="card violet"><h2>我买到的 · 完成交易</h2>${orderList(buyer.done, user.user_id)}</section>
    `;
  }
  document.querySelector("[data-logout-user]")?.addEventListener("click", logoutUser);
  document.querySelectorAll("[data-order-place]").forEach((button) => {
    button.addEventListener("click", async () => db.updateOrderStatus(await db.order(button.dataset.orderPlace), 2));
  });
  document.querySelectorAll("[data-order-receive]").forEach((button) => {
    button.addEventListener("click", async () => db.updateOrderStatus(await db.order(button.dataset.orderReceive), 4));
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
        ${[1, 2].includes(Number(order.status)) ? `<a class="btn secondary" href="dispute.html?order=${order.order_id}">提交争议</a>` : ""}
      </div>
    </section>
  `;
  target.querySelector("[data-place]")?.addEventListener("click", () => db.updateOrderStatus(order, 2));
  target.querySelector("[data-receive]")?.addEventListener("click", () => db.updateOrderStatus(order, 4));
}

async function initLoginPage() {
  const form = document.querySelector("#loginForm");
  const accountInput = form?.querySelector("[name='email']");
  if (accountInput) {
    accountInput.type = "text";
    accountInput.placeholder = "例如：user1";
  }
  form?.querySelectorAll("[name='nickname'], [name='phone'], [name='wechat']").forEach((input) => {
    input.required = false;
  });
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await db.login(Object.fromEntries(new FormData(form)));
      location.href = qs("next") || "index.html";
    } catch (error) {
      alert(`登录失败：${error.message}`);
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
      alert(error.message);
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
    usersTarget.innerHTML = users.map((user) => `<tr><td>${user.user_id}</td><td>${escapeHtml(user.nickname || user.username)}</td><td>${escapeHtml(user.phone || "")}</td><td>${Number(user.status) === 1 ? "正常" : "禁用"}</td><td>${formatTime(user.create_time)}</td></tr>`).join("");
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
      const result = prompt("请输入处理结果", "管理员已处理该争议。") || "管理员已处理该争议。";
      await db.updateDispute(button.dataset.dispute, 2, result);
      location.reload();
    }));
  }
  const logsTarget = document.querySelector("[data-admin-logs]");
  if (logsTarget) {
    const [goods, orders, disputes] = await Promise.all([db.goods({ includeAll: true }), db.orders(), db.disputes()]);
    logsTarget.innerHTML = [
      ["商品待审核", goods.filter((item) => Number(item.status) === 0).length],
      ["商品在售", goods.filter((item) => Number(item.status) === 1).length],
      ["订单交易中", orders.filter((item) => [1, 2, 5].includes(Number(item.status))).length],
      ["订单完成", orders.filter((item) => Number(item.status) === 4).length],
      ["争议待处理", disputes.filter((item) => Number(item.status) !== 2).length]
    ].map(([name, count]) => `<tr><td>${name}</td><td>${count}</td><td>${formatTime(new Date())}</td></tr>`).join("");
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
      alert("争议已提交，管理员会在后台处理。");
      location.href = "profile.html";
    } catch (error) {
      alert(`提交失败：${error.message}`);
    }
  });
}

function initScrollButtons() {
  document.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      const scroller = document.querySelector(".category-scroll");
      if (!scroller) return;
      scroller.scrollBy({ left: button.dataset.scroll === "right" ? 320 : -320, behavior: "smooth" });
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  updateNavUser();
  renderCategories();
  initScrollButtons();
  await initLoginPage();
  await initAdminLoginPage();
  await initAdminPages();
  if (document.body.dataset.page === "category") await initCategoryPage();
  if (document.body.dataset.page === "search") await initSearchPage();
  if (document.body.dataset.page === "product") await initProductPage();
  if (document.body.dataset.page === "publish") await initPublishPage();
  if (document.body.dataset.page === "profile") await initProfilePage();
  if (document.body.dataset.page === "order-detail") await initOrderDetailPage();
  if (document.body.dataset.page === "dispute") await initDisputePage();
});
