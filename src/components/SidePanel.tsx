import { useMemo } from 'react'
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

  if (!country) return null

  // First word of country name for natural phrasing ("See what France loves")
  const shortName = country.name.split(' ')[0]

  return (
    <div className="absolute top-0 right-0 h-full w-[340px] flex flex-col bg-[#0b0a08]/96 backdrop-blur-sm border-l border-[#1c1a15]">

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-5 right-6 text-[#3a3830] hover:text-[#7a7468] transition-colors text-xl leading-none"
        aria-label="Close panel"
      >
        ×
      </button>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 pt-10 pb-4" style={{ scrollbarWidth: 'none' }}>

        {/* Country name */}
        <h2 className="text-[2.4rem] font-bold tracking-tight leading-none text-[#f0e8d4]">
          {country.name}
        </h2>

        {/* Sub-headline */}
        <p className="mt-3 text-[13px] leading-relaxed text-[#5a5448]">
          {mode === 'loved-by' ? (
            lovedBy.length === 0
              ? 'No mapped countries love this cuisine yet.'
              : <>
                  <span className="text-[#b8a882]">{lovedBy.length}</span>
                  {' '}{lovedBy.length === 1 ? 'country loves' : 'countries love'}{' '}
                  {shortName}'s cuisine
                </>
          ) : (
            <>
              <span className="text-[#b8a882]">{country.loves.length}</span>
              {' '}foreign cuisines on {shortName}'s table
            </>
          )}
        </p>

        {/* Divider */}
        <div className="mt-6 h-px bg-[#1c1a15]" />

        {/* Entries */}
        <ul className="mt-6 space-y-6">
          {mode === 'loved-by'
            ? lovedBy.map(({ id, name, relationship }) => (
                <li key={id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[#d4c9b0] text-[13px] font-medium">{name}</span>
                    {relationship.surprisePick && (
                      <span className="shrink-0 text-[10px] italic text-[#9b6928]/80 tracking-wide">
                        unexpected
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] tracking-wider text-[#4a4840] uppercase">
                    {relationship.exampleDishes.join('  ·  ')}
                  </p>
                </li>
              ))
            : country.loves.map(rel => (
                <li key={rel.cuisineCountryId}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[#d4c9b0] text-[13px] font-medium">{rel.cuisineName}</span>
                    {rel.surprisePick && (
                      <span className="shrink-0 text-[10px] italic text-[#9b6928]/80 tracking-wide">
                        unexpected
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] tracking-wider text-[#4a4840] uppercase">
                    {rel.exampleDishes.join('  ·  ')}
                  </p>
                </li>
              ))
          }
        </ul>
      </div>

      {/* Mode toggle — pinned to bottom */}
      <div className="border-t border-[#1c1a15] px-8 py-5">
        {mode === 'loved-by' ? (
          <button
            onClick={() => onModeChange('loves')}
            className="text-[#4a4438] hover:text-[#9b8a6a] text-[11px] tracking-[0.16em] uppercase transition-colors"
          >
            See what {shortName} loves →
          </button>
        ) : (
          <button
            onClick={() => onModeChange('loved-by')}
            className="text-[#4a4438] hover:text-[#9b8a6a] text-[11px] tracking-[0.16em] uppercase transition-colors"
          >
            ← Who loves {shortName}?
          </button>
        )}
      </div>
    </div>
  )
}
