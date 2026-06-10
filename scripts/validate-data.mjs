// Validates src/data/cuisines.json invariants and its alignment with the map.
// Run: npm run validate-data
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const data = JSON.parse(readFileSync(join(root, 'src/data/cuisines.json'), 'utf8'))
const countries = data.countries

const errors = []
const warnings = []

const slugs = new Set(Object.keys(countries))

// Extract NUMERIC_TO_ID from EuropeMap.tsx
const mapSrc = readFileSync(join(root, 'src/components/EuropeMap.tsx'), 'utf8')
const mapBlock = mapSrc.match(/NUMERIC_TO_ID[^=]*=\s*\{([\s\S]*?)\n\}/)
const mapSlugs = new Set()
const mapNumerics = new Set()
if (!mapBlock) {
  errors.push('Could not locate NUMERIC_TO_ID in EuropeMap.tsx')
} else {
  for (const m of mapBlock[1].matchAll(/'(\d+)':\s*'([a-z0-9-]+)'/g)) {
    if (mapNumerics.has(m[1])) errors.push(`Duplicate numeric code in NUMERIC_TO_ID: ${m[1]}`)
    mapNumerics.add(m[1])
    if (mapSlugs.has(m[2])) errors.push(`Duplicate slug in NUMERIC_TO_ID: ${m[2]}`)
    mapSlugs.add(m[2])
  }
}

for (const [slug, c] of Object.entries(countries)) {
  if (!c.name) errors.push(`${slug}: missing name`)
  if (!/^[A-Z]{2}$/.test(c.code ?? '')) errors.push(`${slug}: bad ISO code "${c.code}"`)
  if (!Array.isArray(c.loves) || c.loves.length < 7) {
    errors.push(`${slug}: has ${c.loves?.length ?? 0} loves (minimum 7)`)
  }
  const seen = new Set()
  let surprises = 0
  for (const l of c.loves ?? []) {
    if (!slugs.has(l.cuisineCountryId)) {
      errors.push(`${slug}: loves unknown country "${l.cuisineCountryId}"`)
    }
    if (l.cuisineCountryId === slug) errors.push(`${slug}: loves itself`)
    if (seen.has(l.cuisineCountryId)) errors.push(`${slug}: duplicate love "${l.cuisineCountryId}"`)
    seen.add(l.cuisineCountryId)
    if (!l.cuisineName) errors.push(`${slug}: love ${l.cuisineCountryId} missing cuisineName`)
    if (!Array.isArray(l.exampleDishes) || l.exampleDishes.length < 2) {
      errors.push(`${slug}: love ${l.cuisineCountryId} needs >=2 exampleDishes`)
    }
    if (l.surprisePick === true) surprises++
    if (l.strength !== undefined && (typeof l.strength !== 'number' || l.strength < 0 || l.strength > 100)) {
      errors.push(`${slug}: love ${l.cuisineCountryId} has invalid strength ${l.strength}`)
    }
    if (l.strength !== undefined && !l.source) {
      warnings.push(`${slug}: love ${l.cuisineCountryId} has strength but no source`)
    }
  }
  if (surprises !== 1) errors.push(`${slug}: has ${surprises} surprisePicks (expected exactly 1)`)
  if (mapBlock && !mapSlugs.has(slug)) warnings.push(`${slug}: in data but not in NUMERIC_TO_ID (not clickable)`)
}

for (const s of mapSlugs) {
  if (!slugs.has(s)) errors.push(`NUMERIC_TO_ID slug "${s}" has no data entry`)
}

const totalLoves = Object.values(countries).reduce((n, c) => n + c.loves.length, 0)
const sourced = Object.values(countries).reduce(
  (n, c) => n + c.loves.filter((l) => l.source).length, 0)
console.log(`${Object.keys(countries).length} countries, ${totalLoves} relationships (${sourced} sourced), ${mapSlugs.size} map entries`)

for (const w of warnings) console.warn(`WARN  ${w}`)
for (const e of errors) console.error(`ERROR ${e}`)
if (errors.length) {
  console.error(`\n${errors.length} error(s)`)
  process.exit(1)
}
console.log('OK')
