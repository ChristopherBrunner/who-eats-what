// Generate a small, public-safe sample of the dataset for an open demo while
// the full src/data/cuisines.json stays private. Writes src/data/cuisines.sample.json
// with a geographically-diverse subset (full entries kept verbatim).
// Run: node scripts/make-sample.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const full = JSON.parse(readFileSync(join(root, 'src/data/cuisines.json'), 'utf8'))

// A diverse, recognisable slice across every continent.
const SAMPLE = [
  'usa', 'mexico', 'brazil', 'peru',
  'uk', 'france', 'italy', 'spain',
  'nigeria', 'kenya', 'south-africa', 'morocco',
  'japan', 'china', 'india', 'thailand', 'south-korea',
  'lebanon', 'turkey', 'australia',
]

const out = { countries: {} }
for (const slug of SAMPLE) {
  if (full.countries[slug]) out.countries[slug] = full.countries[slug]
  else console.warn(`sample slug not found: ${slug}`)
}

const total = Object.values(out.countries).reduce((n, c) => n + c.loves.length, 0)
writeFileSync(join(root, 'src/data/cuisines.sample.json'), JSON.stringify(out, null, 2) + '\n')
console.log(`wrote cuisines.sample.json: ${Object.keys(out.countries).length} countries, ${total} relationships`)
