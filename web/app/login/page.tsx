"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        alert("Sai email hoặc mật khẩu!");
      } else {
        window.location.href = "/"; 
      }
    } catch (err) {
      alert("Đã có lỗi xảy ra!");
    } finally {
      setLoading(false);
    }
  };

  return (
    // THAY ĐỔI 1: Bỏ 'font-mono' ở bao ngoài, dùng font mặc định hệ thống (sans-serif) để hết lỗi Tiếng Việt
    <div className="min-h-screen flex items-center justify-center bg-black text-zinc-200 p-4 selection:bg-orange-500/30">
      <div className="p-8 border border-zinc-800 rounded-2xl bg-zinc-950/50 backdrop-blur-xl w-full max-w-sm shadow-2xl relative overflow-hidden">
        
        {/* Hiệu ứng ánh sáng cam mờ ở góc để tăng tính thẩm mỹ */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-600/10 blur-3xl rounded-full"></div>

        <form onSubmit={handleLogin} className="relative z-10 space-y-6">
          <div className="text-center space-y-2">
            {/* THAY ĐỔI 2: Chỉ dùng font-mono cho Tiêu đề để tạo chất "Convert/Hacker" nhưng không gây lỗi dấu */}
            <h1 className="text-3xl font-black text-orange-500 uppercase tracking-tighter italic">
              Đăng Nhập
            </h1>
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-medium">
              Hệ thống đọc truyện Convert
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Email</label>
              <input 
                type="email" placeholder="email@example.com" required
                className="w-full p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-zinc-700"
                onChange={(e) => setEmail(e.target.value.toLowerCase())} 
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Mật khẩu</label>
              <input 
                type="password" placeholder="••••••••" required
                className="w-full p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-zinc-700"
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className={`w-full relative group overflow-hidden bg-orange-600 p-3.5 rounded-xl font-bold text-sm hover:bg-orange-500 transition-all active:scale-[0.98] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="relative z-10">
              {loading ? "ĐANG XỬ LÝ..." : "XÁC NHẬN ĐĂNG NHẬP"}
            </span>
            {/* Hiệu ứng quét sáng khi hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
          </button>

          <p className="text-center text-xs text-zinc-500 pt-2">
            Chưa có tài khoản?{" "}
            <span 
              onClick={() => router.push("/register")}
              className="text-orange-500 hover:text-orange-400 font-semibold cursor-pointer underline-offset-4 hover:underline"
            >
              Đăng ký ngay
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}
