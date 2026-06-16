// Map/geo invariants — run with `node --test`. Centroids power the reveal-wave
// ordering; the NAME_TO_ID fallback keeps id-less geometries (Kosovo) clickable.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readData } from '../scripts/format-data.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const countries = readData().countries
const centroids = JSON.parse(readFileSync(join(root, 'src/data/centroids.json'), 'utf8'))
const mapSrc = readFileSync(join(root, 'src/components/EuropeMap.tsx'), 'utf8')

test('every country has a centroid', () => {
  const missing = Object.keys(countries).filter(s => !centroids[s])
  assert.deepEqual(missing, [], `missing centroids: ${missing.join(', ')}`)
})

test('centroids are valid [lon, lat] pairs', () => {
  for (const [slug, c] of Object.entries(centroids)) {
    assert.ok(Array.isArray(c) && c.length === 2, `${slug} centroid shape`)
    const [lon, lat] = c
    assert.ok(lon >= -180 && lon <= 180, `${slug} lon in range`)
    assert.ok(lat >= -90 && lat <= 90, `${slug} lat in range`)
  }
})

test('NUMERIC_TO_ID and NAME_TO_ID slugs all have data', () => {
  const numBlock = mapSrc.match(/NUMERIC_TO_ID[^=]*=\s*\{([\s\S]*?)\n\}/)
  const nameBlock = mapSrc.match(/NAME_TO_ID[^=]*=\s*\{([\s\S]*?)\n\}/)
  assert.ok(numBlock, 'NUMERIC_TO_ID present')
  assert.ok(nameBlock, 'NAME_TO_ID present')
  const mapSlugs = []
  for (const m of numBlock[1].matchAll(/'(\d+)':\s*'([a-z0-9-]+)'/g)) mapSlugs.push(m[2])
  for (const m of nameBlock[1].matchAll(/:\s*'([a-z0-9-]+)'/g)) mapSlugs.push(m[1])
  for (const s of mapSlugs) assert.ok(countries[s], `map slug "${s}" has data`)
})

test('Kosovo is reachable via the NAME_TO_ID fallback (id-less in TopoJSON)', () => {
  const nameBlock = mapSrc.match(/NAME_TO_ID[^=]*=\s*\{([\s\S]*?)\n\}/)
  assert.match(nameBlock[1], /'Kosovo':\s*'kosovo'/, 'Kosovo name mapping present')
  assert.ok(countries.kosovo, 'kosovo has data')
  assert.ok(centroids.kosovo, 'kosovo has a centroid')
})

test('no two countries share an identical centroid (copy-error guard)', () => {
  const seen = {}
  const dups = []
  for (const [slug, v] of Object.entries(centroids)) {
    const key = v.join(',')
    if (seen[key]) dups.push(`${slug} == ${seen[key]}`)
    else seen[key] = slug
  }
  assert.deepEqual(dups, [], 'centroids should be distinct per country')
})

test('NUMERIC_TO_ID keys are bare (unpadded) numeric strings', () => {
  // The zero-padding bug: TopoJSON ids are padded ('040') but keys must be bare
  // ('40'); countryIdFromGeoId normalises via String(Number(id)).
  const numBlock = mapSrc.match(/NUMERIC_TO_ID[^=]*=\s*\{([\s\S]*?)\n\}/)[1]
  const bad = []
  for (const m of numBlock.matchAll(/'(\d+)':/g)) {
    if (String(Number(m[1])) !== m[1]) bad.push(m[1])
  }
  assert.deepEqual(bad, [], 'NUMERIC_TO_ID keys must be unpadded')
})
