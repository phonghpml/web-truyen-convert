FROM python:3.14

# 1. Cài đặt các thư viện hệ thống cần thiết (Dùng quyền root mặc định của Docker build)
USER root
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# 2. Thiết lập thư mục làm việc và User
WORKDIR /app
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# 3. Cài đặt thư viện Python
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# 4. Copy toàn bộ code (cloakbrowser sẽ tự động download binary khi khởi tạo)
COPY --chown=user . .

# 5. Tạo thư mục model với quyền root, sau đó gán cho user để tránh lỗi Permission denied
RUN mkdir -p /app/.nghitts-models && chown -R user:user /app/.nghitts-models

# 6. Tải model NghiTTS từ Hugging Face trước khi build chạy để tránh đẩy file >10MB lên repo
USER user
RUN curl -L "https://huggingface.co/Phonghp/webtruyen-models/resolve/main/ngochuyennew.onnx?download=true" -o /app/.nghitts-models/ngochuyennew.onnx && \
    curl -L "https://huggingface.co/Phonghp/webtruyen-models/resolve/main/ngochuyennew.onnx.json?download=true" -o /app/.nghitts-models/ngochuyennew.onnx.json

# 7. Sinh Prisma Client Python trước khi chạy ứng dụng
RUN python3 -m prisma py generate

# 8. Chạy ứng dụng trên cổng 7860
CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
