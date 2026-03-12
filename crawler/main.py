from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import database as db_mod
import scraper as scr
import translator_utils as tr
from datetime import datetime
from contextlib import asynccontextmanager # Thêm dòng này

# 1. Định nghĩa Lifespan để thay thế cho @app.on_event("startup")
@asynccontextmanager
async def lifespan(app: FastAPI):
    # [STARTUP]: Chạy khi server bắt đầu
    # Bạn có thể thực hiện nạp từ điển hoặc kết nối DB ở đây
    print("🚀 Hệ thống Convert đã sẵn sàng với 1.4 triệu cụm từ!")
    
    yield  # Nơi ứng dụng hoạt động
    
    # [SHUTDOWN]: Chạy khi tắt server (nếu cần)
    print("💤 Hệ thống đang đóng...")

# 2. Khởi tạo app với lifespan
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TranslationRequest(BaseModel):
    url: str

def format_chapter_url(url: str) -> str:
    url = url.strip()
    if url.endswith(".htm"):
        return url.rsplit('.', 1)[0] + "/"
    if not url.endswith("/"):
        return url + "/"
    return url

# --- CÁC API ENDPOINTS ---

@app.post("/get-basic-info")
async def api_get_info(request: TranslationRequest):
    print(f"🔍 Đang lấy thông tin: {request.url}")
    raw = await scr.scrape_basic_info(request.url)
    
    if not raw:
        raise HTTPException(status_code=400, detail="Không lấy được dữ liệu từ link này.")
    
    try:
        book_data = {
            "source_url": request.url,
            "title_vi": tr.translate_text(raw.get('title_cn', '')),
            "author_vi": tr.translate_text(raw.get('author_cn', '')),
            "description_vi": tr.translate_text(raw.get('description_cn', ''), limit=1000),
            "cover_url": raw.get('cover_url', ''),
            "status": "info_only",
            "updated_at": datetime.now().isoformat() # Thêm thời gian cập nhật nếu cần
        }
        db_mod.save_book(book_data)
        return {"success": True, "data": book_data}
    except Exception as e:
        print(f"❌ Lỗi xử lý Convert: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get-chapters")
async def api_get_chapters(request: TranslationRequest):
    chapter_url = format_chapter_url(request.url)
    print(f"📡 Đang quét chương tại: {chapter_url}")

    raw_chapters = await scr.scrape_chapters(chapter_url)
    
    if not raw_chapters:
        raise HTTPException(status_code=400, detail="Không lấy được danh sách chương.")
    
    try:
        translated_chapters = []
        for index, ch in enumerate(raw_chapters):
            title_cn = ch.get('title_cn', 'Chương không tên')
            url_chapter = ch.get('url', '')
            
            translated_chapters.append({
                "chapter_no": index + 1,
                "title_vi": tr.translate_text(title_cn),
                "url": url_chapter
            })
            
        db_mod.save_chapters(request.url, translated_chapters)
        print(f"✅ Đã dịch và LƯU DATABASE xong {len(translated_chapters)} chương")
        
        return {
            "success": True,
            "total": len(translated_chapters),
            "chapters": translated_chapters
        }
    except Exception as e:
        print(f"❌ Lỗi tại api_get_chapters: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get-chapter-content")
async def api_get_content(request: TranslationRequest):
    print(f"📄 Đang lấy nội dung: {request.url}")
    raw_content = await scr.scrape_chapter_content(request.url)
    
    if not raw_content:
        raise HTTPException(status_code=400, detail="Không lấy được nội dung chương.")

    try:
        content_vi = tr.translate_text(raw_content)
        # Thay thế xuống dòng bằng <br/> để hiển thị HTML tốt hơn
        formatted_content = content_vi.replace('\n', '<br/>')
        
        return {
            "success": True,
            "content_html": formatted_content
        }
    except Exception as e:
        print(f"❌ Lỗi dịch nội dung: {e}")
        raise HTTPException(status_code=500, detail=str(e))
