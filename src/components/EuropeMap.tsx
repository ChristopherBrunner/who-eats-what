import { useState, useMemo, useRef, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { geoRobinson } from 'd3-geo-projection'
import type { Country, ViewMode } from '../types'
import { useColorScheme } from '../hooks/useColorScheme'
import { REVEAL_INITIAL_MS, HEART_FLIGHT_MS, SHAPELESS_COUNTRIES, accentIndices, type RevealPhase } from '../hooks/useRevealSequence'
import { ensureAudioReady } from '../sounds'
import { flagUrl } from '../flags'
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
  /** hearts/ripples/bursts — deliberately distinct from the fills */
  effect: string
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
      effect:            '#ffd9a0',
    },
    light: {
      selected:          '#d97f1f',
      highlighted:       '#e39b3d',
      highlightedHover:  '#d98a26',
      strengthWeak:      '#eec89a',
      strengthStrong:    '#b55708',
      borderSelected:    '#c9731a',
      borderHighlighted: '#c07b2e',
      effect:            '#8f4a06',
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
      effect:            '#ffc2d1',
    },
    light: {
      selected:          '#c93b58',
      highlighted:       '#e2849a',
      highlightedHover:  '#d76e87',
      strengthWeak:      '#f0b9c6',
      strengthStrong:    '#a11f3d',
      borderSelected:    '#b52e4a',
      borderHighlighted: '#c25b74',
      effect:            '#8f1f3d',
    },
  },
}

// Both MUST be stable identities: ZoomableGroup's internal effects depend on
// them, and a fresh function per render makes it reset the zoom transform
// after every gesture (snap-back) and shift the initial view.
// The translate crops the viewBox (898×473, see ComposableMap) tight to the
// actual content: leftmost land is the Aleutian tail at x≈46 (old coords),
// rightmost is Samoa's dot at x≈935, so ~41px left / ~21px right / ~22px top
// / ~5px bottom of empty ocean are cut. Don't grow the crop — those extremes
// sit just inside the edges.
const ROBINSON = geoRobinson().rotate([-12, 0]).scale(148).translate([439, 233])
// Allow trackpad pinch (ctrl+wheel) but not double-click zoom (fights selection).
const zoomFilter = ((e: WheelEvent | MouseEvent) =>
  e.type === 'wheel' ? true : e.type !== 'dblclick' && !e.ctrlKey && e.button === 0
) as unknown as (element: SVGElement) => boolean

// 24×24 material heart (same glyph as the mode toggle), centered on (12,12).
const HEART_PATH = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'

// Stable pseudo-random in [0,1) from a string (FNV-1a). Used to jitter each
// heart's size and tilt so a dense stream looks hand-scattered instead of
// cloned — must be deterministic, since Math.random() in render would
// re-roll every frame and make the hearts twitch.
function hashUnit(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 1000) / 1000
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
  /** Countries currently LIT (in loves this is arrival-delayed by App). */
  revealedSet: Set<string>
  /** Countries whose heart has LAUNCHED — drives the particle layer. In
      loved-by identical to revealedSet; in loves it runs one flight ahead. */
  heartSet: Set<string>
  /** Final reveal count — accentIndices() needs the whole sequence length,
      which the growing sets don't give. */
  revealTotal: number
  phase: RevealPhase
  silentReveal: boolean
  /** Country previewed from the search bar — highlighted like a hover. */
  previewCountry: string | null
  onCountryClick: (countryId: string) => void
  /** Click on ocean / non-country background (misclicks land here). */
  onBackgroundClick: () => void
}

export function WorldMap({ selectedCountry, homeCountry, mode, revealedSet, heartSet, revealTotal, phase, silentReveal, previewCountry, onCountryClick, onBackgroundClick }: Props) {
  const colorScheme = useColorScheme()
  const C = { ...BASE_COLORS[colorScheme], ...MODE_ACCENTS[mode][colorScheme] }

  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  // Zoom factor — marker dot radii divide by it so they keep a constant
  // screen size. Updated live during gestures (rAF-throttled): the per-frame
  // attribute writes force Chrome to re-rasterize the map subtree while
  // zooming, instead of blurrily scaling a cached raster until gesture end.
  const [zoomK, setZoomK] = useState(1)
  const liveZoom = useRef(1)
  const zoomRaf = useRef(0)
  const handleMove = useCallback(({ zoom }: { zoom: number }) => {
    liveZoom.current = zoom
    if (zoomRaf.current) return
    zoomRaf.current = requestAnimationFrame(() => {
      zoomRaf.current = 0
      setZoomK(liveZoom.current)
    })
  }, [])
  // After a zoom gesture Chrome can keep the layer's stale raster until a
  // commit lands OUTSIDE its "user is still interacting" window (any real
  // mousemove did it by accident; a commit at gesture-end is often still
  // inside the window). So bump an invisible fill-opacity toggle at end and
  // again after the window has passed — each bump is a paint invalidation
  // that lets the compositor re-raster at the settled scale.
  const [rasterBump, setRasterBump] = useState(0)
  const bumpTimers = useRef<number[]>([])
  const handleMoveEnd = useCallback(({ zoom }: { zoom: number }) => {
    setZoomK(zoom)
    for (const t of bumpTimers.current) clearTimeout(t)
    setRasterBump(b => b + 1)
    bumpTimers.current = [250, 600].map(ms =>
      window.setTimeout(() => setRasterBump(b => b + 1), ms))
  }, [])

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
  // Reveal-order index (Sets iterate in insertion order) — drives the fast
  // ordered re-flash wave that sweeps the constellation at completion.
  const accents = useMemo(() => accentIndices(revealTotal), [revealTotal])

  const revealOrder = useMemo(() => {
    const m = new Map<string, number>()
    let i = 0
    for (const id of revealedSet) m.set(id, i++)
    return m
  }, [revealedSet])

  const getAnimation = (countryId: string): string | undefined => {
    if (!selectedCountry && countryId === homeCountry) return 'country-breath 3s ease-in-out infinite'
    if (countryId === selectedCountry) {
      if (phase === 'done') return 'selection-finale 750ms ease-out'
      if (silentReveal && phase === 'revealing') return 'selected-halo 1s ease-in-out 3'
      // In loved-by the selection is the receiver: once the first heart lands
      // (first reveal + flight time) it throbs with the incoming stream.
      const throb = mode === 'loved-by'
        ? `, selection-throb 700ms ease-in-out ${REVEAL_INITIAL_MS + HEART_FLIGHT_MS}ms infinite`
        : ''
      return `selected-charge ${REVEAL_INITIAL_MS}ms ease-out${throb}`
    }
    if (revealedSet.has(countryId)) {
      if (phase === 'done') {
        // Quick victory lap: re-flash every country in reveal order while
        // the explosion fires — the whole wave sweeps in ~650ms.
        const n = revealedSet.size
        const idx = revealOrder.get(countryId) ?? 0
        const delay = n > 1 ? Math.round((idx / (n - 1)) * 650) : 0
        return `completion-pulse 450ms ease-in-out ${delay}ms`
      }
      // In loves mode entry into revealedSet is already delayed to the
      // heart's touchdown (App passes the arrival set), so the light-up
      // and the arrival blip fire together, right as the heart lands.
      const arrive = mode === 'loves' ? ', heart-arrive 400ms ease-out' : ''
      return `reveal-pop 350ms ease-out${arrive}`
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
    <div className="w-full h-full" onClick={onBackgroundClick}>
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
        /* Reveal motes: CSS (not SMIL — SMIL clocks run on the document
           timeline, so animations mounted mid-session start pre-expired).
           Each particle sits at its destination and drifts in from --dx/--dy. */
        @keyframes particle-drift {
          0%   { transform: translate(var(--dx), var(--dy)); opacity: 0; }
          12%  { opacity: 0.9; }
          75%  { opacity: 0.9; }
          100% { transform: translate(0, 0); opacity: 0; }
        }
        @keyframes selected-halo {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 0px ${hexToRgba(C.selected, 0)}); }
          50%      { filter: brightness(1.55) drop-shadow(0 0 8px ${hexToRgba(C.selected, 0.9)}); }
        }
        /* Receiver reactions: the selection throbs while hearts stream in
           (loved-by); each loves-target blips as its heart lands (+850ms) */
        @keyframes selection-throb {
          0%, 100% { filter: brightness(1); }
          50%      { filter: brightness(1.15); }
        }
        @keyframes heart-arrive {
          0%   { filter: brightness(1); }
          35%  { filter: brightness(1.55); }
          100% { filter: brightness(1); }
        }
        /* Finale: the selection flashes with a glow while rings burst outward */
        @keyframes selection-finale {
          0%   { filter: brightness(1) drop-shadow(0 0 0px ${hexToRgba(C.effect, 0)}); }
          30%  { filter: brightness(1.75) drop-shadow(0 0 16px ${hexToRgba(C.effect, 0.95)}); }
          100% { filter: brightness(1) drop-shadow(0 0 0px ${hexToRgba(C.effect, 0)}); }
        }
        @keyframes burst-ring {
          from { transform: scale(0.15); opacity: 0.95; }
          to   { transform: scale(3.4); opacity: 0; }
        }
        /* Ripple where a heart lands — runs on its own element with the
           flight time as delay, so it fires even after the reveal finishes
           (the country's own animation slot gets replaced at completion) */
        @keyframes arrival-ripple {
          0%   { transform: scale(0.2); opacity: 0; }
          20%  { opacity: 0.75; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        /* Finale spray: little hearts shoot outward from the selection */
        @keyframes burst-heart {
          0%   { transform: translate(0px, 0px) scale(0.4); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translate(var(--bx), var(--by)) scale(1); opacity: 0; }
        }
        /* The explosion resolves into an expanding heart outline: swells,
           holds its shape briefly, then dissolves */
        @keyframes burst-heart-ring {
          0%   { transform: scale(0.2); opacity: 0; }
          22%  { opacity: 0.95; }
          70%  { transform: scale(2.4); opacity: 0.8; }
          100% { transform: scale(3.0); opacity: 0; }
        }
      `}</style>
      <ComposableMap
        width={898}
        height={473}
        // Robinson reads much less vertically squashed than Equal Earth
        // (South America / Australia kept their familiar proportions).
        // A projection function bypasses projectionConfig, so scale/rotate are
        // baked into ROBINSON. @types/react-simple-maps mistypes the function
        // form; runtime accepts any d3 GeoProjection as-is.
        projection={ROBINSON as unknown as string}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <ZoomableGroup
          minZoom={1}
          maxZoom={8}
          translateExtent={[[0, 0], [898, 473]]}
          filterZoomEvent={zoomFilter}
          onMove={handleMove}
          onMoveEnd={handleMoveEnd}
        >
        {/* Event surface for the letterboxed margins outside the viewBox,
            which are otherwise dead for drag/zoom gestures. d3-zoom's extent
            comes from the svg viewBox, so an oversized rect is harmless. */}
        <rect x={-2000} y={-2000} width={4960} height={4500} fill="transparent" style={{ pointerEvents: 'all' }} />
        <g fillOpacity={rasterBump % 2 ? 0.99995 : 1}>
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

        {/* Direction particles: as each country reveals, a mote drifts along
            the line between it and the selection — inward in loved-by
            (affection arriving), outward in loves (appetite reaching out).
            SMIL starts on mount, so each particle fires exactly once when its
            country enters revealedSet; keys reset the layer per selection. */}
        {selectedCountry && phase !== 'idle' && (() => {
          const selPt = centroids[selectedCountry] && ROBINSON(centroids[selectedCountry])
          if (!selPt) return null
          return [...heartSet].map((id, idx) => {
            const pt = centroids[id] && ROBINSON(centroids[id])
            if (!pt || id === selectedCountry) return null
            const [from, to] = mode === 'loved-by' ? [pt, selPt] : [selPt, pt]
            // Ripple only where arrivals are far enough apart to read as
            // separate events — the same set that decides which landings
            // get a tick, so the two never disagree.
            const ripple = accents.has(idx)
            return (
              <g key={`particle-${selectedCountry}-${mode}-${id}`} style={{ pointerEvents: 'none' }}>
                {/* drift animates translate on the <g>; the heart keeps its
                    own static position/scale transform (zoom-compensated) */}
                <g
                  opacity="0"
                  style={{
                    '--dx': `${from[0] - to[0]}px`,
                    '--dy': `${from[1] - to[1]}px`,
                    animation: `particle-drift ${HEART_FLIGHT_MS}ms cubic-bezier(0.4, 0, 0.6, 1) forwards`,
                  } as React.CSSProperties}
                >
                  <path
                    d={HEART_PATH}
                    fill={C.effect}
                    stroke={colorScheme === 'dark' ? 'rgba(15, 12, 8, 0.5)' : 'rgba(255, 252, 244, 0.65)'}
                    strokeWidth={2}
                    // rotate() sits after the -12,-12 recentre, so each heart
                    // tilts about its own middle rather than swinging.
                    transform={
                      `translate(${to[0]} ${to[1]})` +
                      ` scale(${(0.25 * (0.82 + hashUnit(id) * 0.36)) / zoomK})` +
                      ` rotate(${(hashUnit(`${id}#tilt`) * 2 - 1) * 20})` +
                      ` translate(-12 -12)`
                    }
                  />
                </g>
                {/* landing ripple at the destination, delayed by flight time */}
                {ripple && (
                  <g transform={`translate(${to[0]} ${to[1]})`}>
                    <circle
                      r={4 / zoomK}
                      fill="none"
                      stroke={C.effect}
                      strokeWidth={1 / zoomK}
                      opacity="0"
                      style={{
                        transformOrigin: '0 0',
                        animation: `arrival-ripple 500ms ease-out ${HEART_FLIGHT_MS - 70}ms forwards`,
                      }}
                    />
                  </g>
                )}
              </g>
            )
          })
        })()}

        {/* Finale burst: a ring wave + a spray of little hearts shooting
            outward from the selection, synced with the ding + flash */}
        {selectedCountry && phase === 'done' && (() => {
          const selPt = centroids[selectedCountry] && ROBINSON(centroids[selectedCountry])
          if (!selPt) return null
          const R = 26 / zoomK
          return (
            <g transform={`translate(${selPt[0]} ${selPt[1]})`} style={{ pointerEvents: 'none' }}>
              {/* opening circle wave... */}
              <circle
                r={14 / zoomK}
                fill="none"
                stroke={C.effect}
                strokeWidth={1.8 / zoomK}
                opacity="0"
                style={{
                  transformOrigin: '0 0',
                  animation: 'burst-ring 950ms cubic-bezier(0.2, 0.6, 0.4, 1) forwards',
                }}
              />
              {/* ...resolving into an expanding heart outline */}
              <g
                opacity="0"
                style={{
                  transformOrigin: '0 0',
                  animation: 'burst-heart-ring 1150ms cubic-bezier(0.2, 0.6, 0.35, 1) 280ms forwards',
                }}
              >
                <path
                  d={HEART_PATH}
                  fill="none"
                  stroke={C.effect}
                  strokeWidth={1.6}
                  transform={`scale(${0.55 / zoomK}) translate(-12 -12)`}
                  style={{ vectorEffect: 'non-scaling-stroke' }}
                />
              </g>
              {Array.from({ length: 8 }, (_, i) => {
                // jittered octagon: alternating radius + small stagger reads
                // organic rather than mechanical
                const ang = (i / 8) * Math.PI * 2 - Math.PI / 2 + (i % 2 ? 0.22 : 0)
                const r = R * (i % 2 ? 0.78 : 1)
                return (
                  <g
                    key={i}
                    opacity="0"
                    style={{
                      '--bx': `${Math.cos(ang) * r}px`,
                      '--by': `${Math.sin(ang) * r}px`,
                      animation: `burst-heart 850ms cubic-bezier(0.15, 0.6, 0.4, 1) ${i % 3 * 70}ms forwards`,
                    } as React.CSSProperties}
                  >
                    <path
                      d={HEART_PATH}
                      fill={C.effect}
                      stroke={colorScheme === 'dark' ? 'rgba(15, 12, 8, 0.5)' : 'rgba(255, 252, 244, 0.65)'}
                      strokeWidth={2}
                      transform={`scale(${(i % 2 ? 0.16 : 0.21) / zoomK}) translate(-12 -12)`}
                    />
                  </g>
                )
              })}
            </g>
          )
        })()}
        </g>
        </ZoomableGroup>
      </ComposableMap>

      {hoveredCountry && hoveredCountry !== selectedCountry && (
        <div
          className="pointer-events-none fixed z-50"
          style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 8 }}
        >
          {/* glass chip keeps the label readable over amber/rose fills */}
          <span
            className="flex items-center gap-1.5 px-2 py-1 rounded-md backdrop-blur-sm text-[11px] font-medium tracking-[0.18em] uppercase whitespace-nowrap"
            style={colorScheme === 'dark'
              ? { background: 'rgba(13, 12, 9, 0.78)', color: '#e6dfd0' }
              : { background: 'rgba(250, 246, 236, 0.85)', color: '#4a4236' }}
          >
            {countriesData.countries[hoveredCountry] && (
              <img
                src={flagUrl(countriesData.countries[hoveredCountry].code)}
                alt=""
                draggable={false}
                className="w-3.5 h-3.5 rounded-full"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
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
