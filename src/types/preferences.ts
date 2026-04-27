export type ThemeId = "lume" | "graphite" | "arctic" | "solar";

export type FontId = "system" | "serif" | "mono" | "wide";

export type DensityId = "comfortable" | "compact";

export type SearchEngineId = "google" | "duckduckgo" | "bing" | "yandex";

export type StartupModeId = "new-tab" | "continue" | "specific";

export type UserPreferences = {
  profileName: string;
  syncEnabled: boolean;
  theme: ThemeId;
  font: FontId;
  density: DensityId;
  searchEngine: SearchEngineId;
  startupMode: StartupModeId;
  startupUrl: string;
  showHomeButton: boolean;
  homePageUrl: string;
  safeBrowsing: boolean;
  blockThirdPartyCookies: boolean;
  doNotTrack: boolean;
  useSecureDns: boolean;
  preloadPages: boolean;
  askDownloadLocation: boolean;
  downloadPath: string;
  reduceMotion: boolean;
  showFocusOutlines: boolean;
  hardwareAcceleration: boolean;
  backgroundApps: boolean;
  memorySaver: boolean;
  pageZoom: number;
  defaultFontSize: number;
};

export type UpdateCheckResult = {
  available: boolean;
  currentVersion: string;
  version?: string | null;
};

export type UpdateInstallResult = {
  installed: boolean;
  currentVersion: string;
  version?: string | null;
};
