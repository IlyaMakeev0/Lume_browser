"use client";

import { NativeWebviewHost } from "@/components/browser/NativeWebviewHost";
import { NewTabPage } from "@/components/browser/NewTabPage";
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
      <NativeWebviewHost
        key={`${activeTab.id}::${activeTab.url}`}
        tabId={activeTab.id}
        url={activeTab.url}
      />
    );
  }

  return <NewTabPage onNavigate={onNavigate} />;
}

