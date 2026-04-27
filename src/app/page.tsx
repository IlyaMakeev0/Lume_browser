"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { ArrowLeft, ArrowRight, Home as HomeIcon, Lock, RefreshCw, Settings, X } from "lucide-react";
import { BrowserViewport } from "@/components/browser/BrowserViewport";
import { CommandBar } from "@/components/CommandBar";
import { SettingsPanel } from "@/components/SettingsPanel";
import { Sidebar } from "@/components/Sidebar";
import { Titlebar } from "@/components/Titlebar";
import { applyPreferences, readPreferences, writePreferences } from "@/lib/preferences";
import { invokeCommand } from "@/lib/tauri";
import { evalInWebview } from "@/lib/webview-utils";
import type { SearchEngineId, UserPreferences } from "@/types/preferences";
import type { BrowserTab, NewTabRequest } from "@/types/tabs";

const INIT_TAB: BrowserTab = {
  id: "init-1",
  title: "New Tab",
  url: "lume://new-tab",
  is_active: true,
  pinned: false,
  space: "Focus"
};

const DEFAULT_SPACE = "Focus";

const SEARCH_ENGINES: Record<SearchEngineId, (query: string) => string> = {
  google: (query) => `https://www.google.com/search?q=${query}`,
  duckduckgo: (query) => `https://duckduckgo.com/?q=${query}`,
  bing: (query) => `https://www.bing.com/search?q=${query}`,
  yandex: (query) => `https://yandex.com/search/?text=${query}`
};

function isWebUrl(url?: string) {
  return Boolean(url?.startsWith("http://") || url?.startsWith("https://"));
}

function resolveInputToUrl(raw: string, searchEngine: SearchEngineId = "google"): string {
  const input = raw.trim();

  if (!input) {
    return "lume://new-tab";
  }

  if (/^https?:\/\//i.test(input) || input.startsWith("lume://") || input.startsWith("about:")) {
    return input;
  }

  if (looksLikeHost(input)) {
    const host = hostCandidate(input) ?? input;
    const scheme = isLocalOrIpHost(host) ? "http" : "https";
    const normalizedInput =
      isRawIpv6Host(host) && !input.startsWith("[")
        ? input.replace(host, `[${host}]`)
        : input;

    return `${scheme}://${normalizedInput}`;
  }

  const encodedQuery = encodeURIComponent(input);
  return SEARCH_ENGINES[searchEngine](encodedQuery);
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

function displayUrl(url: string): string {
  try {
    const parsed = new URL(url);

    if (parsed.protocol === "lume:" || parsed.protocol === "about:") {
      return url;
    }

    return parsed.href;
  } catch {
    return url;
  }
}

function navButtonClass(enabled: boolean) {
  return [
    "grid h-8 w-8 place-items-center rounded-md transition",
    enabled
      ? "text-black/52 hover:bg-black/6 hover:text-black"
      : "cursor-not-allowed text-black/18"
  ].join(" ");
}

export default function Home() {
  const [tabs, setTabs] = useState<BrowserTab[]>([INIT_TAB]);
  const [activeSpace, setActiveSpace] = useState(DEFAULT_SPACE);
  const [commandOpen, setCommandOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addressValue, setAddressValue] = useState("");
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(() => readPreferences());
  const addressRef = useRef<HTMLInputElement>(null);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.is_active) ?? tabs[0],
    [tabs]
  );

  const visibleTabs = useMemo(
    () => tabs.filter((tab) => tab.space === activeSpace),
    [activeSpace, tabs]
  );

  const refreshTabs = useCallback(async () => {
    const nextTabs = await invokeCommand<BrowserTab[]>("list_tabs");

    if (nextTabs?.length) {
      setTabs(nextTabs);
      setActiveSpace(
        nextTabs.find((tab) => tab.is_active)?.space ?? nextTabs[0]?.space ?? DEFAULT_SPACE
      );
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshTabs();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [refreshTabs]);

  useEffect(() => {
    if (!isEditingAddress) {
      const timeout = window.setTimeout(() => {
        setAddressValue(activeTab?.url ?? "");
      }, 0);

      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [activeTab?.url, isEditingAddress]);

  useEffect(() => {
    applyPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = event.ctrlKey || event.metaKey;

      if (mod && event.key.toLowerCase() === "t") {
        event.preventDefault();
        void createTab();
      }

      if (mod && event.key.toLowerCase() === "l") {
        event.preventDefault();
        setIsEditingAddress(true);
        window.setTimeout(() => {
          addressRef.current?.focus();
          addressRef.current?.select();
        }, 0);
      }

      if (mod && event.key.toLowerCase() === "w") {
        event.preventDefault();

        if (activeTab) {
          void closeTab(activeTab.id);
        }
      }

      if ((mod && event.key.toLowerCase() === "r") || event.key === "F5") {
        event.preventDefault();
        void handleReload();
      }

      if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        void handleBack();
      }

      if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        void handleForward();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function createTab(space = activeSpace) {
    const request: NewTabRequest = {
      title: "New Tab",
      url: "lume://new-tab",
      space,
      activate: true
    };
    const created = await invokeCommand<BrowserTab>("create_tab", { request });

    if (created) {
      setActiveSpace(created.space);
      await refreshTabs();
      return;
    }

    setTabs((currentTabs) => [
      ...currentTabs.map((tab) => ({ ...tab, is_active: false })),
      {
        id: `local-${Date.now()}`,
        title: "New Tab",
        url: "lume://new-tab",
        is_active: true,
        pinned: false,
        space
      }
    ]);
    setActiveSpace(space);
  }

  async function selectTab(id: string) {
    const selected = await invokeCommand<BrowserTab>("activate_tab", { id });

    if (selected) {
      setActiveSpace(selected.space);
      await refreshTabs();
      return;
    }

    setTabs((currentTabs) =>
      currentTabs.map((tab) => ({ ...tab, is_active: tab.id === id }))
    );

    const localTab = tabs.find((tab) => tab.id === id);

    if (localTab) {
      setActiveSpace(localTab.space);
    }
  }

  async function closeTab(id: string) {
    const nextTabs = await invokeCommand<BrowserTab[]>("close_tab", { id });

    if (nextTabs !== null) {
      setTabs(nextTabs);
      setActiveSpace(
        nextTabs.find((tab) => tab.is_active)?.space ?? nextTabs[0]?.space ?? DEFAULT_SPACE
      );
      return;
    }

    setTabs((currentTabs) => {
      const remainingTabs = currentTabs.filter((tab) => tab.id !== id);

      if (!remainingTabs.length) {
        return [INIT_TAB];
      }

      if (remainingTabs.some((tab) => tab.is_active)) {
        return remainingTabs;
      }

      return remainingTabs.map((tab, index) => ({
        ...tab,
        is_active: index === remainingTabs.length - 1
      }));
    });
  }

  async function selectSpace(space: string) {
    setActiveSpace(space);

    const existingTab = tabs.find((tab) => tab.space === space);

    if (existingTab) {
      await selectTab(existingTab.id);
      return;
    }

    await createTab(space);
  }

  async function navigateTo(input: string) {
    setIsLoading(true);

    try {
      const normalizedInput = resolveInputToUrl(input, preferences.searchEngine);
      const navigated = await invokeCommand<BrowserTab>("navigate_active_tab", {
        input: normalizedInput
      });

      if (navigated) {
        setActiveSpace(navigated.space);
        await refreshTabs();
        return;
      }

      const url = normalizedInput;
      let title = input;

      try {
        title = new URL(url).hostname || input;
      } catch {
        title = input;
      }

      setTabs((currentTabs) => {
        const activeIndex = currentTabs.findIndex((tab) => tab.is_active);
        const indexToUpdate = activeIndex >= 0 ? activeIndex : 0;

        return currentTabs.map((tab, index) =>
          index === indexToUpdate
            ? {
                ...tab,
                title,
                url,
                space: tab.space || activeSpace
              }
            : tab
        );
      });
    } finally {
      window.setTimeout(() => setIsLoading(false), 250);
    }
  }

  async function submitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsEditingAddress(false);

    const input = addressValue.trim();

    if (input) {
      await navigateTo(input);
    }
  }

  async function runWebviewControl(script: string) {
    if (!activeTab || !isWebUrl(activeTab.url)) {
      return;
    }

    setIsLoading(true);
    await evalInWebview(activeTab.id, script);
    window.setTimeout(() => setIsLoading(false), 350);
  }

  async function handleBack() {
    await runWebviewControl("history.back()");
  }

  async function handleForward() {
    await runWebviewControl("history.forward()");
  }

  async function handleReload() {
    await runWebviewControl("location.reload()");
  }

  async function handleHome() {
    await navigateTo(preferences.homePageUrl || "lume://new-tab");
  }

  function updatePreferences(nextPreferences: UserPreferences) {
    setPreferences(nextPreferences);
    writePreferences(nextPreferences);
  }

  const canBrowse = isWebUrl(activeTab?.url);
  const isSecure = activeTab?.url?.startsWith("https://");
  const displayAddress = isEditingAddress
    ? addressValue
    : displayUrl(activeTab?.url ?? "");

  return (
    <div className="h-screen overflow-hidden text-ink">
      <Titlebar pageTitle={canBrowse ? activeTab?.title : undefined} />

      <CommandBar
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNavigate={navigateTo}
      />

      <div className="flex h-full pt-9">
        <Sidebar
          tabs={visibleTabs}
          activeTabId={activeTab?.id}
          activeSpace={activeSpace}
          onCreateTab={() => void createTab()}
          onSelectTab={selectTab}
          onCloseTab={closeTab}
          onSelectSpace={selectSpace}
          onOpenCommandBar={() => setCommandOpen(true)}
          onOpenPrivacy={() => void navigateTo("lume://privacy")}
          onOpenLibrary={() => void navigateTo("lume://library")}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <div className="flex min-w-0 flex-1 flex-col bg-white">
          <div className="flex h-11 shrink-0 items-center gap-1.5 border-b border-black/6 bg-[#f9f9f9] px-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={!canBrowse}
              className={navButtonClass(Boolean(canBrowse))}
              title="Back (Alt+Left)"
            >
              <ArrowLeft size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={handleForward}
              disabled={!canBrowse}
              className={navButtonClass(Boolean(canBrowse))}
              title="Forward (Alt+Right)"
            >
              <ArrowRight size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={handleReload}
              disabled={!canBrowse}
              className={navButtonClass(Boolean(canBrowse))}
              title="Reload (Ctrl+R)"
            >
              <RefreshCw
                size={15}
                strokeWidth={2}
                className={isLoading ? "animate-spin" : undefined}
              />
            </button>

            {preferences.showHomeButton ? (
              <button
                type="button"
                onClick={handleHome}
                className={navButtonClass(true)}
                title="Home"
              >
                <HomeIcon size={15} strokeWidth={2} />
              </button>
            ) : null}

            <form
              onSubmit={submitAddress}
              className="mx-1 flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg bg-black/5 px-3 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-ember/30"
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
                value={displayAddress}
                onChange={(event) => setAddressValue(event.target.value)}
                onFocus={() => {
                  setIsEditingAddress(true);
                  window.setTimeout(() => addressRef.current?.select(), 0);
                }}
                onBlur={() => setIsEditingAddress(false)}
                placeholder="Search or enter URL"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-black/70 outline-none placeholder:text-black/25"
                spellCheck={false}
                autoComplete="off"
              />
              {isEditingAddress && addressValue ? (
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setAddressValue("")}
                  className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-black/10 text-black/40 hover:bg-black/15"
                  aria-label="Clear address"
                  title="Clear"
                >
                  <X size={9} strokeWidth={3} />
                </button>
              ) : null}
            </form>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="grid h-8 w-8 place-items-center rounded-md text-black/35 transition hover:bg-black/6 hover:text-black"
              title="Settings"
            >
              <Settings size={15} strokeWidth={2} />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1">
            <BrowserViewport activeTab={activeTab} onNavigate={navigateTo} />
          </div>
        </div>

        <SettingsPanel
          open={settingsOpen}
          preferences={preferences}
          onChange={updatePreferences}
          onClose={() => setSettingsOpen(false)}
        />
      </div>
    </div>
  );
}
