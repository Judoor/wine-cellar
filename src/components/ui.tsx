import { cn } from "@/lib/cn";
import type { ComponentProps } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm",
  secondary: "bg-surface border border-border text-foreground hover:bg-surface-2",
  ghost: "text-foreground hover:bg-surface-2",
  danger: "bg-danger text-white hover:opacity-90",
};

export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  return cn(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded px-4 py-2 text-sm font-semibold transition-colors",
    "disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    buttonVariants[variant],
    className,
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

// 16px text on inputs prevents iOS/Android browsers from zooming on focus.
const fieldClass =
  "w-full min-h-11 rounded border border-border bg-surface px-3 py-2 text-base md:text-sm placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldClass, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClass, className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted", className)} {...props} />;
}

export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-surface/85 p-5 shadow-[inset_0_1px_0_#fff,0_8px_24px_-16px_rgb(58_37_23/0.4)]",
        className,
      )}
      {...props}
    />
  );
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("mb-3 font-serif text-2xl", className)}>{children}</h2>;
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{children}</p>;
}

export function PageTitle({
  children,
  kicker,
  subtitle,
  actions,
  menu,
}: {
  children: React.ReactNode;
  kicker?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  /** Compact icon actions (⋮ menu, + button) pinned to the right of the title. */
  menu?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="min-w-0 flex-1">
          {kicker && <Kicker>{kicker}</Kicker>}
          <h1 className="font-serif text-4xl leading-[1.05] md:text-5xl">{children}</h1>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
        </div>
        {menu && <div className="-mr-2 flex shrink-0 items-center md:mt-1">{menu}</div>}
      </div>
      {actions && <div className="w-full sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">{actions}</div>}
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "success"; children: React.ReactNode }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "rounded border px-3 py-2 text-sm",
        kind === "error" ? "border-danger/30 bg-danger/10 text-danger" : "border-success/30 bg-success/10 text-success",
      )}
    >
      {children}
    </p>
  );
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("rounded border border-accent/40 bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-[#8a5a1c]", className)}>
      {children}
    </span>
  );
}
