// Circular SVG flags by ISO alpha-2 code, served from the same CDN as the
// map TopoJSON. Emoji flags are not an option — Windows renders them as
// bare letter pairs. Covers XK (Kosovo) and TW (Taiwan).
export function flagUrl(code: string): string {
  return `https://cdn.jsdelivr.net/gh/hatscripts/circle-flags/flags/${code.toLowerCase()}.svg`
}
