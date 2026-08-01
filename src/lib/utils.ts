import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges CSS class names using clsx and tailwind-merge.
 * Resolves conflicting Tailwind classes automatically.
 * @param inputs - Variable number of class names or conditional objects
 * @returns Merged class string with Tailwind conflicts resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
