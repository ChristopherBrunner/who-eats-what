import { useEffect, useMemo, useState } from 'react'
import { geoDistance } from 'd3-geo'
import type { Country, ViewMode } from '../types'
import { isAudioUnlocked, scheduleRevealSounds } from '../sounds'
import rawData from '../data/cuisines.json'
import rawCentroids from '../data/centroids.json'

const countriesData = rawData as { countries: Record<string, Country> }
const centroids = rawCentroids as unknown as Record<string, [number, number]>

// First reveal always fires at INITIAL_MS regardless of N.
// Remaining reveals accelerate via sqrt curve from INITIAL_MS → TOTAL_MS.
export const REVEAL_INITIAL_MS = 700
export const REVEAL_TOTAL_MS = 3000
// The completion ding fires just after the last tick (see sounds.ts).
const DONE_MS = REVEAL_TOTAL_MS + 40

export type RevealPhase = 'idle' | 'revealing' | 'done'

// Countries in the dataset that have no polygon in the 110m TopoJSON.
// The map draws them as clickable dot markers at their centroids, so they
// participate in the reveal cascade like any other country.
export const SHAPELESS_COUNTRIES = new Set([
  'singapore', 'malta', 'mauritius', 'cape-verde', 'samoa',
  'andorra', 'monaco', 'liechtenstein', 'san-marino', 'bahrain', 'maldives',
  'comoros', 'seychelles', 'sao-tome', 'barbados', 'saint-lucia', 'grenada',
  'antigua', 'dominica', 'saint-kitts', 'saint-vincent', 'tonga', 'kiribati',
  'micronesia', 'palau', 'marshall-islands', 'nauru', 'tuvalu',
])

function revealDelayMs(index: number, count: number): number {
  const frac = count <= 1 ? 0 : index / (count - 1)
  return REVEAL_INITIAL_MS + (REVEAL_TOTAL_MS - REVEAL_INITIAL_MS) * Math.sqrt(frac)
}

/**
 * Drives the staggered country-reveal sequence for a selection, shared by
 * the map and the side panel so both stay in sync with each other and with
 * the scheduled sounds.
 *
 * Reveal order is geographic: nearest countries first, so the highlights
 * expand outward from the selection as a single followable wavefront (and
 * the rising tick pitch maps to distance).
 *
 * Reveals are advanced by a single requestAnimationFrame loop (not one
 * setTimeout per country): multiple reveals landing in the same frame are
 * batched into one state update, so rendering can't fall behind the
 * sample-accurate audio clock on countries with many relationships.
 */
export function useRevealSequence(selectedCountry: string | null, mode: ViewMode) {
  const orderedIds = useMemo(() => {
    if (!selectedCountry) return []
    const ids =
      mode === 'loved-by'
        ? Object.entries(countriesData.countries)
            .filter(([id, c]) => id !== selectedCountry && c.loves.some(l => l.cuisineCountryId === selectedCountry))
            .map(([id]) => id)
        : (countriesData.countries[selectedCountry]?.loves ?? [])
            .map(l => l.cuisineCountryId)
            .filter(id => id in countriesData.countries && id !== selectedCountry)

    // Sorted by distance from the selection, so the timed cascade + ticks
    // expand outward as a single wavefront.
    const origin = centroids[selectedCountry]
    const dist = (id: string) =>
      origin && centroids[id] ? geoDistance(origin, centroids[id]) : Infinity
    return ids.sort((a, b) => dist(a) - dist(b))
  }, [selectedCountry, mode])

  const [revealedCount, setRevealedCount] = useState(0)
  const [phase, setPhase] = useState<RevealPhase>('idle')
  // True when this sequence runs without sound (direct-link load before any
  // user gesture) — the map compensates with a visual flourish instead.
  const [silent, setSilent] = useState(false)

  useEffect(() => {
    setRevealedCount(0)
    if (orderedIds.length === 0) {
      setPhase('idle')
      return
    }
    setPhase('revealing')
    setSilent(!isAudioUnlocked())

    const delayAt = (i: number) => revealDelayMs(i, orderedIds.length)

    const stopSounds = scheduleRevealSounds(orderedIds.length, REVEAL_INITIAL_MS, REVEAL_TOTAL_MS)

    const start = performance.now()
    let raf = requestAnimationFrame(function frame(now: number) {
      const elapsed = now - start
      let n = 0
      while (n < orderedIds.length && delayAt(n) <= elapsed) n++
      setRevealedCount(prev => (n > prev ? n : prev))
      if (elapsed >= DONE_MS) {
        setPhase('done')
      } else {
        raf = requestAnimationFrame(frame)
      }
    })

    return () => {
      cancelAnimationFrame(raf)
      stopSounds()
    }
  }, [orderedIds])

  const revealedSet = useMemo(
    () => new Set(orderedIds.slice(0, revealedCount)),
    [orderedIds, revealedCount],
  )

  return { revealedSet, revealedCount, phase, silent }
}
