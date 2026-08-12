"use client";

import { Check, ChevronLeft, ChevronRight, ExternalLink, Trash2, Youtube } from "lucide-react";
import type { Video } from "@/lib/types";

interface CrawlVideoListProps {
  videos: Video[];
  totalVideos: number;
  currentPage: number;
  totalPages: number;
  selectedVideoIds: string[];
  onPageChange: (page: number) => void;
  onToggleVideo: (videoId: string) => void;
  onToggleAll: () => void;
  onPublish: (videoId: string) => void;
  onDelete: (videoId: string) => void;
  onBulkPublish: () => void;
  onBulkDelete: () => void;
  bulkLoading: boolean;
}

function videoId(video: Video) {
  return video.id ?? video.video_url;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("vi-VN");
}

export function CrawlVideoList({ videos, totalVideos, currentPage, totalPages, selectedVideoIds, onPageChange, onToggleVideo, onToggleAll, onPublish, onDelete, onBulkPublish, onBulkDelete, bulkLoading }: CrawlVideoListProps) {
  const selectedCount = selectedVideoIds.length;
  const allSelected = videos.length > 0 && videos.every((video) => selectedVideoIds.includes(videoId(video)));

  if (!totalVideos) return <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-sm text-zinc-300">Chưa có video nào được tạo.</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-[#101010] px-4 py-3">
        <span className="text-sm text-zinc-400">{selectedCount} video đã chọn / {totalVideos}</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onBulkPublish} disabled={!selectedCount || bulkLoading} className="inline-flex items-center gap-2 rounded-lg border border-orange-500 px-3 py-2 text-xs text-orange-300 hover:bg-orange-950/30 disabled:cursor-not-allowed disabled:opacity-40"><Youtube size={14} /> Đăng YouTube</button>
          <button type="button" onClick={onBulkDelete} disabled={!selectedCount || bulkLoading} className="inline-flex items-center gap-2 rounded-lg border border-red-700 px-3 py-2 text-xs text-red-300 hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={14} /> Xóa đã chọn</button>
        </div>
      </div>

      {videos.length === 0 ? <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-sm text-zinc-300">Không có video phù hợp bộ lọc.</div> : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/90">
          <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
            <thead className="bg-black text-[11px] uppercase tracking-[0.16em] text-zinc-500"><tr>
              <th className="w-12 px-4 py-4"><button type="button" onClick={onToggleAll} aria-label="Chọn tất cả video" className={`grid h-5 w-5 place-items-center rounded border ${allSelected ? "border-orange-500 bg-orange-500 text-black" : "border-zinc-600"}`}>{allSelected ? <Check size={14} /> : null}</button></th>
              <th className="px-4 py-4">Video</th><th className="px-4 py-4">Truyện</th><th className="px-4 py-4">Cấu hình</th><th className="px-4 py-4">Ngày tạo</th><th className="sticky right-0 z-10 bg-black px-4 py-4 text-right shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.9)]">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-800">{videos.map((video) => {
              const id = videoId(video);
              const selected = selectedVideoIds.includes(id);
              return <tr key={id} className={selected ? "bg-orange-950/10" : "hover:bg-white/[0.02]"}>
                <td className="px-4 py-4 align-top"><button type="button" onClick={() => onToggleVideo(id)} aria-label="Chọn video" className={`grid h-5 w-5 place-items-center rounded border ${selected ? "border-orange-500 bg-orange-500 text-black" : "border-zinc-600"}`}>{selected ? <Check size={14} /> : null}</button></td>
                <td className="max-w-[300px] px-4 py-4 align-top"><div className="flex gap-3"><div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"><video src={`${video.video_url}#t=0.1`} poster={video.thumbnail_url} muted preload="metadata" className="h-full w-full object-cover" aria-label="Xem trước video" /></div><div className="min-w-0"><div className="truncate font-semibold text-white">{video.video_title || video.book_title || "Video"}</div><div className="mt-1 text-xs text-zinc-500">Chương {video.chapter_start} · {video.chapter_count} chương</div></div></div></td>
                <td className="max-w-[260px] px-4 py-4 align-top"><div className="truncate text-zinc-200">{video.book_title || "-"}</div><div className="mt-1 truncate text-xs text-zinc-600" title={video.book_url}>{video.book_url}</div></td>
                <td className="px-4 py-4 align-top text-xs text-zinc-400"><div>{video.voice}</div><div className="mt-1">Rate: {video.rate}</div></td>
                <td className="whitespace-nowrap px-4 py-4 align-top text-xs text-zinc-500">{formatDate(video.createdAt || video.updatedAt)}</td>
                <td className="sticky right-0 z-[1] bg-zinc-950 px-4 py-4 align-top shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.9)]"><div className="flex justify-end gap-2"><a href={video.video_url} target="_blank" rel="noreferrer" title="Xem video" className="rounded-lg border border-zinc-700 p-2 text-orange-300 hover:border-orange-500"><ExternalLink size={15} /></a><button type="button" onClick={() => onPublish(id)} title="Đăng YouTube" className="rounded-lg border border-orange-700 p-2 text-orange-300 hover:bg-orange-950/30"><Youtube size={15} /></button><button type="button" onClick={() => onDelete(id)} title="Xóa" className="rounded-lg border border-red-700 p-2 text-red-300 hover:bg-red-950/30"><Trash2 size={15} /></button></div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
      {totalPages > 1 ? <div className="flex items-center justify-between gap-4 text-sm text-zinc-400"><span>Trang {currentPage}/{totalPages}</span><div className="flex gap-2"><button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} className="rounded-lg border border-zinc-700 p-2 disabled:opacity-30"><ChevronLeft size={16} /></button><button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} className="rounded-lg border border-zinc-700 p-2 disabled:opacity-30"><ChevronRight size={16} /></button></div></div> : null}
    </div>
  );
}
