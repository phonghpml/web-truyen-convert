'use client'
import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    // Gọi hàm đăng nhập của NextAuth
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      alert("sai email hoac mat khau!")
    } else {
      alert("dang nhap thanh cong!")
      router.push("/") // Quay về trang chủ
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white font-mono">
      <form onSubmit={handleLogin} className="p-8 border border-gray-800 rounded-2xl bg-gray-900 w-80 shadow-2xl">
        <h1 className="text-xl font-bold mb-6 text-orange-500">dang nhap</h1>
        <input 
          type="email" placeholder="email" required
          className="w-full p-2 mb-4 bg-gray-800 border border-gray-700 rounded text-sm outline-none focus:border-orange-500"
          onChange={(e) => setEmail(e.target.value.toLowerCase())} 
        />
        <input 
          type="password" placeholder="mat khau" required
          className="w-full p-2 mb-6 bg-gray-800 border border-gray-700 rounded text-sm outline-none focus:border-orange-500"
          onChange={(e) => setPassword(e.target.value)} 
        />
        <button className="w-full bg-orange-600 p-2 rounded-lg font-bold hover:bg-orange-700 transition">
          dang nhap ngay
        </button>
      </form>
    </div>
  )
}
