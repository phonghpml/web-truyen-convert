from playwright.async_api import async_playwright
import asyncio

# Biến toàn cục để giữ trình duyệt luôn mở
_browser = None
_context = None

async def get_browser():
    global _browser, _context
    if _browser is None:
        pw = await async_playwright().start()
        # Thêm các args này để chạy ổn định trên Docker/Linux
        _browser = await pw.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        )
        _context = await _browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."
        )
    return _context

async def scrape_basic_info(url: str):
    context = await get_browser()
    page = await context.new_page()
    
    # Tối ưu: Chặn tải ảnh, css để tải trang nhanh hơn 5 lần
    await page.route("**/*.{png,jpg,jpeg,gif,css,woff,woff2,svg}", lambda route: route.abort())

    try:
        # Chỉ đợi tối đa 15s, nếu quá là bỏ qua
        await page.goto(url, wait_until="domcontentloaded", timeout=15000)
        
        # Đợi một chút nếu có Cloudflare (tùy độ khó của web)
        # await page.wait_for_timeout(1000) 

        # Lấy dữ liệu bằng Selector (Bạn hãy kiểm tra lại Class trên web nhé)
        data = await page.evaluate('''() => {
            const title = document.querySelector('.booknav2 h1 a')?.innerText || "";
            const author = document.querySelector('.booknav2 p a')?.innerText || "";
            const desc = document.querySelector('.navtxt')?.innerText || "";
            const cover = document.querySelector('.bookimg2 img')?.src || "";
            return {
                title_cn: title,
                author_cn: author,
                description_cn: desc,
                cover_url: cover
            };
        }''')
        
        return data
    except Exception as e:
        print(f"❌ Lỗi Playwright: {e}")
        return None
    finally:
        await page.close() # Chỉ đóng Tab, KHÔNG đóng trình duyệt

# Thêm vào scraper.py
async def scrape_chapters(url: str):
    context = await get_browser()
    page = await context.new_page()
    
    # Tăng tốc độ bằng cách chặn các tài nguyên không cần thiết
    await page.route("**/*.{png,jpg,jpeg,gif,css,woff,woff2,svg}", lambda route: route.abort())

    try:
        # Đợi trang tải xong DOM (chứa danh sách chương)
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        
        # Đợi 1 giây để đảm bảo danh sách chương dài đã render hết
        await page.wait_for_timeout(1000)

        # Lấy tất cả link trong các vùng chứa danh sách chương của 69shuba
        chapters = await page.evaluate('''() => {
            const selectors = '.catalog ul li a, .quanshu ul li a, .content ul li a';
            const items = Array.from(document.querySelectorAll(selectors));
            
            return items.map(item => ({
                title_cn: item.innerText.trim(),
                url: item.href
            }));
        }''')
        
        # LỌC: Chỉ lấy link chứa mã số chương (/txt/) và tiêu đề không rỗng
        # Link /book/ thường chỉ là link giới thiệu, không phải chương
        filtered = [c for c in chapters if "/txt/" in c['url'] and c['title_cn']]
        
        # Loại bỏ trùng lặp (vì trang này thường lặp lại 10 chương mới nhất ở đầu)
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
    context = await get_browser()
    page = await context.new_page()
    # Chặn ảnh để tải cực nhanh vì chỉ lấy text
    await page.route("**/*.{png,jpg,jpeg,gif,css,svg}", lambda route: route.abort())

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
        
        content = await page.evaluate('''() => {
            const el = document.querySelector('.txtnav');
            if (!el) return "";
            
            // Xóa các thành phần thừa, quảng cáo, và link nhúng
            const extras = el.querySelectorAll('h1, .head, .bottom-ad, script, style, a');
            extras.forEach(item => item.remove());
            
            return el.innerText;
        }''')
        
        return content.strip()
    except Exception as e:
        print(f"❌ Lỗi Scrape Content: {e}")
        return None
    finally:
        await page.close()

