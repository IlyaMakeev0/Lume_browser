"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ExternalLink } from "lucide-react";

type NativeWebviewHostProps = {
  tabId: string;
  title: string;
  url: string;
};

type WebviewState = "idle" | "loading" | "ready" | "fallback" | "error";

const CHROME_COMPATIBLE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Lume/0.1";

function webviewLabel(tabId: string) {
  return `lume-browser-${tabId.replace(/[^a-zA-Z0-9-/:_]/g, "_")}`;
}

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function NativeWebviewHost({ tabId, title, url }: NativeWebviewHostProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<WebviewState>("idle");
  const [message, setMessage] = useState("");
  const label = useMemo(() => webviewLabel(tabId), [tabId]);

  useEffect(() => {
    const hostElement = hostRef.current;

    if (!hostElement) {
      return;
    }

    const webviewHost: HTMLDivElement = hostElement;

    if (!isTauriRuntime()) {
      window.setTimeout(() => {
        setState("fallback");
        setMessage("Native WebView is available inside the installed Tauri app.");
      }, 0);
      return;
    }

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let cleanupWebview: (() => Promise<void>) | null = null;

    async function mountWebview() {
      setState("loading");
      setMessage("");

      try {
        const [{ LogicalPosition, LogicalSize }, { Webview }, { getCurrentWindow }] =
          await Promise.all([
            import("@tauri-apps/api/dpi"),
            import("@tauri-apps/api/webview"),
            import("@tauri-apps/api/window")
          ]);

        const existing = await Webview.getByLabel(label);

        if (existing) {
          await existing.close();
        }

        const rect = webviewHost.getBoundingClientRect();
        const width = Math.max(120, Math.round(rect.width));
        const height = Math.max(120, Math.round(rect.height));
        const appWindow = getCurrentWindow();
        const webview = new Webview(appWindow, label, {
          url,
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width,
          height,
          focus: true,
          userAgent: CHROME_COMPATIBLE_UA,
          zoomHotkeysEnabled: true,
          dragDropEnabled: true,
          dataDirectory: "browser-session",
          backgroundColor: "#ffffff"
        });

        cleanupWebview = async () => {
          try {
            await webview.close();
          } catch (error) {
            console.debug("Native WebView already closed.", error);
          }
        };

        async function syncBounds() {
          if (disposed) {
            return;
          }

          const nextRect = webviewHost.getBoundingClientRect();
          await Promise.all([
            webview.setPosition(
              new LogicalPosition(Math.round(nextRect.left), Math.round(nextRect.top))
            ),
            webview.setSize(
              new LogicalSize(
                Math.max(120, Math.round(nextRect.width)),
                Math.max(120, Math.round(nextRect.height))
              )
            )
          ]);
        }

        resizeObserver = new ResizeObserver(() => {
          void syncBounds();
        });
        resizeObserver.observe(webviewHost);
        window.addEventListener("resize", syncBounds);

        webview.once("tauri://created", () => {
          if (!disposed) {
            setState("ready");
            void syncBounds();
          }
        });

        webview.once("tauri://error", (event) => {
          if (!disposed) {
            setState("error");
            setMessage(String(event.payload ?? "WebView failed to load."));
          }
        });

        await syncBounds();

        return () => {
          window.removeEventListener("resize", syncBounds);
        };
      } catch (error) {
        if (!disposed) {
          setState("error");
          setMessage(error instanceof Error ? error.message : String(error));
        }

        return undefined;
      }
    }

    let cleanupBounds: (() => void) | undefined;
    void mountWebview().then((cleanup) => {
      cleanupBounds = cleanup;
    });

    return () => {
      disposed = true;
      cleanupBounds?.();
      resizeObserver?.disconnect();
      void cleanupWebview?.();
    };
  }, [label, url]);

  return (
    <div ref={hostRef} className="relative min-h-0 flex-1 overflow-hidden bg-white">
      {state !== "ready" ? (
        <div className="absolute inset-0 grid place-items-center bg-white p-8 text-center">
          <div className="max-w-md">
            <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-md bg-ember/12 text-ember">
              <AlertTriangle size={19} />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-ink">{title}</h2>
            <p className="mb-4 break-words text-sm leading-6 text-ink/60">
              {state === "loading"
                ? "Opening page in native WebView..."
                : message || "Native WebView is not ready."}
            </p>
            <a
              href={url}
              target="_blank"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-white transition hover:bg-ember"
            >
              <ExternalLink size={15} />
              Open URL
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
