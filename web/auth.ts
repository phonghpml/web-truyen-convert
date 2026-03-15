import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const client = await new MongoClient(process.env.MONGODB_URI!).connect();
        const db = client.db("web_truyen");
        const user = await db.collection("users").findOne({ email: credentials.email });

        if (user && await bcrypt.compare(credentials.password as string, user.password)) {
          const userData = { id: user._id.toString(), email: user.email };
          await client.close();
          return userData;
        }
        await client.close();
        return null;
      }
    })
  ],
});
