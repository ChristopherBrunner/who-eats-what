// Tracks whether the user has ever flipped to the "what X loves" view.
// Until then, both the panel CTA and the top mode toggle pulse for attention.
const KEY = 'loves-mode-used'

export function lovesModeUsed(): boolean {
  return localStorage.getItem(KEY) === '1'
}

export function markLovesModeUsed(): void {
  localStorage.setItem(KEY, '1')
}
