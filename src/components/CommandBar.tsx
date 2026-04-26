"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";

type CommandBarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (input: string) => Promise<void>;
};

export function CommandBar({ open, onOpenChange, onNavigate }: CommandBarProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeout = window.setTimeout(() => inputRef.current?.focus(), 0);

    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!input.trim()) {
      return;
    }

    await onNavigate(input);
    setInput("");
    onOpenChange(false);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-start bg-ink/22 px-4 pt-[14vh] backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="mx-auto grid w-full max-w-2xl grid-rows-[auto_auto] overflow-hidden rounded-md border border-white/20 bg-white shadow-soft"
      >
        <div className="flex h-14 items-center gap-3 border-b border-ink/10 px-4">
          <Search size={18} className="shrink-0 text-ember" />
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink/40"
            placeholder="Search or enter URL"
          />
          <button
            type="button"
            aria-label="Close command bar"
            title="Close"
            onClick={() => onOpenChange(false)}
            className="grid h-8 w-8 place-items-center rounded-md text-ink/50 transition hover:bg-ink/8 hover:text-ink"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-3 text-sm text-ink/58">
          <span className="truncate">Rust engine resolves URL, search, and internal pages.</span>
          <button
            type="submit"
            className="flex h-8 items-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-white transition hover:bg-ember"
          >
            Go
            <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </div>
  );
}
