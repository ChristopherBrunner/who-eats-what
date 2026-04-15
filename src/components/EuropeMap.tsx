import { useState, useMemo } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import type { Country, ViewMode } from '../types'
import rawData from '../data/cuisines.json'

const countriesData = rawData as { countries: Record<string, Country> }

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// ISO 3166-1 numeric → our country slug
const NUMERIC_TO_ID: Record<string, string> = {
  '40':  'austria',
  '56':  'belgium',
  '203': 'czechia',
  '208': 'denmark',
  '250': 'france',
  '276': 'germany',
  '300': 'greece',
  '380': 'italy',
  '528': 'netherlands',
  '578': 'norway',
  '616': 'poland',
  '620': 'portugal',
  '724': 'spain',
  '752': 'sweden',
  '756': 'switzerland',
  '826': 'uk',
}

interface Props {
  selectedCountry: string | null
  mode: ViewMode
  onCountryClick: (countryId: string) => void
}

export function EuropeMap({ selectedCountry, mode, onCountryClick }: Props) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const highlightedCountries = useMemo(() => {
    if (!selectedCountry) return new Set<string>()

    if (mode === 'loved-by') {
      return new Set(
        Object.entries(countriesData.countries)
          .filter(([id, c]) =>
            id !== selectedCountry &&
            c.loves.some(l => l.cuisineCountryId === selectedCountry)
          )
          .map(([id]) => id)
      )
    }

    const selected = countriesData.countries[selectedCountry]
    if (!selected) return new Set<string>()
    return new Set(
      selected.loves
        .map(l => l.cuisineCountryId)
        .filter(id => id in countriesData.countries && id !== selectedCountry)
    )
  }, [selectedCountry, mode])

  const getFill = (countryId: string | undefined, isHovered: boolean): string => {
    if (!countryId) {
      return '#0f0e0b'
    }
    if (countryId === selectedCountry) {
      return '#c4802e'
    }
    if (highlightedCountries.has(countryId)) {
      return isHovered ? '#7a3b1c' : '#653216'
    }
    // When a selection is active, dim unrelated mapped countries
    if (selectedCountry) {
      return isHovered ? '#201d16' : '#161410'
    }
    return isHovered ? '#252119' : '#1b1914'
  }

  const getStroke = (countryId: string | undefined): string => {
    if (countryId === selectedCountry) return '#c4802e'
    if (countryId && highlightedCountries.has(countryId)) return '#7a3b1c'
    return '#201e18'
  }

  const getStrokeWidth = (countryId: string | undefined): number => {
    if (countryId === selectedCountry) return 1.5
    if (countryId && highlightedCountries.has(countryId)) return 0.8
    return 0.4
  }

  return (
    <div className="w-full h-full">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 680, center: [13, 53] }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => {
              const countryId = NUMERIC_TO_ID[String(geo.id)]
              const isInteractive = Boolean(countryId)
              const isHovered = countryId === hoveredCountry
              const fill = getFill(countryId, isHovered)
              const stroke = getStroke(countryId)
              const strokeWidth = getStrokeWidth(countryId)

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  style={{
                    default: {
                      outline: 'none',
                      cursor: isInteractive ? 'pointer' : 'default',
                      transition: 'fill 180ms ease',
                    },
                    hover: {
                      outline: 'none',
                      cursor: isInteractive ? 'pointer' : 'default',
                      fill,
                    },
                    pressed: { outline: 'none' },
                  }}
                  onMouseEnter={(e: React.MouseEvent) => {
                    if (isInteractive) {
                      setHoveredCountry(countryId)
                      setTooltipPos({ x: e.clientX, y: e.clientY })
                    }
                  }}
                  onMouseLeave={() => setHoveredCountry(null)}
                  onMouseMove={(e: React.MouseEvent) => {
                    if (isInteractive) setTooltipPos({ x: e.clientX, y: e.clientY })
                  }}
                  onClick={() => isInteractive && onCountryClick(countryId)}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Floating country label — no box, just text */}
      {hoveredCountry && hoveredCountry !== selectedCountry && (
        <div
          className="pointer-events-none fixed z-50"
          style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 8 }}
        >
          <span className="text-[11px] font-medium tracking-[0.18em] uppercase text-stone-400">
            {countriesData.countries[hoveredCountry]?.name}
          </span>
        </div>
      )}
    </div>
  )
}
