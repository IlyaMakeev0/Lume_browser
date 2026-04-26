"use client";

import clsx from "clsx";
import {
  Compass,
  Folder,
  Globe2,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  ShieldCheck
} from "lucide-react";
import type { BrowserTab } from "@/types/tabs";

type SidebarProps = {
  tabs: BrowserTab[];
  activeTabId?: string;
  onCreateTab: () => void;
  onSelectTab: (id: string) => void;
  onOpenCommandBar: () => void;
};

const spaces = [
  { name: "Focus", accent: "bg-ember" },
  { name: "Build", accent: "bg-mint" },
  { name: "Read", accent: "bg-brass" }
];

export function Sidebar({
  tabs,
  activeTabId,
  onCreateTab,
  onSelectTab,
  onOpenCommandBar
}: SidebarProps) {
  return (
    <aside className="flex h-full w-[288px] shrink-0 flex-col border-r border-white/10 bg-ink/86 px-3 pb-4 pt-4 text-white shadow-soft backdrop-blur-2xl">
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-white text-ink shadow-sm">
            <Compass size={18} strokeWidth={1.9} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Aura</p>
            <p className="truncate text-xs text-white/48">Personal space</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          className="grid h-8 w-8 place-items-center rounded-md text-white/62 transition hover:bg-white/10 hover:text-white"
        >
          <PanelLeftClose size={17} />
        </button>
      </div>

      <button
        type="button"
        onClick={onOpenCommandBar}
        className="mb-4 flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.07] px-3 text-left text-white/58 transition hover:border-mint/50 hover:bg-white/[0.1] hover:text-white"
      >
        <Search size={16} />
        <span className="min-w-0 flex-1 truncate text-sm">Search or enter URL</span>
      </button>

      <div className="mb-5 grid grid-cols-3 gap-2">
        {spaces.map((space) => (
          <button
            key={space.name}
            type="button"
            className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] text-xs font-medium text-white/76 transition hover:border-white/20 hover:bg-white/[0.1] hover:text-white"
          >
            <span className={clsx("h-2 w-2 rounded-sm", space.accent)} />
            {space.name}
          </button>
        ))}
      </div>

      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase text-white/42">Tabs</span>
        <button
          type="button"
          aria-label="Create tab"
          title="Create tab"
          onClick={onCreateTab}
          className="grid h-7 w-7 place-items-center rounded-md bg-white text-ink shadow-sm transition hover:bg-mint"
        >
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId || tab.is_active;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={clsx(
                "flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition",
                isActive
                  ? "bg-white text-ink shadow-sm"
                  : "text-white/70 hover:bg-white/[0.08] hover:text-white"
              )}
            >
              <Globe2
                size={16}
                className={isActive ? "text-ember" : "text-white/42"}
                strokeWidth={1.9}
              />
              <span className="min-w-0 flex-1 truncate">{tab.title}</span>
              {tab.pinned ? (
                <span className="h-1.5 w-1.5 rounded-sm bg-mint" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-1 border-t border-white/10 pt-3">
        <button
          type="button"
          className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-white/64 transition hover:bg-white/[0.08] hover:text-white"
        >
          <ShieldCheck size={16} />
          Privacy
        </button>
        <button
          type="button"
          className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-white/64 transition hover:bg-white/[0.08] hover:text-white"
        >
          <Folder size={16} />
          Library
        </button>
        <button
          type="button"
          className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-white/64 transition hover:bg-white/[0.08] hover:text-white"
        >
          <Settings size={16} />
          Settings
        </button>
      </div>
    </aside>
  );
}
