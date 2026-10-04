"use client";

import { EllipsisVertical, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ComponentProps, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/client";

export type MenuItem = {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  danger?: boolean;
  disabled?: boolean;
} & ({ onSelect: () => void; href?: never } | { href: string; onSelect?: never });

/** "⋮" button opening a small dropdown of actions (edit, delete…). */
export function ActionMenu({
  label,
  items,
  up,
  className,
}: {
  label: string;
  items: MenuItem[];
  /** Open above the button (for menus at the bottom of a card). */
  up?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass = (item: MenuItem) =>
    cn(
      "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium hover:bg-surface-2 disabled:opacity-50",
      item.danger && "text-danger",
    );

  return (
    <div ref={ref} className={cn("relative shrink-0", className)}>
      <IconButton aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <EllipsisVertical className="size-5" aria-hidden />
      </IconButton>
      {open && (
        <div role="menu" 
          className={cn(
            "absolute right-0 z-30 min-w-48 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-xl",
            up ? "bottom-full mb-1" : "mt-1",
          )}
        >
          {items.map((item) => {
            const content = (
              <>
                {item.icon && <item.icon className="size-4 shrink-0" />}
                {item.label}
              </>
            );
            return item.href ? (
              <Link key={item.label} role="menuitem" href={item.href} className={itemClass(item)} onClick={() => setOpen(false)}>
                {content}
              </Link>
            ) : (
              <button
                key={item.label}
                role="menuitem"
                type="button"
                disabled={item.disabled}
                className={itemClass(item)}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Round, borderless icon button (⋮, +…). */
export function IconButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-2 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function AddButton({ label, ...props }: ComponentProps<"button"> & { label: string }) {
  return (
    <IconButton aria-label={label} title={label} {...props}>
      <Plus className="size-7" strokeWidth={1.75} aria-hidden />
    </IconButton>
  );
}

/** Bottom sheet on phones, centered dialog on larger screens. Portaled to <body> to sit above the nav bars. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { t } = useI18n();
  // document.body only exists in the browser; a modal open on first render (?note=1) shows after hydration.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-xl border border-border bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-xl sm:rounded-xl sm:pb-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">{title}</h2>
          <IconButton aria-label={t("common.close")} onClick={onClose} className="-mr-2 text-muted">
            <X className="size-5" aria-hidden />
          </IconButton>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
