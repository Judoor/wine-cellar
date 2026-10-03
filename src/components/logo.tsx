import clsx from "clsx";

/** "Wine Cellar" → "Wine" + italic gold "Cellar". */
export function Logo({ name, className }: { name: string; className?: string }) {
  const [first, ...rest] = name.split(" ");
  return (
    <span className={clsx("font-serif text-2xl leading-none", className)}>
      {first} {rest.length > 0 && <em className="text-accent">{rest.join(" ")}</em>}
    </span>
  );
}
