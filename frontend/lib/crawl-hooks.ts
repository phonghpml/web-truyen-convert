import { useEffect, useState } from "react";
import { ENDPOINTS, MESSAGES } from "./constants";

type CrawlJobStatus = "queued" | "running" | "paused" | "completed" | "failed";

export interface CrawlJob {
  job_id: string;
  book_url: string;
  title_vi?: string;
  author_vi?: string;
  description_vi?: string;
  cover_url?: string;
  status: CrawlJobStatus;
  total_chapters: number;
  crawled_chapters: number;
  current_chapter_index: number;
  current_chapter_title?: string;
  current_chapter_url?: string;
  remaining_chapters: number;
  total_nonvip_chapters: number;
  processed_nonvip_chapters: number;
  crawled_nonvip_chapters: number;
  remaining_nonvip_chapters: number;
  db_chapter_count: number;
  db_book_exists: boolean;
  created_at: string;
  updated_at: string;
  chapters?: Array<{
    chapter_no: number;
    title_vi: string;
    url: string;
    access?: "regular" | "vip" | "unvip";
    status: string;
  }>;
}

export async function submitCrawlJob(url: string) {
  const response = await fetch(ENDPOINTS.CRAWL_SUBMIT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return await response.json();
}

export async function fetchCrawlJobs() {
  const response = await fetch(ENDPOINTS.CRAWL_JOBS);
  return await response.json();
}

export async function pauseCrawlJob(jobId: string) {
  const response = await fetch(`${ENDPOINTS.CRAWL_JOBS}/${encodeURIComponent(jobId)}/pause`, {
    method: "POST",
  });
  return await response.json();
}

export async function resumeCrawlJob(jobId: string) {
  const response = await fetch(`${ENDPOINTS.CRAWL_JOBS}/${encodeURIComponent(jobId)}/resume`, {
    method: "POST",
  });
  return await response.json();
}

export async function deleteCrawlJob(jobId: string) {
  const response = await fetch(`${ENDPOINTS.CRAWL_JOBS}/${encodeURIComponent(jobId)}`, {
    method: "DELETE",
  });
  return await response.json();
}

export const VIDEO_VOICES = [
  { value: "vi-VN-NamMinhNeural", label: "Nam Minh (Tiếng Việt)" },
  { value: "vi-VN-HoaiMyNeural", label: "Hoài My (Tiếng Việt)" },
  { value: "en-US-JennyNeural", label: "Jenny (English)" },
];

export async function createCrawlVideo(jobId: string, chapterStart: number, chapterCount: number, coverImage: File | null, voice: string, rate: string, signal?: AbortSignal) {
  const form = new FormData();
  form.append("chapter_start", chapterStart.toString());
  form.append("chapter_count", chapterCount.toString());
  form.append("voice", voice);
  form.append("rate", rate);
  if (coverImage) {
    form.append("cover_image", coverImage);
  }

  const response = await fetch(`${ENDPOINTS.CRAWL_JOBS}/${encodeURIComponent(jobId)}/video`, {
    method: "POST",
    body: form,
    signal,
  });
  return await response.json();
}

export async function cancelCrawlVideo(jobId: string) {
  const response = await fetch(`${ENDPOINTS.CRAWL_JOBS}/${encodeURIComponent(jobId)}/video/cancel`, {
    method: "POST",
  });
  return await response.json();
}

export async function fetchCrawlVideoProgress(jobId: string) {
  const response = await fetch(`${ENDPOINTS.CRAWL_JOBS}/${encodeURIComponent(jobId)}/video/progress`);
  return await response.json();
}

export function useCrawlJobs(pollInterval = 0, refreshTrigger = 0) {
  const [jobs, setJobs] = useState<CrawlJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadJobs = async () => {
      try {
        if (mounted) setLoading(true);
        const json = await fetchCrawlJobs();
        if (mounted) {
          if (json.success && Array.isArray(json.data)) {
            setJobs(json.data);
            setError(null);
          } else {
            setError(MESSAGES.ERROR);
          }
        }
      } catch (err) {
        console.error("Crawl jobs load error:", err);
        if (mounted) setError(MESSAGES.ERROR);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadJobs();

    if (!pollInterval) {
      return () => {
        mounted = false;
      };
    }

    const timer = setInterval(loadJobs, pollInterval);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [pollInterval, refreshTrigger]);

  return { jobs, loading, error };
}
