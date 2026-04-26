import type { UserPreferences } from "@/types/preferences";

const STORAGE_KEY = "lume.preferences.v1";

export const defaultPreferences: UserPreferences = {
  theme: "lume",
  font: "system",
  density: "comfortable"
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
}
