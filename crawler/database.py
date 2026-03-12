from pymongo import MongoClient
from datetime import datetime

# Cấu hình kết nối
MONGO_URI = "mongodb+srv://admin_web_truyen:290599@bemain.shalbdz.mongodb.net/web_truyen?appName=BeMain"
client = MongoClient(MONGO_URI)
db = client.web_truyen

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

