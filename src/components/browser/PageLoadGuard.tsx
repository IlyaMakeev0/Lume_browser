"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import { invokeCommand } from "@/lib/tauri";
import type { NetworkProbe } from "@/types/tabs";

type PageLoadGuardProps = {
  url: string;
  children: React.ReactNode;
  onNavigate: (input: string) => Promise<void>;
};

type ProbeState =
  | { kind: "checking" }
  | { kind: "ready"; probe?: NetworkProbe }
  | { kind: "failed"; probe: NetworkProbe };

export function PageLoadGuard({ url, children, onNavigate }: PageLoadGuardProps) {
  const [state, setState] = useState<ProbeState>({ kind: "checking" });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let disposed = false;

    const checkingTimeout = window.setTimeout(() => {
      if (!disposed) {
        setState({ kind: "checking" });
      }
    }, 0);

    void invokeCommand<NetworkProbe>("probe_url", { url }).then((probe) => {
      if (disposed) {
        return;
      }

      if (!probe) {
        setState({ kind: "ready" });
        return;
      }

      setState(probe.reachable ? { kind: "ready", probe } : { kind: "failed", probe });
    });

    return () => {
      disposed = true;
      window.clearTimeout(checkingTimeout);
    };
  }, [retryCount, url]);

  if (state.kind === "ready") {
    return <>{children}</>;
  }

  if (state.kind === "checking") {
    return (
      <div className="grid flex-1 place-items-center bg-[#111111] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/12 border-t-ember" />
          <div className="text-center">
            <p className="text-sm font-medium text-white/82">Connecting with Lume...</p>
            <p className="mt-1 max-w-md break-words text-xs text-white/34">{url}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid flex-1 place-items-center bg-[#111111] p-8 text-white">
      <div className="w-full max-w-xl">
        <div className="mb-7 grid h-14 w-14 place-items-center rounded-xl bg-ember/12 text-ember">
          <AlertTriangle size={26} />
        </div>
        <h1 className="mb-3 text-3xl font-semibold tracking-normal">Lume cannot reach this page</h1>
        <p className="mb-2 break-words text-sm font-medium text-white/72">{url}</p>
        <p className="mb-7 max-w-lg text-sm leading-6 text-white/46">
          The address refused the connection or did not answer before Lume timed out.
          This is a Lume network error page, not a Chromium or Edge placeholder.
        </p>

        <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="mb-1 text-xs font-semibold uppercase text-white/34">Details</p>
          <p className="break-words text-sm leading-6 text-white/58">
            {state.probe.error ?? "The host is not reachable."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRetryCount((value) => value + 1)}
            className="flex h-10 items-center gap-2 rounded-md bg-ember px-4 text-sm font-medium text-white transition hover:bg-ember/85"
          >
            <RefreshCw size={16} />
            Retry
          </button>
          <button
            type="button"
            onClick={() => onNavigate(url)}
            className="flex h-10 items-center gap-2 rounded-md border border-white/12 bg-white/[0.05] px-4 text-sm font-medium text-white/74 transition hover:bg-white/[0.09] hover:text-white"
          >
            <Search size={16} />
            Open again
          </button>
        </div>
      </div>
    </div>
  );
}
