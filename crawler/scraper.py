from playwright.async_api import async_playwright
import asyncio
import urllib.parse



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

import asyncio
import urllib.parse
import re
from playwright.async_api import async_playwright

async def scrape_stv_chapter_content(url: str):
    url = urllib.parse.unquote(url).strip()
    print(f"🔍 Đang truy cập: {url}")
    
    context = await get_browser() # Sử dụng browser context hiện tại của Phong
    page = await context.new_page()
    
    # Biến hứng dữ liệu từ API sajax của STV
    captured_data = {"raw": None}

    # Lắng nghe Network để bắt gói tin JSON chứa nội dung truyện
    async def handle_response(response):
        if "sajax=readchapter" in response.url:
            try:
                json_res = await response.json()
                if json_res.get("data"):
                    captured_data["raw"] = json_res["data"]
                    print(f"✅ Đã bắt được nội dung từ API (Size: {len(captured_data['raw'])} chars)")
            except Exception as e:
                print(f"⚠️ Lỗi parse JSON API: {e}")

    page.on("response", handle_response)

    try:
        # Bước 1: Điều hướng tới trang (đợi mạng ổn định một chút)
        await page.goto(url, wait_until="commit", timeout=60000)
        
        # Bước 2: Thủ thuật kích hoạt Load (Mồi cho STV gọi API sajax)
        # STV đôi khi đợi người dùng tương tác mới chịu load nội dung
        await asyncio.sleep(1) # Đợi JS trang chủ load xong
        try:
            # Click vào vùng chứa nội dung để 'đánh thức' script của STV
            await page.click("#content-container", timeout=5000)
        except:
            # Nếu không có ID đó, cuộn chuột nhẹ để kích hoạt lazyload
            await page.mouse.wheel(0, 500)
            print("🖱️ Đã cuộn trang để kích hoạt API")

        # Bước 3: Vòng lặp chờ dữ liệu (Tối đa 15 giây)
        found = False
        for i in range(30): 
            if captured_data["raw"]:
                found = True
                break
            await asyncio.sleep(0.5)

        if not found:
            print("❌ Quá thời gian chờ nhưng không bắt được API sajax=readchapter")
            # Chụp ảnh debug nếu cần (Lưu vào thư mục hiện tại của Phong)
            await page.screenshot(path="debug_stv_error.png")
            return None

        # Bước 4: Xử lý bóc tách text từ HTML thô trong JSON
        raw_html = captured_data["raw"]
        paragraphs = []
        
        # Tách các đoạn theo thẻ <p>
        raw_sections = raw_html.split('<p>')
        for section in raw_sections:
            # Regex lấy nội dung hiển thị nằm trong các thẻ <i> của STV
            # Cấu trúc: <i ...>Chữ Hiển Thị</i>
            words = re.findall(r'>([^<]+)</i>', section)
            if words:
                # Ghép các từ lại thành dòng hoàn chỉnh, xóa khoảng trắng thừa
                line = " ".join(words).strip()
                if line:
                    paragraphs.append(line)

        if not paragraphs:
            print("❌ Regex không tìm thấy nội dung hợp lệ trong dữ liệu bắt được")
            return None

        print(f"🚀 Thành công: Đã lấy được {len(paragraphs)} đoạn văn.")
        return "\n".join(paragraphs)

    except Exception as e:
        print(f"❌ Lỗi hệ thống Scraper STV: {str(e)}")
        return None
    finally:
        # Quan trọng: Luôn đóng page để giải phóng RAM cho WSL 2
        await page.close()