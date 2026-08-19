"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { CrawlVideoList } from "@/components/features/CrawlVideoList";
import { useAuth } from "@/lib/useAuth";
import { VIDEO_VOICES } from "@/lib/crawl-hooks";
import { deleteVideo, publishVideoToYouTube } from "@/lib/hooks";
import { authFetch } from "@/lib/auth";
import { ENDPOINTS } from "@/lib/constants";
import { useBooks } from "@/lib/hooks";
import { createVideoFromBook } from "@/lib/video-hooks";
import type { Video } from "@/lib/types";

export default function AdminVideosPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading } = useAuth();
  const { data: booksData } = useBooks(24);
  const books = booksData || [];
  const [selectedBookIdState, setSelectedBookIdState] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [videosSuccess, setVideosSuccess] = useState<string | null>(null);
  const [videoSearch, setVideoSearch] = useState("");
  const [videoPage, setVideoPage] = useState(1);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [videoStart, setVideoStart] = useState<number>(1);
  const [videoCount, setVideoCount] = useState<number>(1);
  const [videoBatchCount, setVideoBatchCount] = useState<number>(1);
  const [videoImage, setVideoImage] = useState<File | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoAbortController, setVideoAbortController] = useState<AbortController | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoCreatedUrls, setVideoCreatedUrls] = useState<string[]>([]);
  const [videoBatchProgress, setVideoBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [videoProgress, setVideoProgress] = useState<{ step: string; message: string; detail?: string } | null>(null);
  const [videoVoice, setVideoVoice] = useState<string>("nghitts:ngochuyennew");
  const [videoRate, setVideoRate] = useState<string>("+0%");
  const [bulkOrder, setBulkOrder] = useState<string>("created_desc");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const openCreateModal = useCallback(() => setShowCreateModal(true), []);
  const closeCreateModal = useCallback(() => setShowCreateModal(false), []);
  const resetCreateForm = useCallback(() => {
    setVideoStart(1);
    setVideoCount(1);
    setVideoBatchCount(1);
    setVideoImage(null);
    setVideoVoice("nghitts:ngochuyennew");
    setVideoRate("+0%");
    setVideoError(null);
    setVideoUrl(null);
    setVideoCreatedUrls([]);
    setVideoBatchProgress(null);
    setVideoProgress(null);
  }, []);

  useEffect(() => {
    if (!selectedBookIdState && books.length > 0) {
      setSelectedBookIdState(books[0].id as string);
    }
  }, [books, selectedBookIdState]);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace("/");
    }
  }, [isAdmin, isLoading, router]);

  const selectedBook = books.find((b: any) => b.id === selectedBookIdState);

  const loadVideosForJobs = useCallback(async () => {
    setVideosLoading(true);
    setVideosError(null);
    try {
      const response = await authFetch(ENDPOINTS.VIDEOS, { method: "GET" });
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        const all: Video[] = data.data;
        all.sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
        setVideos(all);
      } else {
        setVideos([]);
        setVideosError(data.error || "Lỗi khi tải danh sách video");
      }
    } catch (err) {
      console.error(err);
      setVideosError("Lỗi khi tải danh sách video");
      setVideos([]);
    } finally {
      setVideosLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadVideosForJobs();
    }
  }, [isAdmin, loadVideosForJobs]);

  const filteredVideos = useMemo(() => {
    const query = videoSearch.trim().toLowerCase();
    return videos.filter((video) => {
      if (!query) return true;
      return [video.video_title, video.book_title, video.book_url, video.video_description].some((value) =>
        value?.toLowerCase().includes(query)
      );
    });
  }, [videoSearch, videos]);

  const totalVideoPages = Math.max(1, Math.ceil(filteredVideos.length / 10));
  const visibleVideos = filteredVideos.slice((videoPage - 1) * 10, videoPage * 10);

  const getVideoId = (video: Video) => video.id ?? video.video_url;

  const handleToggleVideo = (videoId: string) => {
    setSelectedVideoIds((current) =>
      current.includes(videoId) ? current.filter((id) => id !== videoId) : [...current, videoId]
    );
  };

  const handleToggleAllVideos = () => {
    const visibleIds = visibleVideos.map(getVideoId);
    setSelectedVideoIds((current) =>
      visibleIds.every((id) => current.includes(id))
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds]))
    );
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa video này không?")) return;
    setVideosError(null);
    setVideosSuccess(null);
    try {
      const result = await deleteVideo(videoId);
      if (!result.success) {
        setVideosError(result.error || "Lỗi khi xóa video");
        return;
      }
      await loadVideosForJobs();
      setVideosSuccess("Đã xóa video.");
    } catch (err) {
      console.error(err);
      setVideosError("Lỗi khi xóa video");
    }
  };

  const handlePublishVideo = async (videoId: string) => {
    if (!window.confirm("Bạn có chắc muốn đăng video này lên YouTube?")) return;
    setVideosError(null);
    setVideosSuccess(null);
    try {
      const result = await publishVideoToYouTube(videoId);
      if (!result.success) {
        setVideosError(result.error || "Lỗi khi đăng video lên YouTube");
        return;
      }
      if (result.data?.auth_url) {
        window.open(result.data.auth_url, "_blank");
        setVideosSuccess("Đã mở Google OAuth trong tab mới. Sau khi xác thực, hãy thử lại.");
      } else {
        setVideosSuccess("Yêu cầu đăng video đã được gửi.");
      }
      await loadVideosForJobs();
    } catch (err) {
      console.error(err);
      setVideosError("Lỗi khi đăng video lên YouTube");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedVideoIds.length) return;
    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedVideoIds.length} video đã chọn?`)) return;
    setBulkLoading(true);
    setVideosError(null);
    setVideosSuccess(null);

    try {
      const results = await Promise.allSettled(selectedVideoIds.map((videoId) => deleteVideo(videoId)));
      const failures = results.filter(
        (result) => result.status === "rejected" || (result.status === "fulfilled" && !result.value.success)
      ).length;
      if (failures) {
        setVideosError(`${failures}/${selectedVideoIds.length} video xóa không thành công.`);
      } else {
        setVideosSuccess(`Đã xóa ${selectedVideoIds.length} video.`);
      }
      setSelectedVideoIds([]);
      await loadVideosForJobs();
    } catch (err) {
      console.error(err);
      setVideosError("Xóa video hàng loạt thất bại");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkPublish = async () => {
    if (!selectedVideoIds.length) return;
    if (!window.confirm(`Bạn có chắc muốn đăng ${selectedVideoIds.length} video đã chọn lên YouTube?`)) return;
    setBulkLoading(true);
    setVideosError(null);
    setVideosSuccess(null);

    const sortSelectedIds = (ids: string[]) => {
      if (!ids || ids.length === 0) return ids;
      const map = new Map(ids.map((id) => [id, videos.find((v) => (v.id ?? v.video_url) === id)]));
      const arr = Array.from(ids);
      switch (bulkOrder) {
        case "created_asc":
          arr.sort((a, b) => {
            const va = map.get(a) as any;
            const vb = map.get(b) as any;
            const ta = va?.createdAt ? new Date(va.createdAt).getTime() : 0;
            const tb = vb?.createdAt ? new Date(vb.createdAt).getTime() : 0;
            return ta - tb;
          });
          break;
        case "chapters_asc":
          arr.sort((a, b) => {
            const va = map.get(a) as any;
            const vb = map.get(b) as any;
            const ca = Number(va?.chapter_count || va?.chapterCount || 0);
            const cb = Number(vb?.chapter_count || vb?.chapterCount || 0);
            return ca - cb;
          });
          break;
        case "chapters_desc":
          arr.sort((a, b) => {
            const va = map.get(a) as any;
            const vb = map.get(b) as any;
            const ca = Number(va?.chapter_count || va?.chapterCount || 0);
            const cb = Number(vb?.chapter_count || vb?.chapterCount || 0);
            return cb - ca;
          });
          break;
        default:
          // created_desc
          arr.sort((a, b) => {
            const va = map.get(a) as any;
            const vb = map.get(b) as any;
            const ta = va?.createdAt ? new Date(va.createdAt).getTime() : 0;
            const tb = vb?.createdAt ? new Date(vb.createdAt).getTime() : 0;
            return tb - ta;
          });
      }
      return arr;
    };

    try {
      const ordered = sortSelectedIds(selectedVideoIds);
      let successCount = 0;
      let failureCount = 0;
      for (const videoId of ordered) {
        const result = await publishVideoToYouTube(videoId);
        if (result.success) successCount += 1;
        else failureCount += 1;
        if (result.data?.auth_url) window.open(result.data.auth_url, "_blank");
      }
      if (failureCount) {
        setVideosError(`${failureCount}/${selectedVideoIds.length} video đăng không thành công.`);
      } else {
        setVideosSuccess(`Đã gửi ${successCount} video lên YouTube.`);
      }
      setSelectedVideoIds([]);
      await loadVideosForJobs();
    } catch (err) {
      console.error(err);
      setVideosError("Đăng video hàng loạt thất bại");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleCreateVideo = async () => {
    if (!selectedBookIdState) {
      setVideoError("Vui lòng chọn truyện (book id) để tạo video.");
      return;
    }

    setVideoLoading(true);
    setVideoError(null);
    setVideoUrl(null);
    setVideoCreatedUrls([]);
    setVideoBatchProgress({ current: 1, total: videoBatchCount });
    setVideoProgress({ step: "start", message: "Đang bắt đầu tạo video" });

    const controller = new AbortController();
    setVideoAbortController(controller);
    let currentStart = videoStart;

    try {
      const createdUrls: string[] = [];
      for (let index = 0; index < videoBatchCount; index += 1) {
        if (controller.signal.aborted) {
          throw new Error("aborted");
        }

        setVideoProgress({ step: "batch", message: `Đang tạo video ${index + 1}/${videoBatchCount}` });
        setVideoBatchProgress({ current: index + 1, total: videoBatchCount });

        let result;
        const bookId = selectedBookIdState as string;
        result = await createVideoFromBook(bookId, currentStart, videoCount, videoImage, videoVoice, videoRate, controller.signal);
        if (!result.success) {
          setVideoError(result.message || `Lỗi tạo video ${index + 1}`);
          break;
        }

        const urlResult = result.data?.video_url;
        if (urlResult) {
          createdUrls.push(urlResult);
          setVideoUrl(urlResult);
          setVideoCreatedUrls([...createdUrls]);
        }

        await loadVideosForJobs();
        currentStart += videoCount;
      }

      if (createdUrls.length > 0 && !controller.signal.aborted) {
        setVideoProgress({ step: "done", message: `Hoàn thành ${createdUrls.length}/${videoBatchCount} video` });
        setVideosSuccess(`Đã tạo ${createdUrls.length} video.`);
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

  useEffect(() => {
    if (!videosError && !videosSuccess) return;
    const timer = window.setTimeout(() => {
      setVideosError(null);
      setVideosSuccess(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [videosError, videosSuccess]);

  useEffect(() => {
    setVideoPage((page) => Math.min(page, totalVideoPages));
    setSelectedVideoIds((current) => current.filter((id) => videos.some((video) => getVideoId(video) === id)));
  }, [videos, totalVideoPages]);

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8">
      <Navbar />
      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-zinc-800 bg-[#0b0b0b] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">Tạo video mới</h3>
                <p className="text-sm text-zinc-400">Tạo video từ truyện (book-based)</p>
              </div>
              <button onClick={closeCreateModal} className="rounded-full border border-zinc-700 px-3 py-2 text-sm text-zinc-300">Đóng</button>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="text-sm text-zinc-300">Truyện</label>
              <select value={selectedBookIdState || ''} onChange={(e) => setSelectedBookIdState(e.target.value)} className="w-full rounded-2xl border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none">
                <option value="">Chọn truyện (book id)</option>
                {books.map((b: any) => <option key={b.id} value={b.id}>{b.title_vi || b.source_url}</option>)}
              </select>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-zinc-300">Chương bắt đầu</label>
                  <input type="number" min={1} value={videoStart} onChange={(e) => setVideoStart(Number(e.target.value) || 1)} className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="text-sm text-zinc-300">Số chương mỗi video</label>
                  <input type="number" min={1} value={videoCount} onChange={(e) => setVideoCount(Number(e.target.value) || 1)} className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="text-sm text-zinc-300">Số video trong lô</label>
                  <input type="number" min={1} value={videoBatchCount} onChange={(e) => setVideoBatchCount(Number(e.target.value) || 1)} className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-3 py-2 text-sm text-white" />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-zinc-300">Ảnh bìa</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setVideoImage(e.target.files?.[0] || null)}
                    className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-3 py-2 text-sm text-white file:rounded-2xl file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:text-white"
                  />
                  {videoImage ? <p className="mt-2 text-xs text-zinc-400">Đã chọn: {videoImage.name}</p> : null}
                </div>
                <div>
                  <label className="text-sm text-zinc-300">Giọng đọc</label>
                  <select value={videoVoice} onChange={(e) => setVideoVoice(e.target.value)} className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none">
                    {VIDEO_VOICES.map((voice) => (
                      <option key={voice.value} value={voice.value}>{voice.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-zinc-300">Tốc độ đọc</label>
                  <select value={videoRate} onChange={(e) => setVideoRate(e.target.value)} className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none">
                    <option value="-20%">-20%</option>
                    <option value="-10%">-10%</option>
                    <option value="+0%">+0%</option>
                    <option value="+10%">+10%</option>
                    <option value="+20%">+20%</option>
                  </select>
                </div>
              </div>

              {(videoProgress || videoBatchProgress || videoCreatedUrls.length > 0) && (
                <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-950/80 p-4 text-sm text-zinc-200">
                  {videoProgress?.message ? <p className="mb-2">{videoProgress.message}</p> : null}
                  {videoBatchProgress ? <p className="mb-2">Lô {videoBatchProgress.current}/{videoBatchProgress.total}</p> : null}
                  {videoCreatedUrls.length > 0 ? (
                    <div className="space-y-1">
                      <p className="font-semibold text-zinc-100">Video đã tạo</p>
                      <ul className="list-disc pl-5">
                        {videoCreatedUrls.map((url) => (
                          <li key={url}>
                            <a href={url} target="_blank" rel="noreferrer" className="text-orange-400 hover:text-orange-300">
                              {url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="mt-4 flex justify-end gap-3">
                <button onClick={closeCreateModal} disabled={videoLoading} className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40">Hủy</button>
                <button
                  onClick={videoProgress?.step === "done" ? resetCreateForm : handleCreateVideo}
                  disabled={!selectedBookIdState || videoLoading}
                  className="rounded-full bg-orange-500 px-4 py-2 text-sm font-black text-black"
                >
                  {videoLoading ? 'Đang tạo...' : videoProgress?.step === "done" ? 'Xong' : 'Tạo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-3xl border border-zinc-800 bg-[#101010] p-6 shadow-xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-orange-400">Quản lý video</h1>
            </div>
          </div>
          {videosSuccess ? <div className="mt-4 rounded-2xl border border-emerald-500/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">{videosSuccess}</div> : null}
          {videosError ? <div className="mt-4 rounded-2xl border border-red-500/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">{videosError}</div> : null}
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-[#101010] p-6 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-white">Danh sách video</h2>
                <p className="text-sm text-zinc-500">Quản lý video đã tạo và xuất bản.</p>
              </div>
            </div>
                <div>
                <input
                  value={videoSearch}
                  onChange={(event) => setVideoSearch(event.target.value)}
                  placeholder="Tìm theo tên video, truyện hoặc URL"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
                />
              </div>
              {videosLoading ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-sm text-zinc-300">Đang tải video...</div>
              ) : (
                <CrawlVideoList
                  videos={visibleVideos}
                  totalVideos={filteredVideos.length}
                  currentPage={videoPage}
                  totalPages={totalVideoPages}
                  selectedVideoIds={selectedVideoIds}
                  onPageChange={setVideoPage}
                  onToggleVideo={handleToggleVideo}
                  onToggleAll={handleToggleAllVideos}
                  onPublish={(videoId) => void handlePublishVideo(videoId)}
                  onDelete={(videoId) => void handleDeleteVideo(videoId)}
                  onBulkPublish={handleBulkPublish}
                  onBulkDelete={handleBulkDelete}
                  order={bulkOrder}
                  onOrderChange={(o) => setBulkOrder(o)}
                  onCreate={openCreateModal}
                  onRefresh={() => void loadVideosForJobs()}
                  videosLoading={videosLoading}
                  bulkLoading={bulkLoading}
                />
              )}
            </div>
          </div>
        </div>
    </div>
  );
}
