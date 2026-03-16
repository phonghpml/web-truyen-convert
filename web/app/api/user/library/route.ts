import { NextResponse } from "next/server";
import { auth } from "@/auth"; 
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = "web_truyen";
const LIBRARY_COLLECTION = "user_library";

// API Kiểm tra & Lấy trạng thái tủ sách
export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const book_url = searchParams.get("book_url");

  if (!session?.user?.email || !book_url) return NextResponse.json({ isSaved: false });

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);
  const saved = await db.collection(LIBRARY_COLLECTION).findOne({
    userEmail: session.user.email,
    book_url: book_url
  });
  
  await client.close();
  return NextResponse.json({ isSaved: !!saved });
}

// API Toggle (Thêm/Xóa)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { book_url, title_vi, cover_url } = await req.json();
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);
  const collection = db.collection(LIBRARY_COLLECTION);

  const existing = await collection.findOne({ userEmail: session.user.email, book_url });

  if (existing) {
    await collection.deleteOne({ _id: existing._id });
    await client.close();
    return NextResponse.json({ isSaved: false, message: "Đã xóa khỏi tủ sách" });
  } else {
    await collection.insertOne({
      userEmail: session.user.email,
      book_url,
      title_vi,
      cover_url,
      created_at: new Date()
    });
    await client.close();
    return NextResponse.json({ isSaved: true, message: "Đã lưu vào tủ sách" });
  }
}
