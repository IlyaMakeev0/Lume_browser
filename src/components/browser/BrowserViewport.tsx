"use client";

import { NativeWebviewHost } from "@/components/browser/NativeWebviewHost";
import { InternalPage } from "@/components/browser/InternalPage";
import { NewTabPage } from "@/components/browser/NewTabPage";
import { PageLoadGuard } from "@/components/browser/PageLoadGuard";
import type { BrowserTab } from "@/types/tabs";

type Props = {
  activeTab?: BrowserTab;
  onNavigate: (input: string) => Promise<void>;
};

function isWebUrl(url?: string) {
  return Boolean(url?.startsWith("http://") || url?.startsWith("https://"));
}

export function BrowserViewport({ activeTab, onNavigate }: Props) {
  if (isWebUrl(activeTab?.url) && activeTab) {
    return (
      <PageLoadGuard url={activeTab.url} onNavigate={onNavigate}>
        <NativeWebviewHost
          key={`${activeTab.id}::${activeTab.url}`}
          tabId={activeTab.id}
          url={activeTab.url}
        />
      </PageLoadGuard>
    );
  }

  if (
    activeTab &&
    activeTab.url !== "lume://new-tab" &&
    activeTab.url !== "lume://start" &&
    activeTab.url !== "about:blank"
  ) {
    return <InternalPage activeTab={activeTab} onNavigate={onNavigate} />;
  }

  return <NewTabPage onNavigate={onNavigate} />;
}
