"use client";

import { Pause, Play, Trash2 } from "lucide-react";
import { CrawlJob } from "@/lib/crawl-hooks";

interface CrawlJobListProps {
  jobs: CrawlJob[];
  onPause: (jobId: string) => void;
  onResume: (jobId: string) => void;
  onDelete: (jobId: string) => void;
}

const statusStyles: Record<string, string> = {
  queued: "bg-zinc-800 text-zinc-200",
  running: "bg-emerald-500 text-black",
  paused: "bg-amber-500 text-black",
  completed: "bg-blue-600 text-white",
  failed: "bg-red-600 text-white",
};

export function CrawlJobList({ jobs, onPause, onResume, onDelete }: CrawlJobListProps) {
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
        const crawledCount = job.total_chapters > 0 ? Math.max(0, job.total_chapters - job.remaining_chapters) : job.crawled_chapters;
        const percent = job.total_chapters > 0 ? Math.round((crawledCount / job.total_chapters) * 100) : 0;
        return (
          <div key={job.job_id} className="rounded-3xl border border-zinc-800 bg-[#101010] p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-4 items-start">
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
                  <div className="mt-3 grid gap-2 sm:grid-cols-3 text-[11px] text-zinc-400 uppercase tracking-[0.16em]">
                    <div>Chương đã cào: {crawledCount}</div>
                    <div>Tổng chương: {job.total_chapters || "Đang xác định"}</div>
                    <div>Còn lại: {job.remaining_chapters}</div>
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
                <button onClick={() => onDelete(job.job_id)} className="rounded-full bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] hover:bg-red-500 transition-all">
                  <Trash2 size={14} /> Xóa
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-500 uppercase tracking-[0.2em]">
                <span>Tiến độ chương</span>
                <span>{crawledCount}/{job.total_chapters}</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${percent}%` }} />
              </div>
              <div className="text-[11px] text-zinc-500">{percent}%</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
