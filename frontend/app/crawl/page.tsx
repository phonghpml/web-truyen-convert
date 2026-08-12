"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { InputGroup } from "@/components/ui/InputGroup";
import { CrawlJobList } from "@/components/features/CrawlJobList";
import { CrawlVideoList } from "@/components/features/CrawlVideoList";
import { submitCrawlJob, pauseCrawlJob, resumeCrawlJob, deleteCrawlJob, createCrawlVideo, cancelCrawlVideo, fetchCrawlVideoProgress, useCrawlJobs, VIDEO_VOICES } from "@/lib/crawl-hooks";
import { deleteVideo, fetchBookVideos, publishVideoToYouTube } from "@/lib/hooks";
import type { Video } from "@/lib/types";

export default function CrawlPage() {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [videoJobId, setVideoJobId] = useState<string | null>(null);
  const [videoStart, setVideoStart] = useState<number>(1);
  const [videoCount, setVideoCount] = useState<number>(1);
  const [videoBatchCount, setVideoBatchCount] = useState<number>(1);
  const [videoImage, setVideoImage] = useState<File | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoCreatedUrls, setVideoCreatedUrls] = useState<string[]>([]);
  const [videoBatchProgress, setVideoBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [videoProgress, setVideoProgress] = useState<{ step: string; message: string; detail?: string } | null>(null);
  const [videoVoice, setVideoVoice] = useState<string>(VIDEO_VOICES[0].value);
  const [videoRate, setVideoRate] = useState<string>("+0%");
  const { jobs, loading, error, reload: reloadJobs } = useCrawlJobs();
  const [activeTab, setActiveTab] = useState<"jobs" | "videos">("jobs");
  const [videos, setVideos] = useState<Video[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [videosSuccess, setVideosSuccess] = useState<string | null>(null);
  const [videoSearch, setVideoSearch] = useState("");
  const [videoPage, setVideoPage] = useState(1);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [bulkVideoLoading, setBulkVideoLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [videoAbortController, setVideoAbortController] = useState<AbortController | null>(null);
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState("all");
  const [jobPage, setJobPage] = useState(1);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [bulkJobLoading, setBulkJobLoading] = useState(false);
  const [jobNotice, setJobNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const JOBS_PER_PAGE = 10;

  const filteredJobs = jobs.filter((job) => {
    const query = jobSearch.trim().toLowerCase();
    const matchesQuery = !query || [job.title_vi, job.author_vi, job.book_url].some((value) => value?.toLowerCase().includes(query));
    return matchesQuery && (jobStatusFilter === "all" || job.status === jobStatusFilter);
  });
  const totalJobPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE));
  const visibleJobs = filteredJobs.slice((jobPage - 1) * JOBS_PER_PAGE, jobPage * JOBS_PER_PAGE);
  const filteredVideos = videos.filter((video) => {
    const query = videoSearch.trim().toLowerCase();
    return !query || [video.video_title, video.book_title, video.book_url, video.video_description].some((value) => value?.toLowerCase().includes(query));
  });
  const totalVideoPages = Math.max(1, Math.ceil(filteredVideos.length / JOBS_PER_PAGE));
  const visibleVideos = filteredVideos.slice((videoPage - 1) * JOBS_PER_PAGE, videoPage * JOBS_PER_PAGE);

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

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobIds((current) => current.includes(jobId) ? current.filter((id) => id !== jobId) : [...current, jobId]);
  };

  const toggleAllVisibleJobs = () => {
    const visibleIds = visibleJobs.map((job) => job.job_id);
    setSelectedJobIds((current) => visibleIds.every((id) => current.includes(id))
      ? current.filter((id) => !visibleIds.includes(id))
      : Array.from(new Set([...current, ...visibleIds])));
  };

  const runBulkJobAction = async (action: "pause" | "resume" | "delete") => {
    const selectedJobs = jobs.filter((job) => selectedJobIds.includes(job.job_id));
    const eligibleJobs = selectedJobs.filter((job) => action === "pause"
      ? job.status === "queued" || job.status === "running"
      : action === "resume" ? job.status === "paused" || job.status === "failed" : true);
    if (!eligibleJobs.length) return;
    const actionLabel = action === "delete" ? "xóa" : action === "pause" ? "tạm dừng" : "tiếp tục";
    if (!window.confirm(`Bạn có chắc muốn ${actionLabel} ${eligibleJobs.length} job đã chọn?`)) return;
    setBulkJobLoading(true);
    try {
      const results = await Promise.allSettled(eligibleJobs.map((job) => action === "delete" ? deleteCrawlJob(job.job_id) : action === "pause" ? pauseCrawlJob(job.job_id) : resumeCrawlJob(job.job_id)));
      if (action === "delete") {
        const failures = results.filter((result) => result.status === "rejected" || (result.status === "fulfilled" && !result.value.success)).length;
        setJobNotice(failures ? { type: "error", message: `${failures}/${eligibleJobs.length} job xóa không thành công.` } : { type: "success", message: `Đã xóa ${eligibleJobs.length} job.` });
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

  const handleCreateVideo = async (jobId: string) => {
    setVideoJobId(jobId);
    setVideoError(null);
    setVideoUrl(null);
    setVideoCreatedUrls([]);
    setVideoBatchProgress(null);
    setVideoStart(1);
    setVideoCount(1);
    setVideoBatchCount(1);
    setVideoImage(null);
    setVideoVoice(VIDEO_VOICES[0].value);
    setVideoRate("+0%");
  };

  // Load videos for all jobs when Videos tab is active
  const loadVideosForJobs = useCallback(async () => {
    setVideosLoading(true);
    setVideosError(null);
    try {
      const all: Video[] = [];
      for (const job of jobs) {
        if (!job?.book_url) continue;
        try {
          const res = await fetchBookVideos(job.book_url);
          if (res.videos && res.videos.length > 0) {
            all.push(...res.videos.map((v) => ({ ...v, book_url: job.book_url })));
          }
        } catch {
          // ignore per-job errors
        }
      }
      // sort by createdAt desc if available
      all.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
      setVideos(all);
    } catch (err) {
      console.error("Error loading videos:", err);
      setVideosError("Lỗi khi tải danh sách video");
    } finally {
      setVideosLoading(false);
    }
  }, [jobs]);

  // Trigger reload when switching to videos or jobs list changes
  useEffect(() => {
    if (activeTab === "videos") {
      void loadVideosForJobs();
    }
  }, [activeTab, jobs, loadVideosForJobs]);

  useEffect(() => {
    if (!videoJobId || !videoLoading) return;

    let cancelled = false;
    const pollProgress = async () => {
      try {
        const json = await fetchCrawlVideoProgress(videoJobId);
        if (!cancelled && json?.success && json?.data) {
          setVideoProgress(json.data);
        }
      } catch {
        // ignore polling errors
      }
    };

    void pollProgress();
    const interval = window.setInterval(() => {
      void pollProgress();
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [videoJobId, videoLoading]);

  const handleSubmitVideo = async () => {
    if (!videoJobId) return;
    setVideoLoading(true);
    setVideoError(null);
    setVideoUrl(null);
    setVideoCreatedUrls([]);
    setVideoProgress({ step: "start", message: "Đang bắt đầu tạo video" });
    setVideoBatchProgress({ current: 1, total: videoBatchCount });

    const controller = new AbortController();
    setVideoAbortController(controller);

    try {
      const createdUrls: string[] = [];
      let currentStart = videoStart;

      for (let index = 0; index < videoBatchCount; index += 1) {
        if (controller.signal.aborted) {
          throw new Error("aborted");
        }

        setVideoProgress({ step: "batch", message: `Đang tạo video ${index + 1}/${videoBatchCount}` });
        setVideoBatchProgress({ current: index + 1, total: videoBatchCount });

        const result = await createCrawlVideo(videoJobId, currentStart, videoCount, videoImage, videoVoice, videoRate, controller.signal);
        if (!result.success) {
          setVideoError(result.message || `Lỗi tạo video ${index + 1}`);
          break;
        }

        const url = result.data?.video_url;
        if (url) {
          createdUrls.push(url);
          setVideoUrl(url);
          setVideoCreatedUrls([...createdUrls]);
        }

        await loadVideosForJobs();
        currentStart += videoCount;
      }

      if (createdUrls.length > 0 && !controller.signal.aborted) {
        setVideoProgress({ step: "done", message: `Hoàn thành ${createdUrls.length}/${videoBatchCount} video` });
        setActiveTab("videos");
      }

      if (controller.signal.aborted) {
        setVideoError("Đã hủy tạo video");
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setVideoError("Đã hủy tạo video");
      } else {
        console.error(err);
        if (!videoError) {
          setVideoError("Lỗi tạo video");
        }
      }
    } finally {
      setVideoLoading(false);
      setVideoAbortController(null);
      setVideoBatchProgress(null);
    }
  };

  const handleCancelVideo = async () => {
    if (!videoJobId) return;

    if (videoAbortController) {
      videoAbortController.abort();
    }

    try {
      await cancelCrawlVideo(videoJobId);
    } catch (err) {
      console.error(err);
    } finally {
      setVideoLoading(false);
      setVideoAbortController(null);
      setVideoJobId(null);
      setVideoUrl(null);
      setVideoCreatedUrls([]);
      setVideoBatchProgress(null);
      setVideoProgress(null);
      setVideoError("Đã hủy tạo video");
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa video này không?")) return;
    setVideosError(null);
    setVideosSuccess(null);

    try {
      const result = await deleteVideo(videoId);
      if (result.success) {
        await loadVideosForJobs();
        setVideosSuccess("Đã xóa video.");
      } else {
        setVideosError(result.error || "Lỗi khi xóa video");
      }
    } catch (err) {
      console.error(err);
      setVideosError("Lỗi khi xóa video");
    }
  };

  const getVideoId = (video: Video) => video.id ?? video.video_url;

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds((current) => current.includes(videoId) ? current.filter((id) => id !== videoId) : [...current, videoId]);
  };

  const toggleAllVisibleVideos = () => {
    const visibleIds = visibleVideos.map(getVideoId);
    setSelectedVideoIds((current) => visibleIds.every((id) => current.includes(id))
      ? current.filter((id) => !visibleIds.includes(id))
      : Array.from(new Set([...current, ...visibleIds])));
  };

  const handleBulkDeleteVideos = async () => {
    if (!selectedVideoIds.length || !window.confirm(`Bạn có chắc muốn xóa ${selectedVideoIds.length} video đã chọn?`)) return;
    setBulkVideoLoading(true);
    const results = await Promise.allSettled(selectedVideoIds.map((videoId) => deleteVideo(videoId)));
    const failures = results.filter((result) => result.status === "rejected" || (result.status === "fulfilled" && !result.value.success)).length;
    setSelectedVideoIds([]);
    await loadVideosForJobs();
    setBulkVideoLoading(false);
    setVideosError(failures ? `${failures} video xóa không thành công.` : null);
    setVideosSuccess(failures ? null : `Đã xóa ${selectedVideoIds.length} video.`);
  };

  const handleBulkPublishVideos = async () => {
    if (!selectedVideoIds.length || !window.confirm(`Bạn có chắc muốn đăng ${selectedVideoIds.length} video lên YouTube?`)) return;
    setBulkVideoLoading(true);
    let successCount = 0;
    let failureCount = 0;
    for (const videoId of selectedVideoIds) {
      try {
        const result = await publishVideoToYouTube(videoId);
        if (result.success) successCount += 1;
        else failureCount += 1;
        if (result.data?.auth_url) window.open(result.data.auth_url, "_blank");
      } catch {
        failureCount += 1;
      }
    }
    setSelectedVideoIds([]);
    await loadVideosForJobs();
    setBulkVideoLoading(false);
    setVideosError(failureCount ? `${failureCount} video đăng không thành công.` : null);
    setVideosSuccess(`Đã xử lý ${successCount}/${successCount + failureCount} video.`);
  };

  useEffect(() => {
    setVideoPage(1);
  }, [videoSearch]);

  useEffect(() => {
    setVideoPage((page) => Math.min(page, totalVideoPages));
    setSelectedVideoIds((current) => current.filter((id) => videos.some((video) => getVideoId(video) === id)));
  }, [videos, totalVideoPages]);

  useEffect(() => {
    if (!videosError && !videosSuccess) return;
    const timer = window.setTimeout(() => {
      setVideosError(null);
      setVideosSuccess(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [videosError, videosSuccess]);

  useEffect(() => {
    if (!jobNotice) return;
    const timer = window.setTimeout(() => setJobNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [jobNotice]);

  const handlePublishVideo = async (videoId: string, jobId?: string) => {
    setVideosError(null);
    setVideosSuccess(null);
    const result = await publishVideoToYouTube(videoId);
    if (!result.success) {
      setVideosError(result.error || "Lỗi khi đăng video lên YouTube");
      return;
    }

    if (result.data?.auth_url) {
      window.open(result.data.auth_url, "_blank");
      setVideosError("Mở Google OAuth trong tab mới. Sau khi xác thực, bạn có thể thử lại để đăng video.");
      return;
    }

    await loadVideosForJobs();

    // If we have a jobId, poll the progress endpoint briefly to surface the YouTube publish notification
    if (jobId) {
      try {
        const start = Date.now();
        const timeout = 10000; // 10s
        while (Date.now() - start < timeout) {
          await new Promise((r) => setTimeout(r, 800));
          const json = await fetchCrawlVideoProgress(jobId);
          if (json?.success && json?.data) {
            const step = json.data.step;
            const detail = json.data.detail;
            if (step === "published" || step === "youtube_published" || step === "done") {
              setVideosSuccess(`Đã đăng lên YouTube${detail ? `: ${detail}` : ""}`);
              break;
            }
          }
        }
      } catch {
        // ignore polling errors
      }
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);
    try {
      if (activeTab === "jobs") {
        await reloadJobs();
      }
      if (activeTab === "videos") {
        await loadVideosForJobs();
      }
    } finally {
      setRefreshing(false);
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
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black uppercase tracking-tight">Danh sách đang cào</h2>
                <div className="flex gap-2 ml-4 rounded-full border border-zinc-800 bg-zinc-950/80 p-1 text-xs uppercase tracking-[0.25em] text-zinc-400">
                  <button
                    type="button"
                    onClick={() => setActiveTab("jobs")}
                    className={`rounded-full px-3 py-1 transition-all ${activeTab === "jobs" ? "bg-orange-500 text-black" : "hover:bg-white/5 hover:text-white"}`}
                  >
                    Jobs
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("videos")}
                    className={`rounded-full px-3 py-1 transition-all ${activeTab === "videos" ? "bg-orange-500 text-black" : "hover:bg-white/5 hover:text-white"}`}
                  >
                    Videos
                  </button>
                </div>
              </div>
              <p className="text-sm text-zinc-500">Nhấn Làm mới để cập nhật dữ liệu.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-zinc-500">{loading ? "Đang tải..." : activeTab === "jobs" ? `${jobs.length} job` : `${videos.length} video`}</div>
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={refreshing || loading || videosLoading}
                className="rounded-full border border-zinc-700 bg-zinc-950/80 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-orange-500 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? "Đang tải..." : "Làm mới"}
              </button>
            </div>
          </div>

          {activeTab === "jobs" ? (
            error ? (
              <div className="rounded-3xl border border-red-700 bg-red-950/30 p-5 text-red-300">Lỗi tải dữ liệu job crawl.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 rounded-2xl border border-zinc-800 bg-[#101010] p-4">
                  {jobNotice ? <div className={`w-full rounded-lg border px-3 py-2 text-sm ${jobNotice.type === "error" ? "border-red-700/70 bg-red-950/30 text-red-300" : "border-emerald-500/70 bg-emerald-950/30 text-emerald-200"}`}>{jobNotice.message}</div> : null}
                  <input value={jobSearch} onChange={(event) => setJobSearch(event.target.value)} placeholder="Tìm theo tên truyện, tác giả hoặc URL" className="min-w-[260px] flex-1 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-orange-500" />
                  <select value={jobStatusFilter} onChange={(event) => setJobStatusFilter(event.target.value)} className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-orange-500">
                    <option value="all">Tất cả trạng thái</option><option value="queued">Đang chờ</option><option value="running">Đang chạy</option><option value="paused">Tạm dừng</option><option value="completed">Hoàn thành</option><option value="failed">Lỗi</option>
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
            )
          ) : (
            <div>
              {videosLoading ? (
                <div className="text-sm text-zinc-400">Đang tải video...</div>
              ) : (
                <div className="space-y-4">
                  {videosError ? <div className="rounded-lg border border-red-700/70 bg-red-950/30 px-3 py-2 text-sm text-red-300">{videosError}</div> : null}
                  {videosSuccess ? <div className="rounded-lg border border-emerald-500/70 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">{videosSuccess}</div> : null}
                  <input value={videoSearch} onChange={(event) => setVideoSearch(event.target.value)} placeholder="Tìm theo tên video, truyện hoặc URL" className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-orange-500" />
                  <CrawlVideoList
                    videos={visibleVideos}
                    totalVideos={filteredVideos.length}
                    currentPage={videoPage}
                    totalPages={totalVideoPages}
                    selectedVideoIds={selectedVideoIds}
                    onPageChange={setVideoPage}
                    onToggleVideo={toggleVideoSelection}
                    onToggleAll={toggleAllVisibleVideos}
                    onPublish={(videoId) => void handlePublishVideo(videoId)}
                    onDelete={(videoId) => void handleDeleteVideo(videoId)}
                    onBulkPublish={() => void handleBulkPublishVideos()}
                    onBulkDelete={() => void handleBulkDeleteVideos()}
                    bulkLoading={bulkVideoLoading}
                  />
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {videoJobId ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-800 bg-[#0f0f11] p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-white">Tạo video từ truyện</h2>
                <p className="text-sm text-zinc-400">Chọn chương bắt đầu, số chương và ảnh bìa/video.</p>
              </div>
              <button onClick={() => setVideoJobId(null)} className="rounded-full bg-zinc-900 px-4 py-2 text-sm uppercase tracking-[0.15em] text-zinc-200 hover:bg-zinc-800">
                Đóng
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm text-zinc-300">Chương bắt đầu</label>
                <input
                  type="number"
                  min={1}
                  value={videoStart}
                  onChange={(event) => setVideoStart(Number(event.target.value) || 1)}
                  className="rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-zinc-300">Số chương</label>
                <input
                  type="number"
                  min={1}
                  value={videoCount}
                  onChange={(event) => setVideoCount(Number(event.target.value) || 1)}
                  className="rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-zinc-300">Số video trong lô</label>
                <input
                  type="number"
                  min={1}
                  value={videoBatchCount}
                  onChange={(event) => setVideoBatchCount(Number(event.target.value) || 1)}
                  className="rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                />
                <p className="text-xs text-zinc-500">Tạo nhiều video tuần tự, mỗi video dùng số chương đã chọn.</p>
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-zinc-300">Ảnh bìa / ảnh nền (tùy chọn)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) => setVideoImage(event.target.files?.[0] ?? null)}
                  className="rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white file:rounded-full file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-sm file:font-black file:text-black"
                />
                <p className="text-xs text-zinc-500">Nếu không chọn ảnh, hệ thống sẽ dùng ảnh bìa truyện nếu có.</p>
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-zinc-300">Chọn giọng đọc</label>
                <select
                  value={videoVoice}
                  onChange={(event) => setVideoVoice(event.target.value)}
                  className="rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                >
                  {VIDEO_VOICES.map((voice) => (
                    <option key={voice.value} value={voice.value}>{voice.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-zinc-300">Tốc độ đọc</label>
                <select
                  value={videoRate}
                  onChange={(event) => setVideoRate(event.target.value)}
                  className="rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500"
                >
                  <option value="+50%">Nhanh (+50%)</option>
                  <option value="+25%">Khá nhanh (+25%)</option>
                  <option value="+0%">Bình thường (+0%)</option>
                  <option value="-10%">Chậm (-10%)</option>
                  <option value="-20%">Rất chậm (-20%)</option>
                </select>
              </div>

              {videoError ? (
                <div className="rounded-2xl border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">{videoError}</div>
              ) : null}

              {videoProgress ? (
                <div className="rounded-2xl border border-orange-500/30 bg-orange-950/20 px-4 py-3 text-sm text-orange-200">
                  <div className="font-semibold uppercase tracking-[0.16em]">Đang thực hiện: {videoProgress.message}</div>
                  {videoProgress.detail ? <div className="mt-1 text-xs text-orange-100/80">{videoProgress.detail}</div> : null}
                </div>
              ) : null}

              {videoBatchProgress ? (
                <div className="rounded-2xl border border-orange-500/30 bg-orange-950/20 px-4 py-3 text-sm text-orange-200">
                  <div className="font-semibold uppercase tracking-[0.16em]">Lô video</div>
                  <div className="mt-1 text-xs text-orange-100/80">{videoBatchProgress.current}/{videoBatchProgress.total} video đã gửi</div>
                </div>
              ) : null}

              {videoCreatedUrls.length > 0 ? (
                <div className="rounded-3xl border border-emerald-500 bg-emerald-950/20 p-4 text-sm text-emerald-200">
                  <div className="font-semibold">Video đã tạo:</div>
                  <ul className="mt-2 space-y-1">
                    {videoCreatedUrls.map((createdUrl) => (
                      <li key={createdUrl}><a href={createdUrl} target="_blank" rel="noreferrer" className="text-orange-400 underline">{createdUrl}</a></li>
                    ))}
                  </ul>
                </div>
              ) : videoUrl ? (
                <div className="rounded-3xl border border-emerald-500 bg-emerald-950/20 p-4 text-sm text-emerald-200">
                  Video đã tạo xong. Xem tại: <a href={videoUrl} target="_blank" rel="noreferrer" className="text-orange-400 underline">{videoUrl}</a>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSubmitVideo}
                  disabled={videoLoading || Boolean(videoUrl)}
                  className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-[0.15em] text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-zinc-700"
                >
                  {videoLoading ? "Đang tạo..." : videoUrl ? "Đã tạo xong" : "Bắt đầu tạo video"}
                </button>
                {!videoUrl ? (
                  <button
                    onClick={() => void handleCancelVideo()}
                    className="rounded-full border border-zinc-700 bg-transparent px-5 py-3 text-sm font-black uppercase tracking-[0.15em] text-white transition hover:border-orange-500"
                  >
                    Hủy
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
