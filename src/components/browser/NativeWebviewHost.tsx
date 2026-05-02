"use client";

import type { Webview } from "@tauri-apps/api/webview";
import { useEffect, useMemo, useRef, useState } from "react";
import { evalInWebview, webviewLabel, isTauriRuntime } from "@/lib/webview-utils";

type Props = {
  active: boolean;
  tabId: string;
  url: string;
};

type VisualState = "loading" | "ready" | "error" | "fallback";

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Lume/1.0";

export function NativeWebviewHost({ active, tabId, url }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const webviewRef = useRef<Webview | null>(null);
  const activeRef = useRef(active);
  const initialUrlRef = useRef(url);
  const loadedUrlRef = useRef(url);
  const [state, setState] = useState<VisualState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const label = useMemo(() => webviewLabel(tabId), [tabId]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    if (!isTauriRuntime()) {
      window.setTimeout(() => setState("fallback"), 0);
      return;
    }

    let disposed = false;
    let closeWebview: (() => void) | null = null;
    let ro: ResizeObserver | null = null;
    let removeBoundsListener: (() => void) | null = null;

    // Capture non-null reference for use inside async closures
    const hostEl: HTMLDivElement = el;

    async function mount() {
      const [{ LogicalPosition, LogicalSize }, { Webview }, { getCurrentWindow }] =
        await Promise.all([
          import("@tauri-apps/api/dpi"),
          import("@tauri-apps/api/webview"),
          import("@tauri-apps/api/window"),
        ]);

      // Close stale webview with same label if it exists
      const existing = await Webview.getByLabel(label);
      if (existing) {
        try { await existing.close(); } catch { /* already gone */ }
      }

      if (disposed) return;

      const rect = hostEl.getBoundingClientRect();
      const appWindow = getCurrentWindow();

      const webview = new Webview(appWindow, label, {
        url: initialUrlRef.current,
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.max(100, Math.round(rect.width)),
        height: Math.max(100, Math.round(rect.height)),
        focus: activeRef.current,
        userAgent: CHROME_UA,
        zoomHotkeysEnabled: true,
        dragDropEnabled: true,
        backgroundColor: "#ffffff",
      });

      webviewRef.current = webview;
      closeWebview = () => { void webview.close().catch(() => {}); };

      async function syncBounds() {
        if (disposed) return;
        const r = hostEl.getBoundingClientRect();
        await Promise.all([
          webview.setPosition(new LogicalPosition(Math.round(r.left), Math.round(r.top))),
          webview.setSize(
            new LogicalSize(
              Math.max(100, Math.round(r.width)),
              Math.max(100, Math.round(r.height))
            )
          ),
        ]);
      }

      function onResize() { void syncBounds(); }
      window.addEventListener("resize", onResize);
      removeBoundsListener = () => window.removeEventListener("resize", onResize);

      ro = new ResizeObserver(onResize);
      ro.observe(hostEl);

      webview.once("tauri://created", () => {
        if (!disposed) {
          setState("ready");
          void syncBounds();
          void (
            activeRef.current
              ? webview.show().then(() => webview.setFocus())
              : webview.hide()
          );
        }
      });

      webview.once("tauri://error", (ev: unknown) => {
        if (!disposed) {
          setState("error");
          const payload = (ev as { payload?: unknown } | null)?.payload;
          setErrorMsg(String(payload ?? "WebView failed to load."));
        }
      });

      await syncBounds();
    }

    void mount().catch((err) => {
      if (!disposed) {
        setState("error");
        setErrorMsg(err instanceof Error ? err.message : String(err));
      }
    });

    return () => {
      disposed = true;
      ro?.disconnect();
      removeBoundsListener?.();
      webviewRef.current = null;
      closeWebview?.();
    };
  }, [label]);

  useEffect(() => {
    const webview = webviewRef.current;

    if (!webview || state !== "ready") {
      return;
    }

    if (active) {
      void webview.show().then(() => webview.setFocus()).catch(() => {});
      return;
    }

    void webview.hide().catch(() => {});
  }, [active, state]);

  useEffect(() => {
    if (state !== "ready" || loadedUrlRef.current === url) {
      return;
    }

    loadedUrlRef.current = url;
    void evalInWebview(tabId, `window.location.assign(${JSON.stringify(url)});`);
  }, [state, tabId, url]);

  return (
    <div
      ref={hostRef}
      className="relative min-h-0 min-w-0 flex-1"
      style={{ background: state === "ready" ? "transparent" : "#fff" }}
    >
      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/10 border-t-ember" />
            <p className="text-sm text-black/40">Loading...</p>
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white p-8 text-center">
          <div className="text-4xl">!</div>
          <p className="text-base font-semibold text-ink">Page failed to load</p>
          <p className="max-w-sm break-words text-sm text-ink/50">
            {errorMsg || "The WebView could not be created."}
          </p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ember"
          >
            Open in system browser
          </a>
        </div>
      )}

      {state === "fallback" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white p-8 text-center">
          <p className="text-sm text-ink/40">
            Native WebView is only available in the installed Lume app.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ember"
          >
            Open in system browser
          </a>
        </div>
      )}
    </div>
  );
}
