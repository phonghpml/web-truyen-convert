"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // Thêm loading để tránh bấm nhiều lần
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false, // Ta tự xử lý redirect để hiện thông báo thành công
      });

      if (res?.error) {
        alert("Sai email hoặc mật khẩu!");
      } else {
        // Dùng window.location.href sẽ giúp Middleware nhận diện Session chuẩn nhất
        window.location.href = "/"; 
      }
    } catch (err) {
      alert("Đã có lỗi xảy ra!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white font-mono p-4">
      <div className="p-8 border border-orange-500/20 rounded-2xl bg-zinc-950 w-full max-w-sm shadow-[0_0_50px_rgba(249,115,22,0.1)]">
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-orange-500 uppercase tracking-widest">Đăng Nhập</h1>
            <p className="text-xs text-zinc-500 mt-2">Truy cập để lưu lịch sử đọc truyện</p>
          </div>

          <div className="space-y-4">
            <input 
              type="email" placeholder="Email" required
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm outline-none focus:border-orange-500 transition-all"
              onChange={(e) => setEmail(e.target.value.toLowerCase())} 
            />
            <input 
              type="password" placeholder="Mật khẩu" required
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm outline-none focus:border-orange-500 transition-all"
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          <button 
            disabled={loading}
            className={`w-full bg-orange-600 p-3 rounded-lg font-bold hover:bg-orange-700 transition-all active:scale-95 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? "ĐANG XỬ LÝ..." : "ĐĂNG NHẬP NGAY"}
          </button>

          <p className="text-center text-xs text-zinc-500">
            Chưa có tài khoản?{" "}
            <span 
              onClick={() => router.push("/register")}
              className="text-orange-500 hover:underline cursor-pointer"
            >
              Đăng ký tại đây
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}
