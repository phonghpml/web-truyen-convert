"use client";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Đang tải..." }: LoadingStateProps) {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  onHome?: () => void;
}

export function ErrorState({
  message = "Có lỗi xảy ra",
  onRetry,
  onHome,
}: ErrorStateProps) {
  return (
    <div className="text-center py-12">
      <p className="text-red-500 mb-4">{message}</p>
      <div className="space-x-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-[10px] text-orange-500 uppercase font-bold hover:text-orange-400 transition-colors"
          >
            Thử lại
          </button>
        )}
        {onHome && (
          <button
            onClick={onHome}
            className="text-[10px] text-orange-500 uppercase font-bold hover:text-orange-400 transition-colors"
          >
            ← Trang chủ
          </button>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message = "Không có dữ liệu" }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500">{message}</p>
    </div>
  );
}
