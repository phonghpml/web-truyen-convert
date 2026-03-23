import { DB } from "@/lib/constants";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        console.log("--- BẮT ĐẦU KIỂM TRA ĐĂNG NHẬP ---");
        try {
          const client = await clientPromise;
          console.log("MongoDB Client đã kết nối thành công", client);
          if (!client) {
            throw new Error("Không thể khởi tạo MongoDB Client");
          }

          const db = client.db(DB.NAME);
          console.log("Đã kết nối đến database:", db);
          const user = await db
            .collection(DB.USERS_COLLECTION)
            .findOne({ email: credentials.email as string });

          if (!user) {
            console.log("LỖI: Không tìm thấy User");
            return null;
          }
          
          console.log("User tìm thấy:", { email: user.email, name: user.password });
          const isMatch = await bcrypt.compare(credentials.password as string, user.password);
          if (isMatch) {
            console.log("--- ĐĂNG NHẬP THÀNH CÔNG ---");
            return { id: user._id.toString(), email: user.email, name: user.name };
          }
        } catch (error: any) {
          console.error("LỖI HỆ THỐNG CỤ THỂ:", error.message);
        }
        return null;
      },


    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
});
