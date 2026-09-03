import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes without duplication.
 * @param {...(string|boolean|undefined)} inputs
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
