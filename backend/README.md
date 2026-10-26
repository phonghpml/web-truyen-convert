 # Backend - Crawler Web Truyen

Dự án crawler và convert truyện chữ tự động:

- FastAPI, Playwright/Chromium
- Bộ dịch Aho-Corasick khoảng 1,4 triệu cụm từ
- Tạo giọng nói và video bằng TTS/FFmpeg

## Chạy backend trên máy Windows cá nhân

### 1. Cài đặt Docker Desktop

Cài Docker Desktop cho Windows, bật backend WSL 2 trong phần Settings, sau đó khởi động Docker Desktop. Nên để Docker Desktop tự khởi động cùng Windows và không cho máy chuyển sang Sleep khi đang cần phục vụ backend.

### 2. Chuẩn bị biến môi trường

Nếu chưa có file, tạo `backend/.env.deploy` từ `backend/.env.example`, rồi điền các giá trị thật. File này đã được Git ignore; không commit secrets.

Lệnh PowerShell sau chỉ tạo file nếu chưa tồn tại, tránh ghi đè cấu hình riêng của bạn:

```powershell
if (-not (Test-Path backend/.env.deploy)) {
  Copy-Item backend/.env.example backend/.env.deploy
}
```

Các giá trị cần có gồm:

- `DATABASE_URL`: PostgreSQL connection string.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.
- `APP_SECRET`: chuỗi ngẫu nhiên riêng cho ứng dụng; không dùng lại database URL hay secret ở frontend.
- `FRONTEND_ORIGINS`: origin của frontend, ví dụ `https://web-truyen-convert.vercel.app`.
- `COOKIE_SECURE=true` khi frontend/backend được truy cập qua HTTPS.

Không dùng lại Supabase service-role key đã từng bị chia sẻ; hãy rotate key trong Supabase trước khi chạy production.

### 3. Build và chạy

Mở PowerShell tại thư mục gốc repository:

```powershell
docker compose up -d --build
docker compose ps
docker compose logs -f backend
```

Lần build đầu sẽ tải Python packages và model TTS nên cần thời gian, mạng ổn định và dung lượng đĩa. Backend chỉ bind vào `127.0.0.1:8000`, không mở cổng trực tiếp ra Internet. Kiểm tra trên máy chủ:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/
```

Các lệnh quản lý thường dùng:

```powershell
docker compose restart backend
docker compose down
docker compose up -d --build
```

Không chạy `docker compose down -v` nếu muốn giữ dữ liệu trong volume `backend_static`. Video được upload lên Supabase Storage; volume này giữ các file static dự phòng và thumbnail. Theo dõi dung lượng ổ đĩa vì volume không tự xóa file cũ.

### 4. Cho frontend Vercel kết nối an toàn

Tạo một HTTPS tunnel trỏ tới `http://localhost:8000` (ví dụ Cloudflare Tunnel), không cấu hình port-forward `8000` trên router. Tunnel cần chạy trên chính máy Windows và khởi động cùng Windows.

Trong Vercel, đặt biến môi trường `API_BASE_URL` thành URL HTTPS của tunnel, ví dụ `https://your-machine.your-tailnet.ts.net`, rồi redeploy frontend. Frontend production gọi backend qua cùng-origin `/api`; `API_BASE_URL` chỉ được Next.js server dùng làm đích proxy trong `frontend/next.config.ts`. Không đặt Supabase service-role key trong Vercel.

### 5. Cập nhật backend

Sau khi lấy code mới về máy chủ, chạy tại thư mục gốc:

```powershell
git pull
docker compose up -d --build
docker compose logs --tail 100 backend
```

Backend dùng PostgreSQL/Supabase hiện có. Không chạy migration tùy tiện trên database đang có dữ liệu; chỉ chạy `python -m prisma migrate deploy` trong container khi đã xác nhận có migration mới cần áp dụng và migration history của database đã được thiết lập đúng.

## Triển khai thủ công trên máy cá nhân

Backend không còn tự động đẩy lên Hugging Face khi push Git. Máy Windows phải bật, có Internet và Docker Desktop đang chạy thì backend/tunnel mới truy cập được. Đây là phương án tự host; không đảm bảo uptime như dịch vụ hosting chuyên dụng.
