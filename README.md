# 校园闲置物品交易系统

这是一个可部署到 Netlify 的校园闲置物品交易系统前端项目。

## 当前状态

- 页面已经完成：用户端、订单、评分、争议、管理员后台。
- 默认使用本地演示数据。
- 填入 Supabase 配置后，可以读取和写入真实数据库。

## 接入 Supabase

1. 登录 Supabase 并创建项目。
2. 打开 Supabase 的 SQL Editor。
3. 复制 `database/supabase-schema.sql` 的全部内容并执行。
4. 在 Supabase 项目设置中找到：
   - Project URL
   - anon public key
5. 打开 `assets/js/config.js`，填入：

```js
window.CAMPUS_SUPABASE = {
  url: "你的 Supabase Project URL",
  anonKey: "你的 Supabase anon public key"
};
```

6. 重新上传到 Netlify。

## 入口

打开 `index.html`。
