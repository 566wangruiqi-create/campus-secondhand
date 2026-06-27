(function () {
  const DEMO_HOST_SUFFIXES = [
    "netlify.app",
    "vercel.app",
    "github.io",
    "pages.dev",
    "web.app",
    "firebaseapp.com"
  ];

  const CATEGORY_NAMES = {
    1: "教材资料",
    2: "数码电子",
    3: "生活用品",
    4: "服饰鞋包",
    5: "运动户外",
    6: "宿舍家具",
    7: "文具工具",
    8: "其他闲置"
  };

  const GOODS_STATUSES = new Set(["pending", "available", "locked", "sold", "removed", "rejected"]);
  const ORDER_STATUSES = new Set([
    "waiting_seller_place",
    "seller_placed",
    "buyer_received",
    "completed",
    "disputed",
    "cancelled"
  ]);
  const DISPUTE_STATUSES = new Set(["pending", "processing", "resolved", "rejected"]);

  let runtimeDemoActive = false;
  let memoryDemoState = null;

  function apiConfig() {
    return window.CAMPUS_API || {};
  }

  function apiBaseUrl() {
    return apiConfig().baseUrl || `${location.origin}/api`;
  }

  function currentToken() {
    return localStorage.getItem("campus_token") || "";
  }

  function clean(value) {
    return String(value ?? "").trim();
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function daysAgo(days) {
    return new Date(Date.now() - days * 86400000).toISOString();
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function demoStorageKey() {
    return apiConfig().demoStorageKey || "campus_secondhand_demo_v1";
  }

  function demoPreference() {
    const params = new URLSearchParams(location.search);
    if (params.has("live") || params.get("demo") === "0") return false;
    if (params.has("demo")) return true;
    const mode = apiConfig().demoMode;
    return mode === undefined ? "auto" : mode;
  }

  function isKnownStaticHost() {
    if (location.protocol === "file:") return true;
    return DEMO_HOST_SUFFIXES.some((suffix) => location.hostname.endsWith(suffix));
  }

  function shouldUseDemoDirectly() {
    const preference = demoPreference();
    if (runtimeDemoActive) return true;
    if (preference === true) return true;
    if (preference === false) return false;
    return isKnownStaticHost();
  }

  function canAutoFallback(error) {
    const preference = demoPreference();
    if (preference === false || apiConfig().demoFallback === false) return false;
    if (preference === true) return true;
    return Boolean(error.networkError || error.invalidApiPayload || ([404, 405].includes(error.status) && !error.hasApiPayload));
  }

  function activateDemoMode() {
    runtimeDemoActive = true;
    window.CAMPUS_DEMO_ACTIVE = true;
    document.documentElement.dataset.demoApi = "true";
  }

  function readBody(options = {}) {
    if (!options.body) return {};
    if (typeof options.body === "string") {
      try {
        return JSON.parse(options.body);
      } catch {
        return {};
      }
    }
    return options.body;
  }

  function mockError(status, message) {
    const error = new Error(message);
    error.status = status;
    throw error;
  }

  function defaultDemoState() {
    const users = [
      {
        id: 1,
        username: "admin",
        password: "123456",
        name: "平台管理员",
        phone: "",
        email: "admin@campus.local",
        wechat: "",
        role: "admin",
        status: "active",
        created_at: daysAgo(80),
        updated_at: daysAgo(8)
      },
      {
        id: 2,
        username: "user1",
        password: "123456",
        name: "李同学",
        phone: "13800010001",
        email: "user1@school.edu",
        wechat: "campus_user1",
        role: "user",
        status: "active",
        created_at: daysAgo(45),
        updated_at: daysAgo(2)
      },
      {
        id: 3,
        username: "user2",
        password: "123456",
        name: "王同学",
        phone: "13800010002",
        email: "user2@school.edu",
        wechat: "campus_user2",
        role: "user",
        status: "active",
        created_at: daysAgo(38),
        updated_at: daysAgo(3)
      },
      {
        id: 4,
        username: "user3",
        password: "123456",
        name: "陈同学",
        phone: "13800010003",
        email: "user3@school.edu",
        wechat: "campus_user3",
        role: "user",
        status: "active",
        created_at: daysAgo(30),
        updated_at: daysAgo(1)
      },
      {
        id: 5,
        username: "user4",
        password: "123456",
        name: "赵同学",
        phone: "13800010004",
        email: "user4@school.edu",
        wechat: "campus_user4",
        role: "user",
        status: "disabled",
        created_at: daysAgo(16),
        updated_at: daysAgo(1)
      }
    ];

    const goods = [
      {
        id: 1,
        seller_id: 3,
        category_id: 1,
        title: "高等数学同济七版上册",
        description: "课程刚用完，重点页有少量铅笔标注，配套习题答案也一起给。",
        price: 18,
        original_price: 52,
        degree: "八成新",
        image_url: "",
        pickup_location: "图书馆南门自取柜",
        contact: "13800010002 / campus_user2",
        status: "available",
        view_count: 126,
        created_at: daysAgo(1.2),
        updated_at: daysAgo(1.2)
      },
      {
        id: 2,
        seller_id: 4,
        category_id: 2,
        title: "罗技 K380 蓝牙键盘",
        description: "按键手感正常，适合平板记笔记，带一节新电池。",
        price: 82,
        original_price: 169,
        degree: "九成新",
        image_url: "",
        pickup_location: "西区宿舍 6 号楼楼下",
        contact: "13800010003 / campus_user3",
        status: "available",
        view_count: 88,
        created_at: daysAgo(2),
        updated_at: daysAgo(2)
      },
      {
        id: 3,
        seller_id: 2,
        category_id: 3,
        title: "宿舍三层收纳推车",
        description: "白色小推车，轮子顺滑，书桌旁边放零食和洗护很方便。",
        price: 35,
        original_price: 79,
        degree: "八成新",
        image_url: "",
        pickup_location: "东区 3 号宿舍楼门口",
        contact: "13800010001 / campus_user1",
        status: "available",
        view_count: 57,
        created_at: daysAgo(2.8),
        updated_at: daysAgo(2.8)
      },
      {
        id: 4,
        seller_id: 3,
        category_id: 5,
        title: "羽毛球拍一对",
        description: "适合新手练习，另送半筒球，晚上操场约球也够用。",
        price: 48,
        original_price: 118,
        degree: "七成新",
        image_url: "",
        pickup_location: "体育馆入口",
        contact: "13800010002 / campus_user2",
        status: "available",
        view_count: 73,
        created_at: daysAgo(3.4),
        updated_at: daysAgo(3.4)
      },
      {
        id: 5,
        seller_id: 4,
        category_id: 6,
        title: "宿舍折叠小桌",
        description: "桌面有一点使用痕迹，不影响展开和承重，适合床上学习。",
        price: 28,
        original_price: 65,
        degree: "七成新",
        image_url: "",
        pickup_location: "北门快递站旁",
        contact: "13800010003 / campus_user3",
        status: "available",
        view_count: 65,
        created_at: daysAgo(4),
        updated_at: daysAgo(4)
      },
      {
        id: 6,
        seller_id: 2,
        category_id: 7,
        title: "马克笔 48 色套装",
        description: "只用了几支，适合做手账、海报和课程展示板。",
        price: 26,
        original_price: 59,
        degree: "九成新",
        image_url: "",
        pickup_location: "教学楼 A 座大厅",
        contact: "13800010001 / campus_user1",
        status: "pending",
        view_count: 12,
        created_at: daysAgo(0.5),
        updated_at: daysAgo(0.5)
      },
      {
        id: 7,
        seller_id: 3,
        category_id: 1,
        title: "考研英语词汇书",
        description: "已被同学下单锁定，等待卖家放置和买家取货。",
        price: 20,
        original_price: 49,
        degree: "八成新",
        image_url: "",
        pickup_location: "二食堂自取柜 B-03",
        contact: "13800010002 / campus_user2",
        status: "locked",
        view_count: 44,
        created_at: daysAgo(7),
        updated_at: daysAgo(0.7)
      },
      {
        id: 8,
        seller_id: 4,
        category_id: 3,
        title: "护眼台灯",
        description: "已完成交易，可在个人中心里体验评价流程。",
        price: 32,
        original_price: 89,
        degree: "八成新",
        image_url: "",
        pickup_location: "图书馆一楼服务台",
        contact: "13800010003 / campus_user3",
        status: "sold",
        view_count: 91,
        created_at: daysAgo(16),
        updated_at: daysAgo(5)
      },
      {
        id: 9,
        seller_id: 2,
        category_id: 4,
        title: "帆布托特包",
        description: "卖家已下架的商品，可以在个人中心重新提交审核。",
        price: 15,
        original_price: 39,
        degree: "七成新",
        image_url: "",
        pickup_location: "东区操场看台",
        contact: "13800010001 / campus_user1",
        status: "removed",
        view_count: 23,
        created_at: daysAgo(20),
        updated_at: daysAgo(2)
      },
      {
        id: 10,
        seller_id: 3,
        category_id: 8,
        title: "无描述耳机线",
        description: "审核未通过示例：描述过少，需补充型号和成色。",
        price: 9,
        original_price: 29,
        degree: "未知",
        image_url: "",
        pickup_location: "待补充",
        contact: "13800010002 / campus_user2",
        status: "rejected",
        view_count: 8,
        created_at: daysAgo(6),
        updated_at: daysAgo(1)
      },
      {
        id: 11,
        seller_id: 2,
        category_id: 2,
        title: "Type-C 拓展坞",
        description: "买家已下单，等待卖家确认放置地点。",
        price: 45,
        original_price: 129,
        degree: "八成新",
        image_url: "",
        pickup_location: "",
        contact: "13800010001 / campus_user1",
        status: "locked",
        view_count: 36,
        created_at: daysAgo(8),
        updated_at: daysAgo(0.8)
      },
      {
        id: 12,
        seller_id: 2,
        category_id: 1,
        title: "概率论复习资料",
        description: "完成交易示例，双方已评价。",
        price: 12,
        original_price: 35,
        degree: "九成新",
        image_url: "",
        pickup_location: "教学楼 C 座 101",
        contact: "13800010001 / campus_user1",
        status: "sold",
        view_count: 101,
        created_at: daysAgo(24),
        updated_at: daysAgo(11)
      },
      {
        id: 13,
        seller_id: 4,
        category_id: 8,
        title: "校园活动展板架",
        description: "争议订单示例，管理员可在后台处理。",
        price: 55,
        original_price: 120,
        degree: "七成新",
        image_url: "",
        pickup_location: "大学生活动中心门口",
        contact: "13800010003 / campus_user3",
        status: "locked",
        view_count: 19,
        created_at: daysAgo(12),
        updated_at: daysAgo(0.4)
      }
    ];

    return {
      version: 1,
      counters: {
        users: 6,
        goods: 14,
        orders: 6,
        reviews: 4,
        disputes: 2,
        logs: 2
      },
      users,
      goods,
      orders: [
        {
          id: 1,
          goods_id: 7,
          buyer_id: 2,
          seller_id: 3,
          price: 20,
          buyer_contact: "李同学 / 13800010001 / user1@school.edu",
          seller_contact: "13800010002 / campus_user2",
          place_location: "二食堂自取柜 B-03",
          status: "seller_placed",
          created_at: daysAgo(1),
          updated_at: daysAgo(0.7)
        },
        {
          id: 2,
          goods_id: 8,
          buyer_id: 2,
          seller_id: 4,
          price: 32,
          buyer_contact: "李同学 / 13800010001 / user1@school.edu",
          seller_contact: "13800010003 / campus_user3",
          place_location: "图书馆一楼服务台",
          status: "completed",
          created_at: daysAgo(10),
          updated_at: daysAgo(5)
        },
        {
          id: 3,
          goods_id: 11,
          buyer_id: 3,
          seller_id: 2,
          price: 45,
          buyer_contact: "王同学 / 13800010002 / user2@school.edu",
          seller_contact: "13800010001 / campus_user1",
          place_location: "",
          status: "waiting_seller_place",
          created_at: daysAgo(0.8),
          updated_at: daysAgo(0.8)
        },
        {
          id: 4,
          goods_id: 12,
          buyer_id: 3,
          seller_id: 2,
          price: 12,
          buyer_contact: "王同学 / 13800010002 / user2@school.edu",
          seller_contact: "13800010001 / campus_user1",
          place_location: "教学楼 C 座 101",
          status: "completed",
          created_at: daysAgo(18),
          updated_at: daysAgo(11)
        },
        {
          id: 5,
          goods_id: 13,
          buyer_id: 3,
          seller_id: 4,
          price: 55,
          buyer_contact: "王同学 / 13800010002 / user2@school.edu",
          seller_contact: "13800010003 / campus_user3",
          place_location: "大学生活动中心门口",
          status: "disputed",
          created_at: daysAgo(4),
          updated_at: daysAgo(0.4)
        }
      ],
      favorites: [
        { user_id: 2, goods_id: 1, created_at: daysAgo(1.1) },
        { user_id: 2, goods_id: 2, created_at: daysAgo(1.4) },
        { user_id: 3, goods_id: 5, created_at: daysAgo(2.2) }
      ],
      reviews: [
        {
          id: 1,
          order_id: 2,
          reviewer_id: 4,
          target_user_id: 2,
          rating: 5,
          comment: "沟通很及时，取货也很准时。",
          created_at: daysAgo(4.6)
        },
        {
          id: 2,
          order_id: 4,
          reviewer_id: 3,
          target_user_id: 2,
          rating: 4,
          comment: "资料整理得挺清楚，价格也合适。",
          created_at: daysAgo(10.6)
        },
        {
          id: 3,
          order_id: 4,
          reviewer_id: 2,
          target_user_id: 3,
          rating: 5,
          comment: "买家很准时，交易顺利。",
          created_at: daysAgo(10.4)
        }
      ],
      disputes: [
        {
          id: 1,
          order_id: 5,
          complainant_id: 3,
          reason: "取货时发现展板架少了一个固定螺丝，希望平台协助确认。",
          evidence: "现场照片已通过聊天发送给卖家。",
          status: "pending",
          admin_reply: "",
          created_at: daysAgo(0.4),
          updated_at: daysAgo(0.4)
        }
      ],
      admin_logs: [
        {
          id: 1,
          admin_id: 1,
          action: "update_goods_status",
          target_type: "goods",
          target_id: 6,
          detail: "商品状态更新为 pending",
          created_at: daysAgo(0.5)
        }
      ]
    };
  }

  function loadDemoState() {
    if (new URLSearchParams(location.search).has("resetDemo")) {
      localStorage.removeItem(demoStorageKey());
      localStorage.removeItem("campus_token");
      localStorage.removeItem("campus_user");
      localStorage.removeItem("campus_admin");
    }

    try {
      const raw = localStorage.getItem(demoStorageKey());
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.version === 1) return parsed;
      const fresh = defaultDemoState();
      localStorage.setItem(demoStorageKey(), JSON.stringify(fresh));
      return fresh;
    } catch {
      if (!memoryDemoState) memoryDemoState = defaultDemoState();
      return memoryDemoState;
    }
  }

  function saveDemoState(state) {
    try {
      localStorage.setItem(demoStorageKey(), JSON.stringify(state));
    } catch {
      memoryDemoState = state;
    }
  }

  function nextId(state, key) {
    const value = Number(state.counters[key] || 1);
    state.counters[key] = value + 1;
    return value;
  }

  function ratingForUser(state, userId) {
    const reviews = state.reviews.filter((review) => Number(review.target_user_id) === Number(userId));
    if (!reviews.length) return { score: null, count: 0 };
    const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
    return { score: Math.round((total / reviews.length) * 10) / 10, count: reviews.length };
  }

  function publicUser(state, user) {
    if (!user) return null;
    const rating = ratingForUser(state, user.id);
    const { password, ...safeUser } = user;
    return {
      ...safeUser,
      rating_score: rating.score,
      rating_count: rating.count
    };
  }

  function findUser(state, userId) {
    return state.users.find((user) => Number(user.id) === Number(userId)) || null;
  }

  function requireAuth(state) {
    const match = currentToken().match(/^demo-(\d+)-/);
    if (!match) mockError(401, "请先登录");
    const user = findUser(state, Number(match[1]));
    if (!user || user.status !== "active") mockError(401, "登录用户不存在或已被禁用");
    return user;
  }

  function requireAdmin(state) {
    const user = requireAuth(state);
    if (user.role !== "admin") mockError(403, "当前账号不是管理员");
    return user;
  }

  function createToken(user) {
    return `demo-${user.id}-${Date.now()}`;
  }

  function decorateGoods(state, goods) {
    if (!goods) return null;
    const seller = findUser(state, goods.seller_id) || {};
    const rating = ratingForUser(state, goods.seller_id);
    return {
      ...goods,
      category_name: CATEGORY_NAMES[goods.category_id] || "其他闲置",
      seller_name: seller.name || seller.username || "校园用户",
      seller_phone: seller.phone || "",
      seller_email: seller.email || "",
      seller_wechat: seller.wechat || "",
      seller_score: rating.score,
      seller_review_count: rating.count
    };
  }

  function decorateOrder(state, order) {
    if (!order) return null;
    const goods = state.goods.find((item) => Number(item.id) === Number(order.goods_id)) || {};
    const buyer = findUser(state, order.buyer_id) || {};
    const seller = findUser(state, order.seller_id) || {};
    return {
      ...order,
      goods_title: goods.title || "订单商品",
      buyer_name: buyer.name || buyer.username || "",
      seller_name: seller.name || seller.username || ""
    };
  }

  function decorateReview(state, review) {
    const reviewer = findUser(state, review.reviewer_id) || {};
    const target = findUser(state, review.target_user_id) || {};
    return {
      ...review,
      reviewer_name: reviewer.name || reviewer.username || "",
      target_user_name: target.name || target.username || ""
    };
  }

  function decorateDispute(state, dispute) {
    const order = state.orders.find((item) => Number(item.id) === Number(dispute.order_id)) || {};
    const complainant = findUser(state, dispute.complainant_id) || {};
    const goods = state.goods.find((item) => Number(item.id) === Number(order.goods_id)) || {};
    return {
      ...dispute,
      complainant_name: complainant.name || complainant.username || "",
      goods_title: goods.title || "",
      order_status: order.status || ""
    };
  }

  function contactOf(user) {
    return [user.name, user.phone, user.email].filter(Boolean).join(" / ");
  }

  function addAdminLog(state, admin, action, targetType, targetId, detail) {
    state.admin_logs.unshift({
      id: nextId(state, "logs"),
      admin_id: admin.id,
      action,
      target_type: targetType,
      target_id: Number(targetId),
      detail,
      created_at: nowIso()
    });
  }

  function ensureOrderVisible(order, user) {
    if (user.role === "admin") return;
    if (Number(order.buyer_id) === Number(user.id)) return;
    if (Number(order.seller_id) === Number(user.id)) return;
    mockError(403, "无权访问该订单");
  }

  function filterGoods(state, url, includeAll = false) {
    const categoryId = url.searchParams.get("category_id");
    const sellerId = url.searchParams.get("seller_id");
    const status = url.searchParams.get("status");
    const keyword = clean(url.searchParams.get("keyword"));
    const minPrice = url.searchParams.get("min_price");
    const maxPrice = url.searchParams.get("max_price");

    return state.goods
      .filter((goods) => {
        if (!includeAll && !status && goods.status !== "available") return false;
        if (status && goods.status !== status) return false;
        if (categoryId && Number(goods.category_id) !== Number(categoryId)) return false;
        if (sellerId && Number(goods.seller_id) !== Number(sellerId)) return false;
        if (minPrice !== null && minPrice !== "" && Number(goods.price) < Number(minPrice)) return false;
        if (maxPrice !== null && maxPrice !== "" && Number(goods.price) > Number(maxPrice)) return false;
        if (!keyword) return true;
        const haystack = `${goods.title} ${goods.description} ${CATEGORY_NAMES[goods.category_id] || ""}`;
        return haystack.includes(keyword);
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((goods) => decorateGoods(state, goods));
  }

  function findGoodsOrThrow(state, goodsId) {
    const goods = state.goods.find((item) => Number(item.id) === Number(goodsId));
    if (!goods) mockError(404, "商品不存在");
    return goods;
  }

  function findOrderOrThrow(state, orderId) {
    const order = state.orders.find((item) => Number(item.id) === Number(orderId));
    if (!order) mockError(404, "订单不存在");
    return order;
  }

  function handleAuth(state, pathname, method, options) {
    const body = readBody(options);

    if (pathname === "/auth/login" && method === "POST") {
      const username = clean(body.username);
      const password = String(body.password || "");
      if (!username || !password) mockError(400, "请输入账号和密码");
      const user = state.users.find((item) => item.username === username || item.email === username);
      if (!user || user.password !== password) mockError(401, "账号或密码错误");
      if (user.status !== "active") mockError(403, "账号已被禁用");
      return { token: createToken(user), user: publicUser(state, user) };
    }

    if (pathname === "/auth/register" && method === "POST") {
      const username = clean(body.username);
      const password = String(body.password || "");
      const name = clean(body.name);
      if (!/^[a-zA-Z0-9_-]{3,24}$/.test(username)) {
        mockError(400, "账号需为 3-24 位字母、数字、下划线或短横线");
      }
      if (password.length < 6) mockError(400, "密码至少需要 6 位");
      if (!name) mockError(400, "请填写昵称");
      if (state.users.some((user) => user.username === username)) mockError(409, "该账号已被注册");

      const user = {
        id: nextId(state, "users"),
        username,
        password,
        name,
        phone: clean(body.phone),
        email: clean(body.email),
        wechat: clean(body.wechat),
        role: "user",
        status: "active",
        created_at: nowIso(),
        updated_at: nowIso()
      };
      state.users.push(user);
      saveDemoState(state);
      return { token: createToken(user), user: publicUser(state, user) };
    }

    if (pathname === "/auth/me" && method === "GET") {
      return publicUser(state, requireAuth(state));
    }

    if (pathname === "/auth/me" && method === "PATCH") {
      const user = requireAuth(state);
      const name = clean(body.name);
      if (!name) mockError(400, "昵称不能为空");
      if (body.password && String(body.password).length < 6) mockError(400, "新密码至少需要 6 位");
      user.name = name;
      user.phone = clean(body.phone);
      user.email = clean(body.email);
      user.wechat = clean(body.wechat);
      if (body.password) user.password = String(body.password);
      user.updated_at = nowIso();
      saveDemoState(state);
      return publicUser(state, user);
    }

    return null;
  }

  function handleStats(state, pathname, method) {
    if (pathname !== "/stats/home" || method !== "GET") return null;
    return {
      available_goods: state.goods.filter((goods) => goods.status === "available").length,
      categories: Object.keys(CATEGORY_NAMES).length,
      active_users: state.users.filter((user) => user.role === "user" && user.status === "active").length
    };
  }

  function handleGoods(state, pathname, method, url, options) {
    const body = readBody(options);

    if (pathname === "/admin/goods" && method === "GET") {
      requireAdmin(state);
      return state.goods
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map((goods) => decorateGoods(state, goods));
    }

    if (pathname === "/goods" && method === "GET") {
      return filterGoods(state, url, url.searchParams.get("include_all") === "true");
    }

    if (pathname === "/goods/mine" && method === "GET") {
      const user = requireAuth(state);
      return state.goods
        .filter((goods) => Number(goods.seller_id) === Number(user.id))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map((goods) => decorateGoods(state, goods));
    }

    if (pathname === "/goods" && method === "POST") {
      const user = requireAuth(state);
      if (!body.category_id || !clean(body.title) || body.price === undefined || body.price === null) {
        mockError(400, "分类、标题和价格不能为空");
      }
      const goods = {
        id: nextId(state, "goods"),
        seller_id: user.id,
        category_id: Number(body.category_id),
        title: clean(body.title),
        description: clean(body.description),
        price: Number(body.price),
        original_price: body.original_price ? Number(body.original_price) : null,
        degree: clean(body.degree),
        image_url: clean(body.image_url),
        pickup_location: clean(body.pickup_location),
        contact: clean(body.contact) || contactOf(user),
        status: "pending",
        view_count: 0,
        created_at: nowIso(),
        updated_at: nowIso()
      };
      state.goods.push(goods);
      saveDemoState(state);
      return decorateGoods(state, goods);
    }

    const statusMatch = pathname.match(/^\/goods\/(\d+)\/status$/);
    if (statusMatch && method === "PATCH") {
      const user = requireAuth(state);
      const goods = findGoodsOrThrow(state, statusMatch[1]);
      const status = clean(body.status);
      if (!GOODS_STATUSES.has(status)) mockError(400, "商品状态不合法");
      const isAdmin = user.role === "admin";
      const isOwner = Number(goods.seller_id) === Number(user.id);
      if (!isAdmin && !isOwner) mockError(403, "无权更新该商品");
      if (!isAdmin && !["removed", "pending"].includes(status)) mockError(403, "卖家只能下架商品或重新提交审核");
      if (!isAdmin && status === "pending" && !["removed", "rejected"].includes(goods.status)) {
        mockError(400, "当前商品不能重新提交");
      }
      if (!isAdmin && status === "removed" && ["locked", "sold"].includes(goods.status)) {
        mockError(400, "交易中的商品不能下架");
      }
      goods.status = status;
      goods.updated_at = nowIso();
      if (isAdmin) addAdminLog(state, user, "update_goods_status", "goods", goods.id, `商品状态更新为 ${status}`);
      saveDemoState(state);
      return decorateGoods(state, goods);
    }

    const goodsMatch = pathname.match(/^\/goods\/(\d+)$/);
    if (goodsMatch && method === "GET") {
      const goods = findGoodsOrThrow(state, goodsMatch[1]);
      goods.view_count = Number(goods.view_count || 0) + 1;
      saveDemoState(state);
      return decorateGoods(state, goods);
    }

    return null;
  }

  function handleOrders(state, pathname, method, url, options) {
    const body = readBody(options);

    if (pathname === "/orders" && method === "POST") {
      const buyer = requireAuth(state);
      const goods = findGoodsOrThrow(state, body.goods_id);
      if (goods.status !== "available") mockError(400, "商品当前不可购买");
      if (Number(goods.seller_id) === Number(buyer.id)) mockError(400, "不能购买自己发布的商品");
      const seller = findUser(state, goods.seller_id) || {};
      const order = {
        id: nextId(state, "orders"),
        goods_id: goods.id,
        buyer_id: buyer.id,
        seller_id: goods.seller_id,
        price: Number(goods.price),
        buyer_contact: clean(body.buyer_contact) || contactOf(buyer),
        seller_contact: goods.contact || contactOf(seller),
        place_location: "",
        status: "waiting_seller_place",
        created_at: nowIso(),
        updated_at: nowIso()
      };
      goods.status = "locked";
      goods.updated_at = nowIso();
      state.orders.push(order);
      saveDemoState(state);
      return decorateOrder(state, order);
    }

    if ((pathname === "/orders" || pathname === "/admin/orders") && method === "GET") {
      const user = pathname.startsWith("/admin") ? requireAdmin(state) : requireAuth(state);
      const buyerId = url.searchParams.get("buyer_id");
      const sellerId = url.searchParams.get("seller_id");
      return state.orders
        .filter((order) => {
          if (user.role !== "admin" && Number(order.buyer_id) !== Number(user.id) && Number(order.seller_id) !== Number(user.id)) {
            return false;
          }
          if (user.role === "admin" && buyerId && Number(order.buyer_id) !== Number(buyerId)) return false;
          if (user.role === "admin" && sellerId && Number(order.seller_id) !== Number(sellerId)) return false;
          return true;
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map((order) => decorateOrder(state, order));
    }

    const statusMatch = pathname.match(/^\/orders\/(\d+)\/status$/);
    if (statusMatch && method === "PATCH") {
      const user = requireAuth(state);
      const order = findOrderOrThrow(state, statusMatch[1]);
      const status = clean(body.status);
      if (!ORDER_STATUSES.has(status)) mockError(400, "订单状态不合法");
      ensureOrderVisible(order, user);
      const isBuyer = Number(order.buyer_id) === Number(user.id);
      const isSeller = Number(order.seller_id) === Number(user.id);
      if (status === "seller_placed" && !isSeller && user.role !== "admin") mockError(403, "无权更新该订单状态");
      if (["buyer_received", "completed"].includes(status) && !isBuyer && user.role !== "admin") {
        mockError(403, "无权更新该订单状态");
      }
      if (["cancelled", "disputed"].includes(status) && !isBuyer && !isSeller && user.role !== "admin") {
        mockError(403, "无权更新该订单状态");
      }
      const transitions = {
        waiting_seller_place: ["seller_placed", "cancelled", "disputed"],
        seller_placed: ["buyer_received", "completed", "cancelled", "disputed"],
        buyer_received: ["completed", "disputed"],
        disputed: ["completed", "cancelled"],
        completed: [],
        cancelled: []
      };
      if (user.role !== "admin" && !transitions[order.status]?.includes(status)) {
        mockError(400, "当前订单状态不能执行该操作");
      }
      if (status === "seller_placed" && !clean(body.place_location)) mockError(400, "请填写商品放置地点");

      order.status = status;
      if (clean(body.place_location)) order.place_location = clean(body.place_location);
      order.updated_at = nowIso();
      const goods = findGoodsOrThrow(state, order.goods_id);
      if (status === "completed") goods.status = "sold";
      if (status === "cancelled") goods.status = "available";
      goods.updated_at = nowIso();
      saveDemoState(state);
      return decorateOrder(state, order);
    }

    const orderMatch = pathname.match(/^\/orders\/(\d+)$/);
    if (orderMatch && method === "GET") {
      const user = requireAuth(state);
      const order = findOrderOrThrow(state, orderMatch[1]);
      ensureOrderVisible(order, user);
      return decorateOrder(state, order);
    }

    return null;
  }

  function handleFavorites(state, pathname, method) {
    if (!pathname.startsWith("/favorites")) return null;
    const user = requireAuth(state);

    if (pathname === "/favorites" && method === "GET") {
      return state.favorites
        .filter((favorite) => Number(favorite.user_id) === Number(user.id))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map((favorite) => decorateGoods(state, findGoodsOrThrow(state, favorite.goods_id)));
    }

    const statusMatch = pathname.match(/^\/favorites\/(\d+)\/status$/);
    if (statusMatch && method === "GET") {
      const goodsId = Number(statusMatch[1]);
      return {
        favorited: state.favorites.some((favorite) => Number(favorite.user_id) === Number(user.id) && Number(favorite.goods_id) === goodsId)
      };
    }

    const favoriteMatch = pathname.match(/^\/favorites\/(\d+)$/);
    if (favoriteMatch && ["POST", "DELETE"].includes(method)) {
      const goodsId = Number(favoriteMatch[1]);
      findGoodsOrThrow(state, goodsId);
      state.favorites = state.favorites.filter((favorite) => !(Number(favorite.user_id) === Number(user.id) && Number(favorite.goods_id) === goodsId));
      if (method === "POST") {
        state.favorites.push({ user_id: user.id, goods_id: goodsId, created_at: nowIso() });
      }
      saveDemoState(state);
      return { favorited: method === "POST" };
    }

    return null;
  }

  function handleReviews(state, pathname, method, url, options) {
    const body = readBody(options);

    if (pathname === "/reviews/mine" && method === "GET") {
      const user = requireAuth(state);
      return state.reviews
        .filter((review) => Number(review.reviewer_id) === Number(user.id))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map((review) => decorateReview(state, review));
    }

    if (pathname === "/reviews" && method === "GET") {
      const targetUserId = url.searchParams.get("target_user_id");
      const orderId = url.searchParams.get("order_id");
      return state.reviews
        .filter((review) => {
          if (targetUserId && Number(review.target_user_id) !== Number(targetUserId)) return false;
          if (orderId && Number(review.order_id) !== Number(orderId)) return false;
          return true;
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map((review) => decorateReview(state, review));
    }

    if (pathname === "/reviews" && method === "POST") {
      const user = requireAuth(state);
      const score = Number(body.rating);
      if (!body.order_id || !Number.isInteger(score) || score < 1 || score > 5) mockError(400, "请选择 1-5 星评分");
      const order = findOrderOrThrow(state, body.order_id);
      if (order.status !== "completed") mockError(400, "订单完成后才能评价");
      const isBuyer = Number(order.buyer_id) === Number(user.id);
      const isSeller = Number(order.seller_id) === Number(user.id);
      if (!isBuyer && !isSeller) mockError(403, "无权评价该订单");
      const targetUserId = isBuyer ? order.seller_id : order.buyer_id;
      const exists = state.reviews.some((review) => (
        Number(review.order_id) === Number(order.id)
        && Number(review.reviewer_id) === Number(user.id)
        && Number(review.target_user_id) === Number(targetUserId)
      ));
      if (exists) mockError(409, "你已经评价过这笔交易");
      const review = {
        id: nextId(state, "reviews"),
        order_id: Number(order.id),
        reviewer_id: Number(user.id),
        target_user_id: Number(targetUserId),
        rating: score,
        comment: clean(body.comment),
        created_at: nowIso()
      };
      state.reviews.push(review);
      saveDemoState(state);
      return decorateReview(state, review);
    }

    return null;
  }

  function handleDisputes(state, pathname, method, options) {
    const body = readBody(options);

    if (pathname === "/disputes" && method === "POST") {
      const user = requireAuth(state);
      if (!body.order_id || !clean(body.reason)) mockError(400, "订单 ID 和争议原因不能为空");
      const order = findOrderOrThrow(state, body.order_id);
      ensureOrderVisible(order, user);
      const dispute = {
        id: nextId(state, "disputes"),
        order_id: Number(order.id),
        complainant_id: Number(user.id),
        reason: clean(body.reason),
        evidence: clean(body.evidence),
        status: "pending",
        admin_reply: "",
        created_at: nowIso(),
        updated_at: nowIso()
      };
      order.status = "disputed";
      order.updated_at = nowIso();
      state.disputes.push(dispute);
      saveDemoState(state);
      return decorateDispute(state, dispute);
    }

    if (pathname === "/admin/disputes" && method === "GET") {
      requireAdmin(state);
      return state.disputes
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map((dispute) => decorateDispute(state, dispute));
    }

    const disputeMatch = pathname.match(/^\/admin\/disputes\/(\d+)$/);
    if (disputeMatch && method === "PATCH") {
      const admin = requireAdmin(state);
      const dispute = state.disputes.find((item) => Number(item.id) === Number(disputeMatch[1]));
      if (!dispute) mockError(404, "争议不存在");
      const status = clean(body.status);
      if (!DISPUTE_STATUSES.has(status)) mockError(400, "争议状态不合法");
      dispute.status = status;
      dispute.admin_reply = clean(body.admin_reply);
      dispute.updated_at = nowIso();
      addAdminLog(state, admin, "update_dispute", "disputes", dispute.id, dispute.admin_reply || `争议状态更新为 ${status}`);
      saveDemoState(state);
      return decorateDispute(state, dispute);
    }

    return null;
  }

  function handleAdmin(state, pathname, method, options) {
    const body = readBody(options);

    if (pathname === "/admin/users" && method === "GET") {
      requireAdmin(state);
      return state.users
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map((user) => publicUser(state, user));
    }

    const userStatusMatch = pathname.match(/^\/admin\/users\/(\d+)\/status$/);
    if (userStatusMatch && method === "PATCH") {
      const admin = requireAdmin(state);
      const status = clean(body.status);
      if (!["active", "disabled"].includes(status)) mockError(400, "用户状态不合法");
      const user = findUser(state, userStatusMatch[1]);
      if (!user) mockError(404, "用户不存在");
      if (Number(user.id) === Number(admin.id)) mockError(400, "不能禁用当前管理员账号");
      user.status = status;
      user.updated_at = nowIso();
      addAdminLog(state, admin, "update_user_status", "users", user.id, `用户状态更新为 ${status}`);
      saveDemoState(state);
      return { id: user.id, status };
    }

    if (pathname === "/admin/dashboard" && method === "GET") {
      requireAdmin(state);
      const countBy = (items, key, value) => items.filter((item) => item[key] === value).length;
      return {
        users: {
          total: state.users.length,
          admins: countBy(state.users, "role", "admin"),
          users: countBy(state.users, "role", "user"),
          active: countBy(state.users, "status", "active"),
          disabled: countBy(state.users, "status", "disabled")
        },
        goods: {
          total: state.goods.length,
          pending: countBy(state.goods, "status", "pending"),
          available: countBy(state.goods, "status", "available"),
          locked: countBy(state.goods, "status", "locked"),
          sold: countBy(state.goods, "status", "sold"),
          removed: countBy(state.goods, "status", "removed"),
          rejected: countBy(state.goods, "status", "rejected")
        },
        orders: {
          total: state.orders.length,
          waiting_seller_place: countBy(state.orders, "status", "waiting_seller_place"),
          seller_placed: countBy(state.orders, "status", "seller_placed"),
          buyer_received: countBy(state.orders, "status", "buyer_received"),
          completed: countBy(state.orders, "status", "completed"),
          disputed: countBy(state.orders, "status", "disputed"),
          cancelled: countBy(state.orders, "status", "cancelled")
        },
        disputes: {
          total: state.disputes.length,
          pending: countBy(state.disputes, "status", "pending"),
          processing: countBy(state.disputes, "status", "processing"),
          resolved: countBy(state.disputes, "status", "resolved"),
          rejected: countBy(state.disputes, "status", "rejected")
        },
        reviews: { total: state.reviews.length },
        payments: {
          total: state.orders.length,
          paid_count: state.orders.filter((order) => order.status !== "cancelled").length,
          paid_amount: state.orders.reduce((sum, order) => order.status === "cancelled" ? sum : sum + Number(order.price || 0), 0)
        }
      };
    }

    if (pathname === "/admin/logs" && method === "GET") {
      requireAdmin(state);
      return state.admin_logs
        .slice(0, 100)
        .map((log) => {
          const admin = findUser(state, log.admin_id) || {};
          return {
            ...log,
            admin_name: admin.name || admin.username || "管理员"
          };
        });
    }

    return null;
  }

  async function demoApiFetch(path, options = {}) {
    activateDemoMode();
    const state = loadDemoState();
    const url = new URL(path, location.origin);
    const pathname = url.pathname;
    const method = (options.method || "GET").toUpperCase();

    const handlers = [
      () => handleAuth(state, pathname, method, options),
      () => handleStats(state, pathname, method),
      () => handleAdmin(state, pathname, method, options),
      () => handleDisputes(state, pathname, method, options),
      () => handleGoods(state, pathname, method, url, options),
      () => handleOrders(state, pathname, method, url, options),
      () => handleFavorites(state, pathname, method),
      () => handleReviews(state, pathname, method, url, options)
    ];

    for (const handler of handlers) {
      const result = handler();
      if (result !== null) return deepClone(result);
    }

    mockError(404, "体验版暂不支持该接口");
  }

  async function liveApiFetch(path, options = {}) {
    const token = currentToken();
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
    const body = options.body && typeof options.body !== "string"
      ? JSON.stringify(options.body)
      : options.body;

    let response;
    try {
      response = await fetch(`${apiBaseUrl()}${path}`, {
        ...options,
        headers,
        body
      });
    } catch (error) {
      error.networkError = true;
      throw error;
    }

    const result = await response.json().catch(() => null);
    if (!result || typeof result !== "object" || !("success" in result)) {
      const error = new Error("接口返回格式不正确");
      error.status = response.status;
      error.invalidApiPayload = true;
      throw error;
    }

    if (!response.ok || result.success === false) {
      const error = new Error(result.message || "接口请求失败");
      error.status = response.status;
      error.hasApiPayload = true;
      throw error;
    }

    return result.data;
  }

  window.apiFetch = async function apiFetch(path, options = {}) {
    if (shouldUseDemoDirectly()) {
      return demoApiFetch(path, options);
    }

    try {
      return await liveApiFetch(path, options);
    } catch (error) {
      if (canAutoFallback(error)) {
        console.info("[Campus Demo] API unavailable, switched to browser demo data.");
        return demoApiFetch(path, options);
      }
      throw error;
    }
  };
}());
