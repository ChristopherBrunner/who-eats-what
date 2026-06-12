import { useState, useEffect } from 'react'
import { Routes, Route, useParams, useNavigate } from 'react-router-dom'
import { WorldMap } from './components/EuropeMap'
import { SidePanel } from './components/SidePanel'
import { useRevealSequence } from './hooks/useRevealSequence'
import { installAudioUnlock } from './sounds'
import type { Country, ViewMode } from './types'
import rawData from './data/cuisines.json'

const countriesData = rawData as { countries: Record<string, Country> }

// Map ISO alpha-2 code → our country slug
function getCountryIdFromCode(code: string): string | null {
  const entry = Object.entries(countriesData.countries)
    .find(([, c]) => c.code === code.toUpperCase())
  return entry ? entry[0] : null
}

function MapView({ homeCountry }: { homeCountry: string | null }) {
  const { countryId, mode: modeParam } = useParams()
  const navigate = useNavigate()

  const mode: ViewMode = modeParam === 'loves' ? 'loves' : 'loved-by'

  // Shared reveal sequence: map highlights, panel rows, and sounds all sync.
  const { revealedSet, revealedCount, phase, silent } = useRevealSequence(countryId ?? null, mode)

  const handleCountryClick = (id: string) => {
    if (id === countryId) {
      navigate('/')
    } else {
      navigate(`/${id}/${mode}`)
    }
  }

  const handleModeChange = (newMode: ViewMode) => {
    navigate(`/${countryId}/${newMode}`)
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f0ead8] dark:bg-[#0d0c09]">

      <WorldMap
        selectedCountry={countryId ?? null}
        homeCountry={homeCountry}
        mode={mode}
        revealedSet={revealedSet}
        phase={phase}
        silentReveal={silent}
        onCountryClick={handleCountryClick}
      />

      <div className="absolute top-7 left-8 pointer-events-none select-none">
        <span className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#9a8e78] dark:text-[#6a6354]">
          Who Eats What
        </span>
      </div>

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
            click a country
          </span>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [homeCountry, setHomeCountry] = useState<string | null>(null)

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
      <Route path="/" element={<MapView homeCountry={homeCountry} />} />
      <Route path="/:countryId/:mode" element={<MapView homeCountry={homeCountry} />} />
    </Routes>
  )
}
