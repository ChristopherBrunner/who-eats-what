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
// Heart particles travel this long from reveal to landing (EuropeMap's
// drift/ripple timings derive from it too).
export const HEART_FLIGHT_MS = 850
// Completion (ding + finale) waits for the LAST heart to land, not just
// the last reveal — otherwise the finale fires while hearts are mid-air.
const DONE_MS = REVEAL_TOTAL_MS + HEART_FLIGHT_MS + 40

export type RevealPhase = 'idle' | 'revealing' | 'done'

interface Progress {
  /** `${country}/${mode}` this progress belongs to. */
  key: string
  revealed: number
  arrived: number
  phase: RevealPhase
  /** True when the sequence runs without sound (direct-link load before any
      user gesture) — the map compensates with a visual flourish instead. */
  silent: boolean
}

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

// Arrivals closer together than this blur into noise (audibly) and into a
// single blob (visually), so only one of them is accented.
const MIN_ACCENT_GAP_MS = 72

/**
 * Which reveal indices get an accent — a tick in the audio, a ripple on the
 * map. Both use the same set so what you hear matches what you see.
 *
 * Thinning is by TIME, not by index: the old rule (first 6, then every 6th)
 * cut a country with 10 lovers as hard as one with 169, which is why small
 * reveals fell silent after a few arrivals. Here every arrival is accented
 * while they are far enough apart — so small reveals accent all of them —
 * and only the dense tail of a big cascade gets thinned. As a bonus the
 * accents come out evenly spaced in time, i.e. rhythmic, instead of
 * bunching up as the sqrt curve accelerates.
 */
export function accentIndices(count: number): Set<number> {
  const out = new Set<number>()
  let last = -Infinity
  for (let i = 0; i < count; i++) {
    const t = revealDelayMs(i, count)
    if (t - last >= MIN_ACCENT_GAP_MS) {
      out.add(i)
      last = t
    }
  }
  return out
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
export function useRevealSequence(selectedCountry: string | null, mode: ViewMode, replayNonce = 0) {
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

    // Sorted by distance from the selection. Loved-by expands outward
    // (near → far, affection arriving); loves is mirrored, sweeping inward
    // from the far side of the world (far → near, appetite reaching out).
    const origin = centroids[selectedCountry]
    const dist = (id: string) =>
      origin && centroids[id] ? geoDistance(origin, centroids[id]) : Infinity
    const nearFirst = ids.sort((a, b) => dist(a) - dist(b))
    return mode === 'loves' ? nearFirst.reverse() : nearFirst
  }, [selectedCountry, mode])

  // Progress is stamped with the sequence it belongs to. Resetting in the
  // effect instead would leave one render where the counts still hold the
  // PREVIOUS selection's totals while orderedIds is already the new
  // country's list — so the first N of the new list flashed as revealed,
  // firing their hearts for a frame before the reset landed.
  // replayNonce is part of the key so bumping it restarts the sequence from
  // scratch — that's how the "replay with sound" affordance re-runs a reveal
  // that had to play silently on a cold page load.
  const seqKey = selectedCountry ? `${selectedCountry}/${mode}/${replayNonce}` : ''
  const fresh = (): Progress => ({
    key: seqKey,
    revealed: 0,
    arrived: 0,
    // arriving mid-render with nothing revealed yet is exactly 'revealing'
    phase: orderedIds.length === 0 ? 'idle' : 'revealing',
    silent: !isAudioUnlocked(),
  })
  const [progress, setProgress] = useState<Progress>(fresh)
  if (progress.key !== seqKey) setProgress(fresh())

  // Never read progress from a stale sequence, not even for one frame.
  const { revealed: revealedCount, arrived: arrivedCount, phase, silent } =
    progress.key === seqKey ? progress : fresh()

  useEffect(() => {

    if (orderedIds.length === 0) return

    const delayAt = (i: number) => revealDelayMs(i, orderedIds.length)

    const stopSounds = scheduleRevealSounds(
      orderedIds.length, REVEAL_INITIAL_MS, REVEAL_TOTAL_MS,
      mode === 'loves' ? 'falling' : 'rising',
      HEART_FLIGHT_MS,
      // same set drives the ripples in EuropeMap
      accentIndices(orderedIds.length),
    )

    const start = performance.now()
    let raf = requestAnimationFrame(function frame(now: number) {
      const elapsed = now - start
      let n = 0
      while (n < orderedIds.length && delayAt(n) <= elapsed) n++
      let a = 0
      while (a < orderedIds.length && delayAt(a) + HEART_FLIGHT_MS <= elapsed) a++
      const done = elapsed >= DONE_MS
      // Guarded by key: a frame scheduled before a fast re-click can't write
      // its progress onto the sequence that replaced it.
      setProgress(p => {
        if (p.key !== seqKey) return p
        const revealed = Math.max(p.revealed, n)
        const arrived  = Math.max(p.arrived, a)
        const phase: RevealPhase = done ? 'done' : p.phase
        // MUST return the identical object when nothing moved. This loop
        // runs every frame but the counts only change a few dozen times;
        // handing back a fresh object regardless re-rendered the whole map
        // 60×/second for the length of the reveal, which is what made it
        // stutter and swallow clicks.
        if (revealed === p.revealed && arrived === p.arrived && phase === p.phase) return p
        return { ...p, revealed, arrived, phase }
      })
      if (!done) raf = requestAnimationFrame(frame)
    })

    return () => {
      cancelAnimationFrame(raf)
      stopSounds()
    }
  }, [orderedIds, mode, replayNonce])

  const revealedSet = useMemo(
    () => new Set(orderedIds.slice(0, revealedCount)),
    [orderedIds, revealedCount],
  )
  const arrivedSet = useMemo(
    () => new Set(orderedIds.slice(0, arrivedCount)),
    [orderedIds, arrivedCount],
  )

  return { revealedSet, revealedCount, arrivedSet, arrivedCount, total: orderedIds.length, phase, silent }
}
