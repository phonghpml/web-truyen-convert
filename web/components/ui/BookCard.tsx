export const BookCard = ({ data }: { data: any }) => (
  <div className="bg-gray-950 border border-orange-500/10 p-6 rounded-3xl flex flex-col md:flex-row gap-8 text-left animate-in fade-in zoom-in duration-500 shadow-2xl">
    <div className="relative group shrink-0">
      <div className="absolute -inset-1 bg-orange-500 rounded-lg blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
      <img 
        src={data.cover_url} 
        className="relative w-40 h-56 object-cover rounded-lg border border-gray-800 shadow-2xl" 
        alt="cover" 
      />
    </div>
    
    <div className="flex-1 py-2">
      <h3 className="font-black text-orange-500 text-3xl mb-1 uppercase italic tracking-tighter leading-tight">
        {data.title_vi}
      </h3>
      <p className="text-[10px] text-gray-500 mb-6 font-bold tracking-[0.2em] uppercase">
        Tác giả: <span className="text-gray-300">{data.author_vi}</span>
      </p>
      
      <div className="space-y-1 mb-8">
        <p className="text-[9px] text-gray-700 font-black uppercase tracking-widest">Giới thiệu convert:</p>
        <p className="text-xs text-gray-400 leading-6 line-clamp-4 font-light italic">
          {data.description_vi}
        </p>
      </div>

      <div className="flex gap-3">
        <button className="bg-white text-black text-[9px] px-6 py-3 rounded-full font-black hover:bg-orange-500 hover:text-white transition-all shadow-lg uppercase">
           Đọc ngay {">"}
        </button>
        <button className="border border-gray-800 text-gray-600 text-[9px] px-6 py-3 rounded-full font-bold hover:bg-gray-900 transition-all uppercase">
           Lưu tủ sách
        </button>
      </div>
    </div>
  </div>
);
