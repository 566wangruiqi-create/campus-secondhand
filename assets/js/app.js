const categories = [
  { id: "textbooks", name: "教材资料", icon: "📚" },
  { id: "digital", name: "数码电子", icon: "⌨" },
  { id: "living", name: "生活用品", icon: "☕" },
  { id: "clothing", name: "服饰鞋包", icon: "◉" },
  { id: "sports", name: "运动户外", icon: "★" },
  { id: "furniture", name: "宿舍家具", icon: "▣" },
  { id: "tools", name: "文具工具", icon: "✎" },
  { id: "other", name: "其他闲置", icon: "＋" }
];

const products = [
  { id: "p1", category: "textbooks", name: "高等数学教材", icon: "📚", price: 28, condition: "八成新", campus: "东校区", rating: "4.9", status: "在售", seller: "林同学", address: "东校区图书馆自取柜 A-12" },
  { id: "p2", category: "digital", name: "机械键盘", icon: "⌨", price: 99, condition: "九成新", campus: "北校区", rating: "4.8", status: "在售", seller: "周同学", address: "北校区二号宿舍大厅" },
  { id: "p3", category: "living", name: "护眼台灯", icon: "☕", price: 45, condition: "七成新", campus: "南校区", rating: "4.7", status: "交易中", seller: "陈同学", address: "南校区生活服务中心" },
  { id: "p4", category: "clothing", name: "双肩书包", icon: "◉", price: 36, condition: "八成新", campus: "东校区", rating: "5.0", status: "在售", seller: "王同学", address: "东校区三号楼门口" },
  { id: "p5", category: "sports", name: "羽毛球拍", icon: "★", price: 58, condition: "九成新", campus: "西校区", rating: "4.6", status: "在售", seller: "赵同学", address: "西校区体育馆置物架" },
  { id: "p6", category: "furniture", name: "宿舍小桌", icon: "▣", price: 32, condition: "六成新", campus: "北校区", rating: "4.5", status: "已售出", seller: "刘同学", address: "北校区五号宿舍" },
  { id: "p7", category: "tools", name: "绘图工具套装", icon: "✎", price: 24, condition: "八成新", campus: "南校区", rating: "4.9", status: "在售", seller: "孙同学", address: "南校区教学楼 B101" },
  { id: "p8", category: "other", name: "收纳箱", icon: "＋", price: 18, condition: "七成新", campus: "东校区", rating: "4.4", status: "在售", seller: "许同学", address: "东校区快递站旁" }
];

const orders = [
  { id: "O20260603001", product: "机械键盘", buyer: "我", seller: "周同学", amount: 99, status: "卖家已放好", address: "北校区二号宿舍大厅", buyerContact: "138****2030", sellerContact: "139****6642" },
  { id: "O20260603002", product: "高等数学教材", buyer: "我", seller: "林同学", amount: 28, status: "订单完成", address: "东校区图书馆自取柜 A-12", buyerContact: "138****2030", sellerContact: "136****5531" },
  { id: "O20260603003", product: "护眼台灯", buyer: "我", seller: "陈同学", amount: 45, status: "争议处理中", address: "南校区生活服务中心", buyerContact: "138****2030", sellerContact: "137****8821" }
];

const disputes = [
  { id: "D1001", order: "O20260603003", type: "商品与描述不符", user: "我", status: "待处理" },
  { id: "D1002", order: "O20260602008", type: "未放到指定地点", user: "李同学", status: "处理中" }
];

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

function categoryName(id) {
  return categories.find((item) => item.id === id)?.name || "全部分类";
}

function renderCategories() {
  const target = document.querySelector("[data-categories]");
  if (!target) return;
  target.innerHTML = categories.map((item) => `
    <a class="category-card" href="category.html?category=${item.id}" aria-label="进入${item.name}分类">
      <span class="category-icon" aria-hidden="true">${item.icon}</span>
      <p class="category-name">${item.name}</p>
    </a>
  `).join("");
}

function renderProductGrid(items) {
  const target = document.querySelector("[data-products]");
  if (!target) return;
  target.innerHTML = items.map((item) => `
    <a class="card" href="product.html?id=${item.id}">
      <div class="product-img">${item.icon}</div>
      <h3>${item.name}</h3>
      <p class="price">￥${item.price}</p>
      <div class="meta">
        <span class="pill">${item.condition}</span>
        <span class="pill">${item.campus}</span>
        <span class="pill">评分 ${item.rating}</span>
        <span class="pill">${item.status}</span>
      </div>
    </a>
  `).join("");
}

function initCategoryPage() {
  const id = qs("category") || "textbooks";
  const title = document.querySelector("[data-category-title]");
  if (title) title.textContent = categoryName(id);
  renderProductGrid(products.filter((item) => item.category === id));
}

function initSearchPage() {
  renderProductGrid(products);
  const input = document.querySelector("#keyword");
  const select = document.querySelector("#category");
  const run = () => {
    const word = input.value.trim();
    const category = select.value;
    const filtered = products.filter((item) => {
      const matchWord = !word || item.name.includes(word) || categoryName(item.category).includes(word);
      const matchCategory = !category || item.category === category;
      return matchWord && matchCategory;
    });
    renderProductGrid(filtered);
  };
  document.querySelector("#searchForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    run();
  });
}

function initProductPage() {
  const item = products.find((product) => product.id === (qs("id") || "p1")) || products[0];
  const target = document.querySelector("[data-product-detail]");
  if (!target) return;
  target.innerHTML = `
    <div class="card">
      <div class="product-img">${item.icon}</div>
      <h2>${item.name}</h2>
    </div>
    <div class="card yellow">
      <h2>￥${item.price}</h2>
      <div class="meta">
        <span class="pill">${categoryName(item.category)}</span>
        <span class="pill">${item.condition}</span>
        <span class="pill">${item.campus}</span>
        <span class="pill">卖家评分 ${item.rating}</span>
      </div>
      <p>卖家：${item.seller}</p>
      <p>商品地址：${item.address}</p>
      <p>当前状态：${item.status}</p>
      <a class="btn primary full" href="order-detail.html?id=O20260603001">立即购买</a>
    </div>
  `;
}

function renderOrders() {
  const target = document.querySelector("[data-orders]");
  if (!target) return;
  target.innerHTML = orders.map((item) => `
    <tr>
      <td>${item.id}</td>
      <td>${item.product}</td>
      <td>￥${item.amount}</td>
      <td>${item.status}</td>
      <td><a class="btn" href="order-detail.html?id=${item.id}">查看</a></td>
    </tr>
  `).join("");
}

function initOrderDetail() {
  const item = orders.find((order) => order.id === (qs("id") || "O20260603001")) || orders[0];
  const target = document.querySelector("[data-order-detail]");
  if (!target) return;
  const isDone = item.status === "订单完成";
  target.innerHTML = `
    <div class="card">
      <h2>${item.id}</h2>
      <p>商品：${item.product}</p>
      <p>金额：￥${item.amount}</p>
      <p>取货地址：${item.address}</p>
      <p>订单状态：${item.status}</p>
      ${isDone ? `<p>买家联系方式：${item.buyerContact}</p><p>卖家联系方式：${item.sellerContact}</p>` : `<p>订单完成前不展示双方联系方式。</p>`}
      <div class="meta">
        <a class="btn good" href="rate.html?id=${item.id}">去评分</a>
        <a class="btn primary" href="dispute.html?id=${item.id}">提交争议</a>
      </div>
    </div>
    <div class="card violet">
      <h2>订单进度</h2>
      <div class="status-line">
        <div class="status-step done"><span class="dot"></span> 待卖家放置</div>
        <div class="status-step current"><span class="dot"></span> 卖家已放好</div>
        <div class="status-step"><span class="dot"></span> 买家已取到</div>
        <div class="status-step"><span class="dot"></span> 订单完成</div>
      </div>
      <div class="meta">
        <button class="btn">确认已放好</button>
        <button class="btn primary">确认已取到</button>
      </div>
    </div>
  `;
}

function renderAdminTables() {
  const users = document.querySelector("[data-admin-users]");
  if (users) users.innerHTML = ["林同学", "周同学", "陈同学", "王同学"].map((name, index) => `
    <tr><td>U00${index + 1}</td><td>${name}</td><td>4.${9 - index}</td><td>正常</td><td><button class="btn">禁用</button></td></tr>
  `).join("");

  const productRows = document.querySelector("[data-admin-products]");
  if (productRows) productRows.innerHTML = products.map((item) => `
    <tr><td>${item.id}</td><td>${item.name}</td><td>${categoryName(item.category)}</td><td>${item.status}</td><td><button class="btn primary">下架</button></td></tr>
  `).join("");

  const disputeRows = document.querySelector("[data-admin-disputes]");
  if (disputeRows) disputeRows.innerHTML = disputes.map((item) => `
    <tr><td>${item.id}</td><td>${item.order}</td><td>${item.type}</td><td>${item.status}</td><td><button class="btn good">处理</button></td></tr>
  `).join("");
}

function bindHomeScroll() {
  const scroller = document.querySelector("[data-categories]");
  document.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.dataset.scroll === "left" ? -1 : 1;
      scroller?.scrollBy({ left: direction * 340, behavior: "smooth" });
    });
  });
  scroller?.addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      event.preventDefault();
      scroller.scrollLeft += event.deltaY;
    }
  }, { passive: false });
}

document.addEventListener("DOMContentLoaded", () => {
  renderCategories();
  bindHomeScroll();
  if (document.body.dataset.page === "category") initCategoryPage();
  if (document.body.dataset.page === "search") initSearchPage();
  if (document.body.dataset.page === "product") initProductPage();
  renderOrders();
  initOrderDetail();
  renderAdminTables();
});
