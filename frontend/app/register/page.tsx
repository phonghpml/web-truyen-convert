"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { register as registerUser } from '@/lib/auth';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const router = useRouter();

  const validateRegister = () => {
    if (!email.trim()) return 'Vui lòng nhập email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email không hợp lệ.';
    if (!password.trim() || password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự.';
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateRegister();
    if (validationError) {
      setFeedback({ type: 'error', message: validationError });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const res = await registerUser(email, password);
      const message = res?.detail || res?.error || res?.message || "Có lỗi xảy ra!";

      if (res?.success) {
        setFeedback({ type: 'success', message: 'Đăng ký thành công! Bạn có thể đăng nhập ngay.' });
        setTimeout(() => router.push('/login'), 800);
      } else {
        setFeedback({ type: 'error', message });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Lỗi kết nối máy chủ!' });
    } finally {
      setLoading(false);
    }
  };

  return (
    // Sử dụng font mặc định hệ thống để hiển thị Tiếng Việt chuẩn nhất
    <div className="min-h-screen flex items-center justify-center bg-black text-zinc-200 p-4 selection:bg-orange-500/30">
      <div className="p-8 border border-zinc-800 rounded-2xl bg-zinc-950/50 backdrop-blur-xl w-full max-w-sm shadow-2xl relative overflow-hidden">
        
        {/* Hiệu ứng decor ánh sáng góc */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-600/10 blur-3xl rounded-full"></div>

        <form onSubmit={handleRegister} className="relative z-10 space-y-6">
          <div className="text-center space-y-2">
            {/* Giữ font-mono cho tiêu đề để tạo phong cách "Convert/Hacker" */}
            <h1 className="text-3xl font-black text-orange-500 uppercase tracking-tighter italic">
              Đăng Ký
            </h1>
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-medium">
              Tạo tài khoản mới để trải nghiệm tốt hơn
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Địa chỉ Email</label>
              <input 
                type="email" placeholder="example@email.com" required
                className="w-full p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-zinc-700"
                onChange={(e) => {
                  setEmail(e.target.value.toLowerCase());
                  setFeedback(null);
                }} 
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Mật khẩu</label>
              <input 
                type="password" placeholder="••••••••" required
                className="w-full p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-zinc-700"
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFeedback(null);
                }} 
              />
            </div>
          </div>

          {feedback && (
            <div className={`rounded-xl border px-3 py-2 text-sm ${feedback.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
              {feedback.message}
            </div>
          )}

          <button 
            disabled={loading}
            className={`w-full relative group overflow-hidden bg-orange-600 p-3.5 rounded-xl font-bold text-sm hover:bg-orange-500 transition-all active:scale-[0.98] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="relative z-10">
              {loading ? "ĐANG XỬ LÝ..." : "TẠO TÀI KHOẢN NGAY"}
            </span>
            {/* Hiệu ứng quét sáng khi hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
          </button>

          <p className="text-center text-xs text-zinc-500 pt-2">
            Đã có tài khoản?{" "}
            <Link 
              href="/login"
              className="text-orange-500 hover:text-orange-400 font-semibold underline-offset-4 hover:underline"
            >
              Đăng nhập tại đây
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
