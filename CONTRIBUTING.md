# Contributing

Thanks for helping improve **Who Eats What**. Most contributions are to the
dataset (`src/data/cuisines.json`); this guide covers how to do that safely.

## Setup

```bash
npm install --legacy-peer-deps   # react-simple-maps has a React 19 peer-dep conflict
npm run dev                      # http://localhost:5173
```

## The data model

`src/data/cuisines.json` is keyed by country slug. Each country has `name`,
`code` (ISO alpha-2) and a `loves` array. Each `loves` entry:

| field | required | notes |
|-------|----------|-------|
| `cuisineCountryId` | yes | slug of the loved country (must exist; never the country's own slug) |
| `cuisineName` | yes | display name of the cuisine (must be identical everywhere that cuisine appears) |
| `exampleDishes` | yes | 2–3 representative dishes |
| `surprisePick` | yes | exactly **one** entry per country is `true` (the "unexpected" highlight) |
| `strength` | optional | integer 0–100, % who like it — **survey data only** |
| `source` | optional | a real citation (see below) |
| `reason` | optional | influence category — **generated, don't hand-set** |

The "who loves this country" view is derived at runtime; you only ever edit
`loves` arrays. To make country **A** loved by country **B**, add an entry to
**B**'s `loves` pointing at **A** (with `surprisePick: false`).

## Editing rules

1. **Never hand-edit the JSON formatting.** Write a small script that calls the
   canonical serializer so the one-line-per-entry format and key order stay
   stable:
   ```js
   import { readData, writeData } from './scripts/format-data.mjs'
   const d = readData()
   // ...mutate d.countries...
   writeData(d)
   ```
2. **Regenerate reasons** after changing sources: `node scripts/tag-reasons.mjs`
   (keyword rules + overrides infer the influence category from source prose;
   survey/OSM-only sources stay untagged — they show *that*, not *why*).
3. **Regenerate centroids** only if you change `NUMERIC_TO_ID`/`NAME_TO_ID`:
   `node scripts/generate-centroids.mjs`.

## Sourcing standards

Add a `source` only with real evidence. Tiers, strongest first:

1. **Survey** — the YouGov Global Cuisine Survey 2019 (carries `strength`).
2. **OpenStreetMap restaurant density** — cite only where a cuisine is in a
   country's top-8 foreign cuisines **and** has **≥8** tagged restaurants. This
   floor is deliberate; **don't lower it to inflate coverage.**
3. **Heritage / diaspora / documented global reach** — colonial ties, diaspora
   population figures, gastrodiplomacy programmes.
4. **Shared-region proximity** — genuinely neighbouring/shared foodways.

**Don't fabricate specificity.** If a relationship is real but you have no
specific evidence, a generic-but-true citation is better than an invented one;
if there's no honest basis at all, leave it uncited (a handful of entries are
deliberate honest holds).

## Before you open a PR

```bash
npm run validate-data   # hard invariants + map alignment (must pass)
npm test                # node:test data/geo/reason suites
npm run data-report     # coverage + integrity + proximity sanity (review output)
npm run lint
npm run build
```

CI runs lint, validate-data, test and build on every PR.
