USE campus_secondhand;

SET NAMES utf8mb4;

INSERT INTO users (id, username, password, name, phone, email, role, status, created_at, updated_at) VALUES
  (1, 'admin', '123456', '系统管理员', '13800000000', 'admin@campus.local', 'admin', 'active', '2026-06-01 09:00:00', '2026-06-01 09:00:00'),
  (2, 'user1', '123456', '李同学', '13800001111', 'user1@campus.local', 'user', 'active', '2026-06-01 09:10:00', '2026-06-01 09:10:00'),
  (3, 'user2', '123456', '王同学', '13800002222', 'user2@campus.local', 'user', 'active', '2026-06-01 09:20:00', '2026-06-01 09:20:00'),
  (4, 'user3', '123456', '陈同学', '13800003333', 'user3@campus.local', 'user', 'active', '2026-06-01 09:30:00', '2026-06-01 09:30:00');

INSERT INTO categories (id, name, sort_order, created_at) VALUES
  (1, '教材资料', 1, '2026-06-01 10:00:00'),
  (2, '数码电子', 2, '2026-06-01 10:00:00'),
  (3, '生活用品', 3, '2026-06-01 10:00:00'),
  (4, '服饰鞋包', 4, '2026-06-01 10:00:00'),
  (5, '运动户外', 5, '2026-06-01 10:00:00'),
  (6, '宿舍家具', 6, '2026-06-01 10:00:00'),
  (7, '文具工具', 7, '2026-06-01 10:00:00'),
  (8, '其他闲置', 8, '2026-06-01 10:00:00');

INSERT INTO goods (
  id, seller_id, category_id, title, description, price, image_url,
  pickup_location, contact, status, created_at, updated_at
) VALUES
  (1, 2, 1, '高等数学同济第七版教材', '公共课教材，书角轻微磨损，重点章节有少量笔记。', 28.00, '/assets/images/demo/math-book.jpg', '东校区图书馆自取柜 A-12', '李同学 13800001111 / wx-user1', 'available', '2026-06-02 08:30:00', '2026-06-02 08:30:00'),
  (2, 2, 2, '罗技无线鼠标 M330', '静音鼠标，适合宿舍和图书馆使用，电池刚换。', 45.00, '/assets/images/demo/mouse.jpg', '北校区二号宿舍楼大厅', '李同学 13800001111 / wx-user1', 'locked', '2026-06-02 09:00:00', '2026-06-03 12:00:00'),
  (3, 3, 6, '宿舍折叠小桌', '可放床上使用，桌面干净，搬宿舍出闲置。', 35.00, '/assets/images/demo/folding-desk.jpg', '南校区 5 号楼门口', '王同学 13800002222 / wx-user2', 'sold', '2026-06-02 10:20:00', '2026-06-04 16:30:00'),
  (4, 3, 4, '双肩书包', '容量大，可放 15 寸电脑，九成新。', 58.00, '/assets/images/demo/backpack.jpg', '西校区食堂一楼', '王同学 13800002222 / wx-user2', 'locked', '2026-06-03 14:10:00', '2026-06-06 11:20:00'),
  (5, 4, 5, '羽毛球拍一对', '适合体育课练习，附赠三只训练球。', 60.00, '/assets/images/demo/badminton.jpg', '体育馆入口服务台', '陈同学 13800003333 / wx-user3', 'pending', '2026-06-04 11:00:00', '2026-06-04 11:00:00'),
  (6, 4, 3, '宿舍收纳箱两个', '透明收纳箱，适合衣物和书本分类。', 22.00, '/assets/images/demo/storage-box.jpg', '东校区快递站旁', '陈同学 13800003333 / wx-user3', 'locked', '2026-06-04 15:40:00', '2026-06-06 08:40:00'),
  (7, 2, 7, '晨光考试文具套装', '含涂卡笔、尺子、橡皮和透明笔袋。', 12.00, '/assets/images/demo/stationery.jpg', '教学楼 B 区大厅', '李同学 13800001111 / wx-user1', 'rejected', '2026-06-05 09:15:00', '2026-06-05 10:20:00'),
  (8, 3, 8, '校园活动纪念徽章', '社团活动纪念徽章，适合收藏。', 10.00, '/assets/images/demo/badge.jpg', '大学生活动中心', '王同学 13800002222 / wx-user2', 'removed', '2026-06-05 13:00:00', '2026-06-06 09:00:00');

INSERT INTO orders (
  id, goods_id, buyer_id, seller_id, price, buyer_contact, seller_contact,
  status, created_at, updated_at
) VALUES
  (1, 2, 3, 2, 45.00, '王同学 13800002222 / wx-user2', '李同学 13800001111 / wx-user1', 'waiting_seller_place', '2026-06-03 12:00:00', '2026-06-03 12:00:00'),
  (2, 3, 2, 3, 35.00, '李同学 13800001111 / wx-user1', '王同学 13800002222 / wx-user2', 'completed', '2026-06-03 18:20:00', '2026-06-04 16:30:00'),
  (3, 6, 2, 4, 22.00, '李同学 13800001111 / wx-user1', '陈同学 13800003333 / wx-user3', 'disputed', '2026-06-05 17:10:00', '2026-06-06 08:40:00'),
  (4, 4, 4, 3, 58.00, '陈同学 13800003333 / wx-user3', '王同学 13800002222 / wx-user2', 'seller_placed', '2026-06-06 10:30:00', '2026-06-06 11:20:00');

INSERT INTO payments (id, order_id, user_id, amount, status, created_at) VALUES
  (1, 1, 3, 45.00, 'paid', '2026-06-03 12:00:30'),
  (2, 2, 2, 35.00, 'paid', '2026-06-03 18:21:00'),
  (3, 3, 2, 22.00, 'paid', '2026-06-05 17:11:00'),
  (4, 4, 4, 58.00, 'paid', '2026-06-06 10:31:00');

INSERT INTO disputes (
  id, order_id, complainant_id, reason, evidence, status,
  admin_reply, created_at, updated_at
) VALUES
  (1, 3, 2, '收纳箱实际有明显裂痕，希望管理员协助沟通退款或换货。', 'https://example.com/evidence/storage-box-crack.jpg', 'processing', '管理员已联系卖家补充说明，等待双方确认处理方案。', '2026-06-06 08:40:00', '2026-06-06 09:10:00');

INSERT INTO reviews (id, order_id, reviewer_id, target_user_id, rating, comment, created_at) VALUES
  (1, 2, 2, 3, 5, '卖家沟通很及时，小桌状态和描述一致。', '2026-06-04 17:00:00'),
  (2, 2, 3, 2, 5, '买家准时取货，交易很顺利。', '2026-06-04 17:05:00');

INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, detail, created_at) VALUES
  (1, 1, 'approve_goods', 'goods', 1, '审核通过商品：高等数学同济第七版教材。', '2026-06-02 08:45:00'),
  (2, 1, 'reject_goods', 'goods', 7, '拒绝商品：考试文具套装，原因是图片和描述信息不足。', '2026-06-05 10:20:00'),
  (3, 1, 'process_dispute', 'disputes', 1, '争议进入处理中，已联系买卖双方补充凭证。', '2026-06-06 09:10:00');
