import { useState, useMemo } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import type { Country, ViewMode } from '../types'
import { useColorScheme } from '../hooks/useColorScheme'
import { REVEAL_INITIAL_MS, type RevealPhase } from '../hooks/useRevealSequence'
import { ensureAudioReady } from '../sounds'
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
  // Note: Cape Verde and Samoa lack shapes in the 110m TopoJSON (see
  // SHAPELESS_COUNTRIES); they stay reachable via URL and side-panel links.
  '132': 'cape-verde',
  '882': 'samoa',
  '740': 'suriname',
  // Full world coverage (sovereign states in the 110m TopoJSON)
  '706': 'somalia',
  '148': 'chad',
  '332': 'haiti',
  '44':  'bahamas',
  '626': 'timor-leste',
  '426': 'lesotho',
  '84':  'belize',
  '328': 'guyana',
  '466': 'mali',
  '478': 'mauritania',
  '562': 'niger',
  '324': 'guinea',
  '624': 'guinea-bissau',
  '430': 'liberia',
  '694': 'sierra-leone',
  '140': 'central-african-republic',
  '226': 'equatorial-guinea',
  '748': 'eswatini',
  '108': 'burundi',
  '275': 'palestine',
  '270': 'gambia',
  '548': 'vanuatu',
  '408': 'north-korea',
  '64':  'bhutan',
  '4':   'afghanistan',
  '795': 'turkmenistan',
  '760': 'syria',
  '442': 'luxembourg',
  '90':  'solomon-islands',
  '96':  'brunei',
  '262': 'djibouti',
  '728': 'south-sudan',
}

// TopoJSON geometry IDs are zero-padded ('040'), NUMERIC_TO_ID keys are not.
export function countryIdFromGeoId(geoId: unknown): string | undefined {
  return NUMERIC_TO_ID[String(Number(geoId))]
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
    // strength gradient endpoints (survey-backed relationships)
    strengthWeak:      '#42200d',
    strengthStrong:    '#a85419',
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
    // strength gradient endpoints (survey-backed relationships)
    strengthWeak:      '#d4a87e',
    strengthStrong:    '#963f12',
    homePulseOn:       '#b8a888',
    homePulseOff:      '#d0c8b8',
    border:            '#bab3a5',
    borderSelected:    '#c4802e',
    borderHighlighted: '#a85e2e',
    tooltip:           '#6a6054',
  },
}

// Linear interpolation between two hex colors, t in [0, 1].
function lerpColor(from: string, to: string, t: number): string {
  const f = parseInt(from.slice(1), 16)
  const g = parseInt(to.slice(1), 16)
  const ch = (shift: number) => {
    const a = (f >> shift) & 0xff
    const b = (g >> shift) & 0xff
    return Math.round(a + (b - a) * t)
  }
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`
}

// Survey strengths worth showing span roughly 50–95%; map onto [0, 1].
function strengthT(strength: number): number {
  return Math.min(1, Math.max(0, (strength - 50) / 45))
}

interface Props {
  selectedCountry: string | null
  homeCountry: string | null
  mode: ViewMode
  revealedSet: Set<string>
  phase: RevealPhase
  onCountryClick: (countryId: string) => void
}

export function WorldMap({ selectedCountry, homeCountry, mode, revealedSet, phase, onCountryClick }: Props) {
  const colorScheme = useColorScheme()
  const C = MAP_COLORS[colorScheme]

  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  // Survey strength of each highlighted country's relationship to the
  // selection, where known — drives the heat gradient.
  const strengthById = useMemo(() => {
    const m = new Map<string, number>()
    if (!selectedCountry) return m
    if (mode === 'loved-by') {
      for (const [id, c] of Object.entries(countriesData.countries)) {
        const rel = c.loves.find(l => l.cuisineCountryId === selectedCountry)
        if (rel?.strength != null) m.set(id, rel.strength)
      }
    } else {
      for (const rel of countriesData.countries[selectedCountry]?.loves ?? []) {
        if (rel.strength != null) m.set(rel.cuisineCountryId, rel.strength)
      }
    }
    return m
  }, [selectedCountry, mode])

  const getFill = (countryId: string | undefined, isHovered: boolean): string => {
    if (!countryId) return C.nonDataset
    if (countryId === selectedCountry) return C.selected
    if (revealedSet.has(countryId)) {
      const strength = strengthById.get(countryId)
      if (strength != null) {
        return lerpColor(C.strengthWeak, C.strengthStrong, strengthT(strength))
      }
      return isHovered ? C.highlightedHover : C.highlighted
    }
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
        /* Act 1: selection charges with the build-up sweep, peaking as it crests */
        @keyframes selected-charge {
          0%   { filter: brightness(0.7); }
          85%  { filter: brightness(1.45); }
          100% { filter: brightness(1); }
        }
        /* Act 2: each reveal flashes bright and settles to its final fill */
        @keyframes reveal-pop {
          0%   { filter: brightness(1.8); }
          100% { filter: brightness(1); }
        }
        /* Act 3: unison settle across the constellation, with the ding */
        @keyframes completion-pulse {
          0%   { filter: brightness(1); }
          35%  { filter: brightness(1.35); }
          100% { filter: brightness(1); }
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
              const countryId = countryIdFromGeoId(geo.id)
              const isInteractive = Boolean(countryId)
              const isHovered = countryId === hoveredCountry
              const isPulsing = !selectedCountry && countryId === homeCountry
              const isSelected = countryId != null && countryId === selectedCountry
              const isRevealed = countryId != null && revealedSet.has(countryId)
              const fill = getFill(countryId, isHovered)
              const stroke = getStroke(countryId)
              const strokeWidth = getStrokeWidth(countryId)

              // One-shot animations per sound act. Values stay constant for the
              // element's lifetime in each state, so re-renders don't restart
              // them; the reveal-pop → completion-pulse swap restarts on purpose.
              let animation: string | undefined
              if (isPulsing) animation = 'country-breath 3s ease-in-out infinite'
              else if (isSelected) animation = `selected-charge ${REVEAL_INITIAL_MS}ms ease-out`
              else if (isRevealed) {
                animation = phase === 'done'
                  ? 'completion-pulse 500ms ease-in-out'
                  : 'reveal-pop 350ms ease-out'
              }

              // Uninvolved countries sink slowly into the dimmed state during
              // the build-up; reveals keep snapping in fast.
              const transition = selectedCountry && !isSelected && !isRevealed
                ? 'fill 600ms ease'
                : 'fill 160ms ease'

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
                      transition,
                      ...(animation ? { animation } : {}),
                    },
                    hover: {
                      outline: 'none',
                      cursor: isInteractive ? 'pointer' : 'default',
                      fill,
                    },
                    pressed: { outline: 'none' },
                  }}
                  onMouseEnter={(e: React.MouseEvent) => {
                    if (countryId) {
                      setHoveredCountry(countryId)
                      setTooltipPos({ x: e.clientX, y: e.clientY })
                    }
                  }}
                  onMouseLeave={() => setHoveredCountry(null)}
                  onMouseMove={(e: React.MouseEvent) => {
                    if (countryId) setTooltipPos({ x: e.clientX, y: e.clientY })
                  }}
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); if (countryId) { ensureAudioReady(); onCountryClick(countryId) } }}
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
            {revealedSet.has(hoveredCountry) && strengthById.get(hoveredCountry) != null && (
              <> · {strengthById.get(hoveredCountry)}%</>
            )}
          </span>
        </div>
      )}
    </div>
  )
}
