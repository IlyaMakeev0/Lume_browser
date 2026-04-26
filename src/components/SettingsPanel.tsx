"use client";

import clsx from "clsx";
import { Check, Download, Palette, RotateCw, Type, X } from "lucide-react";
import { useState } from "react";
import { invokeCommand } from "@/lib/tauri";
import type {
  DensityId,
  FontId,
  ThemeId,
  UpdateCheckResult,
  UpdateInstallResult,
  UserPreferences
} from "@/types/preferences";

type SettingsPanelProps = {
  open: boolean;
  preferences: UserPreferences;
  onChange: (preferences: UserPreferences) => void;
  onClose: () => void;
};

const themes: Array<{ id: ThemeId; name: string; colors: string[] }> = [
  { id: "lume", name: "Lume", colors: ["#151412", "#f06f3c", "#6ec6a4"] },
  { id: "graphite", name: "Graphite", colors: ["#111827", "#38bdf8", "#f97316"] },
  { id: "arctic", name: "Arctic", colors: ["#102033", "#2f80ed", "#7dd3fc"] },
  { id: "solar", name: "Solar", colors: ["#27210f", "#d97706", "#22c55e"] }
];

const fonts: Array<{ id: FontId; name: string; sample: string }> = [
  { id: "system", name: "System", sample: "Segoe UI" },
  { id: "serif", name: "Serif", sample: "Georgia" },
  { id: "mono", name: "Mono", sample: "JetBrains" },
  { id: "wide", name: "Wide", sample: "Verdana" }
];

const densities: Array<{ id: DensityId; name: string }> = [
  { id: "comfortable", name: "Comfortable" },
  { id: "compact", name: "Compact" }
];

export function SettingsPanel({
  open,
  preferences,
  onChange,
  onClose
}: SettingsPanelProps) {
  const [updateStatus, setUpdateStatus] = useState("Ready to check GitHub Releases.");
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (!open) {
    return null;
  }

  function updatePreferences(next: Partial<UserPreferences>) {
    onChange({
      ...preferences,
      ...next
    });
  }

  async function checkForUpdates() {
    setChecking(true);
    setUpdateStatus("Checking GitHub Releases...");

    const result = await invokeCommand<UpdateCheckResult>("check_app_update");

    if (!result) {
      setAvailableVersion(null);
      setUpdateStatus("Updater is unavailable in this preview environment.");
      setChecking(false);
      return;
    }

    if (result.available && result.version) {
      setAvailableVersion(result.version);
      setUpdateStatus(`Version ${result.version} is ready to install.`);
    } else {
      setAvailableVersion(null);
      setUpdateStatus(`Already up to date: ${result.currentVersion}.`);
    }

    setChecking(false);
  }

  async function installUpdate() {
    setInstalling(true);
    setUpdateStatus("Downloading and installing update...");

    const result = await invokeCommand<UpdateInstallResult>("install_app_update");

    if (!result) {
      setUpdateStatus("Updater is unavailable in this preview environment.");
      setInstalling(false);
      return;
    }

    if (result.installed) {
      setUpdateStatus(`Installed ${result.version}. Restarting Lume...`);
    } else {
      setUpdateStatus(`No update found. Current version is ${result.currentVersion}.`);
    }

    setInstalling(false);
  }

  return (
    <aside className="fixed bottom-0 right-0 top-9 z-[65] flex w-80 flex-col border-l border-ink/10 bg-white text-ink shadow-soft">
      <div className="flex h-14 items-center justify-between border-b border-ink/10 px-4">
        <div className="flex items-center gap-2">
          <Palette size={17} className="text-ember" />
          <h2 className="text-sm font-semibold">Settings</h2>
        </div>
        <button
          type="button"
          aria-label="Close settings"
          title="Close"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-md text-ink/54 transition hover:bg-ink/8 hover:text-ink"
        >
          <X size={17} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-ink/44">
            <Palette size={14} />
            Theme
          </div>
          <div className="grid grid-cols-2 gap-2">
            {themes.map((theme) => {
              const active = preferences.theme === theme.id;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => updatePreferences({ theme: theme.id })}
                  className={clsx(
                    "min-h-20 rounded-md border p-3 text-left transition",
                    active
                      ? "border-ember bg-ember/8"
                      : "border-ink/10 bg-white hover:border-ink/22"
                  )}
                >
                  <div className="mb-3 flex gap-1">
                    {theme.colors.map((color) => (
                      <span
                        key={color}
                        className="h-4 w-4 rounded-sm border border-black/10"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className="flex items-center justify-between text-sm font-medium">
                    {theme.name}
                    {active ? <Check size={15} className="text-ember" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-ink/44">
            <Type size={14} />
            Font
          </div>
          <div className="grid gap-2">
            {fonts.map((font) => (
              <button
                key={font.id}
                type="button"
                onClick={() => updatePreferences({ font: font.id })}
                className={clsx(
                  "flex h-11 items-center justify-between rounded-md border px-3 text-sm transition",
                  preferences.font === font.id
                    ? "border-mint bg-mint/10 text-ink"
                    : "border-ink/10 text-ink/64 hover:border-ink/22 hover:text-ink"
                )}
              >
                <span>{font.name}</span>
                <span className="text-xs text-ink/42">{font.sample}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-3 text-xs font-semibold uppercase text-ink/44">Density</div>
          <div className="grid grid-cols-2 rounded-md border border-ink/10 bg-ink/5 p-1">
            {densities.map((density) => (
              <button
                key={density.id}
                type="button"
                onClick={() => updatePreferences({ density: density.id })}
                className={clsx(
                  "h-9 rounded text-sm font-medium transition",
                  preferences.density === density.id
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink/56 hover:text-ink"
                )}
              >
                {density.name}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-ink/44">
            <Download size={14} />
            Updates
          </div>
          <div className="rounded-md border border-ink/10 bg-ink/[0.03] p-3">
            <p className="mb-3 text-sm leading-6 text-ink/64">{updateStatus}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={checkForUpdates}
                disabled={checking || installing}
                className="flex h-9 items-center justify-center gap-2 rounded-md border border-ink/10 bg-white text-sm font-medium text-ink transition hover:border-ink/22 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCw size={15} className={checking ? "animate-spin" : undefined} />
                Check
              </button>
              <button
                type="button"
                onClick={installUpdate}
                disabled={!availableVersion || checking || installing}
                className="flex h-9 items-center justify-center gap-2 rounded-md bg-ink text-sm font-medium text-white transition hover:bg-ember disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={15} />
                Install
              </button>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}
