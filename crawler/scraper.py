from playwright.async_api import async_playwright
import asyncio
import urllib.parse
import re



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

import urllib.parse
import asyncio
import re
import json

async def scrape_stv_chapter_content(url: str):
    url = urllib.parse.unquote(url).strip()
    print(f"🔍 Đang truy cập: {url}")
    path_parts = url.rstrip("/").split("/")
    target_id = path_parts[-1]
    print(f"🎯 Mục tiêu: Phải khớp ID {target_id} trong Network")
    
    context = await get_browser() 
    page = await context.new_page()
    
    # Biến hứng dữ liệu kèm metadata để kiểm tra
    captured_data = {"raw": None, "url_found": None}

    async def handle_response(response):
        res_url = response.url
        
        # BẮT LỖI 1: Log tất cả các request có liên quan đến readchapter để xem có bao nhiêu cái đang chạy
        if "sajax=readchapter" in res_url:
            print(f"📡 Thấy API gọi: {res_url[:100]}...") # Log ngắn gọn URL API

            if target_id in res_url:
                try:
                    if response.status == 200:
                        json_res = await response.json()
                        data = json_res.get("data")
                        
                        # BẮT LỖI 2: Kiểm tra xem data có thực sự là nội dung truyện không
                        if data:
                            # Nếu đã có dữ liệu rồi mà vẫn nhận thêm (do reload/F5) thì log lại
                            if captured_data["raw"]:
                                print(f"⚠️ CẢNH BÁO: Nhận thêm dữ liệu mới cho ID {target_id}. Có thể do F5 nhanh quá.")
                            
                            captured_data["raw"] = data
                            captured_data["url_found"] = res_url
                            print(f"✅ Đã bắt đúng API cho chương ID: {target_id} (Size: {len(data)})")
                        else:
                            print(f"❗ API trả về JSON thành công nhưng 'data' bị rỗng. Chi tiết: {json_res}")
                    else:
                        print(f"❌ API trả về lỗi Status: {response.status}")
                except Exception as e:
                    print(f"⚠️ Lỗi parse JSON: {e}")
            else:
                # BẮT LỖI 3: Nếu bắt được API nhưng không chứa target_id
                print(f"⏭️ Bỏ qua API không thuộc chương này (Có thể là chương trước đó)")

    page.on("response", handle_response)

    try:
        # Bước 1: Điều hướng - dùng 'networkidle' để đảm bảo ko còn request ngầm
        await page.goto(url, wait_until="networkidle", timeout=60000)
        
        # Bước 2: Kích hoạt load
        await asyncio.sleep(2) 
        
        try:
            await page.click("#content-container", timeout=3000)
        except:
            await page.mouse.wheel(0, 1000)
            print("🖱️ Đã cuộn trang")

        # Bước 3: Chờ dữ liệu
        found = False
        for i in range(30): 
            if captured_data["raw"]:
                found = True
                break
            if i % 10 == 0: print(f"⏳ Đang đợi API khớp ID {target_id}...")
            await asyncio.sleep(0.5)

        if not found:
            print(f"❌ THẤT BẠI: Không bắt được API nào chứa ID {target_id}")
            # Chụp ảnh để xem có bị dính Captcha/Cloudflare không
            await page.screenshot(path=f"fail_{target_id}.png")
            return None

        # Bước 4: Xử lý nội dung
        raw_html = captured_data["raw"]
        
        # BẮT LỖI 4: Kiểm tra xem có phải nội dung thật hay là nội dung chờ load
        if "Đang tải nội dung" in raw_html or len(raw_html) < 200:
            print("⚠️ Dữ liệu bắt được có vẻ là placeholder 'Đang tải...', không phải nội dung thật.")
        
        # ... (Phần xử lý paragraphs phía dưới giữ nguyên) ...
        # [Để tiết kiệm diện tích, phần bóc tách regex bạn giữ nguyên như code cũ]
        
        # Cuối cùng: Log một đoạn nhỏ kết quả đã sạch
        result = "\n".join(paragraphs)
        print(f"🚀 Thành công. Preview: {result[:100]}...")
        return result

    except Exception as e:
        print(f"❌ Lỗi Scraper: {str(e)}")
        return None
    finally:
        await page.close()