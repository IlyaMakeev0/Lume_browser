"use client";

import { ExternalLink, FileText, Images, Link2, ShieldAlert } from "lucide-react";
import { NativeWebviewHost } from "@/components/browser/NativeWebviewHost";
import type { BrowserTab, FetchPreview } from "@/types/tabs";

type BrowserViewportProps = {
  activeTab?: BrowserTab;
  preview?: FetchPreview | null;
  loadingPreview: boolean;
};

function isWebUrl(url?: string) {
  return Boolean(url?.startsWith("http://") || url?.startsWith("https://"));
}

export function BrowserViewport({
  activeTab,
  preview,
  loadingPreview
}: BrowserViewportProps) {
  const canBrowse = isWebUrl(activeTab?.url);

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_320px] overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft">
      <div className="grid min-h-0 grid-rows-[auto_1fr] overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-ink">
              {activeTab?.title ?? "New Tab"}
            </h1>
            <p className="truncate text-sm text-ink/52">
              {activeTab?.space ?? "Focus"} workspace
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-medium text-white">
            <FileText size={16} className="text-mint" />
            Native WebView
          </div>
        </div>

        {canBrowse && activeTab ? (
          <NativeWebviewHost
            key={`${activeTab.id}-${activeTab.url}`}
            tabId={activeTab.id}
            title={activeTab.title}
            url={activeTab.url}
          />
        ) : (
          <div className="grid min-h-0 place-items-center bg-[linear-gradient(135deg,rgba(246,242,234,0.92),rgba(110,198,164,0.18))] p-8">
            <div className="w-full max-w-2xl">
              <div className="mb-6 h-2 w-24 rounded-sm bg-ember" />
              <h2 className="mb-3 text-4xl font-semibold tracking-normal text-ink">
                Lume internal page
              </h2>
              <p className="max-w-xl text-base leading-7 text-ink/66">
                Use Ctrl or Cmd + T to navigate. Web pages open in a native Tauri
                WebView, while Lume keeps tab state and URL resolution in Rust.
              </p>
            </div>
          </div>
        )}
      </div>

      <aside className="flex min-h-0 flex-col border-l border-ink/10 bg-[#fbfaf6] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase text-ink/50">Network</h2>
          {activeTab?.url ? (
            <a
              href={activeTab.url}
              target="_blank"
              className="grid h-8 w-8 place-items-center rounded-md text-ink/52 transition hover:bg-ink/8 hover:text-ink"
              title="Open externally"
            >
              <ExternalLink size={15} />
            </a>
          ) : null}
        </div>

        <div className="mb-3 rounded-md border border-ink/10 bg-white p-3">
          <p className="mb-1 text-xs font-semibold uppercase text-ink/42">Status</p>
          <p className="text-sm text-ink">
            {loadingPreview ? "Loading..." : preview ? preview.status : "Idle"}
          </p>
        </div>

        <div className="mb-3 rounded-md border border-ink/10 bg-white p-3">
          <p className="mb-1 text-xs font-semibold uppercase text-ink/42">Content</p>
          <p className="break-words text-sm text-ink/68">
            {preview?.content_type ?? "No content type yet"}
          </p>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="rounded-md border border-ink/10 bg-white p-3">
            <p className="mb-1 text-xs font-semibold uppercase text-ink/42">CSS</p>
            <p className="text-sm text-ink">
              {preview?.document?.resources.stylesheets ?? 0}
            </p>
          </div>
          <div className="rounded-md border border-ink/10 bg-white p-3">
            <p className="mb-1 text-xs font-semibold uppercase text-ink/42">JS</p>
            <p className="text-sm text-ink">{preview?.document?.resources.scripts ?? 0}</p>
          </div>
          <div className="rounded-md border border-ink/10 bg-white p-3">
            <div className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase text-ink/42">
              <Images size={12} />
              Img
            </div>
            <p className="text-sm text-ink">{preview?.document?.resources.images ?? 0}</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-ink/10 bg-white p-3">
          <div className="mb-2 flex items-center gap-2">
            <ShieldAlert size={15} className="text-ember" />
            <p className="text-xs font-semibold uppercase text-ink/42">Body Preview</p>
          </div>
          <p className="h-full overflow-y-auto text-sm leading-6 text-ink/62">
            {preview?.body_preview || "Rust network preview appears here after navigation."}
          </p>
        </div>

        <div className="mt-3 max-h-40 overflow-hidden rounded-md border border-ink/10 bg-white p-3">
          <div className="mb-2 flex items-center gap-2">
            <Link2 size={15} className="text-mint" />
            <p className="text-xs font-semibold uppercase text-ink/42">Links</p>
          </div>
          <div className="max-h-28 space-y-1 overflow-y-auto">
            {(preview?.document?.links ?? []).slice(0, 6).map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                className="block truncate text-sm text-ink/62 transition hover:text-ember"
              >
                {link.label}
              </a>
            ))}
            {!preview?.document?.links?.length ? (
              <p className="text-sm text-ink/46">No parsed links yet.</p>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
