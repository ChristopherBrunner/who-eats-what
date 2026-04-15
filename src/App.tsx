import { useState } from 'react'
import { EuropeMap } from './components/EuropeMap'
import { SidePanel } from './components/SidePanel'
import type { ViewMode } from './types'

export default function App() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [mode, setMode] = useState<ViewMode>('loved-by')

  const handleCountryClick = (countryId: string) => {
    if (countryId === selectedCountry) {
      setSelectedCountry(null)
    } else {
      setSelectedCountry(countryId)
      // Mode persists across country clicks (per design spec)
    }
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0d0c09]">

      {/* Map — fills entire viewport */}
      <EuropeMap
        selectedCountry={selectedCountry}
        mode={mode}
        onCountryClick={handleCountryClick}
      />

      {/* Wordmark — top left, minimal */}
      <div className="absolute top-7 left-8 pointer-events-none select-none">
        <span className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#2e2c26]">
          Who Eats What
        </span>
      </div>

      {/* Side panel */}
      {selectedCountry && (
        <SidePanel
          countryId={selectedCountry}
          mode={mode}
          onModeChange={setMode}
          onClose={() => setSelectedCountry(null)}
        />
      )}

      {/* Idle hint — disappears once anything is selected */}
      {!selectedCountry && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none select-none">
          <span className="text-[10px] tracking-[0.28em] uppercase text-[#2a2822]">
            click a country
          </span>
        </div>
      )}
    </div>
  )
}
