import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // 1. Kết nối MongoDB
    const client = await MongoClient.connect(process.env.MONGODB_URI!);
    const db = client.db("web_truyen");

    // 2. Kiểm tra user đã tồn tại chưa
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "email da ton tai!" }, { status: 400 });
    }

    // 3. Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Lưu vào Database
    await db.collection("users").insertOne({
      email: email.toLowerCase(),
      password: hashedPassword,
      createdAt: new Date(),
    });

    return NextResponse.json({ message: "dang ky thanh cong!" }, { status: 201 });
  } catch (error) {
    console.error(error);
    

return NextResponse.json({ error: "loi ket noi database!" }, { status: 500 });
  }
}
