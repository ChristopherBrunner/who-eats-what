// Merge OpenStreetMap restaurant-density counts into cuisines.json as sources.
// Cites an UNCITED loves entry when its cuisine ranks in the country's top-8
// foreign cuisines by tagged-restaurant count AND has at least MIN_COUNT of
// them — a real density signal, never overwriting existing sources.
//
// Usage: node scripts/merge-osm-sources.mjs <counts.json> [<counts2.json> ...]
// Counts file shape: { "<slug>": { "<cuisineLabel>": <n>, "_total_tagged": <n> } }
import { readFileSync } from 'node:fs'
import { readData, writeData } from './format-data.mjs'

const MIN_COUNT = 8
const TOP_N = 8

// cuisine label (as emitted by the counting scripts) -> country slug
const LABEL_TO_SLUG = {
  italian: 'italy', japanese: 'japan', chinese: 'china', indian: 'india',
  thai: 'thailand', mexican: 'mexico', american: 'usa', turkish: 'turkey',
  french: 'france', korean: 'south-korea', vietnamese: 'vietnam', lebanese: 'lebanon',
  georgian: 'georgia', spanish: 'spain', greek: 'greece',
  // expanded set (Phase 2)
  british: 'uk', german: 'germany', russian: 'russia', portuguese: 'portugal',
  brazilian: 'brazil', moroccan: 'morocco', ethiopian: 'ethiopia', australian: 'australia',
  indonesian: 'indonesia', malaysian: 'malaysia', filipino: 'philippines',
  argentinian: 'argentina', peruvian: 'peru',
}
const SLUG_TO_LABEL = Object.fromEntries(Object.entries(LABEL_TO_SLUG).map(([k, v]) => [v, k]))

// merge all provided count files (later files win on key collision)
const counts = {}
for (const f of process.argv.slice(2)) {
  Object.assign(counts, JSON.parse(readFileSync(f, 'utf8')))
}
if (!Object.keys(counts).length) {
  console.error('no counts provided'); process.exit(1)
}

const data = readData()
let added = 0
const byCuisine = {}
for (const [slug, c] of Object.entries(data.countries)) {
  const row = counts[slug]
  if (!row) continue
  const foreign = Object.entries(row)
    .filter(([lab, n]) => !lab.startsWith('_') && LABEL_TO_SLUG[lab] && LABEL_TO_SLUG[lab] !== slug)
    .sort((a, b) => b[1] - a[1])
  const topSlugs = new Set(foreign.slice(0, TOP_N).filter(([, n]) => n >= MIN_COUNT).map(([lab]) => LABEL_TO_SLUG[lab]))
  for (const l of c.loves) {
    if (l.source) continue
    const t = l.cuisineCountryId
    const lab = SLUG_TO_LABEL[t]
    if (lab && topSlugs.has(t) && (row[lab] ?? 0) >= MIN_COUNT) {
      l.source = `OpenStreetMap 2026 (${row[lab]} ${lab}-tagged restaurants in ${c.name})`
      added++
      byCuisine[lab] = (byCuisine[lab] ?? 0) + 1
    }
  }
}

writeData(data)
const sourced = Object.values(data.countries).reduce((n, c) => n + c.loves.filter(l => l.source).length, 0)
const total = Object.values(data.countries).reduce((n, c) => n + c.loves.length, 0)
console.log(`+${added} OSM sources; ${sourced}/${total} now sourced`)
console.log('by cuisine:', byCuisine)
