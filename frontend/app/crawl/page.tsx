"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { InputGroup } from "@/components/ui/InputGroup";
import { CrawlJobList } from "@/components/features/CrawlJobList";
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
  const [refreshTick, setRefreshTick] = useState(0);
  const { jobs, loading, error } = useCrawlJobs(0, refreshTick);
  const [activeTab, setActiveTab] = useState<"jobs" | "videos">("jobs");
  const [videos, setVideos] = useState<Video[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [videosSuccess, setVideosSuccess] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [videoAbortController, setVideoAbortController] = useState<AbortController | null>(null);

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
    setVideosError(null);
    setVideosSuccess(null);

    const result = await deleteVideo(videoId);
    if (result.success) {
      await loadVideosForJobs();
      setVideosError(null);
      setVideosSuccess(null);
    } else {
      setVideosError(result.error || "Lỗi khi xóa video");
    }
  };

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
      setRefreshTick((prev) => prev + 1);
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
              <CrawlJobList jobs={jobs} onPause={handlePause} onResume={handleResume} onDelete={handleDelete} onCreateVideo={handleCreateVideo} />
            )
          ) : (
            <div>
              {videosLoading ? (
                <div className="text-sm text-zinc-400">Đang tải video...</div>
              ) : videosError ? (
                <div className="rounded-3xl border border-red-700 bg-red-950/30 p-5 text-red-300">{videosError}</div>
              ) : videosSuccess ? (
                <div className="rounded-3xl border border-emerald-500 bg-emerald-950/30 p-5 text-emerald-200">{videosSuccess}</div>
              ) : videos.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-sm text-zinc-300">Chưa có video nào được tạo.</div>
              ) : (
                <div className="space-y-4">
                  {videos.map((video) => (
                    <div key={video.id ?? video.video_url} className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex gap-4">
                          {video.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={video.thumbnail_url} alt="Thumbnail video" className="h-24 w-32 rounded-2xl object-cover" />
                          ) : (
                            <div className="flex h-24 w-32 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-xs uppercase tracking-[0.2em] text-zinc-500">
                              No Cover
                            </div>
                          )}
                          <div>
                            <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">Video</p>
                            <div className="mt-4">
                              {video.video_title ? (
                                <p className="text-lg font-semibold text-white">{video.video_title}</p>
                              ) : (
                                <p className="text-lg font-semibold text-white">{video.book_title || "Video"}</p>
                              )}
                              {video.author_name ? (
                                <p className="text-sm text-zinc-400">Tác giả: {video.author_name}</p>
                              ) : null}
                              {video.video_description ? (
                                <p className="mt-2 text-sm text-zinc-300">{video.video_description}</p>
                              ) : null}
                              {video.video_tags ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {video.video_tags.split(",").map((tag) => (
                                    <span key={tag.trim()} className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-400">{tag.trim()}</span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            <p className="text-xs text-zinc-500">Truyện: {video.book_url}</p>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-400">
                              <span>Giọng: {video.voice}</span>
                              <span>Rate: {video.rate}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 md:mt-0 md:ml-6 flex flex-col items-start md:items-end gap-3">
                          <a href={video.video_url} target="_blank" rel="noreferrer" className="text-orange-400 underline">Xem</a>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void handlePublishVideo(video.id ?? video.video_url)}
                              className="rounded-full border border-orange-500 px-3 py-1 text-sm text-orange-300 hover:bg-orange-950/40"
                            >
                              Đăng YouTube
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteVideo(video.id ?? video.video_url)}
                              className="rounded-full border border-red-700 px-3 py-1 text-sm text-red-400 hover:bg-red-950/40"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      </div>


                    </div>
                  ))}
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
