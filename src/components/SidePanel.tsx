import { useMemo, useState } from 'react'
import type { RevealPhase } from '../hooks/useRevealSequence'
import type { Country, CuisineRelationship, ViewMode } from '../types'
import { lovesModeUsed, markLovesModeUsed } from '../modeDiscovery'
import { flagUrl } from '../flags'
import rawData from '../data/cuisines.json'

const countriesData = rawData as { countries: Record<string, Country> }

interface LovedByEntry {
  id: string
  name: string
  relationship: CuisineRelationship
}

interface Props {
  countryId: string | null
  homeCountry: string | null
  mode: ViewMode
  revealedSet: Set<string>
  revealedCount: number
  phase: RevealPhase
  onModeChange: (mode: ViewMode) => void
  /** Navigates in the CURRENT mode, like every other entry point (map,
      search, dice). Rows used to force loved-by, which made the visible
      toggle spring back on its own. */
  onSelectCountry: (id: string) => void
  onClose: () => void
}

// Live reveal counter: glows in the accent and pops on every increment,
// harder as the cascade accelerates toward the end of the list.
function RevealCounter({ value, total, phase }: { value: number; total: number; phase: RevealPhase }) {
  const frac = total > 0 ? value / total : 0
  return (
    <span
      key={value}
      className={`inline-block font-semibold tabular-nums text-[var(--accent)] ${
        phase === 'done' ? 'animate-count-settle' : value > 0 ? 'animate-count-pop' : ''}`}
      style={{
        '--pop-scale': (1.15 + 0.6 * frac).toFixed(2),
        textShadow: `0 0 ${Math.round(3 + 12 * frac)}px var(--accent-40)`,
      } as React.CSSProperties}
    >
      {value}
    </span>
  )
}

// Idle-state quick starts (home country is prepended when known).
const QUICK_STARTS = ['italy', 'japan', 'mexico']
const TOTAL_COUNTRIES = Object.keys(countriesData.countries).length
const TOTAL_LOVES = Object.values(countriesData.countries)
  .reduce((n, c) => n + c.loves.length, 0)

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
          className="flex items-center gap-2.5 text-[#241e14] dark:text-[#d4c9b0] text-[14px] font-medium hover:text-[var(--accent)] dark:hover:text-[var(--accent)] transition-colors cursor-pointer text-left"
        >
          {countriesData.countries[targetId] && (
            <img
              src={flagUrl(countriesData.countries[targetId].code)}
              alt=""
              loading="lazy"
              draggable={false}
              className="w-5 h-5 rounded-full shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
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
              className={`flex items-center justify-center w-6 h-6 rounded-full border transition-all cursor-pointer shrink-0
                ${expanded
                  ? 'rotate-90 border-[var(--accent-40)] text-[var(--accent)] bg-[var(--accent-30)]/20'
                  : 'border-[#c9c1b2] dark:border-[#2e2b22] text-[#8a7e6c] dark:text-[#7a7260] hover:border-[var(--accent-40)] hover:text-[var(--accent)]'}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="w-3 h-3">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          )}
        </span>
      </div>
      {/* dishes line is display-only for now — dishes become their own
          clickable entities (dish detail view) later; expansion is the
          chevron's job */}
      <p className="mt-1 text-[11px] tracking-wider text-[#8a7e6e] dark:text-[#4a4840] uppercase">
        {relationship.exampleDishes.join('  ·  ')}
      </p>

      {expanded && hasDetails && (
        // Expansion area — future dish-menu (descriptions/photos) mounts here.
        <div className="mt-2 ml-1 pl-3 border-l-2 border-[var(--accent-30)] space-y-2 animate-expand-in">
          {relationship.strength != null && (
            <div>
              <div className="h-[3px] w-full max-w-[200px] rounded bg-[#d4ccbf] dark:bg-[#1c1a15]">
                <div
                  className="h-full rounded bg-[var(--accent)]"
                  style={{ width: `${relationship.strength}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-[#8b6830] dark:text-[#b8a882]">
                {relationship.strength}% of those who tried it like it
              </p>
            </div>
          )}
          {relationship.reason && (
            <span className="inline-block text-[9px] tracking-[0.14em] uppercase px-1.5 py-0.5 rounded border border-[var(--accent-40)] text-[#9b6928] dark:text-[#b8a882]">
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

export function SidePanel({ countryId, homeCountry, mode, revealedSet, revealedCount, phase, onModeChange, onSelectCountry, onClose }: Props) {
  const country = countryId ? countriesData.countries[countryId] : null

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
  // The "see what X loves" CTA pulses until the user flips the view once.
  const [lovesUsed, setLovesUsed] = useState(lovesModeUsed)
  // Single-expanded accordion; reset whenever the selection or mode changes.
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedFor, setExpandedFor] = useState(`${countryId}/${mode}`)
  if (expandedFor !== `${countryId}/${mode}`) {
    setExpandedFor(`${countryId}/${mode}`)
    setExpandedId(null)
  }
  const toggle = (id: string) => setExpandedId(prev => (prev === id ? null : id))

  // The rail is permanent — idle state fills it with quick starts instead
  // of unmounting (the map area never resizes either way).
  if (!country) {
    const picks = homeCountry && !QUICK_STARTS.includes(homeCountry)
      ? [homeCountry, ...QUICK_STARTS.slice(0, 2)]
      : QUICK_STARTS
    const surprise = () => {
      const ids = Object.keys(countriesData.countries)
      onSelectCountry(ids[Math.floor(Math.random() * ids.length)])
    }
    return (
      <div className="absolute top-0 right-0 h-full w-[360px] flex flex-col justify-center px-6 bg-[#ece4d2]/96 dark:bg-[#0b0a08]/96 backdrop-blur-sm border-l border-[#d4ccbf] dark:border-[#1c1a15]">
        <p className="text-[10px] tracking-[0.25em] uppercase text-[#9a8e7c] dark:text-[#5a5448]">
          {TOTAL_COUNTRIES} countries · {TOTAL_LOVES.toLocaleString('en-US')} food crushes
        </p>
        <h2 className="mt-3 text-[1.7rem] font-bold tracking-tight leading-snug text-[#1a1610] dark:text-[#f0e8d4]">
          Every cuisine is somebody's favorite.
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-[#7a6e5c] dark:text-[#5a5448]">
          {mode === 'loved-by'
            ? 'Click any country to see who loves its food. Or start with'
            : "Click any country to see what's on its table. Or start with"}
        </p>
        <ul className="mt-6 space-y-4">
          {picks.map(id => {
            const c = countriesData.countries[id]
            if (!c) return null
            return (
              <li key={id}>
                <button
                  onClick={() => onSelectCountry(id)}
                  className="flex items-center gap-3 text-[17px] font-medium text-[#241e14] dark:text-[#d4c9b0] hover:text-[var(--accent)] dark:hover:text-[var(--accent)] transition-colors cursor-pointer"
                >
                  <img
                    src={flagUrl(c.code)}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    className="w-7 h-7 rounded-full shrink-0"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  {c.name}
                  {id === homeCountry && (
                    <span className="text-[11px] italic text-[#9b6928]/80 tracking-wide">home turf</span>
                  )}
                </button>
              </li>
            )
          })}
          <li>
            <button
              onClick={surprise}
              className="flex items-center gap-3 text-[17px] italic text-[#8a7e6c] dark:text-[#7a7260] hover:text-[var(--accent)] dark:hover:text-[var(--accent)] transition-colors cursor-pointer"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-[#b0a48e] dark:border-[#4a4638] text-[13px] not-italic shrink-0">
                ?
              </span>
              somewhere unexpected
            </button>
          </li>
        </ul>
      </div>
    )
  }

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
    <div className="absolute top-0 right-0 h-full w-[360px] flex flex-col bg-[#ece4d2]/96 dark:bg-[#0b0a08]/96 backdrop-blur-sm border-l border-[#d4ccbf] dark:border-[#1c1a15]">

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-4 p-2 text-3xl text-[#b0a898] dark:text-[#3a3830] hover:text-[#6a6050] dark:hover:text-[#7a7468] transition-colors leading-none cursor-pointer"
        aria-label="Close panel"
      >
        ×
      </button>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pt-10 pb-4" style={{ scrollbarWidth: 'none' }}>

        {/* Country name */}
        <h2 className="flex items-center gap-3 text-[2.4rem] font-bold tracking-tight leading-none text-[#1a1610] dark:text-[#f0e8d4]">
          <img
            src={flagUrl(country.code)}
            alt=""
            draggable={false}
            className="w-9 h-9 rounded-full shrink-0 shadow-sm"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <span className="min-w-0">{country.name}</span>
        </h2>

        {/* Sub-headline — counter climbs with the reveal cascade, settles on the ding */}
        <p className="mt-3 text-[13px] leading-relaxed text-[#7a6e5c] dark:text-[#5a5448]">
          {mode === 'loved-by' ? (
            lovedBy.length === 0
              ? 'No mapped countries love this cuisine yet.'
              : <>
                  <RevealCounter value={Math.min(revealedCount, lovedBy.length)} total={lovedBy.length} phase={phase} />
                  {' '}{lovedBy.length === 1 ? 'country loves' : 'countries love'}{' '}
                  {shortName}'s cuisine
                </>
          ) : (
            <>
              <RevealCounter value={Math.min(revealedCount, country.loves.length)} total={country.loves.length} phase={phase} />
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
      <div className="border-t border-[#d4ccbf] dark:border-[#1c1a15] px-6 py-5 flex items-center justify-between">
        {mode === 'loved-by' ? (
          <button
            onClick={() => { markLovesModeUsed(); setLovesUsed(true); onModeChange('loves') }}
            className={`text-[11px] tracking-[0.16em] uppercase transition-colors cursor-pointer
              hover:text-[var(--accent)] dark:hover:text-[var(--accent)]
              ${phase === 'done' && !lovesUsed
                ? 'text-[var(--accent)] animate-cta-pulse'
                : 'text-[#7a6e58] dark:text-[#8a8270]'}`}
          >
            See what {shortName} loves →
          </button>
        ) : (
          <button
            onClick={() => onModeChange('loved-by')}
            className="text-[#7a6e58] dark:text-[#8a8270] hover:text-[var(--accent)] dark:hover:text-[var(--accent)] text-[11px] tracking-[0.16em] uppercase transition-colors cursor-pointer"
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
