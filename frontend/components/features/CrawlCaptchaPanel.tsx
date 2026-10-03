"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Play, RefreshCw, Send } from "lucide-react";
import {
  CrawlCaptchaChallenge,
  fetchCrawlCaptchaChallenges,
  fetchCrawlCaptchaScreenshot,
  resumeCrawlJob,
  sendCrawlCaptchaAction,
} from "@/lib/crawl-hooks";

interface CrawlCaptchaPanelProps {
  onResumed: () => Promise<void>;
}

interface PointerPosition {
  x: number;
  y: number;
}

export function CrawlCaptchaPanel({ onResumed }: CrawlCaptchaPanelProps) {
  const [challenges, setChallenges] = useState<CrawlCaptchaChallenge[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [captchaText, setCaptchaText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageVersion, setImageVersion] = useState(0);
  const pointerStart = useRef<PointerPosition | null>(null);

  useEffect(() => {
    let active = true;
    const loadChallenges = async () => {
      try {
        const nextChallenges = await fetchCrawlCaptchaChallenges();
        if (!active) return;
        setChallenges(nextChallenges);
        setSelectedJobId((current) =>
          current && nextChallenges.some((challenge) => challenge.job_id === current)
            ? current
            : nextChallenges[0]?.job_id ?? null
        );
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Không thể tải phiên xác minh");
        }
      }
    };

    void loadChallenges();
    const timer = window.setInterval(() => void loadChallenges(), 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!selectedJobId) {
      setScreenshotUrl(null);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;
    setScreenshotUrl(null);
    void fetchCrawlCaptchaScreenshot(selectedJobId)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setScreenshotUrl(objectUrl);
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Không thể tải ảnh CAPTCHA");
        }
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedJobId, imageVersion]);

  const sendAction = async (action: Parameters<typeof sendCrawlCaptchaAction>[1]) => {
    if (!selectedJobId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendCrawlCaptchaAction(selectedJobId, action);
      setImageVersion((version) => version + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không gửi được thao tác");
    } finally {
      setBusy(false);
    }
  };

  const getPosition = (event: React.PointerEvent<HTMLImageElement>): PointerPosition => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.round(((event.clientX - bounds.left) / bounds.width) * 1280),
      y: Math.round(((event.clientY - bounds.top) / bounds.height) * 720),
    };
  };

  const selectedChallenge = challenges.find((challenge) => challenge.job_id === selectedJobId);
  if (challenges.length === 0 && !error) return null;

  const resumeSelectedJob = async () => {
    if (!selectedJobId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await resumeCrawlJob(selectedJobId);
      if (!result.success) throw new Error(result.message || "Không thể tiếp tục job");
      setSelectedJobId(null);
      await onResumed();
    } catch (resumeError) {
      setError(resumeError instanceof Error ? resumeError.message : "Không thể tiếp tục job");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 border border-amber-700/70 bg-amber-950/20 p-4 sm:p-5" aria-label="Xác minh SangTacViet">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-amber-200">Xác minh SangTacViet</h2>
          {selectedChallenge ? (
            <p className="mt-1 text-xs text-amber-100/70">
              Chương {selectedChallenge.chapter_id} · mã {selectedChallenge.code}
              {selectedChallenge.captcha_detected ? " · CAPTCHA được nhận diện" : " · yêu cầu xác minh"}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {challenges.length > 1 ? (
            <select
              aria-label="Chọn job xác minh"
              value={selectedJobId ?? ""}
              onChange={(event) => setSelectedJobId(event.target.value)}
              className="max-w-48 border border-zinc-700 bg-black px-2 py-2 text-sm text-white"
            >
              {challenges.map((challenge) => (
                <option key={challenge.job_id} value={challenge.job_id}>
                  {challenge.job_id.slice(0, 8)} · {challenge.chapter_id}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            onClick={() => setImageVersion((version) => version + 1)}
            disabled={!selectedJobId || busy}
            aria-label="Tải lại ảnh CAPTCHA"
            title="Tải lại ảnh CAPTCHA"
            className="flex size-10 items-center justify-center border border-zinc-700 text-zinc-200 hover:border-amber-500 disabled:opacity-50"
          >
            <RefreshCw size={17} />
          </button>
          <button
            type="button"
            onClick={() => void resumeSelectedJob()}
            disabled={!selectedJobId || busy}
            className="flex min-h-10 items-center gap-2 bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            <Play size={16} /> Tiếp tục job
          </button>
        </div>
      </div>

      {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}

      {selectedJobId ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="overflow-hidden border border-zinc-700 bg-black">
            {screenshotUrl ? (
              <Image
                src={screenshotUrl}
                alt="Trang xác minh SangTacViet"
                width={1280}
                height={720}
                unoptimized
                draggable={false}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  pointerStart.current = getPosition(event);
                }}
                onPointerUp={(event) => {
                  const start = pointerStart.current;
                  pointerStart.current = null;
                  if (!start) return;
                  const end = getPosition(event);
                  const moved = Math.hypot(end.x - start.x, end.y - start.y) > 8;
                  void sendAction(moved
                    ? { action: "drag", ...start, end_x: end.x, end_y: end.y }
                    : { action: "click", ...end });
                }}
                className="block h-auto max-h-[70vh] w-full touch-none object-contain"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center text-sm text-zinc-500">Đang tải ảnh xác minh...</div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium text-zinc-300" htmlFor="captcha-text-entry">Nhập nội dung</label>
            <input
              id="captcha-text-entry"
              value={captchaText}
              onChange={(event) => setCaptchaText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && captchaText) {
                  void sendAction({ action: "type", text: captchaText });
                  setCaptchaText("");
                }
              }}
              maxLength={200}
              className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => {
                if (!captchaText) return;
                void sendAction({ action: "type", text: captchaText });
                setCaptchaText("");
              }}
              disabled={!captchaText || busy}
              className="flex min-h-10 items-center justify-center gap-2 border border-zinc-700 px-3 text-sm text-zinc-100 hover:border-amber-500 disabled:opacity-50"
            >
              <Send size={15} /> Gửi chữ
            </button>
            <button
              type="button"
              onClick={() => void sendAction({ action: "press", key: "Enter" })}
              disabled={busy}
              className="min-h-10 border border-zinc-700 px-3 text-sm text-zinc-100 hover:border-amber-500 disabled:opacity-50"
            >
              Enter
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}