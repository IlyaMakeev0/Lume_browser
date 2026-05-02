import type { UserPreferences } from "@/types/preferences";

const STORAGE_KEY = "lume.preferences.v1";

export const defaultPreferences: UserPreferences = {
  profileName: "Local profile",
  syncEnabled: false,
  theme: "lume",
  font: "system",
  density: "comfortable",
  searchEngine: "google",
  startupMode: "new-tab",
  startupUrl: "https://google.com",
  showHomeButton: false,
  homePageUrl: "lume://new-tab",
  safeBrowsing: true,
  blockThirdPartyCookies: false,
  doNotTrack: false,
  useSecureDns: true,
  preloadPages: true,
  askDownloadLocation: true,
  downloadPath: "Downloads",
  reduceMotion: false,
  showFocusOutlines: true,
  hardwareAcceleration: true,
  backgroundApps: false,
  memorySaver: true,
  inactiveTabSuspendSeconds: 45,
  pageZoom: 100,
  defaultFontSize: 14
};

export function readPreferences(): UserPreferences {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return defaultPreferences;
    }

    return {
      ...defaultPreferences,
      ...JSON.parse(raw)
    };
  } catch (error) {
    console.debug("Unable to read Lume preferences.", error);
    return defaultPreferences;
  }
}

export function writePreferences(preferences: UserPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  applyPreferences(preferences);
}

export function applyPreferences(preferences: UserPreferences) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = preferences.theme;
  document.documentElement.dataset.font = preferences.font;
  document.documentElement.dataset.density = preferences.density;
  document.documentElement.dataset.reduceMotion = String(preferences.reduceMotion);
  document.documentElement.dataset.focusOutlines = String(preferences.showFocusOutlines);
  document.documentElement.style.setProperty(
    "--lume-default-font-size",
    `${preferences.defaultFontSize}px`
  );
  document.documentElement.style.setProperty("--lume-page-zoom", `${preferences.pageZoom / 100}`);
}
