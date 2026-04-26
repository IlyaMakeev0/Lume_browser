export type ThemeId = "lume" | "graphite" | "arctic" | "solar";

export type FontId = "system" | "serif" | "mono" | "wide";

export type DensityId = "comfortable" | "compact";

export type UserPreferences = {
  theme: ThemeId;
  font: FontId;
  density: DensityId;
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
