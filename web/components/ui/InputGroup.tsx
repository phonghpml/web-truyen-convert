interface Props {
  url: string;
  setUrl: (val: string) => void;
  onCrawl: () => void; // kept name for backwards compatibility

  loading: boolean;
}

export const InputGroup = ({ url, setUrl, onCrawl, loading }: Props) => (
  <div className="flex gap-2 p-1 bg-gray-900 border border-gray-800 rounded-xl mb-12 shadow-2xl transition-all focus-within:border-orange-500/50">
    <input 
      className="flex-1 bg-transparent p-4 text-sm outline-none text-white font-mono placeholder-gray-700"
      placeholder="dán link 96shuba hoặc nhập tên truyện để tìm..."
      value={url}
      onChange={(e) => setUrl(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onCrawl()}
    />
    <button 
      onClick={onCrawl}
      disabled={loading}
      className="bg-orange-600 px-8 py-2 rounded-lg font-black text-[10px] hover:bg-orange-500 transition-all active:scale-95 disabled:bg-gray-800 disabled:text-gray-600 uppercase"
    >
      {loading ? "ĐANG XỬ LÝ..." : "TÌM / CONVERT"}
    </button>
  </div>
);
