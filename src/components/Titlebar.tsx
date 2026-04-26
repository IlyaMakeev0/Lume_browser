"use client";

import { Minus, Square, X } from "lucide-react";

async function withCurrentWindow(
  action: (window: Awaited<
    ReturnType<typeof import("@tauri-apps/api/window")["getCurrentWindow"]>
  >) => Promise<void>
) {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await action(getCurrentWindow());
  } catch (error) {
    console.debug("Tauri window API is unavailable in this environment.", error);
  }
}

export function Titlebar() {
  return (
    <header
      data-tauri-drag-region
      className="fixed inset-x-0 top-0 z-50 grid h-9 grid-cols-[1fr_auto] border-b border-white/10 bg-ink/82 text-white shadow-sm backdrop-blur-xl"
    >
      <div
        data-tauri-drag-region
        className="flex min-w-0 items-center gap-2 px-4 text-[13px] font-medium"
      >
        <span className="h-2.5 w-2.5 rounded-sm bg-ember" />
        <span data-tauri-drag-region className="truncate">
          Lume
        </span>
      </div>

      <div className="flex items-center">
        <button
          type="button"
          aria-label="Minimize"
          title="Minimize"
          className="grid h-9 w-11 place-items-center text-white/70 transition hover:bg-white/10 hover:text-white"
          onClick={() => withCurrentWindow((window) => window.minimize())}
        >
          <Minus size={15} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          aria-label="Toggle maximize"
          title="Toggle maximize"
          className="grid h-9 w-11 place-items-center text-white/70 transition hover:bg-white/10 hover:text-white"
          onClick={() => withCurrentWindow((window) => window.toggleMaximize())}
        >
          <Square size={13} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          aria-label="Close"
          title="Close"
          className="grid h-9 w-11 place-items-center text-white/70 transition hover:bg-ember hover:text-white"
          onClick={() => withCurrentWindow((window) => window.close())}
        >
          <X size={16} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}
