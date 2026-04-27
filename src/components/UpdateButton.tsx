"use client";

import { useState } from "react";
import { ArrowUpCircle, CheckCircle, Download, Loader, RotateCw } from "lucide-react";
import { invokeCommand } from "@/lib/tauri";
import type { UpdateCheckResult, UpdateInstallResult } from "@/types/preferences";

type Phase = "idle" | "checking" | "up-to-date" | "available" | "installing" | "done" | "error";

export function UpdateButton() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function check() {
    setPhase("checking");
    setErrorMsg("");

    const result = await invokeCommand<UpdateCheckResult>("check_app_update");

    if (!result) {
      setPhase("error");
      setErrorMsg("Updater unavailable in this build");
      return;
    }

    setCurrentVersion(result.currentVersion);

    if (result.available && result.version) {
      setNewVersion(result.version);
      setPhase("available");
    } else {
      setPhase("up-to-date");
    }
  }

  async function install() {
    setPhase("installing");

    const result = await invokeCommand<UpdateInstallResult>("install_app_update");

    if (!result) {
      setPhase("error");
      setErrorMsg("Install failed");
      return;
    }

    setPhase("done");
  }

  if (phase === "idle") {
    return (
      <button
        type="button"
        onClick={check}
        className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-white/75 transition hover:bg-white/10 hover:text-white"
      >
        <ArrowUpCircle size={15} />
        Check for updates
      </button>
    );
  }

  if (phase === "checking") {
    return (
      <div className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-white/40">
        <Loader size={14} className="animate-spin" />
        Checking GitHub...
      </div>
    );
  }

  if (phase === "up-to-date") {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
        <div className="mb-1 flex items-center gap-2 text-[12px] text-mint">
          <CheckCircle size={13} />
          Up to date {currentVersion ? `(v${currentVersion})` : ""}
        </div>
        <button
          type="button"
          onClick={() => setPhase("idle")}
          className="text-[11px] text-white/30 hover:text-white/60"
        >
          Check again
        </button>
      </div>
    );
  }

  if (phase === "available") {
    return (
      <div className="rounded-lg border border-ember/30 bg-ember/10 px-3 py-2">
        <div className="mb-1.5 text-[12px] font-medium text-ember">
          v{newVersion} available
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={install}
            className="flex h-7 items-center gap-1.5 rounded-md bg-ember px-2.5 text-[12px] font-medium text-white transition hover:bg-ember/80"
          >
            <Download size={11} />
            Install
          </button>
          <button
            type="button"
            onClick={() => setPhase("idle")}
            className="text-[11px] text-white/30 hover:text-white/60"
          >
            Later
          </button>
        </div>
      </div>
    );
  }

  if (phase === "installing") {
    return (
      <div className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-white/40">
        <Loader size={14} className="animate-spin" />
        Installing update...
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="rounded-lg border border-mint/20 bg-mint/10 px-3 py-2">
        <div className="text-[12px] text-mint">Installed! Restart to apply.</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <div className="mb-1 text-[11px] text-white/40">{errorMsg}</div>
      <button
        type="button"
        onClick={() => setPhase("idle")}
        className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60"
      >
        <RotateCw size={10} />
        Retry
      </button>
    </div>
  );
}
