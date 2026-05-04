import os
from dotenv import load_dotenv
from pymongo import MongoClient

def run_cleanup():
    # 1. Tải cấu hình từ file .env
    load_dotenv()
    MONGO_URI = os.getenv("MONGODB_URI")
    DB_NAME = os.getenv("MONGODB_DB_NAME")

    if not MONGO_URI or not DB_NAME:
        print("❌ Lỗi: Kiểm tra lại file .env (MONGODB_URI hoặc MONGODB_DB_NAME)")
        return

    try:
        # 2. Thiết lập kết nối
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        
        # Kiểm tra xem có kết nối được không
        client.admin.command('ping')
        
        # 3. Lấy danh sách tất cả các bảng (collections)
        all_cols = db.list_collection_names()
        
        # 4. Xác định các bảng cần xóa (loại trừ 'users')
        protected = ["users"]
        to_delete = [c for c in all_cols if c not in protected]

        if not to_delete:
            print(f"✨ Database '{DB_NAME}' hiện không có bảng nào khác ngoài 'users'.")
            return

        print(f"🔍 Database: {DB_NAME}")
        print(f"⚠️  Sẽ xóa dữ liệu trong các bảng: {', '.join(to_delete)}")
        print(f"🔒 Bảng sẽ được GIỮ LẠI: {', '.join(protected)}")
        
        # 5. Xác nhận lần cuối
        confirm = input("\n🔥 Bạn có chắc chắn muốn xóa sạch dữ liệu để cào lại không? (y/n): ")
        
        if confirm.lower() == 'y':
            for col_name in to_delete:
                # Dùng delete_many để giữ lại các Index (source_url, slug, v.v.)
                result = db[col_name].delete_many({})
                print(f"✅ Đã dọn dẹp '{col_name}': Xóa {result.deleted_count} bản ghi.")
            
            print("\n🚀 Xong! Hệ thống đã sẵn sàng để cào dữ liệu mới.")
        else:
            print("🚫 Đã hủy thao tác. Không có gì thay đổi.")

    except Exception as e:
        print(f"❌ Có lỗi xảy ra: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    run_cleanup()