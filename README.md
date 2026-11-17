# 海纳手绘预约

Vercel + Supabase 的预约网站。目录中没有提供参考站源码，因此此项目采用 Next.js，适合部署到 Vercel。

## 配置款式

编辑 `src/lib/config.ts` 的 `products` 数组，加入款式 ID、名称和价格。为空时预约页显示图片占位说明，并仍可使用自定义图片预约。产品图片目前留白。

## Supabase

1. 创建 Supabase 项目。
2. 在 SQL Editor 执行 `supabase/schema.sql`。
3. 从项目设置中取得 Project URL 和 service role key。

数据库由服务端 API 使用 service role 访问；service role key 只放在服务器环境变量，不能放进 `NEXT_PUBLIC_` 变量。

## Vercel

导入此项目，设置以下环境变量后部署：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`（默认按要求为 `6767`）
- `ADMIN_SESSION_SECRET`（至少 32 个随机字符）

管理员入口：`/admin`。订单后台通过刷新按钮读取最新订单。

## 本地运行

复制 `.env.example` 为 `.env.local`，填入 Supabase 环境变量，然后运行 `npm install` 和 `npm run dev`。
