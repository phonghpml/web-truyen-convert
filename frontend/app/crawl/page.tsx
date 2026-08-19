"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { InputGroup } from "@/components/ui/InputGroup";
import { CrawlJobList } from "@/components/features/CrawlJobList";
import { submitCrawlJob, pauseCrawlJob, resumeCrawlJob, deleteCrawlJob, useCrawlJobs } from "@/lib/crawl-hooks";
import { useAuth } from "@/lib/useAuth";

export default function CrawlPage() {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { jobs, loading, error, reload: reloadJobs } = useCrawlJobs();
  const [refreshing, setRefreshing] = useState(false);
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState("all");
  const [jobPage, setJobPage] = useState(1);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [bulkJobLoading, setBulkJobLoading] = useState(false);
  const [jobNotice, setJobNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const JOBS_PER_PAGE = 10;

  const filteredJobs = jobs.filter((job) => {
    const query = jobSearch.trim().toLowerCase();
    const matchesQuery = !query || [job.title_vi, job.author_vi, job.book_url].some((value) => value?.toLowerCase().includes(query));
    return matchesQuery && (jobStatusFilter === "all" || job.status === jobStatusFilter);
  });
  const totalJobPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE));
  const visibleJobs = filteredJobs.slice((jobPage - 1) * JOBS_PER_PAGE, jobPage * JOBS_PER_PAGE);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await reloadJobs();
    } finally {
      setRefreshing(false);
    }
  };

  const handlePause = async (jobId: string) => {
    try {
      const result = await pauseCrawlJob(jobId);
      if (!result.success) {
        setJobNotice({ type: "error", message: result.message || "Không thể tạm dừng job." });
        return;
      }
      await reloadJobs();
    } catch (err) {
      console.error(err);
      setJobNotice({ type: "error", message: "Không thể tạm dừng job." });
    }
  };

  const handleResume = async (jobId: string) => {
    try {
      const result = await resumeCrawlJob(jobId);
      if (!result.success) {
        setJobNotice({ type: "error", message: result.message || "Không thể tiếp tục job." });
        return;
      }
      await reloadJobs();
    } catch (err) {
      console.error(err);
      setJobNotice({ type: "error", message: "Không thể tiếp tục job." });
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa job này không?")) return;
    try {
      const result = await deleteCrawlJob(jobId);
      if (result.success) {
        setJobNotice({ type: "success", message: "Đã xóa job." });
        setSelectedJobIds((current) => current.filter((id) => id !== jobId));
        await reloadJobs();
      } else {
        setJobNotice({ type: "error", message: result.message || "Xóa job không thành công." });
      }
    } catch (err) {
      console.error(err);
      setJobNotice({ type: "error", message: "Không thể xóa job." });
    }
  };

  const handleCreateVideo = (jobId: string) => {
    router.push(`/admin/videos?job_id=${encodeURIComponent(jobId)}`);
  };

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobIds((current) =>
      current.includes(jobId) ? current.filter((id) => id !== jobId) : [...current, jobId]
    );
  };

  const toggleAllVisibleJobs = () => {
    const visibleIds = visibleJobs.map((job) => job.job_id);
    setSelectedJobIds((current) =>
      visibleIds.every((id) => current.includes(id))
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds]))
    );
  };

  const runBulkJobAction = async (action: "pause" | "resume" | "delete") => {
    const selectedJobs = jobs.filter((job) => selectedJobIds.includes(job.job_id));
    const eligibleJobs = selectedJobs.filter((job) =>
      action === "pause"
        ? job.status === "queued" || job.status === "running"
        : action === "resume"
        ? job.status === "paused" || job.status === "failed"
        : true
    );

    if (!eligibleJobs.length) return;
    const actionLabel = action === "delete" ? "xóa" : action === "pause" ? "tạm dừng" : "tiếp tục";
    if (!window.confirm(`Bạn có chắc muốn ${actionLabel} ${eligibleJobs.length} job đã chọn?`)) return;

    setBulkJobLoading(true);
    try {
      const results = await Promise.allSettled(
        eligibleJobs.map((job) =>
          action === "delete"
            ? deleteCrawlJob(job.job_id)
            : action === "pause"
            ? pauseCrawlJob(job.job_id)
            : resumeCrawlJob(job.job_id)
        )
      );

      if (action === "delete") {
        const failures = results.filter(
          (result) => result.status === "rejected" || (result.status === "fulfilled" && !result.value.success)
        ).length;
        setJobNotice(
          failures
            ? { type: "error", message: `${failures}/${eligibleJobs.length} job xóa không thành công.` }
            : { type: "success", message: `Đã xóa ${eligibleJobs.length} job.` }
        );
      }

      setSelectedJobIds([]);
      await reloadJobs();
    } finally {
      setBulkJobLoading(false);
    }
  };

  useEffect(() => {
    setJobPage(1);
  }, [jobSearch, jobStatusFilter]);

  useEffect(() => {
    setJobPage((page) => Math.min(page, totalJobPages));
    setSelectedJobIds((current) => current.filter((id) => jobs.some((job) => job.job_id === id)));
  }, [jobs, totalJobPages]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user || !isAdmin) {
      router.replace("/");
    }
  }, [user, isAdmin, isLoading, router]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 pb-16 pt-8">
        <div className="mb-8 rounded-3xl border border-zinc-800 bg-[#101010] p-6 shadow-xl">
          <div className="mb-4">
            <h1 className="text-2xl font-black uppercase tracking-tight text-orange-400">Cào truyện</h1>
            <p className="mt-2 text-sm text-zinc-400">Nhập link truyện sangtacviet.com và hệ thống sẽ cào chương cho bạn.</p>
          </div>

          <InputGroup url={url} setUrl={setUrl} onCrawl={handleSubmit} loading={submitting} />

          {submitError ? (
            <div className="mt-4 rounded-2xl border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">{submitError}</div>
          ) : null}
        </div>

        <section className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Danh sách job cào</h2>
              <p className="text-sm text-zinc-500">Quản lý các job đang chạy và job đã tạo.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm text-zinc-500">{loading ? "Đang tải..." : `${jobs.length} job`}</div>
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={refreshing || loading}
                className="rounded-full border border-zinc-700 bg-zinc-950/80 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-orange-500 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? "Đang tải..." : "Làm mới"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-3xl border border-red-700 bg-red-950/30 p-5 text-red-300">Lỗi tải dữ liệu job crawl.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 rounded-2xl border border-zinc-800 bg-[#101010] p-4">
                {jobNotice ? (
                  <div className={`w-full rounded-lg border px-3 py-2 text-sm ${jobNotice.type === "error" ? "border-red-700/70 bg-red-950/30 text-red-300" : "border-emerald-500/70 bg-emerald-950/30 text-emerald-200"}`}>
                    {jobNotice.message}
                  </div>
                ) : null}
                <input
                  value={jobSearch}
                  onChange={(event) => setJobSearch(event.target.value)}
                  placeholder="Tìm theo tên truyện, tác giả hoặc URL"
                  className="min-w-[260px] flex-1 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                />
                <select
                  value={jobStatusFilter}
                  onChange={(event) => setJobStatusFilter(event.target.value)}
                  className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="queued">Đang chờ</option>
                  <option value="running">Đang chạy</option>
                  <option value="paused">Tạm dừng</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="failed">Lỗi</option>
                </select>
              </div>
              <CrawlJobList
                jobs={visibleJobs}
                totalJobs={filteredJobs.length}
                currentPage={jobPage}
                totalPages={totalJobPages}
                selectedJobIds={selectedJobIds}
                onPageChange={setJobPage}
                onToggleJob={toggleJobSelection}
                onToggleAll={toggleAllVisibleJobs}
                onPause={handlePause}
                onResume={handleResume}
                onDelete={handleDelete}
                onCreateVideo={handleCreateVideo}
                onBulkPause={() => void runBulkJobAction("pause")}
                onBulkResume={() => void runBulkJobAction("resume")}
                onBulkDelete={() => void runBulkJobAction("delete")}
                bulkLoading={bulkJobLoading}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
