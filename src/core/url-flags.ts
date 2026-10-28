/** True when the page URL has `?name` (with or without a value). */
export function hasUrlFlag(name: string): boolean {
  return new URLSearchParams(window.location.search).has(name);
}
