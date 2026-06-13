import { useMemo, useState } from 'react'
import type { RevealPhase } from '../hooks/useRevealSequence'
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
  revealedSet: Set<string>
  revealedCount: number
  phase: RevealPhase
  onModeChange: (mode: ViewMode) => void
  onSelectCountry: (id: string) => void
  onClose: () => void
}

const REASON_LABEL: Record<string, string> = {
  'migration': 'migration story',
  'colonial': 'colonial legacy',
  'proximity': 'neighbours',
  'trade': 'trade routes',
  'soft-power': 'soft power',
  'tourism': 'tourism',
}

// The country name is the navigation target; the chevron / dishes line
// toggles the expansion area, which is also where the future per-entry
// dish menu (descriptions/photos) will mount.
function EntryRow({ targetId, title, relationship, revealed, expanded, onToggle, onSelectCountry }: {
  targetId: string
  title: string
  relationship: CuisineRelationship
  revealed: boolean
  expanded: boolean
  onToggle: () => void
  onSelectCountry: (id: string) => void
}) {
  const hasDetails = relationship.strength != null || relationship.source != null || relationship.reason != null

  return (
    <li className={`transition-all duration-500 ease-out ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <button
          onClick={() => onSelectCountry(targetId)}
          className="text-[#241e14] dark:text-[#d4c9b0] text-[13px] font-medium hover:text-[#c4802e] dark:hover:text-[#c4802e] transition-colors cursor-pointer text-left"
        >
          {title}
        </button>
        <span className="shrink-0 flex items-baseline gap-2">
          {relationship.surprisePick && (
            <span className="text-[10px] italic text-[#9b6928]/80 tracking-wide">
              unexpected
            </span>
          )}
          {relationship.strength != null && (
            <span className="text-[11px] tabular-nums text-[#8b6830] dark:text-[#b8a882]">
              {relationship.strength}%
            </span>
          )}
          {hasDetails && (
            <button
              onClick={onToggle}
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
              aria-expanded={expanded}
              className={`text-[10px] text-[#9a8e7c] dark:text-[#6a6354] hover:text-[#c4802e] dark:hover:text-[#c4802e] transition-all cursor-pointer ${expanded ? 'rotate-90' : ''}`}
            >
              ▸
            </button>
          )}
        </span>
      </div>
      <p
        onClick={hasDetails ? onToggle : undefined}
        className={`mt-1 text-[11px] tracking-wider text-[#8a7e6e] dark:text-[#4a4840] uppercase ${hasDetails ? 'cursor-pointer' : ''}`}
      >
        {relationship.exampleDishes.join('  ·  ')}
      </p>

      {expanded && hasDetails && (
        // Expansion area — future dish-menu (descriptions/photos) mounts here.
        <div className="mt-2 ml-1 pl-3 border-l-2 border-[#c4802e]/30 space-y-2 animate-expand-in">
          {relationship.strength != null && (
            <div>
              <div className="h-[3px] w-full max-w-[200px] rounded bg-[#d4ccbf] dark:bg-[#1c1a15]">
                <div
                  className="h-full rounded bg-[#c4802e]"
                  style={{ width: `${relationship.strength}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-[#8b6830] dark:text-[#b8a882]">
                {relationship.strength}% of those who tried it like it
              </p>
            </div>
          )}
          {relationship.reason && (
            <span className="inline-block text-[9px] tracking-[0.14em] uppercase px-1.5 py-0.5 rounded border border-[#c4802e]/40 text-[#9b6928] dark:text-[#b8a882]">
              {REASON_LABEL[relationship.reason] ?? relationship.reason}
            </span>
          )}
          {relationship.source && (
            <p className="text-[11px] italic leading-relaxed text-[#7a6e5c] dark:text-[#6a6354]">
              {relationship.source}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

export function SidePanel({ countryId, mode, revealedSet, revealedCount, phase, onModeChange, onSelectCountry, onClose }: Props) {
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
  // Single-expanded accordion; reset whenever the selection or mode changes.
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedFor, setExpandedFor] = useState(`${countryId}/${mode}`)
  if (expandedFor !== `${countryId}/${mode}`) {
    setExpandedFor(`${countryId}/${mode}`)
    setExpandedId(null)
  }
  const toggle = (id: string) => setExpandedId(prev => (prev === id ? null : id))

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

        {/* Sub-headline — counter climbs with the reveal cascade, settles on the ding */}
        <p className="mt-3 text-[13px] leading-relaxed text-[#7a6e5c] dark:text-[#5a5448]">
          {mode === 'loved-by' ? (
            lovedBy.length === 0
              ? 'No mapped countries love this cuisine yet.'
              : <>
                  <span className={`text-[#8b6830] dark:text-[#b8a882] tabular-nums ${phase === 'done' ? 'animate-count-settle' : ''}`}>
                    {Math.min(revealedCount, lovedBy.length)}
                  </span>
                  {' '}{lovedBy.length === 1 ? 'country loves' : 'countries love'}{' '}
                  {shortName}'s cuisine
                </>
          ) : (
            <>
              <span className={`text-[#8b6830] dark:text-[#b8a882] tabular-nums ${phase === 'done' ? 'animate-count-settle' : ''}`}>
                {Math.min(revealedCount, country.loves.length)}
              </span>
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
                <EntryRow
                  key={id}
                  targetId={id}
                  title={name}
                  relationship={relationship}
                  revealed={revealedSet.has(id)}
                  expanded={expandedId === id}
                  onToggle={() => toggle(id)}
                  onSelectCountry={onSelectCountry}
                />
              ))
            : country.loves.map(rel => (
                <EntryRow
                  key={rel.cuisineCountryId}
                  targetId={rel.cuisineCountryId}
                  title={rel.cuisineName}
                  relationship={rel}
                  revealed={revealedSet.has(rel.cuisineCountryId)}
                  expanded={expandedId === rel.cuisineCountryId}
                  onToggle={() => toggle(rel.cuisineCountryId)}
                  onSelectCountry={onSelectCountry}
                />
              ))
          }
        </ul>
      </div>

      {/* Footer — mode toggle + share on same line */}
      <div className="border-t border-[#d4ccbf] dark:border-[#1c1a15] px-8 py-5 flex items-center justify-between">
        {mode === 'loved-by' ? (
          <button
            onClick={() => onModeChange('loves')}
            className={`text-[#7a6e58] dark:text-[#8a8270] hover:text-[#c4802e] dark:hover:text-[#c4802e] text-[11px] tracking-[0.16em] uppercase transition-colors ${phase === 'done' ? 'animate-cta-glow' : ''}`}
          >
            See what {shortName} loves →
          </button>
        ) : (
          <button
            onClick={() => onModeChange('loved-by')}
            className="text-[#7a6e58] dark:text-[#8a8270] hover:text-[#c4802e] dark:hover:text-[#c4802e] text-[11px] tracking-[0.16em] uppercase transition-colors"
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
