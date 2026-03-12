import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { MongoClient } from "mongodb"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "email", type: "email" },
        password: { label: "password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const client = await new MongoClient(process.env.MONGODB_URI!).connect()
        const db = client.db("web_truyen")
        const user = await db.collection("users").findOne({ email: credentials.email })

        if (user && await bcrypt.compare(credentials.password as string, user.password)) {
          await client.close()
          return { id: user._id.toString(), email: user.email }
        }
        
        await client.close()
        return null
      }
    })
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
})
