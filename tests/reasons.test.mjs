// Unit tests for the influence-reason classifier (scripts/tag-reasons.mjs).
// Imported as a pure function — the file's write pass only runs when invoked
// directly. Run with `node --test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyReason } from '../scripts/tag-reasons.mjs'

test('an explicit override wins, even over a survey-only source', () => {
  // australia>malaysia is overridden to migration despite a YouGov source.
  assert.equal(classifyReason('YouGov Global Cuisine Survey 2019', 'australia>malaysia'), 'migration')
  assert.equal(classifyReason('anything', 'uk>india'), 'colonial')
})

test('survey / platform / OSM sources stay untagged (they prove THAT, not WHY)', () => {
  assert.equal(classifyReason('YouGov Global Cuisine Survey 2019', 'x>y'), undefined)
  assert.equal(classifyReason('OpenStreetMap 2026 (40 italian-tagged restaurants in X)', 'x>y'), undefined)
  assert.equal(classifyReason(undefined, 'x>y'), undefined)
})

test('keyword rules classify prose by category', () => {
  assert.equal(classifyReason('part of the large Lebanese diaspora', 'x>y'), 'migration')
  assert.equal(classifyReason('a British colonial legacy', 'x>y'), 'colonial')
  assert.equal(classifyReason('shared across the neighbouring Balkans', 'x>y'), 'proximity')
  assert.equal(classifyReason('skyr export across the North Atlantic', 'x>y'), 'trade')
  assert.equal(classifyReason('a favourite on the ferry to Tallinn for food trips', 'x>y'), 'tourism')
  assert.equal(classifyReason('rode the Hallyu boom; washoku gastrodiplomacy', 'x>y'), 'soft-power')
})

test('most-specific rule wins by order (colonial before migration)', () => {
  // "colonial" + "community" both present -> colonial (listed first).
  assert.equal(classifyReason('colonial-era Indian community', 'x>y'), 'colonial')
})

test('returns undefined for prose with no recognised signal', () => {
  assert.equal(classifyReason('a delicious and beloved national dish', 'x>y'), undefined)
})
