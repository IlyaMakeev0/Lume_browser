"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  RefreshCw,
  Settings,
  X,
} from "lucide-react";
import { BrowserViewport } from "@/components/browser/BrowserViewport";
import { CommandBar } from "@/components/CommandBar";
import { SettingsPanel } from "@/components/SettingsPanel";
import { Sidebar } from "@/components/Sidebar";
import { Titlebar } from "@/components/Titlebar";
import { applyPreferences, readPreferences, writePreferences } from "@/lib/preferences";
import { evalInWebview } from "@/lib/webview-utils";
import { invokeCommand } from "@/lib/tauri";
import type { BrowserTab, NewTabRequest } from "@/types/tabs";
import type { UserPreferences } from "@/types/preferences";

const INIT_TAB: BrowserTab = {
  id: "init-1",
  title: "New Tab",
  url: "lume://new-tab",
  is_active: true,
  pinned: false,
  space: "Focus",
};

function isWebUrl(url?: string) {
  return Boolean(url?.startsWith("http://") || url?.startsWith("https://"));
}

function resolveInputToUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "lume://new-tab";
  if (/^(https?|lume|about):\/\//i.test(t)) return t;
  if (/\s/.test(t) || !t.includes("."))
    return `https://duckduckgo.com/?q=${encodeURIComponent(t)}`;
  return `https://${t}`;
}

function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === "lume:" || u.protocol === "about:") return url;
    return u.href;
  } catch {
    return url;
  }
}

export default function Home() {
  const [tabs, setTabs] = useState<BrowserTab[]>([INIT_TAB]);
  const [commandOpen, setCommandOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addressValue, setAddressValue] = useState("");
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(() => readPreferences());
  const addressRef = useRef<HTMLInputElement>(null);

  const activeTab = useMemo(
    () => tabs.find((t) => t.is_active) ?? tabs[0],
    [tabs]
  );

  /* ── Sync address bar with active tab URL ─────────────────────────── */
  useEffect(() => {
    if (!isEditingAddress) {
      setAddressValue(activeTab?.url ?? "");
    }
  }, [activeTab?.url, isEditingAddress]);

  /* ── Apply preferences to <html> ─────────────────────────────────── */
  useEffect(() => {
    applyPreferences(preferences);
  }, [preferences]);

  /* ── Load tabs from Rust on mount ────────────────────────────────── */
  const refreshTabs = useCallback(async () => {
    const next = await invokeCommand<BrowserTab[]>("list_tabs");
    if (next?.length) setTabs(next);
  }, []);

  useEffect(() => {
    void refreshTabs();
  }, [refreshTabs]);

  /* ── Keyboard shortcuts ──────────────────────────────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "t") {
        e.preventDefault();
        void createTab();
      }
      if (mod && e.key === "l") {
        e.preventDefault();
        setIsEditingAddress(true);
        setTimeout(() => {
          addressRef.current?.focus();
          addressRef.current?.select();
        }, 0);
      }
      if (mod && e.key === "w") {
        e.preventDefault();
        if (activeTab) void closeTab(activeTab.id);
      }
      if (mod && e.key === "r") {
        e.preventDefault();
        void handleReload();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ── Tab CRUD ─────────────────────────────────────────────────────── */
  async function createTab() {
    const request: NewTabRequest = {
      title: "New Tab",
      url: "lume://new-tab",
      space: activeTab?.space ?? "Focus",
      activate: true,
    };
    const created = await invokeCommand<BrowserTab>("create_tab", { request });
    if (created) {
      await refreshTabs();
    } else {
      setTabs((prev) => [
        ...prev.map((t) => ({ ...t, is_active: false })),
        {
          id: `local-${Date.now()}`,
          title: "New Tab",
          url: "lume://new-tab",
          is_active: true,
          pinned: false,
          space: activeTab?.space ?? "Focus",
        },
      ]);
    }
  }

  async function selectTab(id: string) {
    const selected = await invokeCommand<BrowserTab>("activate_tab", { id });
    if (selected) {
      await refreshTabs();
    } else {
      setTabs((prev) => prev.map((t) => ({ ...t, is_active: t.id === id })));
    }
  }

  async function closeTab(id: string) {
    const next = await invokeCommand<BrowserTab[]>("close_tab", { id });
    if (next !== null) {
      if (next.length === 0) {
        await createTab();
      } else {
        setTabs(next);
      }
    } else {
      setTabs((prev) => {
        const remaining = prev.filter((t) => t.id !== id);
        if (!remaining.length) return prev;
        const hasActive = remaining.some((t) => t.is_active);
        if (hasActive) return remaining;
        return remaining.map((t, i) => ({ ...t, is_active: i === remaining.length - 1 }));
      });
    }
  }

  /* ── Navigation ───────────────────────────────────────────────────── */
  async function navigateTo(input: string) {
    setIsLoading(true);
    try {
      const navigated = await invokeCommand<BrowserTab>("navigate_active_tab", { input });
      if (navigated) {
        await refreshTabs();
        return;
      }
      // Fallback when Tauri is not available
      const url = resolveInputToUrl(input);
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.is_active);
        const i = idx >= 0 ? idx : 0;
        let title = input;
        try { title = new URL(url).hostname || input; } catch { /* use input */ }
        return prev.map((t, j) =>
          j === i ? { ...t, url, title } : t
        );
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function submitAddress(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsEditingAddress(false);
    const raw = addressValue.trim();
    if (raw) await navigateTo(raw);
  }

  /* ── Webview controls (via Rust eval_in_webview bridge) ──────────── */
  async function handleBack() {
    if (!activeTab) return;
    await evalInWebview(activeTab.id, "history.back()");
  }

  async function handleForward() {
    if (!activeTab) return;
    await evalInWebview(activeTab.id, "history.forward()");
  }

  async function handleReload() {
    if (!activeTab) return;
    if (isWebUrl(activeTab.url)) {
      await evalInWebview(activeTab.id, "location.reload()");
    }
  }

  /* ── Preferences ─────────────────────────────────────────────────── */
  function updatePreferences(next: UserPreferences) {
    setPreferences(next);
    writePreferences(next);
  }

  /* ── Derived state ───────────────────────────────────────────────── */
  const isSecure = activeTab?.url?.startsWith("https://");
  const canBrowse = isWebUrl(activeTab?.url);
  const displayAddr = isEditingAddress ? addressValue : displayUrl(activeTab?.url ?? "");

  return (
    <div className="h-screen overflow-hidden text-ink">
      <Titlebar pageTitle={canBrowse ? activeTab?.title : undefined} />

      <CommandBar
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNavigate={navigateTo}
      />
      <SettingsPanel
        open={settingsOpen}
        preferences={preferences}
        onChange={updatePreferences}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Main layout: sidebar + content */}
      <div className="flex h-full pt-9">
        <Sidebar
          tabs={tabs}
          activeTabId={activeTab?.id}
          onCreateTab={createTab}
          onSelectTab={selectTab}
          onCloseTab={closeTab}
          onOpenCommandBar={() => setCommandOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* Content column */}
        <div className="flex min-w-0 flex-1 flex-col bg-white">
          {/* Navigation bar */}
          <div className="flex h-11 shrink-0 items-center gap-1.5 border-b border-black/6 bg-[#f9f9f9] px-2">
            {/* Nav buttons */}
            <button
              type="button"
              onClick={handleBack}
              className="grid h-8 w-8 place-items-center rounded-md text-black/35 transition hover:bg-black/6 hover:text-black disabled:opacity-30"
              title="Back (Alt+←)"
            >
              <ArrowLeft size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={handleForward}
              className="grid h-8 w-8 place-items-center rounded-md text-black/35 transition hover:bg-black/6 hover:text-black"
              title="Forward (Alt+→)"
            >
              <ArrowRight size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={handleReload}
              className={`grid h-8 w-8 place-items-center rounded-md text-black/35 transition hover:bg-black/6 hover:text-black ${isLoading ? "animate-spin" : ""}`}
              title="Reload (Ctrl+R)"
            >
              <RefreshCw size={15} strokeWidth={2} />
            </button>

            {/* Address bar */}
            <form
              onSubmit={submitAddress}
              className="mx-1 flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg bg-black/5 px-3 ring-0 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-ember/30"
            >
              {canBrowse && !isEditingAddress ? (
                <Lock
                  size={12}
                  strokeWidth={2.5}
                  className={`shrink-0 ${isSecure ? "text-mint" : "text-black/25"}`}
                />
              ) : (
                <div className="h-3 w-3 shrink-0" />
              )}
              <input
                ref={addressRef}
                value={displayAddr}
                onChange={(e) => setAddressValue(e.target.value)}
                onFocus={() => {
                  setIsEditingAddress(true);
                  setTimeout(() => addressRef.current?.select(), 0);
                }}
                onBlur={() => {
                  setIsEditingAddress(false);
                }}
                placeholder="Search or enter URL"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-black/70 outline-none placeholder:text-black/25"
                spellCheck={false}
                autoComplete="off"
              />
              {isEditingAddress && addressValue && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setAddressValue("")}
                  className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-black/10 text-black/40 hover:bg-black/15"
                >
                  <X size={9} strokeWidth={3} />
                </button>
              )}
            </form>

            {/* Settings */}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="grid h-8 w-8 place-items-center rounded-md text-black/35 transition hover:bg-black/6 hover:text-black"
              title="Settings"
            >
              <Settings size={15} strokeWidth={2} />
            </button>
          </div>

          {/* Viewport — fills remaining space; display:flex so children get resolved height */}
          <div className="relative min-h-0 flex-1 flex">
            <BrowserViewport activeTab={activeTab} onNavigate={navigateTo} />
          </div>
        </div>
      </div>
    </div>
  );
}
