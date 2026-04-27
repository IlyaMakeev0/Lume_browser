"use client";

import clsx from "clsx";
import {
  Accessibility,
  BadgeCheck,
  Check,
  Cpu,
  Download,
  FolderDown,
  Globe2,
  Home,
  MonitorCog,
  Palette,
  RotateCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { invokeCommand } from "@/lib/tauri";
import type {
  DensityId,
  FontId,
  SearchEngineId,
  StartupModeId,
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

type SectionId =
  | "profile"
  | "appearance"
  | "search"
  | "startup"
  | "privacy"
  | "downloads"
  | "accessibility"
  | "system"
  | "about";

type SettingsSectionInfo = {
  id: SectionId;
  title: string;
  icon: LucideIcon;
  keywords: string;
};

const sections: SettingsSectionInfo[] = [
  {
    id: "profile",
    title: "You and Lume",
    icon: UserRound,
    keywords: "profile account sync identity"
  },
  {
    id: "appearance",
    title: "Appearance",
    icon: Palette,
    keywords: "theme font density zoom home button"
  },
  {
    id: "search",
    title: "Search engine",
    icon: Search,
    keywords: "google duckduckgo bing yandex address bar"
  },
  {
    id: "startup",
    title: "On startup",
    icon: Home,
    keywords: "new tab continue specific page homepage"
  },
  {
    id: "privacy",
    title: "Privacy and security",
    icon: ShieldCheck,
    keywords: "safe browsing cookies dns tracking preload"
  },
  {
    id: "downloads",
    title: "Downloads",
    icon: FolderDown,
    keywords: "download folder location save files"
  },
  {
    id: "accessibility",
    title: "Accessibility",
    icon: Accessibility,
    keywords: "motion focus outlines font size"
  },
  {
    id: "system",
    title: "System",
    icon: Cpu,
    keywords: "hardware acceleration background memory performance"
  },
  {
    id: "about",
    title: "About Lume",
    icon: BadgeCheck,
    keywords: "version updates github releases"
  }
];

const themes: Array<{ id: ThemeId; name: string; colors: string[] }> = [
  { id: "lume", name: "Lume", colors: ["#151412", "#f06f3c", "#6ec6a4"] },
  { id: "graphite", name: "Graphite", colors: ["#111827", "#38bdf8", "#f97316"] },
  { id: "arctic", name: "Arctic", colors: ["#102033", "#2f80ed", "#7dd3fc"] },
  { id: "solar", name: "Solar", colors: ["#27210f", "#d97706", "#22c55e"] }
];

const fonts: Array<{ id: FontId; name: string; sample: string }> = [
  { id: "system", name: "System", sample: "Segoe UI" },
  { id: "serif", name: "Serif", sample: "Georgia" },
  { id: "mono", name: "Mono", sample: "Cascadia Mono" },
  { id: "wide", name: "Wide", sample: "Verdana" }
];

const densities: Array<{ id: DensityId; name: string }> = [
  { id: "comfortable", name: "Comfortable" },
  { id: "compact", name: "Compact" }
];

const searchEngines: Array<{ id: SearchEngineId; name: string; host: string }> = [
  { id: "google", name: "Google", host: "google.com" },
  { id: "duckduckgo", name: "DuckDuckGo", host: "duckduckgo.com" },
  { id: "bing", name: "Bing", host: "bing.com" },
  { id: "yandex", name: "Yandex", host: "yandex.com" }
];

const startupModes: Array<{ id: StartupModeId; name: string; description: string }> = [
  { id: "new-tab", name: "Open New Tab", description: "Start with the Lume start page" },
  { id: "continue", name: "Continue", description: "Reopen the previous browsing space" },
  { id: "specific", name: "Specific page", description: "Open a page you choose" }
];

export function SettingsPanel({
  open,
  preferences,
  onChange,
  onClose
}: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("appearance");
  const [settingsQuery, setSettingsQuery] = useState("");
  const [updateStatus, setUpdateStatus] = useState("Ready to check GitHub Releases.");
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);

  const visibleSections = useMemo(() => {
    const query = settingsQuery.trim().toLowerCase();

    if (!query) {
      return sections.filter((section) => section.id === activeSection);
    }

    return sections.filter((section) =>
      `${section.title} ${section.keywords}`.toLowerCase().includes(query)
    );
  }, [activeSection, settingsQuery]);

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
      setUpdateStatus("Updater is unavailable in this build.");
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
      setUpdateStatus("Updater is unavailable in this build.");
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
    <aside className="flex h-full w-[680px] max-w-[calc(100vw-256px)] shrink-0 border-l border-black/10 bg-[#f8f7f4] text-ink shadow-soft">
      <nav className="flex w-56 shrink-0 flex-col border-r border-black/10 bg-white">
        <div className="flex h-14 items-center justify-between border-b border-black/10 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SlidersHorizontal size={17} className="shrink-0 text-ember" />
            <h2 className="truncate text-sm font-semibold">Settings</h2>
          </div>
          <button
            type="button"
            aria-label="Close settings"
            title="Close"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-ink/50 transition hover:bg-ink/10 hover:text-ink"
          >
            <X size={17} />
          </button>
        </div>

        <div className="border-b border-black/10 p-3">
          <label className="flex h-9 items-center gap-2 rounded-lg bg-ink/5 px-3 ring-1 ring-black/5 focus-within:bg-white focus-within:ring-ember/30">
            <Search size={14} className="shrink-0 text-ink/40" />
            <input
              value={settingsQuery}
              onChange={(event) => setSettingsQuery(event.target.value)}
              placeholder="Search settings"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink/40"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const active = !settingsQuery && section.id === activeSection;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  setSettingsQuery("");
                  setActiveSection(section.id);
                }}
                className={clsx(
                  "flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] transition",
                  active
                    ? "bg-ink text-white"
                    : "text-ink/70 hover:bg-ink/5 hover:text-ink"
                )}
              >
                <Icon size={15} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{section.title}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-[420px] gap-4 px-5 py-5">
          {visibleSections.length ? (
            visibleSections.map((section) => (
              <div key={section.id}>{renderSection(section.id)}</div>
            ))
          ) : (
            <div className="rounded-lg border border-black/10 bg-white p-6 text-center">
              <Search size={24} className="mx-auto mb-3 text-ink/30" />
              <p className="text-sm font-medium text-ink">No settings found</p>
              <p className="mt-1 text-xs text-ink/50">Try another search term.</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );

  function renderSection(sectionId: SectionId) {
    switch (sectionId) {
      case "profile":
        return (
          <SettingsSection
            icon={UserRound}
            title="You and Lume"
            description="Profile, sync, and local identity."
          >
            <SettingRow title="Profile name" description="Shown in local Lume surfaces.">
              <input
                value={preferences.profileName}
                onChange={(event) => updatePreferences({ profileName: event.target.value })}
                className="h-9 w-44 rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none transition focus:border-ember/60"
              />
            </SettingRow>
            <SettingRow
              title="Sync"
              description="Keep browser preferences ready for GitHub-backed updates."
            >
              <Toggle
                checked={preferences.syncEnabled}
                onChange={(checked) => updatePreferences({ syncEnabled: checked })}
              />
            </SettingRow>
          </SettingsSection>
        );

      case "appearance":
        return (
          <SettingsSection
            icon={Palette}
            title="Appearance"
            description="Theme, typography, layout density, and page scale."
          >
            <div className="grid grid-cols-2 gap-2">
              {themes.map((theme) => {
                const active = preferences.theme === theme.id;

                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => updatePreferences({ theme: theme.id })}
                    className={clsx(
                      "min-h-20 rounded-lg border p-3 text-left transition",
                      active
                        ? "border-ember bg-ember/10"
                        : "border-black/10 bg-white hover:border-black/25"
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

            <SettingRow title="Font family" description="Default UI font.">
              <SegmentedControl
                value={preferences.font}
                options={fonts}
                onChange={(font) => updatePreferences({ font })}
              />
            </SettingRow>

            <SettingRow title="Layout density" description="Spacing used by browser controls.">
              <SegmentedControl
                value={preferences.density}
                options={densities}
                onChange={(density) => updatePreferences({ density })}
              />
            </SettingRow>

            <RangeRow
              title="Page zoom"
              value={preferences.pageZoom}
              min={80}
              max={150}
              step={5}
              suffix="%"
              onChange={(pageZoom) => updatePreferences({ pageZoom })}
            />

            <SettingRow title="Show home button" description="Display Home in the toolbar.">
              <Toggle
                checked={preferences.showHomeButton}
                onChange={(checked) => updatePreferences({ showHomeButton: checked })}
              />
            </SettingRow>
          </SettingsSection>
        );

      case "search":
        return (
          <SettingsSection
            icon={Globe2}
            title="Search engine"
            description="Choose the provider used by the address bar."
          >
            <div className="grid gap-2">
              {searchEngines.map((engine) => {
                const active = preferences.searchEngine === engine.id;

                return (
                  <button
                    key={engine.id}
                    type="button"
                    onClick={() => updatePreferences({ searchEngine: engine.id })}
                    className={clsx(
                      "flex min-h-12 items-center gap-3 rounded-lg border px-3 text-left transition",
                      active
                        ? "border-ember bg-ember/10"
                        : "border-black/10 bg-white hover:border-black/25"
                    )}
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-md bg-ink text-xs font-semibold text-white">
                      {engine.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{engine.name}</p>
                      <p className="truncate text-xs text-ink/50">{engine.host}</p>
                    </div>
                    {active ? <Check size={16} className="text-ember" /> : null}
                  </button>
                );
              })}
            </div>
          </SettingsSection>
        );

      case "startup":
        return (
          <SettingsSection
            icon={Home}
            title="On startup"
            description="Choose what opens when Lume starts."
          >
            <div className="grid gap-2">
              {startupModes.map((mode) => {
                const active = preferences.startupMode === mode.id;

                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => updatePreferences({ startupMode: mode.id })}
                    className={clsx(
                      "rounded-lg border px-3 py-3 text-left transition",
                      active
                        ? "border-ember bg-ember/10"
                        : "border-black/10 bg-white hover:border-black/25"
                    )}
                  >
                    <span className="flex items-center justify-between text-sm font-medium text-ink">
                      {mode.name}
                      {active ? <Check size={15} className="text-ember" /> : null}
                    </span>
                    <span className="mt-1 block text-xs text-ink/50">{mode.description}</span>
                  </button>
                );
              })}
            </div>

            <SettingRow title="Startup page" description="Used when Specific page is selected.">
              <input
                value={preferences.startupUrl}
                onChange={(event) => updatePreferences({ startupUrl: event.target.value })}
                className="h-9 w-52 rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none transition focus:border-ember/60"
              />
            </SettingRow>

            <SettingRow title="Home page" description="Address opened by Home.">
              <input
                value={preferences.homePageUrl}
                onChange={(event) => updatePreferences({ homePageUrl: event.target.value })}
                className="h-9 w-52 rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none transition focus:border-ember/60"
              />
            </SettingRow>
          </SettingsSection>
        );

      case "privacy":
        return (
          <SettingsSection
            icon={ShieldCheck}
            title="Privacy and security"
            description="Network, cookie, and browsing protections."
          >
            <ToggleRow
              title="Safe browsing"
              description="Warn before loading known risky destinations."
              checked={preferences.safeBrowsing}
              onChange={(checked) => updatePreferences({ safeBrowsing: checked })}
            />
            <ToggleRow
              title="Block third-party cookies"
              description="Limit cross-site cookies in the browser session."
              checked={preferences.blockThirdPartyCookies}
              onChange={(checked) => updatePreferences({ blockThirdPartyCookies: checked })}
            />
            <ToggleRow
              title="Send Do Not Track"
              description="Ask sites not to track browsing activity."
              checked={preferences.doNotTrack}
              onChange={(checked) => updatePreferences({ doNotTrack: checked })}
            />
            <ToggleRow
              title="Secure DNS"
              description="Prefer encrypted DNS where the platform allows it."
              checked={preferences.useSecureDns}
              onChange={(checked) => updatePreferences({ useSecureDns: checked })}
            />
            <ToggleRow
              title="Preload pages"
              description="Allow faster page starts for likely next navigations."
              checked={preferences.preloadPages}
              onChange={(checked) => updatePreferences({ preloadPages: checked })}
            />
          </SettingsSection>
        );

      case "downloads":
        return (
          <SettingsSection
            icon={FolderDown}
            title="Downloads"
            description="File saving location and confirmation behavior."
          >
            <SettingRow title="Location" description="Default download folder.">
              <input
                value={preferences.downloadPath}
                onChange={(event) => updatePreferences({ downloadPath: event.target.value })}
                className="h-9 w-52 rounded-md border border-black/10 bg-white px-3 text-sm text-ink outline-none transition focus:border-ember/60"
              />
            </SettingRow>
            <ToggleRow
              title="Ask where to save each file"
              description="Show a save prompt before download starts."
              checked={preferences.askDownloadLocation}
              onChange={(checked) => updatePreferences({ askDownloadLocation: checked })}
            />
          </SettingsSection>
        );

      case "accessibility":
        return (
          <SettingsSection
            icon={Accessibility}
            title="Accessibility"
            description="Motion, focus visibility, and text sizing."
          >
            <ToggleRow
              title="Reduce motion"
              description="Minimize transitions and animations."
              checked={preferences.reduceMotion}
              onChange={(checked) => updatePreferences({ reduceMotion: checked })}
            />
            <ToggleRow
              title="Show focus outlines"
              description="Make keyboard focus easier to see."
              checked={preferences.showFocusOutlines}
              onChange={(checked) => updatePreferences({ showFocusOutlines: checked })}
            />
            <RangeRow
              title="Default font size"
              value={preferences.defaultFontSize}
              min={12}
              max={22}
              step={1}
              suffix="px"
              onChange={(defaultFontSize) => updatePreferences({ defaultFontSize })}
            />
          </SettingsSection>
        );

      case "system":
        return (
          <SettingsSection
            icon={MonitorCog}
            title="System"
            description="Performance and platform behavior."
          >
            <ToggleRow
              title="Hardware acceleration"
              description="Use GPU acceleration for browser surfaces."
              checked={preferences.hardwareAcceleration}
              onChange={(checked) => updatePreferences({ hardwareAcceleration: checked })}
            />
            <ToggleRow
              title="Continue running background apps"
              description="Keep background tasks alive after windows close."
              checked={preferences.backgroundApps}
              onChange={(checked) => updatePreferences({ backgroundApps: checked })}
            />
            <ToggleRow
              title="Memory saver"
              description="Reduce memory use for inactive tabs."
              checked={preferences.memorySaver}
              onChange={(checked) => updatePreferences({ memorySaver: checked })}
            />
          </SettingsSection>
        );

      case "about":
        return (
          <SettingsSection
            icon={BadgeCheck}
            title="About Lume"
            description="Version and update channel."
          >
            <div className="rounded-lg border border-black/10 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-sm font-semibold text-white">
                  L
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Lume Browser</p>
                  <p className="text-xs text-ink/50">GitHub Releases update channel</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-ink/70">{updateStatus}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={checkForUpdates}
                  disabled={checking || installing}
                  className="flex h-9 items-center justify-center gap-2 rounded-md border border-black/10 bg-white text-sm font-medium text-ink transition hover:border-black/25 disabled:cursor-not-allowed disabled:opacity-50"
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
          </SettingsSection>
        );
    }
  }
}

function SettingsSection({
  icon: Icon,
  title,
  description,
  children
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-black/10 bg-[#fbfaf7] p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-ember/10 text-ember">
          <Icon size={19} />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          <p className="mt-0.5 text-xs leading-5 text-ink/55">{description}</p>
        </div>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function SettingRow({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 rounded-lg border border-black/10 bg-white px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-ink/50">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <SettingRow title={title} description={description}>
      <Toggle checked={checked} onChange={onChange} />
    </SettingRow>
  );
}

function Toggle({
  checked,
  onChange
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative h-6 w-11 rounded-full transition",
        checked ? "bg-ember" : "bg-ink/20"
      )}
    >
      <span
        className={clsx(
          "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition",
          checked ? "left-6" : "left-1"
        )}
      />
    </button>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: Array<{ id: T; name: string; sample?: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-md border border-black/10 bg-ink/5 p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={clsx(
            "h-8 rounded px-2 text-xs font-medium transition",
            value === option.id
              ? "bg-white text-ink shadow-sm"
              : "text-ink/60 hover:text-ink"
          )}
          title={option.sample}
        >
          {option.name}
        </button>
      ))}
    </div>
  );
}

function RangeRow({
  title,
  value,
  min,
  max,
  step,
  suffix,
  onChange
}: {
  title: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-white px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{title}</p>
          <p className="mt-0.5 text-xs text-ink/50">
            {value}
            {suffix}
          </p>
        </div>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full accent-ember"
      />
    </div>
  );
}
