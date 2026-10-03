import clsx, { type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({});

/** clsx + tailwind-merge: later classes win over conflicting earlier ones (e.g. p-0 over p-5). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
