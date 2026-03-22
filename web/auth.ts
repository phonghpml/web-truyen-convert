import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";
import { DB } from "./lib/constants";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const client = await clientPromise;
        const user = await client
          .db(DB.NAME)
          .collection(DB.USERS_COLLECTION)
          .findOne({ email: credentials.email });

        if (user && bcrypt.compareSync(credentials.password as string, user.password)) {
          return { id: user._id.toString(), email: user.email, name: user.name };
        }
        return null;
      },
    }),
  ],
  // Tối ưu session để giảm tải DB
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
});
