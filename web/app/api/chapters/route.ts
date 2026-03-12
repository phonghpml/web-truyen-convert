import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = "web_truyen";
const CHAPTERS_COLLECTION = "chapters";

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

    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(DB_NAME);

    // dữ liệu lưu trong collection chỉ có trường "chapter_no" (không phải "index").
    // trước đây sort({ index: 1 }) không có tác dụng nên thứ tự trả về có thể loạn.
    const chapters = await db
      .collection(CHAPTERS_COLLECTION)
      .find({ book_source_url: book })
      .sort({ chapter_no: 1 }) // sắp xếp theo số chương tăng dần
      .toArray();

    client.close();
    return NextResponse.json({ success: true, data: chapters });
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch chapters" },
      { status: 500 }
    );
  }
}
