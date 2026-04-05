import asyncio
import json
import re
import urllib.parse
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

# Biến toàn cục
_browser = None
_context = None


async def get_browser():
    global _browser, _context
    if _browser is None:
        pw = await async_playwright().start()
        _browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                # GIẤU DẤU VẾT BOT (QUAN TRỌNG NHẤT)
                "--disable-blink-features=AutomationControlled", 
                "--disable-infobars",
                "--window-position=0,0",
                "--ignore-certificate-errors",
            ]
        )
        _context = await _browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            viewport={'width': 1280, 'height': 720},
            locale="vi-VN",
            timezone_id="Asia/Ho_Chi_Minh"
        )
        
        # XOÁ DẤU VẾT WEBDRIVER TRÊN TOÀN BỘ TRANG
        await _context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            window.chrome = { runtime: {} };
        """)
    return _context


async def scrape_basic_info(url: str):
    url = urllib.parse.unquote(url) # Fix lỗi link mã hóa gây 400
    context = await get_browser()
    page = await context.new_page()
    await page.route("**/*.{png,jpg,jpeg,gif,css,woff,woff2,svg}", lambda route: route.abort())

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
        
        data = await page.evaluate('''() => {
            const title = document.querySelector('.booknav2 h1 a')?.innerText || "";
            const author = document.querySelector('.booknav2 p a')?.innerText || "";
            const desc = document.querySelector('.navtxt')?.innerText || "";
            const cover = document.querySelector('.bookimg2 img')?.src || "";
            return { title_cn: title, author_cn: author, description_cn: desc, cover_url: cover };
        }''')
        return data
    except Exception as e:
        print(f"❌ Lỗi Playwright Info: {e}")
        return None
    finally:
        await page.close()

async def scrape_chapters(url: str):
    url = urllib.parse.unquote(url)
    context = await get_browser()
    page = await context.new_page()
    await page.route("**/*.{png,jpg,jpeg,gif,css,woff,woff2,svg}", lambda route: route.abort())

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(1000)

        chapters = await page.evaluate('''() => {
            const selectors = '.catalog ul li a, .quanshu ul li a, .content ul li a';
            const items = Array.from(document.querySelectorAll(selectors));
            return items.map(item => ({ title_cn: item.innerText.trim(), url: item.href }));
        }''')
        
        # Nhận diện cả link /txt/ và /book/
        filtered = [c for c in chapters if ("/txt/" in c['url'] or "/book/" in c['url']) and c['title_cn']]
        
        unique_chapters = []
        seen_urls = set()
        for ch in filtered:
            if ch['url'] not in seen_urls:
                unique_chapters.append(ch)
                seen_urls.add(ch['url'])

        print(f"✅ Đã tìm thấy: {len(unique_chapters)} chương")
        return unique_chapters
    except Exception as e:
        print(f"❌ Lỗi Scrape Chapters: {e}")
        return []
    finally:
        await page.close()

async def scrape_chapter_content(url: str):
    url = urllib.parse.unquote(url).strip()
    context = await get_browser()
    page = await context.new_page()
    
    # CÁCH GỠ LỖI: Dùng script tự thân để giấu webdriver thay cho thư viện lỗi
    await page.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        window.chrome = { runtime: {} };
    """)

    try:
        # Giả lập Referer để tránh bị 69shuba nghi ngờ bot cào
        await page.set_extra_http_headers({"Referer": "https://69shuba.cx"})
        
        # 1. Vào trang và đợi cho đến khi bắt đầu load (commit)
        await page.goto(url, wait_until="commit", timeout=30000)
        
        # 2. Quan trọng: Nghỉ 5 giây để Cloudflare nhả cho qua
        await asyncio.sleep(5) 
        
        # 3. Cuộn chuột nhẹ để giả lập người thật
        await page.mouse.wheel(0, 500)
        await asyncio.sleep(1) 
        
        # 4. Chờ đúng thẻ chứa nội dung truyện hiện ra
        await page.wait_for_selector(".txtnav", timeout=20000)

        content = await page.evaluate('''() => {
            const el = document.querySelector('.txtnav');
            if (!el) return null;
            // Xóa sạch quảng cáo, rác
            const targets = 'h1, .head, .bottom-ad, script, style, a, .top_ad, .p_ad';
            el.querySelectorAll(targets).forEach(item => item.remove());
            return el.innerText;
        }''')
        
        return content.strip() if content else None
    except Exception as e:
        # Chụp ảnh lỗi để soi xem nó hiện thông báo gì (Captcha hay Cloudflare)
        await page.screenshot(path="error_debug.png")
        print(f"❌ Lỗi Scrape Content: {str(e)}")
        return None
    finally:
        await page.close()
async def scrape_stv_basic_info(url: str):
    url = urllib.parse.unquote(url).strip()
    context = await get_browser()
    page = await context.new_page()
    try:
        # STV cần thời gian để render bản dịch JS
        await page.goto(url, wait_until="commit", timeout=60000)
        await page.wait_for_selector("#book_name2", timeout=20000)
        await asyncio.sleep(2) 

        return await page.evaluate('''() => {
            return { 
                title_vi: document.querySelector('#book_name2')?.innerText?.trim() || "", 
                author_vi: document.querySelector('h2')?.innerText?.trim() || "", 
                description_vi: document.querySelector('.textzoom')?.innerText?.trim() || "", 
                cover_url: document.querySelector('#thumb-prop')?.src || "" 
            };
        }''')
    except Exception as e:
        print(f"❌ Lỗi STV Info: {e}")
        return None
    finally:
        await page.close()

async def scrape_stv_chapters(url: str):
    url = urllib.parse.unquote(url).strip()
    print(f"🔍 Đang lấy danh sách chương từ STV: {url}")
    context = await get_browser()
    page = await context.new_page()
    
    # --- BƯỚC A: TẠO BIẾN ĐỂ HỨNG DỮ LIỆU ---
    api_raw_data = None
    
    async def handle_response(response):
        nonlocal api_raw_data
        # Nếu thấy gói tin có chứa 'getchapterlist' thì hốt luôn
        if "sajax=getchapterlist" in response.url:
            try:
                res_json = await response.json()
                api_raw_data = res_json.get("data")
            except:
                pass
            # Đăng ký lắng nghe sự kiện TRƯỚC KHI goto
    page.on("response", handle_response)

    try:
        await page.goto(url, wait_until="networkidle", timeout=60000)
        
        # Đợi một chút để API kịp trả về
        await asyncio.sleep(2)

        # --- BƯỚC B: ƯU TIÊN DÙNG DỮ LIỆU TỪ API ---
        if api_raw_data:
            print("✅ Đã bắt được ID chương từ API!")
            return parse_stv_data(api_raw_data, url)
    
        await page.wait_for_selector(".listchapitem", timeout=15000)
        
        return await page.evaluate('''() => {
            const links = Array.from(document.querySelectorAll('a.listchapitem'));
            return links.map(a => ({
                title_vi: a.innerText.trim(), 
                url: a.href
            })).filter(c => c.title_vi !== "");
        }''')
    except Exception as e:
        print(f"❌ Lỗi STV Chapters: {e}")
        return []
    finally:
        await page.close()
        
def parse_stv_data(raw_str, url):
    chapters = []
    items = raw_str.strip().split("-//-")
    for index, item in enumerate(items):
        if not item.strip(): continue
        parts = item.split("-/-")
        if len(parts) >= 3:
            c_id = parts[1].strip()
            title = parts[2].strip()
            chapters.append({
                "chapter_no": index + 1,
                "title_vi": title,
                "real_id": c_id,
                "url": f"{url}{c_id}/"
            })
    return chapters


import json

async def scrape_stv_chapter_content(url: str):
    # 1. Trích xuất ID để đối chiếu (Chống lấy nhầm chương cũ)
    url = urllib.parse.unquote(url).strip()
    path_parts = [p for p in url.split("/") if p]
    try:
        # Giả định URL: .../bookid/chapterid/
        target_chap_id = path_parts[4]
    except:
        return None

    print(f"🚀 [START] Đang xử lý chương: {target_chap_id}")
    
    # Lấy browser instance
    existing_context = await get_browser()
    browser = existing_context.browser 
    
    # 2. Tạo một context mới hoàn toàn (Incognito) để tránh dính Cookie/Session
    context = await browser.new_context()
    page = await context.new_page()

    captured_data = {"raw": None}

    # 3. Lắng nghe API sajax - Có lọc ID chương
    async def handle_response(response):
        res_url = response.url
        if "sajax=readchapter" in res_url and target_chap_id in res_url:
            try:
                # Đọc text và tìm JSON để tránh rác đầu chuỗi
                text_res = await response.text()
                start_idx = text_res.find('{"')
                if start_idx != -1:
                    data_json = json.loads(text_res[start_idx:])
                    if data_json.get("code") == "0" and data_json.get("data"):
                        captured_data["raw"] = data_json["data"]
            except:
                pass

    page.on("response", handle_response)

    try:
        # Bước 1: Điều hướng
        await page.goto(url, wait_until="commit", timeout=60000)
        
        # Bước 2: Đợi nạp script và kích hoạt API
        await asyncio.sleep(1.5)
        
        # Thử kích hoạt nạp bằng cách click hoặc cuộn chuột
        try:
            await page.click("#content-container", timeout=2000)
        except:
            await page.mouse.wheel(0, 500)

        # Bước 3: Chờ dữ liệu đổ về (Tối đa 12 giây)
        for _ in range(40):
            if captured_data["raw"]:
                break
            await asyncio.sleep(0.3)

        # Dự phòng: Click nút nạp nếu vẫn chưa thấy
        if not captured_data["raw"]:
            try:
                btn = page.get_by_text("Nhấp vào để tải chương")
                if await btn.is_visible(timeout=1000):
                    await btn.click()
                    for _ in range(20):
                        if captured_data["raw"]: break
                        await asyncio.sleep(0.3)
            except:
                pass

        if not captured_data["raw"]:
            return None

        # Bước 4: Bóc tách nội dung bằng Regex (Thẻ <i>)
        raw_html = captured_data["raw"]
        paragraphs = []
        
        for section in raw_html.split('<p>'):
            if "@Bạn đang đọc" in section:
                continue
                
            # Lấy text hiển thị trong các thẻ <i>
            words = re.findall(r'>([^<]+)</i>', section)
            if words:
                line = " ".join(words).strip()
                if line:
                    paragraphs.append(line)

        return "\n\n".join(paragraphs)

    except Exception as e:
        print(f"🔥 Lỗi Scraper: {str(e)}")
        return None
    finally:
        # QUAN TRỌNG: Gỡ listener và đóng context để giải phóng RAM
        page.remove_listener("response", handle_response)
        await page.close()
        await context.close()
        print(f"🏁 [FINISHED] Xong chương {target_chap_id}")