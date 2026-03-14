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
