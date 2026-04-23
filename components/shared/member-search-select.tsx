"use client";

import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";

type Option = { id: string; label: string };

export function MemberSearchSelect({ 
  name, 
  memberships, 
  defaultValue,
  onChange 
}: { 
  name: string; 
  memberships: Option[]; 
  defaultValue?: string;
  onChange?: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Option | null>(
    defaultValue ? (memberships.find((m) => m.id === defaultValue) ?? null) : null
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? memberships.filter((m) => m.label.toLowerCase().includes(query.toLowerCase())).slice(0, 20)
    : memberships.slice(0, 20);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selected?.id ?? ""} required />
      <div
        className="flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          placeholder={selected ? selected.label : "Search member..."}
          value={open ? query : (selected?.label ?? "")}
          onChange={(e) => { 
            setQuery(e.target.value); 
            setOpen(true);
            if (!e.target.value && !selected) onChange?.(""); 
          }}
          onFocus={() => { setOpen(true); setQuery(""); }}
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-border bg-[#111] shadow-xl">
          {filtered.map((m) => (
            <li
              key={m.id}
              className="px-4 py-3 text-sm cursor-pointer hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors"
              onMouseDown={(e) => { 
                e.preventDefault(); 
                setSelected(m); 
                onChange?.(m.id);
                setOpen(false); 
                setQuery(""); 
              }}
            >
              {m.label}
            </li>
          ))}
        </ul>
      )}
      {open && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-[#111] px-4 py-3 text-sm text-muted-foreground shadow-xl">
          No members found.
        </div>
      )}
    </div>
  );
}
