import { useState, useMemo, useEffect } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import type { Country, ViewMode } from '../types'
import { useColorScheme } from '../hooks/useColorScheme'
import rawData from '../data/cuisines.json'

const countriesData = rawData as { countries: Record<string, Country> }

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// ISO 3166-1 numeric → our country slug
const NUMERIC_TO_ID: Record<string, string> = {
  '40':  'austria',
  '56':  'belgium',
  '203': 'czechia',
  '208': 'denmark',
  '246': 'finland',
  '250': 'france',
  '276': 'germany',
  '300': 'greece',
  '348': 'hungary',
  '372': 'ireland',
  '380': 'italy',
  '528': 'netherlands',
  '578': 'norway',
  '616': 'poland',
  '620': 'portugal',
  '642': 'romania',
  '724': 'spain',
  '752': 'sweden',
  '756': 'switzerland',
  '826': 'uk',
}

const MAP_COLORS = {
  dark: {
    nonDataset:        '#0f0e0b',
    countryDefault:    '#1b1914',
    countryHover:      '#252119',
    countryDimmed:     '#161410',
    countryDimmedHover:'#201d16',
    selected:          '#c4802e',
    highlighted:       '#653216',
    highlightedHover:  '#7a3b1c',
    homePulseOn:       '#2e2a1f',
    homePulseOff:      '#1e1c15',
    border:            '#201e18',
    borderSelected:    '#c4802e',
    borderHighlighted: '#7a3b1c',
    tooltip:           '#a8a29e',
  },
  light: {
    nonDataset:        '#e4ddd0',
    countryDefault:    '#d0c8b8',
    countryHover:      '#c8c0b0',
    countryDimmed:     '#dbd4c8',
    countryDimmedHover:'#d0c9bc',
    selected:          '#c4802e',
    highlighted:       '#b86c3a',
    highlightedHover:  '#a85e2e',
    homePulseOn:       '#c0b8a8',
    homePulseOff:      '#cacab4',
    border:            '#bab3a5',
    borderSelected:    '#c4802e',
    borderHighlighted: '#a85e2e',
    tooltip:           '#6a6054',
  },
}

interface Props {
  selectedCountry: string | null
  homeCountry: string | null
  mode: ViewMode
  onCountryClick: (countryId: string) => void
}

export function EuropeMap({ selectedCountry, homeCountry, mode, onCountryClick }: Props) {
  const colorScheme = useColorScheme()
  const C = MAP_COLORS[colorScheme]

  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [pulseOn, setPulseOn] = useState(true)

  useEffect(() => {
    if (!homeCountry || selectedCountry) return
    const interval = setInterval(() => setPulseOn(p => !p), 900)
    return () => clearInterval(interval)
  }, [homeCountry, selectedCountry])

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
    if (!countryId) return C.nonDataset
    if (countryId === selectedCountry) return C.selected
    if (highlightedCountries.has(countryId)) return isHovered ? C.highlightedHover : C.highlighted
    if (!selectedCountry && countryId === homeCountry) {
      return pulseOn ? C.homePulseOn : C.homePulseOff
    }
    if (selectedCountry) return isHovered ? C.countryDimmedHover : C.countryDimmed
    return isHovered ? C.countryHover : C.countryDefault
  }

  const getStroke = (countryId: string | undefined): string => {
    if (countryId === selectedCountry) return C.borderSelected
    if (countryId && highlightedCountries.has(countryId)) return C.borderHighlighted
    return C.border
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

      {hoveredCountry && hoveredCountry !== selectedCountry && (
        <div
          className="pointer-events-none fixed z-50"
          style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 8 }}
        >
          <span
            className="text-[11px] font-medium tracking-[0.18em] uppercase"
            style={{ color: C.tooltip }}
          >
            {countriesData.countries[hoveredCountry]?.name}
          </span>
        </div>
      )}
    </div>
  )
}
