import { useMemo, useState } from 'react'
import type { Country, CuisineRelationship, ViewMode } from '../types'
import rawData from '../data/cuisines.json'

const countriesData = rawData as { countries: Record<string, Country> }

interface LovedByEntry {
  id: string
  name: string
  relationship: CuisineRelationship
}

interface Props {
  countryId: string
  mode: ViewMode
  onModeChange: (mode: ViewMode) => void
  onClose: () => void
}

export function SidePanel({ countryId, mode, onModeChange, onClose }: Props) {
  const country = countriesData.countries[countryId]

  const lovedBy: LovedByEntry[] = useMemo(() => {
    if (!country) return []
    return Object.entries(countriesData.countries)
      .filter(([id, c]) =>
        id !== countryId &&
        c.loves.some(l => l.cuisineCountryId === countryId)
      )
      .map(([id, c]) => ({
        id,
        name: c.name,
        relationship: c.loves.find(l => l.cuisineCountryId === countryId)!,
      }))
  }, [countryId, country])

  const [copied, setCopied] = useState(false)
  const [copiedKey, setCopiedKey] = useState(0)

  if (!country) return null

  const shortName = country.name.split(' ')[0]

  const handleShare = () => {
    const url = `${window.location.origin}/${countryId}/${mode}?ref=share`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setCopiedKey(k => k + 1)
      setTimeout(() => setCopied(false), 1000)
    })
  }

  return (
    <div className="absolute top-0 right-0 h-full w-[400px] flex flex-col bg-[#ece4d2]/96 dark:bg-[#0b0a08]/96 backdrop-blur-sm border-l border-[#d4ccbf] dark:border-[#1c1a15]">

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-5 right-6 text-[#b0a898] dark:text-[#3a3830] hover:text-[#6a6050] dark:hover:text-[#7a7468] transition-colors text-xl leading-none"
        aria-label="Close panel"
      >
        ×
      </button>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 pt-10 pb-4" style={{ scrollbarWidth: 'none' }}>

        {/* Country name */}
        <h2 className="text-[2.4rem] font-bold tracking-tight leading-none text-[#1a1610] dark:text-[#f0e8d4]">
          {country.name}
        </h2>

        {/* Sub-headline */}
        <p className="mt-3 text-[13px] leading-relaxed text-[#7a6e5c] dark:text-[#5a5448]">
          {mode === 'loved-by' ? (
            lovedBy.length === 0
              ? 'No mapped countries love this cuisine yet.'
              : <>
                  <span className="text-[#8b6830] dark:text-[#b8a882]">{lovedBy.length}</span>
                  {' '}{lovedBy.length === 1 ? 'country loves' : 'countries love'}{' '}
                  {shortName}'s cuisine
                </>
          ) : (
            <>
              <span className="text-[#8b6830] dark:text-[#b8a882]">{country.loves.length}</span>
              {' '}foreign cuisines on {shortName}'s table
            </>
          )}
        </p>

        {/* Divider */}
        <div className="mt-6 h-px bg-[#d4ccbf] dark:bg-[#1c1a15]" />

        {/* Entries */}
        <ul className="mt-6 space-y-6">
          {mode === 'loved-by'
            ? lovedBy.map(({ id, name, relationship }) => (
                <li key={id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[#241e14] dark:text-[#d4c9b0] text-[13px] font-medium">{name}</span>
                    {relationship.surprisePick && (
                      <span className="shrink-0 text-[10px] italic text-[#9b6928]/80 tracking-wide">
                        unexpected
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] tracking-wider text-[#8a7e6e] dark:text-[#4a4840] uppercase">
                    {relationship.exampleDishes.join('  ·  ')}
                  </p>
                </li>
              ))
            : country.loves.map(rel => (
                <li key={rel.cuisineCountryId}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[#241e14] dark:text-[#d4c9b0] text-[13px] font-medium">{rel.cuisineName}</span>
                    {rel.surprisePick && (
                      <span className="shrink-0 text-[10px] italic text-[#9b6928]/80 tracking-wide">
                        unexpected
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] tracking-wider text-[#8a7e6e] dark:text-[#4a4840] uppercase">
                    {rel.exampleDishes.join('  ·  ')}
                  </p>
                </li>
              ))
          }
        </ul>
      </div>

      {/* Footer — mode toggle + share on same line */}
      <div className="border-t border-[#d4ccbf] dark:border-[#1c1a15] px-8 py-5 flex items-center justify-between">
        {mode === 'loved-by' ? (
          <button
            onClick={() => onModeChange('loves')}
            className="text-[#9a8e7c] dark:text-[#4a4438] hover:text-[#6a5e4a] dark:hover:text-[#9b8a6a] text-[11px] tracking-[0.16em] uppercase transition-colors"
          >
            See what {shortName} loves →
          </button>
        ) : (
          <button
            onClick={() => onModeChange('loved-by')}
            className="text-[#9a8e7c] dark:text-[#4a4438] hover:text-[#6a5e4a] dark:hover:text-[#9b8a6a] text-[11px] tracking-[0.16em] uppercase transition-colors"
          >
            ← Who loves {shortName}?
          </button>
        )}

        <button
          onClick={handleShare}
          className="text-[11px] tracking-[0.16em] uppercase"
          aria-label="Copy link"
        >
          <span className="relative">
            <span className={`transition-opacity duration-200 ${copied ? 'opacity-0' : 'opacity-100'} text-[#9a8e7c] dark:text-[#3a3830] hover:text-[#6a5e4a] dark:hover:text-[#9b8a6a]`}>
              share
            </span>
            {copied && (
              <span key={copiedKey} className="absolute inset-0 animate-copied">
                copied
              </span>
            )}
          </span>
        </button>
      </div>
    </div>
  )
}
