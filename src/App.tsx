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

// Accent-colored die (5 face) between search bar and mode toggle: rolls a
// random country in the current mode. Wobbles idly, spins on click.
function DiceButton({ onRoll }: { onRoll: () => void }) {
  const [rollKey, setRollKey] = useState(0)
  return (
    <button
      type="button"
      aria-label="Random country"
      title="Roll a random country"
      onClick={() => { setRollKey(k => k + 1); onRoll() }}
      className="flex items-center justify-center w-11 h-11 rounded-full shrink-0
        bg-white/55 dark:bg-white/[0.06] backdrop-blur-xl backdrop-saturate-150
        border border-white/60 dark:border-white/10
        shadow-lg shadow-black/[0.07] dark:shadow-black/40
        transition-colors hover:bg-white/75 dark:hover:bg-white/[0.09] cursor-pointer"
    >
      <svg
        key={rollKey}
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="w-5 h-5 text-[var(--accent)] transition-colors duration-500"
        style={{ animation: rollKey ? 'dice-roll 600ms ease-out' : 'dice-wobble 5s ease-in-out infinite' }}
        onAnimationEnd={() => setRollKey(0)}
      >
        <rect x="3" y="3" width="18" height="18" rx="4.5" fill="currentColor" />
        {[[7.6, 7.6], [16.4, 7.6], [12, 12], [7.6, 16.4], [16.4, 16.4]].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.7" className="fill-[#f5efe0] dark:fill-[#151310]" />
        ))}
      </svg>
    </button>
  )
}

// Light mode paints the vignette with DEEPENED accents: the mix % is already
// maxed out, so extra presence has to come from darker pigment (the amber
// especially washed out against the parchment).
function vignetteColor(m: ViewMode, scheme: 'light' | 'dark'): string {
  if (scheme === 'dark') return ACCENT_UI[m][scheme]
  return m === 'loved-by' ? '#94500c' : '#9c2240'
}

// Inner-vignette paint for a mode accent. Eased multi-stop radial gradient,
// NOT box-shadow: shadow blur quantizes into visible rings on dark, and
// two-stop gradients show Mach bands — many stops on an easing curve
// interpolate smoothly. Light needs a stronger mix against the parchment.
// NOTE: the 115% size puts the container corner at only ~61% of the gradient
// radius — the strong end of the ramp is offscreen by design, so the visible
// corner tint is roughly max × 0.14. The max values are user-calibrated
// against that geometry; don't "fix" the sizing without retuning them.
function vignetteBackground(c: string, scheme: 'light' | 'dark'): string {
  const max = scheme === 'light' ? 100 : 45
  const stop = (t: number, at: number) =>
    `color-mix(in srgb, ${c} ${Math.round(max * t * 100) / 100}%, transparent) ${at}%`
  return `radial-gradient(115% 115% at 50% 50%, transparent 34%, ${[
    stop(0.03, 47), stop(0.1, 58), stop(0.22, 68), stop(0.4, 77),
    stop(0.63, 86), stop(0.85, 94), stop(1, 100),
  ].join(', ')})`
}

// Explainer under the wordmark: the pill button morphs into the window
// itself; any click outside (the ocean, other controls) closes it.
function HowItWorks({ open, onOpen, onClose }: { open: boolean; onOpen: () => void; onClose: () => void }) {
  return (
    <div className="absolute top-[4.2rem] left-8 z-40 w-72" onClick={e => e.stopPropagation()}>
      {!open ? (
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={false}
          className="px-3 py-1.5 rounded-full text-[10px] font-medium tracking-[0.18em] uppercase cursor-pointer
            bg-white/55 dark:bg-white/[0.06] backdrop-blur-xl backdrop-saturate-150
            border border-white/60 dark:border-white/10
            shadow-md shadow-black/[0.06] dark:shadow-black/40
            text-[#8a7e68] dark:text-[#7a7260] hover:text-[#5a5040] dark:hover:text-[#a89e8a] transition-colors"
        >
          ? how it works
        </button>
      ) : (
        <div className="relative rounded-2xl p-4 pr-8 space-y-2.5 text-[12px] leading-relaxed animate-expand-in
          bg-white/65 dark:bg-[#171510]/85 backdrop-blur-xl backdrop-saturate-150
          border border-white/60 dark:border-white/10
          shadow-xl shadow-black/[0.08] dark:shadow-black/50
          text-[#4a4236] dark:text-[#c2bbaa]"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2.5 right-3.5 text-base leading-none cursor-pointer
              text-[#b0a898] dark:text-[#5a5548] hover:text-[#6a6050] dark:hover:text-[#a89e8a] transition-colors"
          >
            ×
          </button>
          <p>
            <strong className="text-[#b5691a] dark:text-[#c4802e]">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="inline-block w-3 h-3 mr-1 align-[-1px]">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              Loved by
            </strong> — click any country to watch everyone who loves its cuisine light up, near to far.
          </p>
          <p>
            <strong className="text-[#b02747] dark:text-[#cf4d68]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="inline-block w-3 h-3 mr-1 align-[-1px]">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                <path d="M7 2v20" />
                <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
              </svg>
              Loves
            </strong> — flip the toggle to see what that country loves eating from elsewhere instead.
          </p>
          <p><strong>Deeper color = stronger love.</strong> Percentages are the share of people who like that cuisine (YouGov survey where available).</p>
          <p><em>unexpected</em> tags each country's one surprise pick; expand a row for the story and source.</p>
          <p>Tiny dots are micro states. They're clickable too. Scroll to zoom, drag to pan, or find anywhere with the search bar.</p>
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
  const { revealedSet, arrivedSet, arrivedCount, phase, silent } = useRevealSequence(countryId ?? null, mode)
  // Map: in loves a country lights when its heart LANDS; in loved-by it
  // lights at launch, because the light-up is what sends the heart.
  const litSet = mode === 'loves' ? arrivedSet : revealedSet
  // Panel: always arrival-driven, in both modes. The rows and the counter
  // then land on the same frame as the arrival tick and the selection's
  // throb, instead of running a flight time ahead of their own sound.

  // Country highlighted in the search dropdown, previewed on the map.
  const [previewCountry, setPreviewCountry] = useState<string | null>(null)
  // How-it-works window; closes on any click outside it (ocean included).
  const [helpOpen, setHelpOpen] = useState(false)

  // Escape backs out: help window first, then the selected country.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.target instanceof HTMLInputElement) return
      setHelpOpen(open => {
        if (!open && countryId) navigate('/')
        return false
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [countryId, navigate])

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
      onClick={() => setHelpOpen(false)}
    >

      {/* The right rail is PERMANENT: the map area never resizes, so
          selecting/deselecting a country can't shift targets under the
          cursor. Flush against the 360px panel (a gap read as a seam). */}
      <div className="absolute inset-y-0 left-0 right-[360px]">
        <WorldMap
          selectedCountry={countryId ?? null}
          homeCountry={homeCountry}
          mode={mode}
          revealedSet={litSet}
          heartSet={revealedSet}
          phase={phase}
          silentReveal={silent}
          previewCountry={previewCountry}
          onCountryClick={handleCountryClick}
          onBackgroundClick={() => {
            if (countryId) navigate('/')
          }}
        />

      {/* per-mode inner vignettes (amber for loved-by, rose for loves) —
          INSIDE the map area so they never run under the side panel (their
          corners banded through the panel edges). Two stacked layers that
          cross-fade: only opacity animates, because transitioning the paint
          itself made Chrome re-layerize at the transition's end, flickering
          the glow. */}
      {(['loved-by', 'loves'] as ViewMode[]).map(m => (
        <div
          key={m}
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-700"
          style={{
            opacity: mode === m ? 1 : 0,
            background: vignetteBackground(vignetteColor(m, scheme), scheme),
          }}
        />
      ))}
      {/* one-shot glow riding the finale: the same vignette, swelling and
          falling once as the burst fires. Keyed per selection so it re-fires
          on every reveal rather than only the first. */}
      {phase === 'done' && countryId && (
        <div
          key={`finale-${countryId}-${mode}`}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: 0,
            background: vignetteBackground(vignetteColor(mode, scheme), scheme),
            animation: 'finale-glow 950ms ease-out',
          }}
        />
      )}
      {/* grain sibling (NOT nested: a fading parent isolates blending, which
          made the overlay blend shift as the fade finished — the old snap) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: scheme === 'light' ? 0.07 : 0.11,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='128' height='128' filter='url(%23n)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
          maskImage: 'radial-gradient(ellipse at center, transparent 40%, black 90%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, transparent 40%, black 90%)',
        }}
      />
      </div>

      {/* wordmark: quiet caps on the baseline of a big glowing serif-italic
          "eats" in the live mode accent, a tiny heart beating off the final s */}
      <div className="absolute top-5 left-8 pointer-events-none select-none flex items-baseline gap-2">
        <span className="text-[12px] font-semibold tracking-[0.3em] uppercase text-[#7a6e5a] dark:text-[#8a8270]">
          who
        </span>
        <span
          className="relative text-[30px] leading-none italic font-bold text-[var(--accent)] transition-colors duration-500"
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            textShadow: '0 0 18px var(--accent-30)',
          }}
        >
          eats
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className="absolute -top-1 -right-2 w-2.5 h-2.5 animate-heart-beat"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </span>
        <span className="text-[12px] font-semibold tracking-[0.3em] uppercase text-[#7a6e5a] dark:text-[#8a8270]">
          what
        </span>
      </div>

      {/* centered over the MAP AREA (screen minus the 360px right rail) */}
      <div className="absolute top-6 left-[calc((100%-360px)/2)] -translate-x-1/2 z-40 flex items-start gap-3">
        <SearchBar
          onSelect={(id) => { ensureAudioReady(); navigate(`/${id}/${mode}`) }}
          onHighlight={setPreviewCountry}
        />
        <DiceButton onRoll={() => {
          ensureAudioReady()
          const ids = Object.keys(countriesData.countries).filter(id => id !== countryId)
          navigate(`/${ids[Math.floor(Math.random() * ids.length)]}/${mode}`)
        }} />
        <ModeToggle mode={mode} onChange={(m) => { ensureAudioReady(); handleModeChange(m) }} />
      </div>

      <HowItWorks open={helpOpen} onOpen={() => setHelpOpen(true)} onClose={() => setHelpOpen(false)} />

      <ThemeToggle />

      <SidePanel
        countryId={countryId ?? null}
        homeCountry={homeCountry}
        mode={mode}
        revealedSet={arrivedSet}
        revealedCount={arrivedCount}
        phase={phase}
        onModeChange={handleModeChange}
        onSelectCountry={(id) => { ensureAudioReady(); navigate(`/${id}/${mode}`) }}
        onClose={() => navigate('/')}
      />

      {!countryId && (
        <div className="absolute bottom-8 left-[calc((100%-360px)/2)] -translate-x-1/2 pointer-events-none select-none">
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
