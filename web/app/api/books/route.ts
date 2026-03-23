import { DB } from "@/lib/constants";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db(DB.NAME);

    // Lấy danh sách sách với phân trang, hoặc theo id nếu có
    const url = new URL(req.url);
    const sourceUrl = url.searchParams.get("source_url");
    const bookId = url.searchParams.get("id");
    
    if (sourceUrl) {
      const book = await db
        .collection(DB.BOOKS_COLLECTION)
        .findOne({ source_url: sourceUrl });
      if (book) {
        // cũng thêm trường chapter count
        const chapterCount = await db
          .collection(DB.CHAPTERS_COLLECTION)
          .countDocuments({ book_source_url: book.source_url });
        book.chapters_count = chapterCount;
      }
      
      return NextResponse.json({ success: true, data: book ? [book] : [] });
    }
    
    if (bookId) {
      let book;
      try {
        // Thử query bằng ObjectId trước
        book = await db
          .collection(DB.BOOKS_COLLECTION)
          .findOne({ _id: new ObjectId(bookId) } as any);
      } catch {
        // Nếu không phải ObjectId hợp lệ, skip
      }
      
      if (book) {
        const chapterCount = await db
          .collection(DB.CHAPTERS_COLLECTION)
          .countDocuments({ book_source_url: book.source_url });
        book.chapters_count = chapterCount;
      }
      
      return NextResponse.json({ success: true, data: book ? [book] : [] });
    }

    const limit = parseInt(url.searchParams.get("limit") || "12", 10);
    const skip = parseInt(url.searchParams.get("skip") || "0", 10);

    const books = await db
      .collection(DB.BOOKS_COLLECTION)
      .find({})
      .sort({ updated_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Lấy số chương cho mỗi truyện
    const booksWithChapters = await Promise.all(
      books.map(async (book) => {
        const chapterCount = await db
          .collection(DB.CHAPTERS_COLLECTION)
          .countDocuments({ book_source_url: book.source_url });

        return {
          ...book,
          chapters_count: chapterCount,
        };
      })
    );

    const total = await db.collection(DB.BOOKS_COLLECTION).countDocuments();

    

    return NextResponse.json({
      success: true,
      data: booksWithChapters,
      total,
      limit,
      skip,
    });
  } catch (error) {
    console.error("Error fetching books:", error);
    return NextResponse.json(
      { error: "Failed to fetch books" },
      { status: 500 }
    );
  }
}
