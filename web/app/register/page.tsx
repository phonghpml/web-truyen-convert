'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      alert("dang ky thanh cong!");
      window.location.href = '/login'; // Chuyển sang trang đăng nhập
    } else {
      alert(data.error || "co loi xay ra!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white font-mono">
      <form onSubmit={handleRegister} className="p-8 border border-gray-800 rounded-2xl bg-gray-900 w-80 shadow-2xl">
        <h1 className="text-xl font-bold mb-6 text-orange-500">dang ky tai khoan</h1>
        
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
        
        <button 
          disabled={loading}
          className="w-full bg-orange-600 p-2 rounded-lg font-bold hover:bg-orange-700 transition disabled:bg-gray-600"
        >
          {loading ? 'dang xu ly...' : 'tao tai khoan'}
        </button>

        <p className="mt-4 text-xs text-gray-500 text-center">
          da co tai khoan? <Link href="/login" className="text-orange-500">dang nhap</Link>
        </p>
      </form>
    </div>
  );
}
