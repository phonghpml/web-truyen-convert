import os
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime

load_dotenv() # Nạp biến từ file .env
# Cấu hình kết nối
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME")

client = MongoClient(
    MONGO_URI, 
    maxPoolSize=50, 
    retryWrites=True # Tự động thử lại nếu kết nối mạng chập chờn
)

# Kiểm tra kết nối ngay lập tức
try:
    
    client.admin.command('ping')
    db = client[DB_NAME]
except Exception as e:
    raise SystemExit(f"Không thể kết nối MongoDB: {e}")

# --- KHỞI TẠO INDEX (Chỉ chạy khi bắt đầu kết nối) ---
# Index cho bảng truyện (books) dựa trên source_url
db.books.create_index("source_url", unique=True)

# Index cho bảng chương (chapters) dựa trên url gốc
db.chapters.create_index("url", unique=True)

# Index kết hợp cho slug để làm đường dẫn web (Search theo slug trong 1 bộ truyện)
# Chạy dòng này nếu bạn đã có trường 'slug' trong dữ liệu chương
db.chapters.create_index([("book_source_url", 1), ("slug", 1)], unique=True)
# ---------------------------------------------------

def save_book(data):
    """Lưu thông tin tổng quan của truyện"""
    return db.books.update_one(
        {"source_url": data['source_url']}, 
        {"$set": {**data, "updated_at": datetime.now()}}, 
        upsert=True
    )

def save_chapters(book_url, chapters_list):
    """Lưu danh sách chương bằng Bulk Write để tối ưu tốc độ"""
    from pymongo import UpdateOne
    
    operations = []
    for ch in chapters_list:
        operations.append(
            UpdateOne(
                {"url": ch["url"]}, 
                {"$set": {**ch, "book_source_url": book_url, "updated_at": datetime.now()}}, 
                upsert=True
            )
        )
    
    if operations:
        return db.chapters.bulk_write(operations)
    return None

