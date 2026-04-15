import { useState, useEffect } from 'react'
import { Routes, Route, useParams, useNavigate } from 'react-router-dom'
import { EuropeMap } from './components/EuropeMap'
import { SidePanel } from './components/SidePanel'
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

      <EuropeMap
        selectedCountry={countryId ?? null}
        homeCountry={homeCountry}
        mode={mode}
        onCountryClick={handleCountryClick}
      />

      <div className="absolute top-7 left-8 pointer-events-none select-none">
        <span className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#c0b8a8] dark:text-[#2e2c26]">
          Who Eats What
        </span>
      </div>

      {countryId && (
        <SidePanel
          countryId={countryId}
          mode={mode}
          onModeChange={handleModeChange}
          onClose={() => navigate('/')}
        />
      )}

      {!countryId && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none select-none">
          <span className="text-[10px] tracking-[0.28em] uppercase text-[#c8c0b0] dark:text-[#2a2822]">
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
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        const id = getCountryIdFromCode(data.country_code ?? '')
        if (id) setHomeCountry(id)
      })
      .catch(() => {/* silently fail — geolocation is best-effort */})
  }, [])

  return (
    <Routes>
      <Route path="/" element={<MapView homeCountry={homeCountry} />} />
      <Route path="/:countryId/:mode" element={<MapView homeCountry={homeCountry} />} />
    </Routes>
  )
}
