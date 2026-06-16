// Data invariants for src/data/cuisines.json — run with `node --test`.
// These lock in the guarantees the app relies on (every country loved, one
// surprise pick, well-formed sources/reasons, referential integrity).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readData } from '../scripts/format-data.mjs'

const data = readData()
const countries = data.countries
const slugs = Object.keys(countries)
const REASONS = new Set(['migration', 'colonial', 'proximity', 'trade', 'soft-power', 'tourism'])

test('has a countries object with entries', () => {
  assert.ok(countries && typeof countries === 'object')
  assert.ok(slugs.length >= 196, `expected >=196 countries, got ${slugs.length}`)
})

test('every country has name, 2-letter code, and a loves array', () => {
  for (const [slug, c] of Object.entries(countries)) {
    assert.equal(typeof c.name, 'string', `${slug} name`)
    assert.ok(c.name.length > 0, `${slug} name non-empty`)
    assert.match(c.code, /^[A-Z]{2}$/, `${slug} code is ISO alpha-2`)
    assert.ok(Array.isArray(c.loves) && c.loves.length > 0, `${slug} has loves`)
  }
})

test('every loves entry is well-formed', () => {
  for (const [slug, c] of Object.entries(countries)) {
    for (const l of c.loves) {
      assert.equal(typeof l.cuisineCountryId, 'string', `${slug} cuisineCountryId`)
      assert.equal(typeof l.cuisineName, 'string', `${slug}>${l.cuisineCountryId} cuisineName`)
      assert.ok(Array.isArray(l.exampleDishes) && l.exampleDishes.length > 0, `${slug}>${l.cuisineCountryId} has dishes`)
      assert.equal(typeof l.surprisePick, 'boolean', `${slug}>${l.cuisineCountryId} surprisePick`)
      if (l.strength !== undefined) {
        assert.ok(Number.isFinite(l.strength) && l.strength >= 0 && l.strength <= 100, `${slug}>${l.cuisineCountryId} strength range`)
      }
      if (l.source !== undefined) {
        assert.equal(typeof l.source, 'string', `${slug}>${l.cuisineCountryId} source type`)
        assert.ok(l.source.trim().length > 0, `${slug}>${l.cuisineCountryId} source non-empty`)
      }
      if (l.reason !== undefined) {
        assert.ok(REASONS.has(l.reason), `${slug}>${l.cuisineCountryId} reason "${l.reason}" is allowed`)
      }
    }
  }
})

test('exactly one surprise pick per country', () => {
  for (const [slug, c] of Object.entries(countries)) {
    const n = c.loves.filter(l => l.surprisePick).length
    assert.equal(n, 1, `${slug} should have exactly 1 surprise pick, has ${n}`)
  }
})

test('no self-love and no duplicate targets within a country', () => {
  for (const [slug, c] of Object.entries(countries)) {
    const seen = new Set()
    for (const l of c.loves) {
      assert.notEqual(l.cuisineCountryId, slug, `${slug} loves itself`)
      assert.ok(!seen.has(l.cuisineCountryId), `${slug} lists ${l.cuisineCountryId} twice`)
      seen.add(l.cuisineCountryId)
    }
  }
})

test('every cuisineCountryId references an existing country', () => {
  for (const [slug, c] of Object.entries(countries)) {
    for (const l of c.loves) {
      assert.ok(countries[l.cuisineCountryId], `${slug}>${l.cuisineCountryId} target missing`)
    }
  }
})

test('every country is loved by at least one other (the emotional hook)', () => {
  const lovedBy = Object.fromEntries(slugs.map(s => [s, 0]))
  for (const [slug, c] of Object.entries(countries)) {
    for (const l of c.loves) if (l.cuisineCountryId !== slug) lovedBy[l.cuisineCountryId]++
  }
  const unloved = slugs.filter(s => lovedBy[s] === 0)
  assert.deepEqual(unloved, [], `unloved countries: ${unloved.join(', ')}`)
})

test('a cuisine has a single consistent display name across all entries', () => {
  const names = {}
  for (const c of Object.values(countries)) {
    for (const l of c.loves) (names[l.cuisineCountryId] ??= new Set()).add(l.cuisineName)
  }
  const inconsistent = Object.entries(names).filter(([, s]) => s.size > 1)
  assert.deepEqual(inconsistent.map(([t]) => t), [], 'cuisine names should be consistent')
})

const all = Object.entries(countries).flatMap(([slug, c]) => c.loves.map(l => ({ slug, ...l })))

test('a reason is only set when a source backs it', () => {
  const bad = all.filter(l => l.reason && !l.source).map(l => `${l.slug}>${l.cuisineCountryId}`)
  assert.deepEqual(bad, [], 'reasons must derive from a source')
})

test('a survey strength is only set alongside a source', () => {
  const bad = all.filter(l => l.strength != null && !l.source).map(l => `${l.slug}>${l.cuisineCountryId}`)
  assert.deepEqual(bad, [], 'strength implies a source')
})

test('sources are substantive (>= 20 chars), not placeholders', () => {
  const tiny = all.filter(l => l.source && l.source.trim().length < 20).map(l => `${l.slug}>${l.cuisineCountryId}`)
  assert.deepEqual(tiny, [], 'sources should be real citations')
})

test('sourcing coverage stays high (>= 99%)', () => {
  const sourced = all.filter(l => l.source).length
  const pct = (100 * sourced) / all.length
  assert.ok(pct >= 99, `sourced coverage dropped to ${pct.toFixed(1)}%`)
})
