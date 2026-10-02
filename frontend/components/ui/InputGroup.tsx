interface Props {
  url: string;
  setUrl: (val: string) => void;
  onCrawl: () => void; // kept name for backwards compatibility

  loading: boolean;
}

export const InputGroup = ({ url, setUrl, onCrawl, loading }: Props) => (
  <div className="mb-12 flex flex-col gap-2 rounded-xl border border-gray-800 bg-gray-900 p-2 shadow-2xl transition-all focus-within:border-orange-500/50 sm:flex-row sm:p-1">
    <input 
      className="w-full min-w-0 flex-1 bg-transparent p-3 text-sm font-mono text-white outline-none placeholder-gray-700 sm:p-4"
      placeholder="dán link 96shuba hoặc nhập tên truyện để tìm..."
      value={url}
      onChange={(e) => setUrl(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onCrawl()}
    />
    <button 
      onClick={onCrawl}
      disabled={loading}
      className="min-h-11 w-full rounded-lg bg-orange-600 px-4 py-2 text-[10px] font-black uppercase transition-all hover:bg-orange-500 active:scale-95 disabled:bg-gray-800 disabled:text-gray-600 sm:w-auto sm:px-8"
    >
      {loading ? "ĐANG XỬ LÝ..." : "TÌM / CONVERT"}
    </button>
  </div>
);
