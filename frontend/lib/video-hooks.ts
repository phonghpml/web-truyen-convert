import { ENDPOINTS, MESSAGES } from "./constants";
import { authFetch } from "./auth";

export async function createVideoFromBook(
  bookId: string,
  chapterStart: number,
  chapterCount: number,
  coverImage: File | null,
  voice: string,
  rate: string,
  signal?: AbortSignal
) {
  const form = new FormData();
  form.append("book_id", bookId);
  form.append("chapter_start", chapterStart.toString());
  form.append("chapter_count", chapterCount.toString());
  form.append("voice", voice);
  form.append("rate", rate);
  if (coverImage) {
    form.append("cover_image", coverImage);
  }

  const response = await authFetch(ENDPOINTS.VIDEOS, {
    method: "POST",
    body: form,
    signal,
  });
  return await response.json();
}

export async function fetchVideosByBookUrl(bookUrl: string) {
  try {
    const response = await fetch(`${ENDPOINTS.VIDEOS}?book_url=${encodeURIComponent(bookUrl)}`);
    return await response.json();
  } catch (err) {
    console.error("Error fetching videos:", err);
    return { success: false, data: [] };
  }

}



