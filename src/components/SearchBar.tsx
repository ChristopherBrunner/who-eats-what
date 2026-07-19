import { useEffect, useMemo, useRef, useState } from 'react'
import type { Country } from '../types'
import rawData from '../data/cuisines.json'

const countriesData = rawData as { countries: Record<string, Country> }

const ALL_COUNTRIES = Object.entries(countriesData.countries)
  .map(([id, c]) => ({ id, name: c.name }))
  .sort((a, b) => a.name.localeCompare(b.name))

const MAX_RESULTS = 8

interface Props {
  onSelect: (countryId: string) => void
  /** Fires with the keyboard/mouse-highlighted result so the map can preview it; null when the list closes. */
  onHighlight: (countryId: string | null) => void
}

/**
 * Floating glass search bar pinned to the top of the map. Every country in
 * the dataset is reachable here — including the 28 micro/island states that
 * only appear as small dot markers on the map.
 */
export function SearchBar({ onSelect, onHighlight }: Props) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    // Prefix matches rank above substring matches.
    const starts = ALL_COUNTRIES.filter(c => c.name.toLowerCase().startsWith(q))
    const contains = ALL_COUNTRIES.filter(
      c => !c.name.toLowerCase().startsWith(q) && c.name.toLowerCase().includes(q),
    )
    return [...starts, ...contains].slice(0, MAX_RESULTS)
  }, [query])

  const open = focused && results.length > 0
  const clampedIndex = Math.min(activeIndex, results.length - 1)

  useEffect(() => {
    onHighlight(open ? results[clampedIndex]?.id ?? null : null)
  }, [open, clampedIndex, results, onHighlight])

  const choose = (id: string) => {
    setQuery('')
    setActiveIndex(0)
    inputRef.current?.blur()
    onSelect(id)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && open) {
      e.preventDefault()
      choose(results[clampedIndex].id)
    } else if (e.key === 'Escape') {
      setQuery('')
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative w-72">
      <div
        className="flex items-center gap-2.5 rounded-full px-4 py-2.5
          bg-white/55 dark:bg-white/[0.06]
          backdrop-blur-xl backdrop-saturate-150
          border border-white/60 dark:border-white/10
          shadow-lg shadow-black/[0.07] dark:shadow-black/40
          transition-colors focus-within:bg-white/75 dark:focus-within:bg-white/[0.09]"
      >
        <svg
          className="w-3.5 h-3.5 shrink-0 text-[#9a8e78] dark:text-[#6a6354]"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.2" y2="16.2" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Find a country"
          aria-label="Find a country"
          spellCheck={false}
          autoComplete="off"
          className="w-full bg-transparent outline-none text-[13px] tracking-wide
            text-[#3d372c] dark:text-[#d6d0c4]
            placeholder:text-[#9a8e78] dark:placeholder:text-[#6a6354]"
          onChange={e => { setQuery(e.target.value); setActiveIndex(0) }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {open && (
        <ul
          className="mt-2 overflow-hidden rounded-2xl py-1.5
            bg-white/65 dark:bg-[#171510]/80
            backdrop-blur-xl backdrop-saturate-150
            border border-white/60 dark:border-white/10
            shadow-xl shadow-black/[0.08] dark:shadow-black/50"
        >
          {results.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                className={`w-full px-4 py-2 text-left text-[13px] tracking-wide transition-colors
                  ${i === clampedIndex
                    ? 'bg-[#c4802e]/15 text-[#7a4a12] dark:bg-[#c4802e]/20 dark:text-[#e0b070]'
                    : 'text-[#3d372c] dark:text-[#d6d0c4]'}`}
                // mousedown fires before the input's blur closes the list
                onMouseDown={e => { e.preventDefault(); choose(c.id) }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
