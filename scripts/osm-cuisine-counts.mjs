// Scrape OpenStreetMap (Overpass) restaurant counts per cuisine, per country,
// for the EXPANDED cuisine set Phase 1 didn't cover. Crash-safe: results are
// written incrementally to osm_counts_v2.json after every country, so an
// interrupted run keeps whatever finished. Only scrapes countries that still
// have an uncited loves entry pointing at one of these cuisines.
//
// Usage: node scripts/osm-cuisine-counts.mjs [outfile]
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { readData } from './format-data.mjs'

const OUT = process.argv[2] || `${process.env.TEMP || '/tmp'}/osm_counts_v2.json`

// cuisine slug -> OSM cuisine tag value (regex-matched, handles comma lists)
const EXP = {
  uk: 'british', germany: 'german', russia: 'russian', portugal: 'portuguese',
  brazil: 'brazilian', morocco: 'moroccan', ethiopia: 'ethiopian',
  australia: 'australian', indonesia: 'indonesian', malaysia: 'malaysian',
  philippines: 'filipino', argentina: 'argentinian', peru: 'peruvian',
}

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function overpass(query) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = ENDPOINTS[attempt % ENDPOINTS.length]
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 100000) // client-side hard timeout
    try {
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(query), signal: ctrl.signal })
      if (res.status === 429 || res.status === 504) {
        await sleep(2000 * (attempt + 1))
        continue
      }
      if (!res.ok) { await sleep(1500 * (attempt + 1)); continue }
      return await res.json()
    } catch {
      await sleep(1500 * (attempt + 1))
    } finally {
      clearTimeout(timer)
    }
  }
  return null
}

// Determine target countries from uncited entries pointing at EXP cuisines.
const data = readData()
const targets = {} // slug -> { code, name, cuisines:Set }
for (const [slug, c] of Object.entries(data.countries)) {
  for (const l of c.loves) {
    if (l.source) continue
    if (EXP[l.cuisineCountryId]) {
      const t = targets[slug] || (targets[slug] = { code: c.code, name: c.name, cuisines: new Set() })
      t.cuisines.add(EXP[l.cuisineCountryId])
    }
  }
}

const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
const entries = Object.entries(targets)
console.log(`scraping ${entries.length} countries -> ${OUT}`)

for (const [slug, t] of entries) {
  if (out[slug]?._done) { console.log(`skip ${slug} (cached)`); continue }
  if (!t.code) { console.log(`skip ${slug} (no ISO code)`); continue }
  const cuisines = [...t.cuisines]
  const re = cuisines.join('|')
  const q = `[out:json][timeout:90];
area["ISO3166-1"="${t.code}"][admin_level=2]->.a;
nwr["amenity"="restaurant"]["cuisine"~"${re}"](area.a);
out tags;`
  const json = await overpass(q)
  if (!json) { console.log(`FAIL ${slug} (${t.name})`); continue }
  const row = { _total_tagged: json.elements?.length || 0 }
  for (const cui of cuisines) row[cui] = 0
  for (const el of json.elements || []) {
    const tags = (el.tags?.cuisine || '').toLowerCase()
    for (const cui of cuisines) if (tags.includes(cui)) row[cui]++
  }
  row._done = true
  out[slug] = row
  writeFileSync(OUT, JSON.stringify(out, null, 0))
  console.log(`${slug} (${t.name}):`, cuisines.map((c) => `${c}=${row[c]}`).join(' '))
  await sleep(800)
}

console.log('done')
