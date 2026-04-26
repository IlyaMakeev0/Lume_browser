"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Cpu, Lock, RefreshCw } from "lucide-react";
import { BrowserViewport } from "@/components/browser/BrowserViewport";
import { CommandBar } from "@/components/CommandBar";
import { SettingsPanel } from "@/components/SettingsPanel";
import { Sidebar } from "@/components/Sidebar";
import { Titlebar } from "@/components/Titlebar";
import {
  applyPreferences,
  readPreferences,
  writePreferences
} from "@/lib/preferences";
import { invokeCommand } from "@/lib/tauri";
import type {
  BrowserTab,
  FetchPreview,
  NewTabRequest,
  PlatformProfile
} from "@/types/tabs";
import type { UserPreferences } from "@/types/preferences";

const fallbackTabs: BrowserTab[] = [
  {
    id: "tab-1",
    title: "Lume Start",
    url: "lume://start",
    is_active: true,
    pinned: true,
    space: "Focus"
  },
  {
    id: "tab-2",
    title: "Rust Network Layer",
    url: "https://tauri.app",
    is_active: false,
    pinned: false,
    space: "Build"
  },
  {
    id: "tab-3",
    title: "Design Notes",
    url: "lume://notes",
    is_active: false,
    pinned: false,
    space: "Read"
  }
];

function resolveLocalNavigation(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      title: "New Tab",
      url: "lume://new-tab"
    };
  }

  if (trimmed.startsWith("lume://") || trimmed.startsWith("about:")) {
    return {
      title: trimmed === "lume://start" ? "Lume Start" : "Lume Internal",
      url: trimmed
    };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return {
      title: new URL(trimmed).hostname,
      url: trimmed
    };
  }

  if (looksLikeHost(trimmed)) {
    const host = hostCandidate(trimmed) ?? trimmed;
    const scheme = isLocalOrIpHost(host) ? "http" : "https";
    const normalizedInput =
      isRawIpv6Host(host) && !trimmed.startsWith("[")
        ? trimmed.replace(host, `[${host}]`)
        : trimmed;
    const normalized = `${scheme}://${normalizedInput}`;

    return {
      title: new URL(normalized).hostname,
      url: normalized
    };
  }

  return {
    title: `Search: ${trimmed}`,
    url: `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`
  };
}

function looksLikeHost(input: string) {
  if (/\s/.test(input)) {
    return false;
  }

  const host = hostCandidate(input);

  return Boolean(host && (host.includes(".") || isLocalOrIpHost(host)));
}

function hostCandidate(input: string) {
  const firstToken = input.split("/")[0]?.trim();

  if (!firstToken) {
    return null;
  }

  if (firstToken.startsWith("[")) {
    return firstToken.slice(1).split("]")[0] ?? null;
  }

  if (isRawIpv6Host(firstToken)) {
    return firstToken;
  }

  return firstToken.split(":")[0] ?? firstToken;
}

function isLocalOrIpHost(host: string) {
  return (
    host.toLowerCase() === "localhost" ||
    /^(\d{1,3}\.){3}\d{1,3}$/.test(host) ||
    isRawIpv6Host(host)
  );
}

function isRawIpv6Host(host: string) {
  return host.includes(":") && /^[0-9a-f:]+$/i.test(host);
}

function isPreviewableUrl(url?: string) {
  return Boolean(url?.startsWith("http://") || url?.startsWith("https://"));
}

export default function Home() {
  const [tabs, setTabs] = useState<BrowserTab[]>(fallbackTabs);
  const [commandOpen, setCommandOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preview, setPreview] = useState<FetchPreview | null>(null);
  const [platformProfile, setPlatformProfile] = useState<PlatformProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>(() => readPreferences());

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.is_active) ?? tabs[0],
    [tabs]
  );

  const refreshTabs = useCallback(async () => {
    const nextTabs = await invokeCommand<BrowserTab[]>("list_tabs");

    if (nextTabs?.length) {
      setTabs(nextTabs);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    void invokeCommand<BrowserTab[]>("list_tabs").then((nextTabs) => {
      if (isMounted && nextTabs?.length) {
        setTabs(nextTabs);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    applyPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    let isMounted = true;

    void invokeCommand<PlatformProfile>("platform_profile").then((profile) => {
      if (isMounted && profile) {
        setPlatformProfile(profile);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "t") {
        event.preventDefault();
        setCommandOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const url = activeTab?.url;

    if (!url) {
      return;
    }

    void invokeCommand<FetchPreview>("fetch_preview", { url }).then((nextPreview) => {
      if (isMounted && nextPreview) {
        setPreview(nextPreview);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeTab?.url]);

  async function createTab() {
    const request: NewTabRequest = {
      title: "New Tab",
      url: "lume://new-tab",
      space: "Focus",
      activate: true
    };

    const created = await invokeCommand<BrowserTab>("create_tab", { request });

    if (created) {
      await refreshTabs();
      return;
    }

    setTabs((currentTabs) => {
      const tab: BrowserTab = {
        id: `local-${currentTabs.length + 1}`,
        title: request.title ?? "New Tab",
        url: request.url ?? "about:blank",
        space: request.space ?? "Focus",
        is_active: true,
        pinned: false
      };

      return currentTabs.map((item) => ({ ...item, is_active: false })).concat(tab);
    });
  }

  async function selectTab(id: string) {
    const selected = await invokeCommand<BrowserTab>("activate_tab", { id });

    if (selected) {
      await refreshTabs();
      return;
    }

    setTabs((currentTabs) =>
      currentTabs.map((tab) => ({ ...tab, is_active: tab.id === id }))
    );
  }

  async function navigateTo(input: string) {
    const navigated = await invokeCommand<BrowserTab>("navigate_active_tab", { input });

    if (navigated) {
      await refreshTabs();
      return;
    }

    const target = resolveLocalNavigation(input);

    setTabs((currentTabs) => {
      if (!currentTabs.length) {
        return [
          {
            id: "local-1",
            title: target.title,
            url: target.url,
            is_active: true,
            pinned: false,
            space: "Focus"
          }
        ];
      }

      const activeIndex = currentTabs.findIndex((tab) => tab.is_active);
      const indexToUpdate = activeIndex >= 0 ? activeIndex : 0;

      return currentTabs.map((tab, index) => ({
        ...tab,
        title: index === indexToUpdate ? target.title : tab.title,
        url: index === indexToUpdate ? target.url : tab.url,
        is_active: index === indexToUpdate
      }));
    });
  }

  async function submitLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = formData.get("location");

    if (typeof input === "string") {
      await navigateTo(input);
    }
  }

  function updatePreferences(nextPreferences: UserPreferences) {
    setPreferences(nextPreferences);
    writePreferences(nextPreferences);
  }

  const loadingPreview =
    Boolean(activeTab?.url) &&
    isPreviewableUrl(activeTab?.url) &&
    preview?.url !== activeTab?.url;

  return (
    <div className="h-screen overflow-hidden text-ink">
      <Titlebar />
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

      <main className="flex h-full pt-9">
        <Sidebar
          tabs={tabs}
          activeTabId={activeTab?.id}
          onCreateTab={createTab}
          onSelectTab={selectTab}
          onOpenCommandBar={() => setCommandOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <section className="flex min-w-0 flex-1 flex-col bg-shell">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-ink/10 bg-shell/92 px-4 backdrop-blur-xl">
            <button
              type="button"
              aria-label="Back"
              title="Back"
              className="grid h-9 w-9 place-items-center rounded-md text-ink/56 transition hover:bg-ink/8 hover:text-ink"
            >
              <ArrowLeft size={17} />
            </button>
            <button
              type="button"
              aria-label="Forward"
              title="Forward"
              className="grid h-9 w-9 place-items-center rounded-md text-ink/56 transition hover:bg-ink/8 hover:text-ink"
            >
              <ArrowRight size={17} />
            </button>
            <button
              type="button"
              aria-label="Reload"
              title="Reload"
              className="grid h-9 w-9 place-items-center rounded-md text-ink/56 transition hover:bg-ink/8 hover:text-ink"
            >
              <RefreshCw size={16} />
            </button>

            <form
              key={`${activeTab?.id ?? "none"}-${activeTab?.url ?? "blank"}`}
              onSubmit={submitLocation}
              className="ml-1 flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-ink/10 bg-white px-3 shadow-sm"
            >
              <Lock size={15} className="shrink-0 text-mint" />
              <input
                name="location"
                defaultValue={activeTab?.url ?? "about:blank"}
                className="min-w-0 flex-1 bg-transparent text-sm text-ink/72 outline-none"
                aria-label="Location"
              />
            </form>

            <div className="hidden h-10 items-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-white lg:flex">
              <Cpu size={16} className="text-mint" />
              {platformProfile?.name ?? "Web preview"}
            </div>
          </div>

          <div
            className={
              preferences.density === "compact"
                ? "min-h-0 flex-1 overflow-hidden p-3"
                : "min-h-0 flex-1 overflow-hidden p-6"
            }
          >
            <BrowserViewport
              activeTab={activeTab}
              preview={preview}
              loadingPreview={loadingPreview}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
