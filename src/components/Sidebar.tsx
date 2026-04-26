"use client";

import clsx from "clsx";
import { Globe2, Plus, Search, Settings, ShieldCheck, Folder, X } from "lucide-react";
import { UpdateButton } from "@/components/UpdateButton";
import type { BrowserTab } from "@/types/tabs";

type Props = {
  tabs: BrowserTab[];
  activeTabId?: string;
  onCreateTab: () => void;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onOpenCommandBar: () => void;
  onOpenSettings: () => void;
};

const SPACES = [
  { name: "Focus", color: "bg-ember" },
  { name: "Build", color: "bg-mint" },
  { name: "Read", color: "bg-brass" },
];

export function Sidebar({
  tabs,
  activeTabId,
  onCreateTab,
  onSelectTab,
  onCloseTab,
  onOpenCommandBar,
  onOpenSettings,
}: Props) {
  return (
    <aside className="flex h-full w-[256px] shrink-0 flex-col border-r border-white/8 bg-ink/90 pb-3 pt-2 backdrop-blur-2xl">
      {/* Logo area */}
      <div className="mb-3 flex items-center gap-2.5 px-4 pt-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-ember text-white shadow-sm">
          <span className="text-xs font-bold leading-none">L</span>
        </div>
        <span className="text-sm font-semibold text-white">Lume</span>
      </div>

      {/* Search */}
      <div className="mb-3 px-3">
        <button
          type="button"
          onClick={onOpenCommandBar}
          className="flex h-9 w-full items-center gap-2.5 rounded-lg border border-white/8 bg-white/6 px-3 text-left text-white/40 transition hover:border-white/16 hover:bg-white/10 hover:text-white/70"
        >
          <Search size={14} />
          <span className="min-w-0 flex-1 truncate text-sm">Search or navigate…</span>
          <kbd className="hidden rounded border border-white/16 bg-white/8 px-1.5 py-0.5 text-[10px] text-white/30 lg:block">
            ⌘T
          </kbd>
        </button>
      </div>

      {/* Spaces */}
      <div className="mb-3 grid grid-cols-3 gap-1.5 px-3">
        {SPACES.map((space) => (
          <button
            key={space.name}
            type="button"
            className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-white/8 bg-white/5 text-[11px] font-medium text-white/50 transition hover:border-white/16 hover:bg-white/10 hover:text-white/80"
          >
            <span className={clsx("h-1.5 w-1.5 rounded-[2px]", space.color)} />
            {space.name}
          </button>
        ))}
      </div>

      {/* Tabs header */}
      <div className="mb-1.5 flex items-center justify-between px-4">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/28">
          Tabs
        </span>
        <button
          type="button"
          onClick={onCreateTab}
          title="New tab (Ctrl+T)"
          className="grid h-6 w-6 place-items-center rounded-md bg-white/10 text-white/60 transition hover:bg-white/18 hover:text-white"
        >
          <Plus size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* Tab list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        <div className="space-y-0.5">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId || tab.is_active;
            return (
              <div
                key={tab.id}
                className={clsx(
                  "group flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 transition",
                  isActive
                    ? "bg-white shadow-sm"
                    : "text-white/60 hover:bg-white/8 hover:text-white"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className="flex min-w-0 flex-1 items-center gap-2.5"
                >
                  <Globe2
                    size={14}
                    strokeWidth={1.8}
                    className={clsx(
                      "shrink-0 transition",
                      isActive ? "text-ember" : "text-white/32 group-hover:text-white/60"
                    )}
                  />
                  <span
                    className={clsx(
                      "min-w-0 flex-1 truncate text-[13px]",
                      isActive ? "font-medium text-ink" : ""
                    )}
                  >
                    {tab.title}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  title="Close tab"
                  className={clsx(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-md transition",
                    isActive
                      ? "text-ink/30 hover:bg-ink/8 hover:text-ink"
                      : "text-white/0 group-hover:text-white/40 hover:bg-white/12 hover:!text-white"
                  )}
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 space-y-0.5 border-t border-white/8 px-2 pt-2">
        <UpdateButton />
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-white/48 transition hover:bg-white/8 hover:text-white"
        >
          <ShieldCheck size={15} />
          Privacy
        </button>
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-white/48 transition hover:bg-white/8 hover:text-white"
        >
          <Folder size={15} />
          Library
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-white/48 transition hover:bg-white/8 hover:text-white"
        >
          <Settings size={15} />
          Settings
        </button>
      </div>
    </aside>
  );
}
