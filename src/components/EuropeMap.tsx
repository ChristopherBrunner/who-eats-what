import { useState, useMemo } from 'react'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { geoRobinson } from 'd3-geo-projection'
import type { Country, ViewMode } from '../types'
import { useColorScheme } from '../hooks/useColorScheme'
import { REVEAL_INITIAL_MS, SHAPELESS_COUNTRIES, type RevealPhase } from '../hooks/useRevealSequence'
import { ensureAudioReady } from '../sounds'
import rawData from '../data/cuisines.json'
import rawCentroids from '../data/centroids.json'

const countriesData = rawData as { countries: Record<string, Country> }
const centroids = rawCentroids as unknown as Record<string, [number, number]>

// Micro/island states with no polygon in the 110m TopoJSON, drawn as
// clickable dot markers at their centroids instead.
const MARKER_IDS = [...SHAPELESS_COUNTRIES].filter(id => centroids[id])

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
  // SHAPELESS_COUNTRIES); they render as centroid dot markers.
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
  // Micro/island states — no shape in the 110m TopoJSON; drawn as centroid
  // dot markers (see SHAPELESS_COUNTRIES in useRevealSequence)
  '20':  'andorra',
  '492': 'monaco',
  '438': 'liechtenstein',
  '674': 'san-marino',
  '48':  'bahrain',
  '462': 'maldives',
  '174': 'comoros',
  '690': 'seychelles',
  '678': 'sao-tome',
  '52':  'barbados',
  '662': 'saint-lucia',
  '308': 'grenada',
  '28':  'antigua',
  '212': 'dominica',
  '659': 'saint-kitts',
  '670': 'saint-vincent',
  '776': 'tonga',
  '296': 'kiribati',
  '583': 'micronesia',
  '585': 'palau',
  '584': 'marshall-islands',
  '520': 'nauru',
  '798': 'tuvalu',
}

// A few world-atlas geometries carry no numeric id (Natural Earth leaves
// Kosovo, N. Cyprus and Somaliland id-less). Match the ones we have data for
// by their geometry name instead.
const NAME_TO_ID: Record<string, string> = {
  'Kosovo': 'kosovo',
}

// TopoJSON geometry IDs are zero-padded ('040'), NUMERIC_TO_ID keys are not.
export function countryIdFromGeoId(geoId: unknown): string | undefined {
  return NUMERIC_TO_ID[String(Number(geoId))]
}

// Resolve a geometry to a data slug: numeric id first, then name fallback.
export function countryIdFromGeo(geo: { id?: unknown; properties?: { name?: string } }): string | undefined {
  const byId = countryIdFromGeoId(geo.id)
  if (byId) return byId
  const name = geo.properties?.name
  return name ? NAME_TO_ID[name] : undefined
}

// Scheme-dependent base colors, shared by both view modes.
const BASE_COLORS = {
  dark: {
    nonDataset:        '#0f0e0b',
    countryDefault:    '#1b1914',
    countryHover:      '#252119',
    countryDimmed:     '#161410',
    countryDimmedHover:'#201d16',
    homePulseOn:       '#5a4c2a',
    homePulseOff:      '#1b1914',
    border:            '#312d23',
    tooltip:           '#a8a29e',
  },
  light: {
    nonDataset:        '#e4ddd0',
    countryDefault:    '#d0c8b8',
    countryHover:      '#c8c0b0',
    countryDimmed:     '#dbd4c8',
    countryDimmedHover:'#d0c9bc',
    homePulseOn:       '#c4a36a',
    homePulseOff:      '#d0c8b8',
    border:            '#a49b88',
    tooltip:           '#6a6054',
  },
}

// Accent palette per view mode: amber for "who loves X" (the default view,
// incoming affection), rose for "what X loves" (outgoing appetite). The two
// hues are the strongest mode signal in the whole UI — keep them distinct.
// strengthWeak/strengthStrong are the gradient endpoints for survey-backed
// relationships.
const MODE_ACCENTS: Record<ViewMode, Record<'dark' | 'light', {
  selected: string
  highlighted: string
  highlightedHover: string
  strengthWeak: string
  strengthStrong: string
  borderSelected: string
  borderHighlighted: string
}>> = {
  'loved-by': {
    dark: {
      selected:          '#c4802e',
      highlighted:       '#653216',
      highlightedHover:  '#7a3b1c',
      strengthWeak:      '#42200d',
      strengthStrong:    '#a85419',
      borderSelected:    '#c4802e',
      borderHighlighted: '#7a3b1c',
    },
    light: {
      selected:          '#d97f1f',
      highlighted:       '#e39b3d',
      highlightedHover:  '#d98a26',
      strengthWeak:      '#eec89a',
      strengthStrong:    '#b55708',
      borderSelected:    '#c9731a',
      borderHighlighted: '#c07b2e',
    },
  },
  'loves': {
    dark: {
      selected:          '#cf4d68',
      highlighted:       '#5c2130',
      highlightedHover:  '#70283c',
      strengthWeak:      '#38141e',
      strengthStrong:    '#b03a55',
      borderSelected:    '#cf4d68',
      borderHighlighted: '#70283c',
    },
    light: {
      selected:          '#c93b58',
      highlighted:       '#e2849a',
      highlightedHover:  '#d76e87',
      strengthWeak:      '#f0b9c6',
      strengthStrong:    '#a11f3d',
      borderSelected:    '#b52e4a',
      borderHighlighted: '#c25b74',
    },
  },
}

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha})`
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
  silentReveal: boolean
  /** Country previewed from the search bar — highlighted like a hover. */
  previewCountry: string | null
  onCountryClick: (countryId: string) => void
}

export function WorldMap({ selectedCountry, homeCountry, mode, revealedSet, phase, silentReveal, previewCountry, onCountryClick }: Props) {
  const colorScheme = useColorScheme()
  const C = { ...BASE_COLORS[colorScheme], ...MODE_ACCENTS[mode][colorScheme] }

  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  // Settled zoom factor — marker dot radii divide by it so they keep a
  // constant screen size (updated on gesture end, not per frame).
  const [zoomK, setZoomK] = useState(1)

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

  // One-shot animations per sound act, shared by polygons and dot markers.
  // Values stay constant for the element's lifetime in each state, so
  // re-renders don't restart them; the reveal-pop → completion-pulse swap
  // restarts on purpose.
  const getAnimation = (countryId: string): string | undefined => {
    if (!selectedCountry && countryId === homeCountry) return 'country-breath 3s ease-in-out infinite'
    if (countryId === selectedCountry) {
      return silentReveal && phase === 'revealing'
        ? 'selected-halo 1s ease-in-out 3'
        : `selected-charge ${REVEAL_INITIAL_MS}ms ease-out`
    }
    if (revealedSet.has(countryId)) {
      return phase === 'done'
        ? 'completion-pulse 500ms ease-in-out'
        : 'reveal-pop 350ms ease-out'
    }
    return undefined
  }

  // Uninvolved countries sink slowly into the dimmed state during the
  // build-up; reveals keep snapping in fast.
  const getTransition = (countryId: string): string =>
    selectedCountry && countryId !== selectedCountry && !revealedSet.has(countryId)
      ? 'fill 600ms ease'
      : 'fill 160ms ease'

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
        /* Silent reveals (direct links, audio locked): the linked country
           wears a blinking accent halo as a visual fanfare instead of sound */
        @keyframes selected-halo {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 0px ${hexToRgba(C.selected, 0)}); }
          50%      { filter: brightness(1.55) drop-shadow(0 0 8px ${hexToRgba(C.selected, 0.9)}); }
        }
      `}</style>
      <ComposableMap
        width={960}
        height={500}
        // Robinson reads much less vertically squashed than Equal Earth
        // (South America / Australia kept their familiar proportions).
        // A projection function bypasses projectionConfig, so scale/center
        // are baked in here; rotate lon by -12° ≈ old center [10, 10].
        // @types/react-simple-maps mistypes the function form; runtime accepts
        // any d3 GeoProjection as-is.
        projection={geoRobinson().rotate([-12, 0]).scale(172).translate([480, 265]) as unknown as string}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <ZoomableGroup
          minZoom={1}
          maxZoom={8}
          translateExtent={[[0, 0], [960, 500]]}
          // Runtime receives the raw event despite the typings; allow trackpad
          // pinch (ctrl+wheel) but not double-click zoom (it fights selection).
          filterZoomEvent={((e: WheelEvent | MouseEvent) =>
            e.type === 'wheel' ? true : e.type !== 'dblclick' && !e.ctrlKey && e.button === 0
          ) as unknown as (element: SVGElement) => boolean}
          onMoveEnd={({ zoom }) => setZoomK(zoom)}
        >
        {/* Oversized event surface: ZoomableGroup's own rect only spans the
            viewBox, leaving letterboxed margins dead for drag/zoom gestures */}
        <rect x={-4000} y={-4000} width={8960} height={8500} fill="transparent" style={{ pointerEvents: 'all' }} />
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => {
              const countryId = countryIdFromGeo(geo)
              const isInteractive = Boolean(countryId)
              const isHovered = countryId != null && (countryId === hoveredCountry || countryId === previewCountry)
              const fill = getFill(countryId, isHovered)
              const stroke = getStroke(countryId)
              const strokeWidth = getStrokeWidth(countryId)
              const animation = countryId ? getAnimation(countryId) : undefined
              const transition = countryId ? getTransition(countryId) : 'fill 160ms ease'

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
                      vectorEffect: 'non-scaling-stroke',
                      transition,
                      ...(animation ? { animation } : {}),
                    },
                    hover: {
                      outline: 'none',
                      cursor: isInteractive ? 'pointer' : 'default',
                      vectorEffect: 'non-scaling-stroke',
                      fill,
                    },
                    pressed: { outline: 'none', vectorEffect: 'non-scaling-stroke' },
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

        {/* Micro/island states without a 110m polygon: clickable centroid dots */}
        {MARKER_IDS.map(id => {
          const isHovered = id === hoveredCountry || id === previewCountry
          const isActive = id === selectedCountry || revealedSet.has(id)
          const animation = getAnimation(id)
          // Divide by the zoom factor so dots keep a constant screen size.
          const r = ((isActive ? 3 : 2.2) + (isHovered ? 0.6 : 0)) / zoomK
          return (
            <Marker key={id} coordinates={centroids[id]}>
              <g
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e: React.MouseEvent) => {
                  setHoveredCountry(id)
                  setTooltipPos({ x: e.clientX, y: e.clientY })
                }}
                onMouseLeave={() => setHoveredCountry(null)}
                onMouseMove={(e: React.MouseEvent) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); ensureAudioReady(); onCountryClick(id) }}
              >
                {/* slightly padded invisible hit area — the visible dot is tiny */}
                <circle r={4 / zoomK} fill="transparent" />
                <circle
                  r={r}
                  fill={getFill(id, isHovered)}
                  stroke={getStroke(id)}
                  strokeWidth={getStrokeWidth(id) + 0.2}
                  style={{
                    vectorEffect: 'non-scaling-stroke',
                    transition: `${getTransition(id)}, r 160ms ease`,
                    ...(animation ? { animation } : {}),
                  }}
                />
              </g>
            </Marker>
          )
        })}
        </ZoomableGroup>
      </ComposableMap>

      {hoveredCountry && hoveredCountry !== selectedCountry && (
        <div
          className="pointer-events-none fixed z-50"
          style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 8 }}
        >
          {/* glass chip keeps the label readable over amber/rose fills */}
          <span
            className="inline-block px-2 py-1 rounded-md backdrop-blur-sm text-[11px] font-medium tracking-[0.18em] uppercase whitespace-nowrap"
            style={colorScheme === 'dark'
              ? { background: 'rgba(13, 12, 9, 0.78)', color: '#e6dfd0' }
              : { background: 'rgba(250, 246, 236, 0.85)', color: '#4a4236' }}
          >
            {countriesData.countries[hoveredCountry]?.name}
            {revealedSet.has(hoveredCountry) && (
              <> · {mode === 'loved-by' ? 'loves it' : 'on the menu'}</>
            )}
            {revealedSet.has(hoveredCountry) && strengthById.get(hoveredCountry) != null && (
              <> · {strengthById.get(hoveredCountry)}%</>
            )}
          </span>
        </div>
      )}
    </div>
  )
}
