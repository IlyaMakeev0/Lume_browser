"use client";

import clsx from "clsx";
import { Globe2, Plus, Search, Settings, ShieldCheck, Folder, X } from "lucide-react";
import { UpdateButton } from "@/components/UpdateButton";
import type { BrowserTab } from "@/types/tabs";

type Props = {
  tabs: BrowserTab[];
  activeTabId?: string;
  activeSpace: string;
  onCreateTab: () => void;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onSelectSpace: (space: string) => void;
  onOpenCommandBar: () => void;
  onOpenPrivacy: () => void;
  onOpenLibrary: () => void;
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
  activeSpace,
  onCreateTab,
  onSelectTab,
  onCloseTab,
  onSelectSpace,
  onOpenCommandBar,
  onOpenPrivacy,
  onOpenLibrary,
  onOpenSettings,
}: Props) {
  return (
    <aside className="lume-sidebar flex h-full w-[256px] shrink-0 flex-col border-r border-white/10 bg-[#151412] pb-3 pt-2 text-white backdrop-blur-2xl">
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
          className="flex h-9 w-full items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 text-left text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          <Search size={14} />
          <span className="min-w-0 flex-1 truncate text-sm">Search or navigate...</span>
          <kbd className="hidden rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50 lg:block">
            Ctrl+T
          </kbd>
        </button>
      </div>

      {/* Spaces */}
      <div className="mb-3 grid grid-cols-3 gap-1.5 px-3">
        {SPACES.map((space) => (
          <button
            key={space.name}
            type="button"
            onClick={() => onSelectSpace(space.name)}
            className={clsx(
              "flex h-8 items-center justify-center gap-1.5 rounded-md border text-[11px] font-medium transition",
              activeSpace === space.name
                ? "border-white/20 bg-white text-ink shadow-sm"
                : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white"
            )}
          >
            <span className={clsx("h-1.5 w-1.5 rounded-[2px]", space.color)} />
            {space.name}
          </button>
        ))}
      </div>

      {/* Tabs header */}
      <div className="mb-1.5 flex items-center justify-between px-4">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
          Tabs
        </span>
        <button
          type="button"
          onClick={onCreateTab}
          title="New tab (Ctrl+T)"
          className="grid h-6 w-6 place-items-center rounded-md bg-white/10 text-white/75 transition hover:bg-white/20 hover:text-white"
        >
          <Plus size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* Tab list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        {tabs.length ? (
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
                    : "text-white/70 hover:bg-white/10 hover:text-white"
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
                      isActive ? "text-ember" : "text-white/50 group-hover:text-white/75"
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
                      ? "text-ink/30 hover:bg-ink/10 hover:text-ink"
                      : "text-white/0 group-hover:text-white/60 hover:bg-white/10 hover:!text-white"
                  )}
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-4 text-center text-xs leading-5 text-white/60">
            No tabs in this space.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="lume-sidebar-footer mt-2 space-y-0.5 border-t border-white/10 px-2 pt-2">
        <UpdateButton />
        <button
          type="button"
          onClick={onOpenPrivacy}
          className="lume-sidebar-footer-button flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition"
        >
          <ShieldCheck size={15} />
          Privacy
        </button>
        <button
          type="button"
          onClick={onOpenLibrary}
          className="lume-sidebar-footer-button flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition"
        >
          <Folder size={15} />
          Library
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="lume-sidebar-footer-button flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition"
        >
          <Settings size={15} />
          Settings
        </button>
      </div>
    </aside>
  );
}
