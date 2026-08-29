"use client";

import Image from "next/image";
import { Check, ChevronLeft, ChevronRight, Pause, Play, Trash2 } from "lucide-react";
import { CrawlJob } from "@/lib/crawl-hooks";

interface CrawlJobListProps {
  jobs: CrawlJob[];
  totalJobs: number;
  currentPage: number;
  totalPages: number;
  selectedJobIds: string[];
  onPageChange: (page: number) => void;
  onToggleJob: (jobId: string) => void;
  onToggleAll: () => void;
  onPause: (jobId: string) => void;
  onResume: (jobId: string) => void;
  onDelete: (jobId: string) => void;
  onBulkPause: () => void;
  onBulkResume: () => void;
  onBulkDelete: () => void;
  bulkLoading: boolean;
}

const statusStyles: Record<string, string> = {
  queued: "bg-zinc-800 text-zinc-200",
  running: "bg-emerald-500 text-black",
  paused: "bg-amber-500 text-black",
  completed: "bg-blue-600 text-white",
  failed: "bg-red-600 text-white",
};

const statusLabels: Record<string, string> = {
  queued: "Đang chờ",
  running: "Đang chạy",
  paused: "Tạm dừng",
  completed: "Hoàn thành",
  failed: "Lỗi",
};

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("vi-VN");
}

export function CrawlJobList({
  jobs,
  totalJobs,
  currentPage,
  totalPages,
  selectedJobIds,
  onPageChange,
  onToggleJob,
  onToggleAll,
  onPause,
  onResume,
  onDelete,
  onBulkPause,
  onBulkResume,
  onBulkDelete,
  bulkLoading,
}: CrawlJobListProps) {
  const selectedCount = selectedJobIds.length;
  const allSelected = jobs.length > 0 && jobs.every((job) => selectedJobIds.includes(job.job_id));
  const canPause = jobs.some((job) => selectedJobIds.includes(job.job_id) && (job.status === "queued" || job.status === "running"));
  const canResume = jobs.some((job) => selectedJobIds.includes(job.job_id) && (job.status === "paused" || job.status === "failed"));

  if (!totalJobs) {
    return <div className="rounded-2xl border border-zinc-800 bg-[#090909] p-8 text-center text-zinc-500">Chưa có công việc cào nào.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-[#101010] px-4 py-3">
        <span className="text-sm text-zinc-400">{selectedCount} job đã chọn / {totalJobs}</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onBulkPause} disabled={!canPause || bulkLoading} className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:border-orange-500 disabled:cursor-not-allowed disabled:opacity-40"><Pause size={14} /> Tạm dừng</button>
          <button type="button" onClick={onBulkResume} disabled={!canResume || bulkLoading} className="inline-flex items-center gap-2 rounded-lg border border-emerald-700 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-950/30 disabled:cursor-not-allowed disabled:opacity-40"><Play size={14} /> Tiếp tục</button>
          <button type="button" onClick={onBulkDelete} disabled={!selectedCount || bulkLoading} className="inline-flex items-center gap-2 rounded-lg border border-red-700 px-3 py-2 text-xs text-red-300 hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={14} /> Xóa đã chọn</button>
        </div>
      </div>

      {jobs.length === 0 ? <div className="rounded-2xl border border-zinc-800 bg-[#090909] p-8 text-center text-zinc-500">Không có job phù hợp bộ lọc.</div> : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#101010]">
          <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
            <thead className="bg-zinc-950 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              <tr>
                <th className="w-12 px-4 py-4"><button type="button" onClick={onToggleAll} aria-label="Chọn tất cả job" className={`grid h-5 w-5 place-items-center rounded border ${allSelected ? "border-orange-500 bg-orange-500 text-black" : "border-zinc-600"}`}>{allSelected ? <Check size={14} /> : null}</button></th>
                <th className="px-4 py-4">Truyện</th><th className="px-4 py-4">Trạng thái</th><th className="w-64 px-4 py-4">Tiến độ</th><th className="px-4 py-4">Chương</th><th className="px-4 py-4">Cập nhật</th><th className="sticky right-0 z-10 bg-zinc-950 px-4 py-4 text-right shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.9)]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {jobs.map((job) => {
                const chapters = Array.isArray(job.chapters) ? job.chapters : [];
                const total = job.total_nonvip_chapters ?? chapters.filter((item) => item.access !== "vip").length;
                const processed = job.processed_nonvip_chapters ?? Math.max(0, total - (job.remaining_nonvip_chapters ?? 0));
                const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
                const selected = selectedJobIds.includes(job.job_id);
                return (
                  <tr key={job.job_id} className={selected ? "bg-orange-950/10" : "hover:bg-white/[0.02]"}>
                    <td className="px-4 py-4 align-top"><button type="button" onClick={() => onToggleJob(job.job_id)} aria-label={`Chọn ${job.title_vi || "job"}`} className={`grid h-5 w-5 place-items-center rounded border ${selected ? "border-orange-500 bg-orange-500 text-black" : "border-zinc-600"}`}>{selected ? <Check size={14} /> : null}</button></td>
                    <td className="max-w-[300px] px-4 py-4 align-top"><div className="flex gap-3"><div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">{job.cover_url ? <Image src={job.cover_url} alt={job.title_vi || "Bìa truyện"} fill className="object-cover" unoptimized /> : <span className="grid h-full place-items-center text-[8px] text-zinc-600">N/A</span>}</div><div className="min-w-0"><div className="truncate font-semibold text-white">{job.title_vi || "Truyện đang cào"}</div>{job.author_vi ? <div className="mt-1 truncate text-xs text-zinc-400">{job.author_vi}</div> : null}<div className="mt-1 truncate text-xs text-zinc-600" title={job.book_url}>{job.book_url}</div></div></div></td>
                    <td className="px-4 py-4 align-top"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusStyles[job.status] || "bg-zinc-700 text-zinc-200"}`}>{statusLabels[job.status] || job.status}</span></td>
                    <td className="px-4 py-4 align-top"><div className="flex items-center justify-between text-xs text-zinc-400"><span>{processed}/{total || job.total_chapters || 0}</span><span>{percent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-orange-500" style={{ width: `${percent}%` }} /></div>{job.current_chapter_title ? <div className="mt-2 truncate text-xs text-zinc-500" title={job.current_chapter_title}>{job.current_chapter_title}</div> : null}{job.latest_chapter_event ? <div className={`mt-2 line-clamp-2 rounded-md border px-2 py-1 text-[11px] ${job.latest_chapter_event_type === "error" ? "border-red-700/60 bg-red-950/30 text-red-200" : job.latest_chapter_event_type === "success" ? "border-emerald-700/60 bg-emerald-950/30 text-emerald-200" : job.latest_chapter_event_type === "running" ? "border-orange-700/60 bg-orange-950/20 text-orange-200" : "border-zinc-700 bg-zinc-900/60 text-zinc-300"}`}>{job.latest_chapter_event}</div> : null}</td>
                    <td className="px-4 py-4 align-top text-xs text-zinc-400">Tổng: {total || job.total_chapters || 0}<br />Còn: {job.remaining_nonvip_chapters ?? job.remaining_chapters ?? 0}</td>
                    <td className="whitespace-nowrap px-4 py-4 align-top text-xs text-zinc-500">{formatDate(job.updated_at || job.created_at)}</td>
                    <td className="sticky right-0 z-[1] bg-[#101010] px-4 py-4 align-top shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.9)]"><div className="flex justify-end gap-2">{(job.status === "running" || job.status === "queued") ? <button type="button" onClick={() => onPause(job.job_id)} title="Tạm dừng" className="rounded-lg border border-zinc-700 p-2 text-zinc-300 hover:border-orange-500"><Pause size={15} /></button> : null}{(job.status === "paused" || job.status === "failed") ? <button type="button" onClick={() => onResume(job.job_id)} title="Tiếp tục" className="rounded-lg border border-emerald-700 p-2 text-emerald-300 hover:bg-emerald-950/30"><Play size={15} /></button> : null}<button type="button" onClick={() => onDelete(job.job_id)} title="Xóa" className="rounded-lg border border-red-700 p-2 text-red-300 hover:bg-red-950/30"><Trash2 size={15} /></button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 ? <div className="flex items-center justify-between gap-4 text-sm text-zinc-400"><span>Trang {currentPage}/{totalPages}</span><div className="flex gap-2"><button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} className="rounded-lg border border-zinc-700 p-2 disabled:opacity-30"><ChevronLeft size={16} /></button><button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} className="rounded-lg border border-zinc-700 p-2 disabled:opacity-30"><ChevronRight size={16} /></button></div></div> : null}
    </div>
  );
}
