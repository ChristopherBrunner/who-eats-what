// One-off generator for src/data/centroids.json: [lon, lat] per country slug,
// computed from the same world-atlas 110m TopoJSON the map renders.
// Run: node scripts/generate-centroids.mjs
import { writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { geoCentroid, geoArea } from 'd3-geo'
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

// Some geometries are id-less (e.g. Kosovo) and matched by name on the map.
const nameBlock = mapSrc.match(/NAME_TO_ID[^=]*=\s*\{([\s\S]*?)\n\}/)
const nameToId = {}
if (nameBlock) for (const m of nameBlock[1].matchAll(/'([^']+)':\s*'([a-z0-9-]+)'/g)) nameToId[m[1]] = m[2]

const centroids = {}
for (const geom of topo.objects.countries.geometries) {
  const slug = numericToId[String(Number(geom.id))] || nameToId[geom.properties?.name]
  if (!slug) continue
  // Centroid of the LARGEST polygon only: whole-multipolygon centroids get
  // dragged by far-flung territories (France + French Guiana landed in the
  // Bay of Biscay; Alaska pulls the USA; Svalbard pulls Norway).
  const f = feature(topo, geom)
  let target = f
  if (f.geometry.type === 'MultiPolygon') {
    let bestArea = -1
    for (const coords of f.geometry.coordinates) {
      const poly = { type: 'Polygon', coordinates: coords }
      const a = geoArea(poly)
      if (a > bestArea) { bestArea = a; target = poly }
    }
  }
  const [lon, lat] = geoCentroid(target)
  centroids[slug] = [Math.round(lon * 10) / 10, Math.round(lat * 10) / 10]
}

// Countries with data but no 110m shape — hand-set coordinates.
Object.assign(centroids, {
  'singapore':  [103.8, 1.35],
  'malta':      [14.4, 35.9],
  'mauritius':  [57.6, -20.3],
  'cape-verde': [-23.6, 15.1],
  'samoa':      [-172.1, -13.8],
  'andorra': [1.5, 42.5], 'monaco': [7.4, 43.7], 'liechtenstein': [9.55, 47.15],
  'san-marino': [12.45, 43.95], 'bahrain': [50.55, 26.05], 'maldives': [73.5, 4.2],
  'comoros': [43.3, -11.7], 'seychelles': [55.45, -4.6], 'sao-tome': [6.6, 0.2],
  'barbados': [-59.5, 13.2], 'saint-lucia': [-61.0, 13.9], 'grenada': [-61.7, 12.1],
  'antigua': [-61.8, 17.1], 'dominica': [-61.35, 15.4], 'saint-kitts': [-62.75, 17.3],
  'saint-vincent': [-61.2, 13.25], 'tonga': [-175.2, -21.2], 'kiribati': [173.0, 1.4],
  'micronesia': [158.2, 6.9], 'palau': [134.5, 7.5], 'marshall-islands': [171.2, 7.1],
  'nauru': [166.9, -0.5], 'tuvalu': [179.2, -7.5],
})

const missing = Object.values(numericToId).filter(s => !(s in centroids))
if (missing.length) {
  console.error('Missing centroids for:', missing)
  process.exit(1)
}

const sorted = Object.fromEntries(Object.entries(centroids).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(join(root, 'src/data/centroids.json'), JSON.stringify(sorted, null, 0).replaceAll('],', '],\n') + '\n')
console.log(`wrote ${Object.keys(sorted).length} centroids`)
