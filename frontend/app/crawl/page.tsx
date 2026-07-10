"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { InputGroup } from "@/components/ui/InputGroup";
import { CrawlJobList } from "@/components/features/CrawlJobList";
import { submitCrawlJob, pauseCrawlJob, resumeCrawlJob, deleteCrawlJob, useCrawlJobs } from "@/lib/crawl-hooks";

export default function CrawlPage() {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { jobs, loading, error } = useCrawlJobs(3000);

  const handleSubmit = async () => {
    if (!url.trim()) {
      setSubmitError("Vui lòng nhập link truyện từ sangtacviet.com");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const json = await submitCrawlJob(url.trim());
      if (!json.success) {
        setSubmitError(json.message || "Lỗi khi tạo job cào");
      } else {
        setUrl("");
      }
    } catch (err) {
      console.error("Submit crawl error:", err);
      setSubmitError("Lỗi khi gửi yêu cầu cào");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePause = async (jobId: string) => {
    try {
      await pauseCrawlJob(jobId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResume = async (jobId: string) => {
    try {
      await resumeCrawlJob(jobId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (jobId: string) => {
    try {
      await deleteCrawlJob(jobId);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 pb-16 pt-8">
        <div className="mb-8 rounded-3xl border border-zinc-800 bg-[#101010] p-6 shadow-xl">
          <div className="mb-4">
            <h1 className="text-2xl font-black uppercase tracking-tight text-orange-400">Cào Truyện SangTacViet</h1>
            <p className="mt-2 text-sm text-zinc-400">Nhập link truyện sangtacviet.com và hệ thống sẽ cào chương từ đầu đến cuối, bỏ qua chương đã có trong database.</p>
          </div>

          <InputGroup
            url={url}
            setUrl={setUrl}
            onCrawl={handleSubmit}
            loading={submitting}
          />

          {submitError ? (
            <div className="rounded-2xl border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">{submitError}</div>
          ) : null}
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Danh sách đang cào</h2>
              <p className="text-sm text-zinc-500">Cập nhật tự động mỗi vài giây.</p>
            </div>
            <div className="text-sm text-zinc-500">{loading ? "Đang tải..." : `${jobs.length} job`}</div>
          </div>

          {error ? (
            <div className="rounded-3xl border border-red-700 bg-red-950/30 p-5 text-red-300">Lỗi tải dữ liệu job crawl.</div>
          ) : (
            <CrawlJobList jobs={jobs} onPause={handlePause} onResume={handleResume} onDelete={handleDelete} />
          )}
        </section>
      </main>
    </div>
  );
}
