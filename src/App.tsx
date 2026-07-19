import { useState, useEffect } from 'react'
import { Routes, Route, useParams, useNavigate } from 'react-router-dom'
import { WorldMap } from './components/EuropeMap'
import { SidePanel } from './components/SidePanel'
import { SearchBar } from './components/SearchBar'
import { ModeToggle } from './components/ModeToggle'
import { useRevealSequence } from './hooks/useRevealSequence'
import { toggleColorScheme, useColorScheme } from './hooks/useColorScheme'
import { ensureAudioReady, installAudioUnlock } from './sounds'
import type { Country, ViewMode } from './types'
import rawData from './data/cuisines.json'

const countriesData = rawData as { countries: Record<string, Country> }

// Map ISO alpha-2 code → our country slug
function getCountryIdFromCode(code: string): string | null {
  const entry = Object.entries(countriesData.countries)
    .find(([, c]) => c.code === code.toUpperCase())
  return entry ? entry[0] : null
}

// Glass sun/moon button; overrides the system scheme (persisted, see useColorScheme).
function ThemeToggle() {
  const scheme = useColorScheme()
  return (
    <button
      type="button"
      aria-label={scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleColorScheme}
      className="absolute bottom-6 left-6 z-40 flex items-center justify-center w-10 h-10 rounded-full
        bg-white/55 dark:bg-white/[0.06]
        backdrop-blur-xl backdrop-saturate-150
        border border-white/60 dark:border-white/10
        shadow-lg shadow-black/[0.07] dark:shadow-black/40
        text-[#6a6054] dark:text-[#a8a29e]
        transition-colors hover:bg-white/75 dark:hover:bg-white/[0.09] cursor-pointer"
    >
      {scheme === 'dark' ? (
        // sun
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
        </svg>
      ) : (
        // moon
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
        </svg>
      )}
    </button>
  )
}

// UI accent per mode+scheme — matches the map's MODE_ACCENTS and drives the
// --accent CSS vars used by the side panel and shared keyframes.
const ACCENT_UI: Record<ViewMode, Record<'light' | 'dark', string>> = {
  'loved-by': { light: '#b5691a', dark: '#c4802e' },
  'loves':    { light: '#b02747', dark: '#cf4d68' },
}

// Collapsible explainer under the wordmark.
function HowItWorks() {
  const [open, setOpen] = useState(false)
  return (
    <div className="absolute top-14 left-8 z-40 w-72">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="px-3 py-1.5 rounded-full text-[10px] font-medium tracking-[0.18em] uppercase cursor-pointer
          bg-white/55 dark:bg-white/[0.06] backdrop-blur-xl backdrop-saturate-150
          border border-white/60 dark:border-white/10
          shadow-md shadow-black/[0.06] dark:shadow-black/40
          text-[#8a7e68] dark:text-[#7a7260] hover:text-[#5a5040] dark:hover:text-[#a89e8a] transition-colors"
      >
        {open ? '× close' : '? how it works'}
      </button>
      {open && (
        <div className="mt-2 rounded-2xl p-4 space-y-2.5 text-[12px] leading-relaxed
          bg-white/65 dark:bg-[#171510]/85 backdrop-blur-xl backdrop-saturate-150
          border border-white/60 dark:border-white/10
          shadow-xl shadow-black/[0.08] dark:shadow-black/50
          text-[#4a4236] dark:text-[#c2bbaa]"
        >
          <p><strong className="text-[#b5691a] dark:text-[#c4802e]">♥ Loved by</strong> — click any country to watch everyone who loves its cuisine light up, near to far.</p>
          <p><strong className="text-[#b02747] dark:text-[#cf4d68]">⑂ Loves</strong> — flip the toggle to see what that country loves eating from elsewhere instead.</p>
          <p><strong>Deeper color = stronger love.</strong> Percentages are the share of people who like that cuisine (YouGov survey where available).</p>
          <p><em>unexpected</em> tags each country's one surprise pick; expand a row for the story and source.</p>
          <p>Tiny dots are micro-states — they're clickable too. Scroll to zoom, drag to pan, or find anywhere with the search bar.</p>
        </div>
      )}
    </div>
  )
}

function MapView({ homeCountry, idleMode, onIdleModeChange }: {
  homeCountry: string | null
  idleMode: ViewMode
  onIdleModeChange: (mode: ViewMode) => void
}) {
  const { countryId, mode: modeParam } = useParams()
  const navigate = useNavigate()

  // URL wins when a country is selected; the idle default (set via the top
  // toggle, kept in App so it survives route changes) applies otherwise.
  const mode: ViewMode = modeParam === 'loves' ? 'loves'
    : modeParam === 'loved-by' ? 'loved-by'
    : idleMode

  // Shared reveal sequence: map highlights, panel rows, and sounds all sync.
  const { revealedSet, revealedCount, phase, silent } = useRevealSequence(countryId ?? null, mode)

  // Country highlighted in the search dropdown, previewed on the map.
  const [previewCountry, setPreviewCountry] = useState<string | null>(null)

  const handleCountryClick = (id: string) => {
    if (id === countryId) {
      navigate('/')
    } else {
      navigate(`/${id}/${mode}`)
    }
  }

  const handleModeChange = (newMode: ViewMode) => {
    onIdleModeChange(newMode)
    if (countryId) navigate(`/${countryId}/${newMode}`)
  }

  const scheme = useColorScheme()
  const accent = ACCENT_UI[mode][scheme]
  const accentVars = {
    '--accent': accent,
    '--accent-30': `color-mix(in srgb, ${accent} 30%, transparent)`,
    '--accent-40': `color-mix(in srgb, ${accent} 40%, transparent)`,
  } as React.CSSProperties

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#f0ead8] dark:bg-[#0d0c09]"
      style={accentVars}
    >

      <WorldMap
        selectedCountry={countryId ?? null}
        homeCountry={homeCountry}
        mode={mode}
        revealedSet={revealedSet}
        phase={phase}
        silentReveal={silent}
        previewCountry={previewCountry}
        onCountryClick={handleCountryClick}
      />

      {/* rose inner vignette signals the flipped "what X loves" view */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-shadow duration-700"
        style={{
          boxShadow: mode === 'loves'
            // light needs a much stronger mix to read against the parchment
            ? `inset 0 0 ${scheme === 'light' ? '180px' : '140px'} color-mix(in srgb, ${accent} ${scheme === 'light' ? '45%' : '24%'}, transparent)`
            : 'inset 0 0 0 0 transparent',
        }}
      />

      <div className="absolute top-7 left-8 pointer-events-none select-none">
        <span className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#9a8e78] dark:text-[#6a6354]">
          Who Eats What
        </span>
      </div>

      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 flex items-start gap-3">
        <SearchBar
          onSelect={(id) => { ensureAudioReady(); navigate(`/${id}/${mode}`) }}
          onHighlight={setPreviewCountry}
        />
        <ModeToggle mode={mode} onChange={(m) => { ensureAudioReady(); handleModeChange(m) }} />
      </div>

      <HowItWorks />

      <ThemeToggle />

      {countryId && (
        <SidePanel
          countryId={countryId}
          mode={mode}
          revealedSet={revealedSet}
          revealedCount={revealedCount}
          phase={phase}
          onModeChange={handleModeChange}
          onSelectCountry={(id) => navigate(`/${id}/loved-by`)}
          onClose={() => navigate('/')}
        />
      )}

      {!countryId && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none select-none">
          <span className="text-[11px] tracking-[0.28em] uppercase text-[#8b7e68] dark:text-[#7a7260] animate-prompt-breathe">
            {mode === 'loved-by'
              ? 'click a country · see who loves its food'
              : 'click a country · see what it loves'}
          </span>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [homeCountry, setHomeCountry] = useState<string | null>(null)
  // Mode used while no country is selected (and for the next selection);
  // lives here so it survives the route switch between '/' and '/:id/:mode'.
  const [idleMode, setIdleMode] = useState<ViewMode>('loved-by')

  useEffect(() => {
    installAudioUnlock()
  }, [])

  useEffect(() => {
    // Best-effort IP geolocation with fallbacks — ipapi.co often 403s.
    let cancelled = false
    const providers: { url: string; pick: (d: Record<string, unknown>) => unknown }[] = [
      { url: 'https://ipwho.is/', pick: d => d.country_code },
      { url: 'https://ipapi.co/json/', pick: d => d.country_code },
      { url: 'https://api.country.is/', pick: d => d.country },
    ]
    ;(async () => {
      for (const p of providers) {
        try {
          const r = await fetch(p.url)
          if (!r.ok) continue
          const code = p.pick(await r.json())
          const id = typeof code === 'string' ? getCountryIdFromCode(code) : null
          if (id && !cancelled) {
            setHomeCountry(id)
            return
          }
        } catch { /* try next provider */ }
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <Routes>
      <Route path="/" element={<MapView homeCountry={homeCountry} idleMode={idleMode} onIdleModeChange={setIdleMode} />} />
      <Route path="/:countryId/:mode" element={<MapView homeCountry={homeCountry} idleMode={idleMode} onIdleModeChange={setIdleMode} />} />
    </Routes>
  )
}
