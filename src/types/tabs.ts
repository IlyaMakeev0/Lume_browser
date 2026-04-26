export type BrowserTab = {
  id: string;
  title: string;
  url: string;
  is_active: boolean;
  pinned: boolean;
  space: string;
};

export type NewTabRequest = {
  title?: string;
  url?: string;
  space?: string;
  activate?: boolean;
};

export type FetchPreview = {
  url: string;
  status: number;
  content_type?: string | null;
  title?: string | null;
  document?: DocumentSnapshot | null;
  body_preview: string;
};

export type DocumentSnapshot = {
  url: string;
  title?: string | null;
  description?: string | null;
  language?: string | null;
  text_preview: string;
  links: LinkCandidate[];
  resources: ResourceCounts;
};

export type LinkCandidate = {
  label: string;
  href: string;
};

export type ResourceCounts = {
  stylesheets: number;
  scripts: number;
  images: number;
};

export type HistoryEntry = {
  url: string;
  title: string;
  visit_count: number;
  last_visited_ms: number;
};

export type NavigationTarget = {
  input: string;
  resolved_url: string;
  display_title: string;
  kind: "internal" | "url" | "search";
};

export type PlatformProfile = {
  id: string;
  name: string;
  family: string;
  shell: string;
  engine_strategy: string;
};
