export default function Loading() {
  return (
    <main className="app-loading-screen fixed inset-0 z-[9999] flex min-h-screen items-center justify-center">
      <style>{`
        .app-loading-screen {
          --loader-bg: #0b0d14;
          --loader-title: #c4b5fd;
          --loader-copy: rgba(226, 232, 240, .42);
          --loader-ring: rgba(255, 255, 255, .10);
          background: radial-gradient(ellipse at 50% 42%, rgba(139, 92, 246, .13), transparent 48%), var(--loader-bg);
          color: #fff;
          transition: background-color .2s ease, color .2s ease;
        }
        .app-loading-screen .loader-track {
          border-color: var(--loader-ring);
        }
        .app-loading-screen .loader-copy {
          color: var(--loader-copy);
        }
        html[data-mobile-theme="light"] .app-loading-screen,
        html[data-theme="light"] .app-loading-screen {
          --loader-bg: #f5f3fb;
          --loader-title: #7c3aed;
          --loader-copy: rgba(71, 60, 105, .62);
          --loader-ring: rgba(124, 58, 237, .14);
          background: radial-gradient(ellipse at 50% 42%, rgba(168, 85, 247, .13), transparent 52%), #f5f3fb;
          color: #302944;
        }
        .app-loading-screen .loader-title { color: var(--loader-title); }
        @media (prefers-reduced-motion: reduce) {
          .app-loading-screen .animate-spin,
          .app-loading-screen .animate-pulse { animation: none !important; }
        }
      `}</style>
      <div className="flex flex-col items-center gap-6">
        <div className="relative h-20 w-20">
          <div className="loader-track absolute inset-0 rounded-full border-4" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-violet-500 border-r-fuchsia-500" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <h2 className="loader-title animate-pulse text-xs font-black uppercase tracking-[0.3em]">
            Đang kết nối...
          </h2>
          <p className="loader-copy text-[10px] font-bold uppercase tracking-widest">
            Chất lượng gốc • Tốc độ cao
          </p>
        </div>
      </div>
    </main>
  );
}
