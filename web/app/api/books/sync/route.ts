import { DB } from "@/lib/constants";
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";


export async function POST(req: Request) {
  let client;
  try {
    const { source_url, title_vi, cover_url, description_vi, author_vi, slug } = await req.json();

    client = await clientPromise;
    const db = client.db(DB.NAME);

    // Cập nhật thông tin truyện (Luôn lấy thông tin mới nhất từ Crawler)
    const result = await db.collection("books").updateOne(
      { source_url: source_url },
      {
        $set: {
          title_vi,
          cover_url,
          description_vi,
          author_vi,
          updated_at: new Date(),
          slug
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, isNew: result.upsertedCount > 0, slug: slug, });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
