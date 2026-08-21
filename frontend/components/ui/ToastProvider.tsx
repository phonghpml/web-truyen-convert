"use client";

import {
  CheckCircle2,
  CircleAlert,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error";

type ToastInput = {
  message: string;
  type: ToastType;
  duration?: number;
};

type Toast = ToastInput & {
  id: number;
};

type ToastContextValue = {
  toast: (input: ToastInput) => number;
  success: (message: string, duration?: number) => number;
  error: (message: string, duration?: number) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    ({ message, type, duration = 4000 }: ToastInput) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, type, duration }]);

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [dismiss],
  );

  const success = useCallback(
    (message: string, duration?: number) => toast({ message, type: "success", duration }),
    [toast],
  );

  const error = useCallback(
    (message: string, duration?: number) => toast({ message, type: "error", duration }),
    [toast],
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, dismiss }}>
      {children}
      <div
        aria-label="Thông báo"
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
      >
        {toasts.map(({ id, message, type }) => {
          const isError = type === "error";
          const Icon = isError ? CircleAlert : CheckCircle2;

          return (
            <div
              key={id}
              role={isError ? "alert" : "status"}
              aria-live={isError ? "assertive" : "polite"}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${
                isError
                  ? "border-red-500/30 bg-red-950/95 text-red-200"
                  : "border-emerald-500/30 bg-emerald-950/95 text-emerald-200"
              }`}
            >
              <Icon aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
              <p className="min-w-0 flex-1 leading-5">{message}</p>
              <button
                type="button"
                aria-label="Đóng thông báo"
                onClick={() => dismiss(id)}
                className="shrink-0 rounded-md p-0.5 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                <X aria-hidden="true" size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
