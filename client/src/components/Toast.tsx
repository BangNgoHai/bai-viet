import { useGame } from '../store';

const STYLE: Record<string, string> = {
  error: 'border-rose-400/30 bg-rose-500/15 text-rose-100',
  success: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100',
  info: 'border-sky-400/30 bg-sky-500/15 text-sky-100',
};

export function ToastHost() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismiss(toast.id)}
          className={`pointer-events-auto float-in max-w-md rounded-xl border px-4 py-2 text-sm shadow-2xl backdrop-blur ${
            STYLE[toast.type] ?? STYLE.info
          }`}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
