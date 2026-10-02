import Image from "next/image";
import { Book } from "@/lib/types";

export const BookResult = ({ data }: { data: Book }) => (
  <div className="flex flex-col gap-4 rounded-2xl border border-orange-500/30 bg-gray-900 p-4 text-left sm:flex-row sm:gap-6 sm:p-6">
    <div className="relative h-36 w-24 shrink-0 self-center overflow-hidden rounded-lg sm:h-44 sm:w-32 sm:self-start">
      <Image
        src={data.cover_url || "/placeholder.png"}
        alt={data.title_vi || "cover"}
        fill
        className="object-cover"
        unoptimized
      />
    </div>
    <div className="min-w-0">
      <h3 className="break-words text-lg font-bold text-orange-500 sm:text-xl">{data.title_vi}</h3>
        <p className="text-gray-500 text-xs mb-3 italic">{data.author_vi}</p>
        <p className="text-sm text-gray-400 line-clamp-3">{data.description_vi}</p>
    </div>
  </div>
);
