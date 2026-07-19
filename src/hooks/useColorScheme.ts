import { useSyncExternalStore } from 'react'

export type ColorScheme = 'light' | 'dark'

// Manual override, persisted; null means "follow the system preference".
const STORAGE_KEY = 'color-scheme'

const media = window.matchMedia('(prefers-color-scheme: dark)')

let override: ColorScheme | null = (() => {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'light' || v === 'dark' ? v : null
})()

const listeners = new Set<() => void>()

function effectiveScheme(): ColorScheme {
  return override ?? (media.matches ? 'dark' : 'light')
}

// Tailwind's dark: variant is class-based (see @custom-variant in index.css),
// so the effective scheme must be mirrored onto <html>.
function syncRootClass() {
  document.documentElement.classList.toggle('dark', effectiveScheme() === 'dark')
}
syncRootClass()

media.addEventListener('change', () => {
  if (override) return
  syncRootClass()
  listeners.forEach(l => l())
})

export function toggleColorScheme() {
  override = effectiveScheme() === 'dark' ? 'light' : 'dark'
  // Toggling back to what the system prefers resumes following the system.
  if (override === (media.matches ? 'dark' : 'light')) {
    override = null
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, override)
  }
  syncRootClass()
  listeners.forEach(l => l())
}

export function useColorScheme(): ColorScheme {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    effectiveScheme,
  )
}
