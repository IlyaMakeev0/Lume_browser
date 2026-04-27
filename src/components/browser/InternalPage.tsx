"use client";

import { useEffect, useState } from "react";
import { Clock3, Database, Eraser, ExternalLink, Folder, ShieldCheck } from "lucide-react";
import { invokeCommand } from "@/lib/tauri";
import type { BrowserTab, HistoryEntry } from "@/types/tabs";

type InternalPageProps = {
  activeTab: BrowserTab;
  onNavigate: (input: string) => Promise<void>;
};

function pageKind(url: string) {
  if (url === "lume://privacy") {
    return "privacy";
  }

  if (url === "lume://library") {
    return "library";
  }

  return "info";
}

function formatVisited(ms: number) {
  if (!ms) {
    return "recently";
  }

  return new Date(ms).toLocaleString();
}

export function InternalPage({ activeTab, onNavigate }: InternalPageProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [status, setStatus] = useState("");
  const kind = pageKind(activeTab.url);

  useEffect(() => {
    if (kind !== "library") {
      return;
    }

    let mounted = true;

    void invokeCommand<HistoryEntry[]>("list_history").then((entries) => {
      if (mounted && entries) {
        setHistory(entries);
      }
    });

    return () => {
      mounted = false;
    };
  }, [kind]);

  async function clearBrowserData() {
    setStatus("Clearing browser data...");
    const result = await invokeCommand<void>("clear_browser_data");

    if (result === null) {
      setStatus("Clear data is only available inside the Tauri app.");
      return;
    }

    setHistory([]);
    setStatus("History and preview cache cleared.");
  }

  if (kind === "privacy") {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto bg-white p-8">
        <div className="mb-7 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-mint/12 text-mint">
            <ShieldCheck size={21} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-ink">Privacy</h1>
            <p className="text-sm text-ink/52">Browser data and local session controls.</p>
          </div>
        </div>

        <div className="grid max-w-3xl gap-3">
          <button
            type="button"
            onClick={clearBrowserData}
            className="flex min-h-20 items-center gap-4 rounded-lg border border-ink/10 bg-ink/[0.03] px-4 text-left transition hover:border-ember/40 hover:bg-ember/8"
          >
            <div className="grid h-10 w-10 place-items-center rounded-md bg-white text-ember shadow-sm">
              <Eraser size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">Clear browsing data</p>
              <p className="mt-1 text-sm text-ink/52">
                Clears Lume history and cached Rust preview data.
              </p>
            </div>
          </button>

          <div className="flex min-h-20 items-center gap-4 rounded-lg border border-ink/10 bg-white px-4">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-ink/[0.04] text-ink/54">
              <Database size={18} />
            </div>
            <div>
              <p className="font-medium text-ink">Chromium session</p>
              <p className="mt-1 text-sm text-ink/52">
                Page rendering runs in the native WebView2 Chromium session.
              </p>
            </div>
          </div>
        </div>

        {status ? <p className="mt-5 text-sm text-ink/56">{status}</p> : null}
      </div>
    );
  }

  if (kind === "library") {
    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-white p-8">
        <div className="mb-7 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-brass/12 text-brass">
              <Folder size={21} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-ink">Library</h1>
              <p className="text-sm text-ink/52">Recent pages opened through Lume.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={clearBrowserData}
            className="flex h-9 items-center gap-2 rounded-md border border-ink/10 bg-white px-3 text-sm font-medium text-ink/62 transition hover:border-ember/40 hover:text-ember"
          >
            <Eraser size={15} />
            Clear
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-ink/10">
          {history.length ? (
            history.map((entry) => (
              <button
                key={`${entry.url}-${entry.last_visited_ms}`}
                type="button"
                onClick={() => onNavigate(entry.url)}
                className="flex min-h-16 w-full items-center gap-3 border-b border-ink/8 px-4 text-left transition last:border-b-0 hover:bg-ink/[0.03]"
              >
                <div className="grid h-9 w-9 place-items-center rounded-md bg-ink/[0.04] text-ink/46">
                  <ExternalLink size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{entry.title}</p>
                  <p className="truncate text-xs text-ink/46">{entry.url}</p>
                </div>
                <div className="hidden items-center gap-1 text-xs text-ink/38 lg:flex">
                  <Clock3 size={13} />
                  {formatVisited(entry.last_visited_ms)}
                </div>
              </button>
            ))
          ) : (
            <div className="grid h-full min-h-60 place-items-center text-center">
              <div>
                <Folder size={30} className="mx-auto mb-3 text-ink/22" />
                <p className="text-sm font-medium text-ink/54">No history yet</p>
                <p className="mt-1 text-xs text-ink/38">Open a site and it will appear here.</p>
              </div>
            </div>
          )}
        </div>

        {status ? <p className="mt-4 text-sm text-ink/56">{status}</p> : null}
      </div>
    );
  }

  return (
    <div className="grid flex-1 place-items-center bg-white p-8">
      <div className="max-w-lg text-center">
        <h1 className="mb-2 text-2xl font-semibold text-ink">{activeTab.title}</h1>
        <p className="text-sm leading-6 text-ink/54">
          This Lume page is handled by the shell. Use the address bar or quick search to
          open a Chromium-powered web page.
        </p>
      </div>
    </div>
  );
}
