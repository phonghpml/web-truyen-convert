import { DB } from "@/lib/constants";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * API Handler lấy thông tin truyện:
 * 1. Nếu có slug/id/source_url -> Trả về 1 truyện duy nhất (Ưu tiên hàng đầu)
 * 2. Nếu không có tham số -> Trả về danh sách truyện phân trang
 */
export async function GET(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db(DB.NAME);
    const url = new URL(req.url);

    // Lấy các tham số từ URL
    const slug = url.searchParams.get("slug");
    const id = url.searchParams.get("id");
    const sourceUrl = url.searchParams.get("source_url");
    const limit = parseInt(url.searchParams.get("limit") || "12", 10);
    const skip = parseInt(url.searchParams.get("skip") || "0", 10);

    // --- PHẦN 1: XỬ LÝ TRUY VẤN MỘT TRUYỆN CỤ THỂ ---
    let filter: any = null;

    if (slug) {
      filter = { slug: slug };
    } else if (sourceUrl) {
      filter = { source_url: sourceUrl };
    } else if (id) {
      try {
        filter = { _id: new ObjectId(id) };
      } catch (e) {
        return NextResponse.json({ success: false, error: "ID không hợp lệ" }, { status: 400 });
      }
    }

    // Nếu có filter tìm đích danh truyện
    if (filter) {
      const book = await db.collection(DB.BOOKS_COLLECTION).findOne(filter);
      
      if (!book) {
        return NextResponse.json({ success: true, data: [] });
      }

      // Đếm số chương cho truyện này
      const chaptersCount = await db
        .collection(DB.CHAPTERS_COLLECTION)
        .countDocuments({ book_source_url: book.source_url });
      
      book.chapters_count = chaptersCount;

      return NextResponse.json({ 
        success: true, 
        data: [book] // Trả về mảng 1 phần tử để đồng bộ với Frontend của bạn
      });
    }

    // --- PHẦN 2: XỬ LÝ LẤY DANH SÁCH TRUYỆN (MẶC ĐỊNH) ---
    // Chỉ chạy đến đây nếu không có slug, id hoặc source_url
    const [books, total] = await Promise.all([
      db.collection(DB.BOOKS_COLLECTION)
        .find({})
        .sort({ updated_at: -1 }) // Truyện mới cập nhật lên đầu
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(DB.BOOKS_COLLECTION).countDocuments()
    ]);

    // Lấy số chương cho từng truyện trong danh sách (Chạy song song tối ưu speed)
    const booksWithChapters = await Promise.all(
      books.map(async (book) => {
        const count = await db
          .collection(DB.CHAPTERS_COLLECTION)
          .countDocuments({ book_source_url: book.source_url });
        return { ...book, chapters_count: count };
      })
    );

    return NextResponse.json({
      success: true,
      data: booksWithChapters,
      total,
      limit,
      skip,
    });

  } catch (error) {
    console.error("[API_BOOKS_GET_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi kết nối cơ sở dữ liệu" },
      { status: 500 }
    );
  }
}