"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

type Props = {
  onNavigate: (input: string) => Promise<void>;
};

function useClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

const QUICK_LINKS = [
  { label: "Google", url: "https://google.com" },
  { label: "GitHub", url: "https://github.com" },
  { label: "YouTube", url: "https://youtube.com" },
  { label: "Reddit", url: "https://reddit.com" },
];

export function NewTabPage({ onNavigate }: Props) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const now = useClock();

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (input.trim()) await onNavigate(input.trim());
  }

  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-8"
      style={{ background: "var(--app-background)" }}
    >
      {/* Clock */}
      <div className="text-center">
        <div className="text-7xl font-light tabular-nums tracking-tight text-white/90">
          {hours}:{minutes}
        </div>
        <div className="mt-1 text-sm text-white/40">{dateStr}</div>
      </div>

      {/* Search bar */}
      <form
        onSubmit={submit}
        className="flex w-full max-w-xl items-center gap-3 rounded-2xl bg-white/10 px-5 py-3.5 ring-1 ring-white/10 backdrop-blur-xl transition focus-within:bg-white/15 focus-within:ring-white/20"
      >
        <Search size={18} className="shrink-0 text-white/40" />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search or enter URL..."
          className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/30"
        />
        {input && (
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-ember px-3 py-1.5 text-sm font-medium text-white transition hover:bg-ember/80"
          >
            Go
          </button>
        )}
      </form>

      {/* Quick links */}
      <div className="flex gap-3">
        {QUICK_LINKS.map((link) => (
          <button
            key={link.url}
            type="button"
            onClick={() => void onNavigate(link.url)}
            className="flex h-10 items-center gap-2 rounded-xl bg-white/8 px-4 text-sm text-white/60 ring-1 ring-white/10 transition hover:bg-white/14 hover:text-white"
          >
            <span className="h-4 w-4 rounded-sm bg-white/20 text-[9px] font-bold text-white flex items-center justify-center">
              {link.label[0]}
            </span>
            {link.label}
          </button>
        ))}
      </div>

      {/* Lume label */}
      <div className="flex items-center gap-2 text-white/20">
        <span className="h-2 w-2 rounded-sm bg-ember/60" />
        <span className="text-xs tracking-wide">Lume Browser</span>
      </div>
    </div>
  );
}
