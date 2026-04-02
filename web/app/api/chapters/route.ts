import { DB } from "@/lib/constants";
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const book = url.searchParams.get("book");
    if (!book) {
      return NextResponse.json(
        { success: false, error: "Missing book parameter" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB.NAME);

    // dữ liệu lưu trong collection chỉ có trường "chapter_no" (không phải "index").
    // trước đây sort({ index: 1 }) không có tác dụng nên thứ tự trả về có thể loạn.
    const chapters = await db
      .collection(DB.CHAPTERS_COLLECTION)
      .find({ book_source_url: book }, {
        projection: {
          content: 0,        // KHÔNG lấy nội dung (để API nhẹ hơn)
          _id: 0             // Có thể ẩn _id nếu không dùng ở Frontend
        }
      })
      .sort({ chapter_no: 1 }) // sắp xếp theo số chương tăng dần
      .toArray();
    return NextResponse.json({ success: true, data: chapters });
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch chapters" },
      { status: 500 }
    );
  }
}
