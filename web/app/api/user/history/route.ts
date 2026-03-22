import { auth } from "@/auth";
import { DB } from "@/lib/constants";
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let client;
  try {
    // 1. Kiểm tra đăng nhập qua NextAuth
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    // 2. Lấy dữ liệu chương đang đọc từ Client gửi lên
    const { book_url, chapter_url, chapter_title } = await req.json();

    if (!book_url || !chapter_url) {
      return NextResponse.json({ success: false, error: "Thiếu dữ liệu" }, { status: 400 });
    }

    // 3. Kết nối MongoDB
    client = await clientPromise;
    const db = client.db(DB.NAME);
    const collection = db.collection(DB.HISTORY_COLLECTION);

    // 4. Lưu hoặc Cập nhật (Upsert) dựa trên Email và Link truyện
    // Chúng ta dùng book_url (chính là source_url trong file bạn gửi) làm định danh bộ truyện
    await collection.updateOne(
      { 
        userEmail: session.user.email, 
        book_url: book_url 
      },
      { 
        $set: { 
          chapter_url, 
          chapter_title, 
          updated_at: new Date() 
        } 
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Lỗi API History:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  } finally {
    if (client) client.close();
  }
}
// Thêm vào bên dưới hàm POST trong file web/app/api/user/history/route.ts

export async function GET(req: Request) {
  let client;
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const book_url = searchParams.get("book_url");

    if (!session?.user?.email || !book_url) {
      return NextResponse.json({ success: false, data: null });
    }

    client = await clientPromise;
    const db = client.db(DB.NAME);
    
    // Tìm bản ghi mới nhất của người dùng này cho bộ truyện này
    const history = await db.collection(DB.HISTORY_COLLECTION).findOne({
      userEmail: session.user.email,
      book_url: book_url
    });

    return NextResponse.json({ success: true, data: history });

  } catch (error) {
    return NextResponse.json({ success: false, data: null }, { status: 500 });
  } finally {
    if (client) client.close();
  }
}
