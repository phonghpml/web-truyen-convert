FROM python:3.9

# 1. Cài đặt các thư viện hệ thống cần thiết
RUN apt-get update && apt-get install -y \
    lsb-release \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libnss3 \
    libxss1 \
    libxtst6 \
    && rm -rf /var/lib/apt/lists/*

# 2. Tạo User mới (Hugging Face yêu cầu User ID 1000)
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# 3. Copy và cài đặt thư viện Python
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# 4. Cài đặt Playwright và Trình duyệt
# Chúng ta cài đặt vào thư mục home của user để không bị lỗi quyền
RUN playwright install chromium
RUN playwright install-deps chromium

# 5. Copy toàn bộ code vào container
COPY --chown=user:user . .

# 6. Chạy ứng dụng (Port 7860 là mặc định của HF)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
