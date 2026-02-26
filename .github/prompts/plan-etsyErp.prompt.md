# Plan: Etsy ERP – Hệ thống quản lý shop Etsy

## TL;DR

Xây dựng hệ thống ERP full-stack với **React (Vite) + Node.js/Express** backend, **MySQL** database, deploy bằng **Docker Compose** trên VPS. Hệ thống hỗ trợ 20+ shop Etsy với OAuth Google (admin login), OAuth Etsy (shop connection), quản lý đơn hàng/sản phẩm qua Etsy API v3, notification qua Telegram/Email, quản lý kho/giá nhập/lãi lỗ, dashboard biểu đồ, và xuất file hóa đơn chuẩn theo NĐ 174/2025/NĐ-CP (tích hợp Mật Báo).

---

## Kiến trúc tổng quan

```
                    ┌──────────────┐
                    │   Nginx      │  (Reverse Proxy + SSL)
                    │   :80/:443   │
                    └──────┬───────┘
               ┌───────────┴───────────┐
               ▼                       ▼
        ┌─────────────┐        ┌──────────────┐
        │  React SPA  │        │  Express API │
        │  (Vite)     │        │  :5000       │
        │  :3000      │        └──────┬───────┘
        └─────────────┘               │
                              ┌───────┴───────┐
                              ▼               ▼
                       ┌──────────┐    ┌──────────┐
                       │  MySQL   │    │  Redis   │
                       │  :3306   │    │  :6379   │
                       └──────────┘    └──────────┘
```

---

## Cấu trúc thư mục dự án

```
etsy-erp/
├── docker-compose.yml
├── .env.example
├── nginx/
│   └── nginx.conf
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                  # Express app entry
│   │   ├── config/
│   │   │   ├── database.ts           # MySQL connection (TypeORM)
│   │   │   ├── redis.ts              # Redis connection (Bull queues)
│   │   │   └── env.ts                # Environment validation
│   │   ├── entities/                  # TypeORM entities
│   │   │   ├── User.ts
│   │   │   ├── EtsyShop.ts
│   │   │   ├── EtsyToken.ts
│   │   │   ├── Product.ts
│   │   │   ├── ProductVariant.ts
│   │   │   ├── Order.ts
│   │   │   ├── OrderItem.ts
│   │   │   ├── InventoryMovement.ts
│   │   │   ├── CostPrice.ts
│   │   │   └── Invoice.ts
│   │   ├── migrations/                # TypeORM migrations
│   │   ├── middleware/
│   │   │   ├── auth.ts                # JWT verification
│   │   │   ├── rbac.ts                # Role-based access
│   │   │   └── rateLimiter.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts         # Google OAuth + JWT
│   │   │   ├── etsy-auth.routes.ts    # Etsy OAuth (PKCE)
│   │   │   ├── shops.routes.ts
│   │   │   ├── products.routes.ts
│   │   │   ├── orders.routes.ts
│   │   │   ├── inventory.routes.ts
│   │   │   ├── profit.routes.ts
│   │   │   ├── invoice.routes.ts
│   │   │   ├── dashboard.routes.ts
│   │   │   └── notification.routes.ts
│   │   ├── services/
│   │   │   ├── etsy-api.service.ts    # Etsy API v3 wrapper
│   │   │   ├── etsy-webhook.service.ts
│   │   │   ├── google-auth.service.ts
│   │   │   ├── order-sync.service.ts
│   │   │   ├── product-sync.service.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── telegram.service.ts
│   │   │   ├── email.service.ts
│   │   │   ├── profit.service.ts
│   │   │   ├── invoice.service.ts     # Xuất file hóa đơn
│   │   │   └── inventory.service.ts
│   │   ├── jobs/                       # Bull queue jobs
│   │   │   ├── sync-orders.job.ts
│   │   │   ├── sync-products.job.ts
│   │   │   └── token-refresh.job.ts
│   │   └── utils/
│   │       ├── pkce.ts                # PKCE helper cho Etsy
│   │       ├── crypto.ts              # Encrypt/decrypt tokens
│   │       └── etsy-webhook-verify.ts # HMAC verification
│   └── Dockerfile
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/                       # Axios instances + hooks
│   │   │   └── client.ts
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useEtsyShops.ts
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Shops/
│   │   │   │   ├── ShopList.tsx
│   │   │   │   └── ShopConnect.tsx
│   │   │   ├── Orders/
│   │   │   │   ├── OrderList.tsx
│   │   │   │   └── OrderDetail.tsx
│   │   │   ├── Products/
│   │   │   │   ├── ProductList.tsx
│   │   │   │   ├── ProductCreate.tsx
│   │   │   │   └── ProductEdit.tsx
│   │   │   ├── Inventory/
│   │   │   │   ├── InventoryList.tsx
│   │   │   │   └── InventoryMovements.tsx
│   │   │   ├── Profit/
│   │   │   │   ├── ProfitDashboard.tsx
│   │   │   │   └── ProfitByOrder.tsx
│   │   │   ├── Invoice/
│   │   │   │   ├── InvoiceList.tsx
│   │   │   │   └── InvoiceExport.tsx
│   │   │   └── Settings/
│   │   │       ├── NotificationSettings.tsx
│   │   │       └── UserManagement.tsx
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   ├── Charts/
│   │   │   └── common/
│   │   └── utils/
│   └── Dockerfile
└── docs/
    └── api.md
```

---

## Steps

### Phase 1 – Foundation (Infra + Auth)

1. **Khởi tạo monorepo** – Tạo cấu trúc thư mục `backend/` và `frontend/` với `package.json` riêng. Backend dùng **TypeScript + Express + TypeORM**. Frontend dùng **React + Vite + TypeScript + Ant Design** (UI library phù hợp ERP).

2. **Docker Compose setup** – Tạo `docker-compose.yml` với 5 services: `mysql:8.0` (port 3306), `redis:7-alpine` (port 6379, dùng cho Bull queue + caching), `backend` (Express, port 5000), `frontend` (Vite dev / Nginx prod, port 3000), `nginx` (reverse proxy, port 80/443 với Let's Encrypt).

3. **Database schema + TypeORM entities** – Tạo các entity chính:
   - `User` (id, email, name, avatar, googleId, role: admin/manager/viewer, createdAt)
   - `EtsyShop` (id, userId, shopId, shopName, etsyUserId, status, lastSyncAt)
   - `EtsyToken` (id, shopId, accessToken **encrypted**, refreshToken **encrypted**, expiresAt, scopes)
   - `Product` (id, shopId, etsyListingId, title, description, sku, status, tags, price, quantity)
   - `ProductVariant` (id, productId, sku, price, quantity, propertyValues)
   - `Order` (id, shopId, etsyReceiptId, buyerName, buyerEmail, totalPrice, subtotal, shippingCost, salesTax, etsyFees, status, createdAt, paidAt)
   - `OrderItem` (id, orderId, productVariantId, etsyTransactionId, title, sku, quantity, price)
   - `InventoryMovement` (id, productVariantId, type: import/export/adjustment, quantity, costPrice, note, createdAt, createdBy)
   - `CostPrice` (id, productVariantId, costPrice, currency, effectiveFrom, note)
   - `Invoice` (id, orderId, invoiceNumber, invoiceDate, buyerName, buyerTaxCode, items JSON, totalAmount, vatAmount, status, exportedAt, matbaoRef)

4. **Google OAuth login** – Dùng `passport-google-oauth20` + `jsonwebtoken`. Flow: Frontend redirect → Google consent → callback `/api/auth/google/callback` → tạo/tìm User → trả JWT (accessToken 15min + refreshToken 7 ngày lưu httpOnly cookie). Middleware `auth.ts` verify JWT cho mọi protected route.

5. **Etsy OAuth (PKCE)** – Tạo service `etsy-api.service.ts` xử lý full OAuth flow:
   - Generate `code_verifier` + `code_challenge` (SHA-256)
   - Redirect đến `https://www.etsy.com/oauth/connect` với scopes: `shops_r listings_r listings_w transactions_r transactions_w billing_r profile_r email_r`
   - Callback `/api/etsy/callback` exchange code → lưu token (AES-256 encrypted) vào `EtsyToken`
   - Auto-refresh token khi gần hết hạn (Bull cron job mỗi 45 phút check tất cả tokens)

### Phase 2 – Etsy Integration (Shop + Products + Orders)

6. **Etsy API service wrapper** – Tạo class `EtsyApiService` bao bọc tất cả Etsy API calls với:
   - Auto retry với exponential backoff khi gặp 429
   - Rate limit tracking từ response headers (`x-remaining-this-second`, `x-remaining-today`)
   - Token auto-refresh trước khi call nếu token sắp hết hạn
   - Request queue (Bull) để không vượt rate limit

7. **Shop management** – API endpoints:
   - `GET /api/shops` – Danh sách shop đã kết nối (từ DB)
   - `POST /api/shops/connect` – Bắt đầu Etsy OAuth flow
   - `DELETE /api/shops/:id` – Ngắt kết nối shop
   - `POST /api/shops/:id/sync` – Trigger sync thủ công
   - Sync job tự động mỗi 15 phút cập nhật thông tin shop

8. **Product management (CRUD qua Etsy API)** –
   - `GET /api/shops/:shopId/products` – Lấy listings từ Etsy, sync vào DB
   - `POST /api/shops/:shopId/products` – Tạo listing mới (draft) trên Etsy → sync về DB
   - `PATCH /api/products/:id` – Cập nhật listing (title, description, price, tags, quantity) → push lên Etsy
   - `DELETE /api/products/:id` – Xoá/deactivate listing trên Etsy
   - `POST /api/products/:id/images` – Upload ảnh (multipart) → Etsy image API
   - Sync job mỗi 30 phút pull toàn bộ active listings về DB

9. **Order management** –
   - `GET /api/shops/:shopId/orders` – Lấy receipts từ Etsy, sync vào DB
   - `GET /api/orders/:id` – Chi tiết đơn hàng (kèm items, tracking)
   - `PATCH /api/orders/:id` – Cập nhật status (mark as shipped, add tracking)
   - `POST /api/orders/:id/tracking` – Thêm tracking number → push lên Etsy
   - **Etsy Webhook** – Đăng ký webhook `order.paid` + `order.canceled`. Endpoint `POST /api/webhooks/etsy` verify HMAC-SHA256 → process event → trigger notification

### Phase 3 – Notifications

10. **Telegram notification** – Service `telegram.service.ts`:
    - Dùng direct HTTP call đến `https://api.telegram.org/bot{TOKEN}/sendMessage`
    - Gửi notification với format HTML khi có đơn hàng mới (từ webhook hoặc polling)
    - Template: `<b>🛒 New Order!</b>\nShop: {shopName}\nOrder #{receiptId}\nTotal: ${amount}\nBuyer: {buyerName}`
    - Settings page cho admin cấu hình bot token + chat ID per shop

11. **Email notification** – Service `email.service.ts`:
    - Dùng `nodemailer` với SMTP (Gmail/SendGrid/bất kì)
    - Template HTML cho email thông báo đơn hàng mới
    - Queue bằng Bull để tránh block request

12. **Notification settings UI** – Trang Settings cho phép admin:
    - Bật/tắt Telegram/Email notification per shop
    - Cấu hình Telegram bot token + chat ID
    - Cấu hình SMTP settings
    - Test notification button

### Phase 4 – Inventory & Cost Management

13. **Inventory management** –
    - `GET /api/inventory` – Tồn kho theo SKU (aggregate từ InventoryMovement)
    - `POST /api/inventory/import` – Nhập kho (type: import, ghi nhận số lượng + giá nhập)
    - `POST /api/inventory/export` – Xuất kho (type: export, liên kết với order)
    - `POST /api/inventory/adjust` – Điều chỉnh tồn (type: adjustment)
    - Auto-export khi đơn hàng confirmed (từ webhook trigger)
    - Hiển thị lịch sử xuất nhập theo timeline

14. **Cost price management** –
    - `GET /api/cost-prices/:sku` – Lịch sử giá nhập theo SKU
    - `POST /api/cost-prices` – Thêm/cập nhật giá nhập mới
    - Hỗ trợ giá nhập theo thời gian (effective date) để tính lãi lỗ chính xác cho từng đơn

### Phase 5 – Profit & Dashboard

15. **Profit calculation service** – `profit.service.ts`:
    - Với mỗi OrderItem: `profit = salePrice - costPrice - (etsyFees / items) - (shippingCost / items)`
    - Etsy fees gồm: transaction fee (6.5%), processing fee (3% + $0.25), listing fee ($0.20)
    - API: `GET /api/profit/by-order?from=&to=` – Lãi lỗ từng đơn
    - API: `GET /api/profit/by-shop?from=&to=` – Lãi lỗ theo shop
    - API: `GET /api/profit/by-product?from=&to=` – Lãi lỗ theo sản phẩm/SKU
    - API: `GET /api/profit/summary?from=&to=&groupBy=day|week|month` – Tổng hợp cho chart

16. **Dashboard** – Trang chính sau login:
    - **Summary cards**: Tổng đơn hôm nay, doanh thu hôm nay, lợi nhuận hôm nay, tổng sản phẩm active
    - **Revenue chart** (Recharts): Line/Bar chart doanh thu theo ngày/tuần/tháng, filter theo shop
    - **Profit chart**: Line chart lợi nhuận vs doanh thu theo thời gian
    - **Top products**: Bảng top sản phẩm bán chạy, lợi nhuận cao nhất
    - **Recent orders**: 10 đơn gần nhất với status
    - **Shop health**: Cards cho mỗi shop (tổng đơn, rating, active listings)
    - Dùng **Recharts** hoặc **Chart.js** cho biểu đồ, **Ant Design** Table cho bảng dữ liệu

### Phase 6 – Invoice Export

17. **Invoice export (NĐ 174/2025/NĐ-CP)** – `invoice.service.ts`:
    - Tạo file hóa đơn XML theo chuẩn Thông tư 78/2021/TT-BTC (format cơ sở cho e-invoice)
    - Hỗ trợ 2 mode:
      - **Mode 1 – Xuất file chuẩn**: Generate file XML/Excel theo format Mật Báo (matbao.net) để import vào hệ thống e-invoice. Cần tìm hiểu chính xác template import của Mật Báo.
      - **Mode 2 – API integration** (tương lai): Gọi API Mật Báo trực tiếp để phát hành hóa đơn.
    - UI: Chọn ngày → hiển thị danh sách đơn hàng → chọn đơn cần xuất HĐ → nhập thông tin người mua (tên, MST) → xuất file
    - Fields: Số thứ tự, tên hàng hóa (từ OrderItem), đơn vị tính, số lượng, đơn giá (quy đổi VND), thành tiền, thuế suất, tiền thuế, tổng thanh toán
    - API: `POST /api/invoices/generate` – Tạo hóa đơn
    - API: `GET /api/invoices/export?date=YYYY-MM-DD&format=xml|excel` – Xuất file theo ngày

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Ant Design 5 + Recharts |
| Backend | Node.js + Express + TypeScript + TypeORM |
| Database | MySQL 8.0 |
| Cache/Queue | Redis 7 + Bull (job queue) |
| Auth | Passport.js (Google OAuth) + Custom Etsy PKCE + JWT |
| Notifications | Nodemailer (email) + Telegram Bot API (HTTP) |
| Containerization | Docker + Docker Compose |
| Reverse Proxy | Nginx + Let's Encrypt (certbot) |

## Key Libraries

**Backend**: `express`, `typeorm`, `mysql2`, `passport-google-oauth20`, `jsonwebtoken`, `bull`, `ioredis`, `nodemailer`, `axios`, `helmet`, `cors`, `multer` (image upload), `crypto` (PKCE + token encryption)

**Frontend**: `react`, `react-router-dom`, `antd`, `recharts`, `axios`, `@tanstack/react-query`, `dayjs`

---

## Verification

- **Unit tests**: Jest cho backend services (etsy-api, profit calculation, invoice generation)
- **API tests**: Supertest cho các route handlers
- **Manual flow test**: Google login → Connect Etsy shop → Sync products → Tạo test order trên Etsy → Verify webhook notification → Check profit calculation → Export invoice file
- **Docker**: `docker compose up --build` → verify tất cả services khởi động, MySQL migration chạy thành công
- **Load test**: Verify 20+ shop sync concurrent không vượt Etsy rate limit

## Decisions

- **Ant Design** over MUI/Chakra: phù hợp nhất cho ERP/admin dashboard với Table, Form, Layout components sẵn có
- **TypeORM** over Prisma/Knex: mature, decorator-based entities phù hợp TypeScript, migration support tốt
- **Bull + Redis** over cron: reliable job queue với retry, concurrency control, dashboard monitoring (bull-board)
- **JWT + httpOnly cookie** over session: stateless, phù hợp React SPA + API architecture
- **Etsy Webhook** (primary) + Polling (fallback): webhook cho real-time notification, polling job mỗi 15 phút làm safety net
- **Token encryption at rest** (AES-256-GCM): Etsy tokens lưu encrypted trong DB, decrypt khi cần dùng
- **Monorepo** (không dùng Nx/Turborepo): đơn giản, 2 thư mục backend/frontend riêng biệt, Docker build riêng
