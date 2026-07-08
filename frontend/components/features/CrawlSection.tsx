"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MESSAGES } from "@/lib/constants";
import { getCrawlerInfo, getCrawlerChapters } from "@/lib/hooks";
import { getSearchLink, isValidUrl } from "@/lib/utils";
import { InputGroup } from "../ui/InputGroup";

interface CrawlSectionProps {
  onSearchMode?: (isSearching: boolean) => void;
}

export default function CrawlSection({ onSearchMode }: CrawlSectionProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    if (!input.trim()) return;

    if (isValidUrl(input)) {
      setLoading(true);
      onSearchMode?.(true);

      try {
        // 1. Gọi Python cào Info (Python sẽ tự lưu vào table 'books')
        const infoResult = await getCrawlerInfo(input);
        if (!infoResult.success || !infoResult.data) throw new Error("Crawl Info failed");

        // 2. Gọi Python cào Chapters (Python sẽ tự lưu vào table 'chapters')
        // Chúng ta đợi cào xong để đảm bảo sang trang Detail là có chương ngay
        await getCrawlerChapters(input);

        // 3. Chuyển hướng sang trang chi tiết dựa trên Slug mà Python vừa tạo
        const finalSlug = infoResult.data.slug;
        router.push(`/book/${finalSlug}`);
        
      } catch (err) {
        console.error("Crawl error:", err);
        alert(MESSAGES.ERROR_CONVERT);
        onSearchMode?.(false);
      } finally {
        setLoading(false);
      }
    } else {
      // Nếu không phải URL thì thực hiện tìm kiếm
      router.push(getSearchLink(input));
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-8 py-10">
      <InputGroup
        url={input}
        setUrl={setInput}
        onCrawl={handleExecute}
        loading={loading}
      />
      {loading && (
        <div className="text-center animate-pulse text-orange-500 text-xs font-mono mt-4">
          🚀 SYSTEM: CRAWLING AND SAVING TO DATABASE...
        </div>
      )}
    </div>
  );
}