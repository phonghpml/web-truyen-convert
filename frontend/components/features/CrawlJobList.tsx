"use client";

import { Pause, Play, Trash2, Video } from "lucide-react";
import { CrawlJob } from "@/lib/crawl-hooks";

interface CrawlJobListProps {
  jobs: CrawlJob[];
  onPause: (jobId: string) => void;
  onResume: (jobId: string) => void;
  onDelete: (jobId: string) => void;
  onCreateVideo: (jobId: string) => void;
}

const statusStyles: Record<string, string> = {
  queued: "bg-zinc-800 text-zinc-200",
  running: "bg-emerald-500 text-black",
  paused: "bg-amber-500 text-black",
  completed: "bg-blue-600 text-white",
  failed: "bg-red-600 text-white",
};

export function CrawlJobList({ jobs, onPause, onResume, onDelete, onCreateVideo }: CrawlJobListProps) {
  if (!jobs.length) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-[#090909] p-8 text-center text-zinc-500">
        Chưa có công việc cào nào. Dán link truyện sangtacviet.com và bấm Cào Truyện.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const chapters = Array.isArray(job.chapters) ? job.chapters : [];
        const vipCount = chapters.filter((item) => item.access === "vip").length;
        const totalNonVip = job.total_nonvip_chapters ?? chapters.filter((item) => item.access !== "vip").length;
        const processedNonVip = job.processed_nonvip_chapters ?? (totalNonVip - (job.remaining_nonvip_chapters ?? 0));
        const nonVipRemaining = job.remaining_nonvip_chapters ?? Math.max(0, totalNonVip - processedNonVip);
        const percent = totalNonVip > 0 ? Math.round((processedNonVip / totalNonVip) * 100) : 0;
        const progressLabel = totalNonVip > 0 ? (processedNonVip >= totalNonVip ? "Hoàn thành chương thường" : "Đang xử lý chương thường") : "Chưa có dữ liệu chương thường";
        const progressText = totalNonVip > 0 ? `${processedNonVip}/${totalNonVip}` : "0/0";

        return (
          <div key={job.job_id} className="rounded-3xl border border-zinc-800 bg-[#101010] p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-4 items-start min-w-0">
                <div className="h-24 w-20 overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800">
                  {job.cover_url ? (
                    <img src={job.cover_url} alt={job.title_vi || "Bìa truyện"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                      No cover
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 items-center">
                    <h3 className="text-lg font-black text-white truncate">{job.title_vi || "Truyện đang cào"}</h3>
                    <span className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${statusStyles[job.status] || "bg-zinc-700 text-zinc-200"}`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-zinc-400 break-words">
                    {job.author_vi && <div className="font-medium text-zinc-300">Tác giả: {job.author_vi}</div>}
                    <div className="mt-1 break-words">{job.book_url}</div>
                  </div>
                  {job.description_vi ? (
                    <div className="mt-3 text-sm leading-6 text-zinc-500 line-clamp-3">{job.description_vi}</div>
                  ) : null}

                  <div className="mt-3 grid gap-2 sm:grid-cols-2 text-[11px] text-zinc-400 uppercase tracking-[0.16em]">
                    <div>Đã cào: {progressText}</div>
                    <div>VIP: {vipCount}</div>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 text-[11px] text-zinc-400 uppercase tracking-[0.16em]">
                    <div>Còn lại chương thường: {nonVipRemaining}</div>
                    <div>Đã xử lý: {processedNonVip}/{totalNonVip || 0}</div>
                  </div>
                  {job.status === "running" && job.current_chapter_title ? (
                    <div className="mt-2 text-sm text-zinc-300">Đang cào: {job.current_chapter_title}</div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                {(job.status === "running" || job.status === "queued") && (
                  <button onClick={() => onPause(job.job_id)} className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all">
                    <Pause size={14} /> Tạm dừng
                  </button>
                )}
                {(job.status === "paused" || job.status === "failed") && (
                  <button onClick={() => onResume(job.job_id)} className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all">
                    <Play size={14} /> Tiếp tục
                  </button>
                )}
                <button onClick={() => onCreateVideo(job.job_id)} className="rounded-full bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] hover:bg-blue-500 transition-all">
                  <Video size={14} /> Video
                </button>
                <button onClick={() => onDelete(job.job_id)} className="rounded-full bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] hover:bg-red-500 transition-all">
                  <Trash2 size={14} /> Xóa
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-500 uppercase tracking-[0.2em]">
                <span>{progressLabel}</span>
                <span>{progressText}</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${percent}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>{percent}%</span>
                <span className="text-zinc-400">Tổng chương: {totalNonVip || job.total_chapters || 0}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
