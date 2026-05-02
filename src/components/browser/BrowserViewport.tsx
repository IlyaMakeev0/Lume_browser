"use client";

import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { InternalPage } from "@/components/browser/InternalPage";
import { NativeWebviewHost } from "@/components/browser/NativeWebviewHost";
import { NewTabPage } from "@/components/browser/NewTabPage";
import { PageLoadGuard } from "@/components/browser/PageLoadGuard";
import type { BrowserTab } from "@/types/tabs";

type Props = {
  activeTab?: BrowserTab;
  tabs: BrowserTab[];
  memorySaver: boolean;
  inactiveTabSuspendSeconds: number;
  proxyUrl?: string;
  onNavigate: (input: string) => Promise<void>;
};

function isWebUrl(url?: string) {
  return Boolean(url?.startsWith("http://") || url?.startsWith("https://"));
}

export function BrowserViewport({
  activeTab,
  tabs,
  memorySaver,
  inactiveTabSuspendSeconds,
  proxyUrl,
  onNavigate
}: Props) {
  const activeTabIsWeb = isWebUrl(activeTab?.url);
  const webTabs = useMemo(() => tabs.filter((tab) => isWebUrl(tab.url)), [tabs]);
  const webTabIdsKey = useMemo(() => webTabs.map((tab) => tab.id).join("|"), [webTabs]);
  const activeWebTabId = activeTabIsWeb ? activeTab?.id : undefined;
  const [residentTabIds, setResidentTabIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const webTabIds = new Set(webTabs.map((tab) => tab.id));

    if (!memorySaver) {
      const keepAliveTimer = window.setTimeout(() => {
        setResidentTabIds(webTabIds);
      }, 0);

      return () => window.clearTimeout(keepAliveTimer);
    }

    const activateTimer = window.setTimeout(() => {
      setResidentTabIds((current) => {
        const next = new Set<string>();

        current.forEach((tabId) => {
          if (webTabIds.has(tabId)) {
            next.add(tabId);
          }
        });

        if (activeWebTabId) {
          next.add(activeWebTabId);
        }

        return next;
      });
    }, 0);

    const suspendDelay = Math.max(5, inactiveTabSuspendSeconds) * 1000;
    const timers = webTabs
      .filter((tab) => tab.id !== activeWebTabId)
      .map((tab) =>
        window.setTimeout(() => {
          setResidentTabIds((current) => {
            if (!current.has(tab.id)) {
              return current;
            }

            const next = new Set(current);
            next.delete(tab.id);
            return next;
          });
        }, suspendDelay)
      );

    return () => {
      window.clearTimeout(activateTimer);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [activeWebTabId, inactiveTabSuspendSeconds, memorySaver, webTabIdsKey, webTabs]);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-white">
      {webTabs.map((tab) => {
        const active = activeTab?.id === tab.id;
        const resident = active || residentTabIds.has(tab.id);

        if (!resident) {
          return null;
        }

        return (
          <div
            key={tab.id}
            className={clsx(
              "absolute inset-0 flex transition-opacity",
              active
                ? "z-10 opacity-100"
                : "pointer-events-none z-0 opacity-0"
            )}
            aria-hidden={!active}
          >
            <PageLoadGuard url={tab.url} skipProbe={Boolean(proxyUrl)} onNavigate={onNavigate}>
              <NativeWebviewHost
                active={active}
                tabId={tab.id}
                url={tab.url}
                proxyUrl={proxyUrl}
              />
            </PageLoadGuard>
          </div>
        );
      })}

      {!activeTabIsWeb ? (
        <div className="absolute inset-0 z-20 flex">
          {activeTab &&
          activeTab.url !== "lume://new-tab" &&
          activeTab.url !== "lume://start" &&
          activeTab.url !== "about:blank" ? (
            <InternalPage activeTab={activeTab} onNavigate={onNavigate} />
          ) : (
            <NewTabPage onNavigate={onNavigate} />
          )}
        </div>
      ) : null}
    </div>
  );
}
