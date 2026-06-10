// One-off generator for src/data/centroids.json: [lon, lat] per country slug,
// computed from the same world-atlas 110m TopoJSON the map renders.
// Run: node scripts/generate-centroids.mjs
import { writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { geoCentroid } from 'd3-geo'
import { feature } from 'topojson-client'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Same source as GEO_URL in EuropeMap.tsx
const ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
const topo = await (await fetch(ATLAS_URL)).json()

// Extract NUMERIC_TO_ID from EuropeMap.tsx (keys are unpadded numeric strings)
const mapSrc = readFileSync(join(root, 'src/components/EuropeMap.tsx'), 'utf8')
const block = mapSrc.match(/NUMERIC_TO_ID[^=]*=\s*\{([\s\S]*?)\n\}/)[1]
const numericToId = {}
for (const m of block.matchAll(/'(\d+)':\s*'([a-z0-9-]+)'/g)) numericToId[m[1]] = m[2]

const centroids = {}
for (const geom of topo.objects.countries.geometries) {
  const slug = numericToId[String(Number(geom.id))]
  if (!slug) continue
  const [lon, lat] = geoCentroid(feature(topo, geom))
  centroids[slug] = [Math.round(lon * 10) / 10, Math.round(lat * 10) / 10]
}

// Countries with data but no 110m shape — hand-set coordinates.
Object.assign(centroids, {
  'singapore':  [103.8, 1.35],
  'malta':      [14.4, 35.9],
  'mauritius':  [57.6, -20.3],
  'cape-verde': [-23.6, 15.1],
  'samoa':      [-172.1, -13.8],
})

const missing = Object.values(numericToId).filter(s => !(s in centroids))
if (missing.length) {
  console.error('Missing centroids for:', missing)
  process.exit(1)
}

const sorted = Object.fromEntries(Object.entries(centroids).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(join(root, 'src/data/centroids.json'), JSON.stringify(sorted, null, 0).replaceAll('],', '],\n') + '\n')
console.log(`wrote ${Object.keys(sorted).length} centroids`)
