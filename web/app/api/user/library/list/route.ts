import { NextResponse } from "next/server";
import { auth } from "@/auth"; 
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ data: [] });

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db("web_truyen");
  
  // Lấy tất cả truyện đã lưu của User, xếp mới nhất lên đầu
  const library = await db.collection("user_library")
    .find({ userEmail: session.user.email })
    .sort({ created_at: -1 })
    .toArray();

  await client.close();
  return NextResponse.json({ data: library });
}
