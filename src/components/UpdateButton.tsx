"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader } from "lucide-react";
import { invokeCommand } from "@/lib/tauri";
import type { UpdateCheckResult, UpdateInstallResult } from "@/types/preferences";

type Phase = "checking" | "up-to-date" | "available" | "installing" | "done" | "error";

export function UpdateButton() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState("Installed. Restart Lume to apply.");

  const check = useCallback(async () => {
    setPhase("checking");

    const result = await invokeCommand<UpdateCheckResult>("check_app_update");

    if (!result) {
      setPhase("error");
      return;
    }

    if (result.available && result.version) {
      setNewVersion(result.version);
      setPhase("available");
      return;
    }

    setNewVersion(null);
    setPhase("up-to-date");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void check();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [check]);

  async function install() {
    setPhase("installing");

    const result = await invokeCommand<UpdateInstallResult>("install_app_update");

    if (!result || !result.installed) {
      setPhase("error");
      return;
    }

    setDoneMsg(
      result.launchedInstaller
        ? "Installer opened. Finish setup to update."
        : "Installed. Restart Lume to apply."
    );
    setPhase("done");
  }

  if (phase === "available") {
    return (
      <div className="rounded-lg border border-ember/30 bg-ember/10 px-3 py-2">
        <div className="mb-1.5 text-[12px] font-medium text-ember">
          Update {newVersion ? `v${newVersion}` : ""} available
        </div>
        <button
          type="button"
          onClick={install}
          className="flex h-7 items-center gap-1.5 rounded-md bg-ember px-2.5 text-[12px] font-medium text-white transition hover:bg-ember/80"
        >
          <Download size={11} />
          Install
        </button>
      </div>
    );
  }

  if (phase === "installing") {
    return (
      <div className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-white/50">
        <Loader size={14} className="animate-spin" />
        Installing update...
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="rounded-lg border border-mint/20 bg-mint/10 px-3 py-2">
        <div className="text-[12px] text-mint">{doneMsg}</div>
      </div>
    );
  }

  return null;
}
