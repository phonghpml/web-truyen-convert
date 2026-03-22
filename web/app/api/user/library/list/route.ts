import { auth } from "@/auth";
import { DB } from "@/lib/constants";
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

const MONGODB_URI = process.env.MONGODB_URI!;

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ data: [] });

  const client = await clientPromise;
  const db = client.db(DB.NAME);
  
  // Lấy tất cả truyện đã lưu của User, xếp mới nhất lên đầu
  const library = await db.collection(DB.LIBRARY_COLLECTION)
    .find({ userEmail: session.user.email })
    .sort({ created_at: -1 })
    .toArray();

  await client.close();
  return NextResponse.json({ data: library });
}
