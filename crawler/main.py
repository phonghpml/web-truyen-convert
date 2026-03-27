from fastapi import FastAPI, HTTPException, Query # Thêm Query
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse # Thêm dòng này
import database as db_mod
import scraper as scr
import translator_utils as tr
import edge_tts # Thêm dòng này
import re # Thêm dòng này
from datetime import datetime
from contextlib import asynccontextmanager
from slugify import slugify
import random

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Hệ thống Convert đã sẵn sàng với 1.4 triệu cụm từ!")
    # Đảm bảo nạp từ điển vào RAM từ đây
    tr.translator.load_all_dicts() 
    yield
    if scr._browser:
        await scr._browser.close()
    print("💤 Hệ thống đang đóng...")

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


def generate_unique_slug(title: str) -> str:
    base_slug = slugify(title)
    suffix = str(random.randint(1000, 9999))  # 4 số ngẫu nhiên
    return f"{base_slug}-{suffix}"


# --- CÁC API ENDPOINTS GIỮ NGUYÊN ---

@app.post("/get-basic-info")
async def api_get_info(request: TranslationRequest):
    print(f"🔍 Đang lấy thông tin: {request.url}")
    raw = await scr.scrape_basic_info(request.url)
    if not raw:
        raise HTTPException(status_code=400, detail="Không lấy được dữ liệu.")
    try:
        book_data = {
            "source_url": request.url,
            "title_vi": tr.translate_text(raw.get('title_cn', '')),
            "author_vi": tr.translate_text(raw.get('author_cn', '')),
            "description_vi": tr.translate_text(raw.get('description_cn', ''), limit=1000),
            "cover_url": raw.get('cover_url', ''),
            "status": "info_only",
            "updated_at": datetime.now().isoformat(),
            "slug": generate_unique_slug(tr.translate_text(raw.get('title_cn', '')))
        }
        db_mod.save_book(book_data)
        return {"success": True, "data": book_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get-chapters")
async def api_get_chapters(request: TranslationRequest):
    chapter_url = format_chapter_url(request.url)
    raw_chapters = await scr.scrape_chapters(chapter_url)
    if not raw_chapters:
        raise HTTPException(status_code=400, detail="Không lấy được danh sách chương.")
    try:
        translated_chapters = []
        for index, ch in enumerate(raw_chapters):
            translated_chapters.append({
                "chapter_no": index + 1,
                "title_vi": tr.translate_text(ch.get('title_cn', '')),
                "url": ch.get('url', '')
            })
        db_mod.save_chapters(request.url, translated_chapters)
        return {"success": True, "total": len(translated_chapters), "chapters": translated_chapters}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- PHẦN SỬA ĐỔI CHO ĐỌC TRUYỆN & TTS ---

@app.post("/get-chapter-content")
async def api_get_content(request: TranslationRequest):
    """Sửa để trả về mảng paragraphs phục vụ highlight"""
    raw_content = await scr.scrape_chapter_content(request.url)
    if not raw_content:
        raise HTTPException(status_code=400, detail="Không lấy được nội dung.")

    try:
        # Tách dòng, lọc rác và dịch từng đoạn
        raw_lines = [p.strip() for p in raw_content.split('\n') if p.strip()]
        translated_paragraphs = []
        
        for line in raw_lines:
            translated = tr.translate_text(line)
            # Lọc bỏ dòng rác ngày tháng nhưng giữ tiêu đề chương
            if not re.match(r'^\d{4}-\d{2}-\d{2}', translated):
                translated_paragraphs.append(translated)
        
        return {
            "success": True,
            "paragraphs": translated_paragraphs # Trả về mảng thay vì HTML string
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stream-chapter-audio")
async def api_stream_audio(
    text: str = Query(...), 
    rate: str = Query("+0%"), 
    voice: str = Query("vi-VN-NamMinhNeural")
):
    # FIX LỖI UBUNTU: Biến dấu cách (do URL decode nhầm) thành dấu +
    rate_clean = rate.replace(" ", "+").strip()
    
    # Đảm bảo luôn có dấu + hoặc - ở đầu
    if not rate_clean.startswith("+") and not rate_clean.startswith("-"):
        rate_clean = "+" + rate_clean

    try:
        communicate = edge_tts.Communicate(text, voice, rate=rate_clean)
        async def audio_generator():
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]
        return StreamingResponse(audio_generator(), media_type="audio/mpeg")
    except Exception as e:
        print(f"❌ Lỗi TTS: {e}")
        raise HTTPException(status_code=500, detail=str(e))
