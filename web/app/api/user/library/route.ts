import { auth } from "@/auth";
import { DB } from "@/lib/constants";
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

// API Kiểm tra & Lấy trạng thái tủ sách
export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const book_url = searchParams.get("book_url");

  if (!session?.user?.email || !book_url) return NextResponse.json({ isSaved: false });

  const client = await clientPromise;
  const db = client.db(DB.NAME);
  const saved = await db.collection(DB.LIBRARY_COLLECTION).findOne({
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
  const client = await clientPromise;
  const db = client.db(DB.NAME);
  const collection = db.collection(DB.LIBRARY_COLLECTION);

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
