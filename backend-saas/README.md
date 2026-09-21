# Backend — smart-wealth (backend-saas)

Tổng hợp nhanh về service backend (Spring Boot) để chia cho team hoặc cho AI thiết kế giao diện.

## Tổng quan
- Dự án: `smart-wealth` (module `backend-saas`).
- Ngôn ngữ: Java 17, Spring Boot 3.5.15, Maven.
- Chức năng chính: quản lý người dùng, ví (wallets), danh mục (categories), giao dịch (transactions), authentication (JWT).

## Thư mục quan trọng
- [pom.xml](pom.xml)
- [Dockerfile](Dockerfile)
- [HELP.md](HELP.md)
- [wait-for-postgres.sh](wait-for-postgres.sh)
- Cấu hình Spring: [src/main/resources/application.yml](src/main/resources/application.yml), [src/main/resources/application-prod.yml](src/main/resources/application-prod.yml)
- Flyway migrations: [src/main/resources/db/migration/](src/main/resources/db/migration/) (V1__, V2__)
- Code nguồn: [src/main/java/com/fintech/smartwealth](src/main/java/com/fintech/smartwealth)

## Các entity chính
- `User` — quản lý tài khoản, email, password, role
- `Wallet` — ví người dùng, balance
- `Category` — danh mục thu/chi
- `Transaction` — giao dịch (amount, date, wallet, category)

## API chính (tổng quan)
Base path: `/api/v1`

- Auth
  - `POST /api/v1/auth/register` — đăng ký (RegisterRequest)
  - `POST /api/v1/auth/login` — đăng nhập (LoginRequest) → trả `AuthResponse` (token)

- Users
  - `GET /api/v1/users` — list users
  - `GET /api/v1/users/{id}` — chi tiết user
  - `POST /api/v1/users` — tạo user
  - `PUT /api/v1/users/{id}` — cập nhật
  - `DELETE /api/v1/users/{id}` — xóa

- Wallets
  - `GET /api/v1/wallets` — list wallets
  - `GET /api/v1/wallets/{id}` — chi tiết
  - `POST /api/v1/wallets` — tạo ví
  - `DELETE /api/v1/wallets/{id}` — xóa

- Categories
  - `GET /api/v1/categories`
  - `GET /api/v1/categories/{id}`
  - `POST /api/v1/categories`
  - `PUT /api/v1/categories/{id}`
  - `DELETE /api/v1/categories/{id}`

- Transactions
  - `GET /api/v1/transactions` — hỗ trợ filter (walletId, categoryId, type, fromDate, toDate) và paging
  - `GET /api/v1/transactions/{id}`
  - `GET /api/v1/transactions/wallet/{walletId}/total-expense` — tổng chi theo ví
  - `POST /api/v1/transactions` — tạo giao dịch
  - `PUT /api/v1/transactions/{id}` — cập nhật
  - `DELETE /api/v1/transactions/{id}` — xóa

> Lưu ý: API có bảo vệ bằng JWT; endpoint `auth/login` trả token để sử dụng trong header `Authorization: Bearer <token>`.

## Biến môi trường và cấu hình (chính)
- Database
  - `SPRING_DATASOURCE_URL` (mặc định `jdbc:postgresql://localhost:5433/fintech_db`)
  - `SPRING_DATASOURCE_USERNAME` (default `postgres`)
  - `SPRING_DATASOURCE_PASSWORD` (default `secret123`)
- JWT
  - `JWT_SECRET` (bắt buộc khi chạy; example: `change-me-please-use-strong-secret-32chars!`)
  - `JWT_EXPIRATION_MS` (mặc định `86400000`)
- Server / CORS
  - `SERVER_PORT` (mặc định `8080`)
  - `CORS_ALLOWED_ORIGINS` (ví dụ `http://localhost:5173` hoặc `http://localhost:3000`)
- Docker helper
  - `DB_HOST`, `DB_PORT` (sử dụng trong `wait-for-postgres.sh`), `WAIT_FOR_POSTGRES_TIMEOUT` (mặc định 60)

## Chạy (Quick start)

- Dùng Docker (đã cấu hình trong root `docker-compose.yml`):
```bash
docker compose up -d --build
docker compose logs -f backend
```

- Chạy local (dev / debug):
  1. Export biến môi trường tối thiểu:
```powershell
$env:JWT_SECRET='change-me-please-use-strong-secret-32chars!'
$env:SERVER_PORT='8081'   # nếu 8080 đang bị chiếm
.\mvnw spring-boot:run
```
  2. Hoặc build jar và chạy:
```bash
mvn -DskipTests package
java -jar target/smart-wealth-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```

## Database / Migrations
- Flyway được bật mặc định trong cấu hình production (`application-prod.yml`) và chạy các file trong `classpath:db/migration`.
- Các migration hiện có:
  - `V1__init_schema.sql` — tạo bảng users, wallets, categories, transactions
  - `V2__add_role_to_users.sql` — thêm cột role cho users

## Scripts & helpers
- `wait-for-postgres.sh` — script nhỏ đợi Postgres sẵn sàng trước khi chạy ứng dụng (được sử dụng trong Dockerfile).

## Notes cho team frontend / designer AI
- Base API URL mặc định: `http://localhost:8080/api/v1` (thay đổi nếu backend chạy trên port khác). Frontend project dùng biến `VITE_API_BASE_URL` (xem `frontend-app/src/services/api.ts`).
- CORS: nếu frontend dev trên port khác, thêm origin vào `CORS_ALLOWED_ORIGINS` hoặc cấu hình tương ứng.
- Endpoints trả JSON tiêu chuẩn; authentication là JWT trong header `Authorization`.

## Useful files to inspect
- [src/main/java/com/fintech/smartwealth](src/main/java/com/fintech/smartwealth) — controllers, services, entities, security
- [src/main/resources/db/migration](src/main/resources/db/migration) — SQL migrations
- [Dockerfile](Dockerfile) & [wait-for-postgres.sh](wait-for-postgres.sh)
