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
  created_at: string;
  updated_at: string;
  chapters: Array<{ chapter_no: number; title_vi: string; url: string; status: string }>;
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

export function useCrawlJobs(pollInterval = 3000) {
  const [jobs, setJobs] = useState<CrawlJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadJobs = async () => {
      try {
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
    const timer = setInterval(loadJobs, pollInterval);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [pollInterval]);

  return { jobs, loading, error };
}
