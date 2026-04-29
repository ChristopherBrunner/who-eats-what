import { useState, useEffect, useRef } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import type { Country, ViewMode } from '../types'
import { useColorScheme } from '../hooks/useColorScheme'
import { scheduleRevealSounds, primeAudioContext } from '../sounds'
import rawData from '../data/cuisines.json'

const countriesData = rawData as { countries: Record<string, Country> }

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// ISO 3166-1 numeric → our country slug
const NUMERIC_TO_ID: Record<string, string> = {
  // Europe
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
  '643': 'russia',
  '804': 'ukraine',
  '792': 'turkey',
  // Americas
  '840': 'usa',
  '124': 'canada',
  '76':  'brazil',
  '484': 'mexico',
  '32':  'argentina',
  '170': 'colombia',
  '604': 'peru',
  '152': 'chile',
  // Asia
  '392': 'japan',
  '156': 'china',
  '356': 'india',
  '410': 'south-korea',
  '764': 'thailand',
  '704': 'vietnam',
  '360': 'indonesia',
  '608': 'philippines',
  '458': 'malaysia',
  '586': 'pakistan',
  '50':  'bangladesh',
  // Middle East
  '422': 'lebanon',
  '376': 'israel',
  '364': 'iran',
  '682': 'saudi-arabia',
  '784': 'uae',
  '818': 'egypt',
  // Africa
  '504': 'morocco',
  '231': 'ethiopia',
  '566': 'nigeria',
  '710': 'south-africa',
  '404': 'kenya',
  '288': 'ghana',
  '834': 'tanzania',
  '686': 'senegal',
  '12':  'algeria',
  '788': 'tunisia',
  '120': 'cameroon',
  // Oceania
  '36':  'australia',
  '554': 'new-zealand',
  // Europe (additional)
  '191': 'croatia',
  '703': 'slovakia',
  '100': 'bulgaria',
  '688': 'serbia',
  '440': 'lithuania',
  '268': 'georgia',
  // Americas (additional)
  '862': 'venezuela',
  '218': 'ecuador',
  '192': 'cuba',
  '68':  'bolivia',
  // Asia (additional)
  '702': 'singapore',
  '104': 'myanmar',
  '144': 'sri-lanka',
  '524': 'nepal',
  '398': 'kazakhstan',
  '158': 'taiwan',
  '496': 'mongolia',
  '860': 'uzbekistan',
  // Middle East (additional)
  '400': 'jordan',
  '368': 'iraq',
  '634': 'qatar',
  '512': 'oman',
  '414': 'kuwait',
  // Europe (more)
  '428': 'latvia',
  '233': 'estonia',
  // Americas (more)
  '600': 'paraguay',
  '858': 'uruguay',
  '188': 'costa-rica',
  // Southeast Asia (more)
  '116': 'cambodia',
  '418': 'laos',
  // Africa (more)
  '800': 'uganda',
  '716': 'zimbabwe',
  '450': 'madagascar',
  '180': 'drc',
  '434': 'libya',
  '729': 'sudan',
  // Oceania (more)
  '598': 'papua-new-guinea',
  '242': 'fiji',
  // Americas (more)
  '222': 'el-salvador',
  '320': 'guatemala',
  // Middle East (more)
  '887': 'yemen',
  // Europe (more)
  '112': 'belarus',
  '8':   'albania',
  '70':  'bosnia',
  '498': 'moldova',
  '51':  'armenia',
  '31':  'azerbaijan',
  '196': 'cyprus',
  // Caribbean
  '214': 'dominican-republic',
  '388': 'jamaica',
  '780': 'trinidad',
  // Central America (more)
  '340': 'honduras',
  '591': 'panama',
  // Africa (more)
  '384': 'ivory-coast',
  '646': 'rwanda',
  '24':  'angola',
  '508': 'mozambique',
  '516': 'namibia',
  // Europe (even more)
  '352': 'iceland',
  '470': 'malta',
  '705': 'slovenia',
  '807': 'north-macedonia',
  '499': 'montenegro',
  // Central Asia (more)
  '762': 'tajikistan',
  '417': 'kyrgyzstan',
  // Central America (more)
  '558': 'nicaragua',
  // Africa (even more)
  '894': 'zambia',
  '454': 'malawi',
  '72':  'botswana',
  '480': 'mauritius',
  '854': 'burkina-faso',
  '768': 'togo',
  '204': 'benin',
  '178': 'congo-republic',
  '266': 'gabon',
  '232': 'eritrea',
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
    homePulseOn:       '#3d3828',
    homePulseOff:      '#1b1914',
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
    homePulseOn:       '#b8a888',
    homePulseOff:      '#d0c8b8',
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

export function WorldMap({ selectedCountry, homeCountry, mode, onCountryClick }: Props) {
  const colorScheme = useColorScheme()
  const C = MAP_COLORS[colorScheme]

  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [revealedSet, setRevealedSet] = useState<Set<string>>(new Set())

  // AudioContext lives in a ref so it persists across renders.
  // Created lazily on first user click to satisfy browser autoplay policy.
  const audioCtxRef = useRef<AudioContext | null>(null)
  function ensureAudio() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
      primeAudioContext(audioCtxRef.current)
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
    return audioCtxRef.current
  }

  // Timing constants — first reveal always fires at INITIAL_MS regardless of N.
  // Remaining reveals accelerate via sqrt curve from INITIAL_MS → TOTAL_MS.
  const INITIAL_MS = 700
  const TOTAL_MS   = 3000

  useEffect(() => {
    setRevealedSet(new Set())
    if (!selectedCountry) return

    const ordered =
      mode === 'loved-by'
        ? Object.entries(countriesData.countries)
            .filter(([id, c]) => id !== selectedCountry && c.loves.some(l => l.cuisineCountryId === selectedCountry))
            .map(([id]) => id)
        : (countriesData.countries[selectedCountry]?.loves ?? [])
            .map(l => l.cuisineCountryId)
            .filter(id => id in countriesData.countries && id !== selectedCountry)

    // Always schedule sounds (build-up plays even for 0-fan countries).
    const stopSounds = audioCtxRef.current
      ? scheduleRevealSounds(audioCtxRef.current, ordered.length, INITIAL_MS, TOTAL_MS)
      : () => {}

    if (ordered.length === 0) return stopSounds

    const span = TOTAL_MS - INITIAL_MS
    const timeouts = ordered.map((id, i) => {
      const frac  = ordered.length === 1 ? 0 : i / (ordered.length - 1)
      const delay = INITIAL_MS + span * Math.sqrt(frac)
      return setTimeout(() => setRevealedSet(prev => new Set([...prev, id])), delay)
    })

    return () => {
      timeouts.forEach(clearTimeout)
      stopSounds()
    }
  }, [selectedCountry, mode])

  const getFill = (countryId: string | undefined, isHovered: boolean): string => {
    if (!countryId) return C.nonDataset
    if (countryId === selectedCountry) return C.selected
    if (revealedSet.has(countryId)) return isHovered ? C.highlightedHover : C.highlighted
    if (!selectedCountry && countryId === homeCountry) return C.homePulseOff
    if (selectedCountry) return isHovered ? C.countryDimmedHover : C.countryDimmed
    return isHovered ? C.countryHover : C.countryDefault
  }

  const getStroke = (countryId: string | undefined): string => {
    if (countryId === selectedCountry) return C.borderSelected
    if (countryId && revealedSet.has(countryId)) return C.borderHighlighted
    return C.border
  }

  const getStrokeWidth = (countryId: string | undefined): number => {
    if (countryId === selectedCountry) return 1.5
    if (countryId && revealedSet.has(countryId)) return 0.8
    return 0.4
  }

  return (
    <div className="w-full h-full" onClick={() => { if (selectedCountry) onCountryClick(selectedCountry) }}>
      <style>{`
        @keyframes country-breath {
          0%, 100% { fill: ${C.homePulseOff}; }
          50%       { fill: ${C.homePulseOn}; }
        }
      `}</style>
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 160, center: [10, 10] }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => {
              const countryId = NUMERIC_TO_ID[String(geo.id)]
              const isInteractive = Boolean(countryId)
              const isHovered = countryId === hoveredCountry
              const isPulsing = !selectedCountry && countryId === homeCountry
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
                      ...(isPulsing
                        ? { animation: 'country-breath 3s ease-in-out infinite' }
                        : { transition: 'fill 160ms ease' }
                      ),
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
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); if (isInteractive) { ensureAudio(); onCountryClick(countryId) } }}
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
