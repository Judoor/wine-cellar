"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui";

/**
 * Text input with server suggestions. Stays an uncontrolled form field (name/defaultValue),
 * so the parent form can also fill it programmatically. With `multiple`, suggestions apply
 * to the last comma-separated item ("Merlot, Cab…").
 */
export function AutocompleteInput<T>({
  id,
  name,
  defaultValue,
  url,
  getLabel,
  renderItem,
  onPick,
  multiple = false,
}: {
  id: string;
  name: string;
  defaultValue?: string | number;
  url: string;
  getLabel: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  onPick?: (item: T) => void;
  multiple?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (term.trim().length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(url + encodeURIComponent(term.trim()), { signal: ctrl.signal });
        if (res.ok) {
          setItems(await res.json());
          setActive(-1);
        }
      } catch {
        /* aborted */
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [term, url]);

  useEffect(() => {
    const close = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Suggestions only apply to a term of 2+ characters.
  const visible = term.trim().length >= 2 ? items : [];

  function onChange(value: string) {
    setTerm(multiple ? (value.split(",").pop() ?? "") : value);
    setOpen(true);
  }

  function pick(item: T) {
    const el = inputRef.current!;
    const label = getLabel(item);
    if (multiple) {
      const parts = el.value.split(",").map((s) => s.trim());
      parts[parts.length - 1] = label;
      el.value = parts.filter(Boolean).join(", ");
    } else {
      el.value = label;
    }
    setOpen(false);
    setTerm("");
    onPick?.(item);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || visible.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % visible.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? visible.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(visible[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <Input
        ref={inputRef}
        id={id}
        name={name}
        defaultValue={defaultValue}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && visible.length > 0}
        aria-controls={`${id}-list`}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {open && visible.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded border border-border bg-surface shadow-xl">
          {visible.map((item, i) => (
            <li key={getLabel(item) + i} role="option" aria-selected={i === active}>
              <button
                type="button"
                onClick={() => pick(item)}
                className={`block w-full px-3 py-2 text-left hover:bg-surface-2 ${i === active ? "bg-surface-2" : ""}`}
              >
                {renderItem(item)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
