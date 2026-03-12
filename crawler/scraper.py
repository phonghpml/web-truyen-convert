from playwright.async_api import async_playwright
import asyncio
import urllib.parse

# Biến toàn cục để giữ trình duyệt luôn mở
_browser = None
_context = None

async def get_browser():
    global _browser, _context
    if _browser is None:
        pw = await async_playwright().start()
        # Thêm các args để chạy ổn định trên Docker và giấu dấu vết bot
        _browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox", 
                "--disable-setuid-sandbox", 
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled" # Giấu trạng thái bot
            ]
        )
        _context = await _browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            viewport={'width': 1280, 'height': 720},
            locale="vi-VN"
        )
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
    url = urllib.parse.unquote(url)
    
    # 69shuba thường chặn bot ở link /txt/, tự động chuyển sang link /book/ để ổn định hơn
    if "/txt/" in url:
        url = url.replace("/txt/", "/book/")
        if not url.endswith(".htm"):
            url += ".htm"

    context = await get_browser()
    page = await context.new_page()
    await page.route("**/*.{png,jpg,jpeg,gif,css,svg}", lambda route: route.abort())

    try:
        # Dùng networkidle để đợi trang tải xong hoàn toàn
        await page.goto(url, wait_until="networkidle", timeout=30000)
        
        content = await page.evaluate('''() => {
            // Thêm nhiều selector dự phòng
            const el = document.querySelector('.txtnav') || document.querySelector('.content') || document.querySelector('#content');
            if (!el) return "";
            
            const extras = el.querySelectorAll('h1, .head, .bottom-ad, script, style, a, .top_ad');
            extras.forEach(item => item.remove());
            
            return el.innerText;
        }''')
        
        return content.strip()
    except Exception as e:
        print(f"❌ Lỗi Scrape Content: {e}")
        return None
    finally:
        await page.close()
