// Holistic data-quality report for src/data/cuisines.json. Read-only; prints a
// health snapshot and any integrity smells. Complements validate-data.mjs
// (which enforces hard invariants) with softer coverage/quality signals.
// Run: node scripts/data-report.mjs
import { readData } from './format-data.mjs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const d = readData()
const entries = Object.entries(d.countries)
const allLoves = entries.flatMap(([slug, c]) => c.loves.map(l => ({ slug, ...l })))

// --- Sourcing & reasons ---
const total = allLoves.length
const sourced = allLoves.filter(l => l.source).length
const withStrength = allLoves.filter(l => l.strength != null).length
const reasons = {}
for (const l of allLoves) if (l.reason) reasons[l.reason] = (reasons[l.reason] ?? 0) + 1
const reasonTotal = Object.values(reasons).reduce((a, b) => a + b, 0)

console.log(`countries:        ${entries.length}`)
console.log(`relationships:    ${total}`)
console.log(`sourced:          ${sourced} (${(100 * sourced / total).toFixed(1)}%)`)
console.log(`with strength:    ${withStrength}`)
console.log(`reason-tagged:    ${reasonTotal}  ${JSON.stringify(reasons)}`)

// --- Loved-by & loves coverage ---
const lovedBy = Object.fromEntries(entries.map(([s]) => [s, 0]))
for (const l of allLoves) if (l.slug !== l.cuisineCountryId && lovedBy[l.cuisineCountryId] != null) lovedBy[l.cuisineCountryId]++
const unloved = entries.filter(([s]) => lovedBy[s] === 0).map(([s]) => s)
const lovedByOne = entries.filter(([s]) => lovedBy[s] === 1).map(([s]) => s)
const lovesSizes = entries.map(([, c]) => c.loves.length)
console.log(`\nloved-by: 0 -> ${unloved.length} ${unloved.length ? JSON.stringify(unloved) : ''}; 1 -> ${lovedByOne.length} ${lovedByOne.length ? JSON.stringify(lovedByOne) : ''}`)
console.log(`loves per country: min ${Math.min(...lovesSizes)}, max ${Math.max(...lovesSizes)}`)

// --- Integrity smells ---
const smells = []
const names = {}
for (const l of allLoves) {
  if (l.slug === l.cuisineCountryId) smells.push(`self-love: ${l.slug}`)
  if (!d.countries[l.cuisineCountryId]) smells.push(`missing target: ${l.slug}>${l.cuisineCountryId}`)
  if (!l.exampleDishes?.length) smells.push(`no dishes: ${l.slug}>${l.cuisineCountryId}`)
  ;(names[l.cuisineCountryId] = names[l.cuisineCountryId] || new Set()).add(l.cuisineName)
}
for (const [t, set] of Object.entries(names)) if (set.size > 1) smells.push(`inconsistent name for ${t}: ${[...set].join(' | ')}`)
for (const [slug, c] of entries) {
  const dups = c.loves.map(l => l.cuisineCountryId).filter((v, i, a) => a.indexOf(v) !== i)
  if (dups.length) smells.push(`duplicate target in ${slug}: ${dups.join(',')}`)
  const surprises = c.loves.filter(l => l.surprisePick).length
  if (surprises !== 1) smells.push(`${slug} has ${surprises} surprise picks (want 1)`)
}
console.log(`\nintegrity smells: ${smells.length}`)
smells.slice(0, 40).forEach(s => console.log(`  - ${s}`))

// --- Proximity sanity (great-circle vs centroids) ---
const centroids = JSON.parse(readFileSync(join(root, 'src/data/centroids.json'), 'utf8'))
const km = (a, b) => {
  if (!a || !b) return null
  const r = (x) => (x * Math.PI) / 180
  const h = Math.sin(r(b[1] - a[1]) / 2) ** 2 + Math.cos(r(a[1])) * Math.cos(r(b[1])) * Math.sin(r(b[0] - a[0]) / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}
const farProx = allLoves
  .filter(l => l.reason === 'proximity')
  .map(l => ({ pair: `${l.slug}>${l.cuisineCountryId}`, km: km(centroids[l.slug], centroids[l.cuisineCountryId]) }))
  .filter(x => x.km != null && x.km > 4000)
  .sort((a, b) => b.km - a.km)
console.log(`\nproximity-tagged pairs > 4000km (review for mis-tags): ${farProx.length}`)
farProx.slice(0, 15).forEach(x => console.log(`  - ${Math.round(x.km)}km ${x.pair}`))
