import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

export async function POST(req: Request) {
  let client;
  try {
    const { source_url, title_vi, cover_url, description_vi, author_vi } = await req.json();

    client = await MongoClient.connect(MONGODB_URI);
    const db = client.db("web_truyen");

    // Cập nhật thông tin truyện (Luôn lấy thông tin mới nhất từ Crawler)
    const result = await db.collection("books").updateOne(
      { source_url: source_url },
      { 
        $set: { 
          title_vi, 
          cover_url, 
          description_vi, 
          author_vi,
          updated_at: new Date() 
        } 
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, isNew: result.upsertedCount > 0 });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  } finally {
    if (client) client.close();
  }
}
