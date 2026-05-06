import { NextResponse } from 'next/server';

// Hàm hỗ trợ tạo độ trễ (delay) giữa các lần thử lại
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'yuepiao';
  const chn = searchParams.get('chn') || '0'; // Lấy thêm mã thể loại chn từ Frontend gửi lên

  const MAX_RETRIES = 2; // Thử lại tối đa 2 lần nếu Crawler gặp sự cố đột ngột
  let lastError = 'Không thể lấy dữ liệu từ dịch vụ crawler.';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Ép tham số type và chn trực tiếp vào URL gọi sang Backend FastAPI
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CRAWLER_URL}/get-qidian-rank?type=${type}&chn=${chn}&_t=${Date.now()}`, 
        {
          method: 'GET',
          // Sử dụng no-store khi đang thử lại để lấy dữ liệu mới nhất, tránh lấy lại cục lỗi cũ
          cache: attempt === 1 ? 'default' : 'no-store',
          next: { revalidate: attempt === 1 ? 43200 : 0 }
        }
      );

      if (!response.ok) {
        throw new Error(`Crawler phản hồi trạng thái HTTP: ${response.status}`);
      }
      
      const data = await response.json();

      // Nếu máy chủ crawler trả về lỗi context hoặc lỗi script ngầm
      if (data && (data.error || data.detail || data.success === false)) {
        throw new Error(data.error || data.detail || 'Tiến trình của Crawler bị gián đoạn giữa chừng.');
      }
      
      // Trả thẳng cục data từ FastAPI về (Vì bên FastAPI đã đóng gói chuẩn dạng { success: true, data: { data: [...] } })
      return NextResponse.json(data);

    } catch (error: any) {
      console.warn(`⚠️ Thử lần ${attempt} thất bại: ${error.message}`);
      lastError = error.message;
      
      // Nếu chưa hết số lần thử, đợi 1.5 giây để Crawler giải phóng tab trình duyệt cũ rồi thử lại
      if (attempt < MAX_RETRIES) {
        await delay(1500);
      }
    }
  }

  // Nếu sau các lần thử lại vẫn thất bại, lúc này mới trả về lỗi 502 cho UI
  return NextResponse.json(
    { success: false, message: `Crawler gặp sự cố liên tiếp: ${lastError}` }, 
    { status: 502 }
  );
}