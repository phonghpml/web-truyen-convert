import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = "web_truyen";
const BOOKS_COLLECTION = "books";
const CHAPTERS_COLLECTION = "chapters";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";

    if (!query.trim()) {
      return NextResponse.json(
        { error: "Query không được để trống" },
        { status: 400 }
      );
    }

    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(DB_NAME);

    // Tìm kiếm theo tên truyện
    const books = await db
      .collection(BOOKS_COLLECTION)
      .find({
        $or: [
          { title_vi: { $regex: query, $options: "i" } },
          { author_vi: { $regex: query, $options: "i" } },
        ],
      })
      .limit(10)
      .toArray();

    // Lấy số chương cho mỗi truyện
    const booksWithChapters = await Promise.all(
      books.map(async (book) => {
        const chapterCount = await db
          .collection(CHAPTERS_COLLECTION)
          .countDocuments({ book_source_url: book.source_url });

        return {
          ...book,
          chapters_count: chapterCount,
        };
      })
    );

    client.close();

    return NextResponse.json({
      success: true,
      data: booksWithChapters,
    });
  } catch (error) {
    console.error("Error searching books:", error);
    return NextResponse.json(
      { error: "Failed to search books" },
      { status: 500 }
    );
  }
}
