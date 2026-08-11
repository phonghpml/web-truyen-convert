import Image from "next/image";
import { Book } from "@/lib/types";

export const BookResult = ({ data }: { data: Book }) => (
  <div className="bg-gray-900 border border-orange-500/30 p-6 rounded-2xl flex gap-6 text-left">
    <div className="relative w-32 h-44 overflow-hidden rounded-lg">
      <Image
        src={data.cover_url || "/placeholder.png"}
        alt={data.title_vi || "cover"}
        fill
        className="object-cover"
        unoptimized
      />
    </div>
    <div>
        <h3 className="font-bold text-orange-500 text-xl">{data.title_vi}</h3>
        <p className="text-gray-500 text-xs mb-3 italic">{data.author_vi}</p>
        <p className="text-sm text-gray-400 line-clamp-3">{data.description_vi}</p>
    </div>
  </div>
);
