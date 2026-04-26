"use client";

import { Minus, Square, X } from "lucide-react";

type Props = {
  pageTitle?: string;
};

async function withWindow(
  action: (w: Awaited<ReturnType<typeof import("@tauri-apps/api/window")["getCurrentWindow"]>>) => Promise<void>
) {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await action(getCurrentWindow());
  } catch {
    /* not in Tauri */
  }
}

export function Titlebar({ pageTitle }: Props) {
  return (
    <header
      data-tauri-drag-region
      className="fixed inset-x-0 top-0 z-50 flex h-9 items-center border-b border-white/8 bg-ink/88 backdrop-blur-xl"
    >
      {/* Drag area with title */}
      <div
        data-tauri-drag-region
        className="flex min-w-0 flex-1 items-center gap-2 px-4 text-white"
      >
        <span className="h-2 w-2 shrink-0 rounded-[3px] bg-ember" />
        <span className="text-[13px] font-medium text-white/50">Lume</span>
        {pageTitle && (
          <>
            <span className="text-white/20">/</span>
            <span
              data-tauri-drag-region
              className="min-w-0 truncate text-[13px] text-white/70"
            >
              {pageTitle}
            </span>
          </>
        )}
      </div>

      {/* Window controls */}
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          aria-label="Minimize"
          className="grid h-9 w-10 place-items-center text-white/50 transition hover:bg-white/8 hover:text-white"
          onClick={() => withWindow((w) => w.minimize())}
        >
          <Minus size={14} strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Maximize"
          className="grid h-9 w-10 place-items-center text-white/50 transition hover:bg-white/8 hover:text-white"
          onClick={() => withWindow((w) => w.toggleMaximize())}
        >
          <Square size={11} strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Close"
          className="grid h-9 w-10 place-items-center text-white/50 transition hover:bg-ember hover:text-white"
          onClick={() => withWindow((w) => w.close())}
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}
