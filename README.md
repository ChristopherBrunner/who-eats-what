# Who Eats What

An interactive world map of cross-country food-preference relationships. Click any
country to see **who loves its cuisine** — the emotional hook — then flip the panel to
see **what that country loves eating** from elsewhere.

- **Primary view (`loved-by`):** the countries whose people love the selected country's
  cuisine light up across the map in a geographic wave, with a sound cascade that settles
  on a completion chime.
- **Secondary view (`loves`):** what the selected country loves eating from abroad.
- Every relationship can be expanded in the side panel to show the evidence behind it: a
  survey strength bar, an influence-reason chip, and a source citation.

Shareable URLs follow `/:countryId/:mode` (mode is `loved-by` or `loves`).

## Data

`src/data/cuisines.json` covers **196 countries** and **1,748 cuisine relationships**, of
which **99.8% carry a source citation**. The `loved-by` view is derived at runtime by
scanning every country's `loves` array — there's no redundant storage.

Each `loves` entry has a target cuisine, example dishes, exactly one "surprise pick" per
country, and — where known — a `strength` (survey % who like it), a `source`, and a
`reason` (influence category).

**Sourcing tiers, strongest first:**

1. **YouGov Global Cuisine Survey 2019** (24 markets × 34 cuisines) — survey `strength` + source.
2. **OpenStreetMap restaurant density** — cited only where a cuisine ranks in a country's
   top-8 foreign cuisines *and* has ≥8 tagged restaurants (a deliberate floor, never lowered
   to inflate coverage).
3. **Heritage / diaspora / documented global reach** — colonial ties, diaspora population
   figures, gastrodiplomacy programmes.
4. **Shared-region proximity** — neighbouring countries with genuinely shared foodways.

**Influence reasons:** `migration`, `colonial`, `proximity`, `trade`, `soft-power`,
`tourism` — inferred from the source prose and famous-case overrides.

Every country is loved by at least one other (all but San Marino, an enclave wholly within
Italy, by at least two), and loves at least seven cuisines.

## Commands

```bash
npm run dev            # Vite dev server (HMR)
npm run build          # type-check + production build
npm run lint           # ESLint
npm run validate-data  # enforce cuisines.json invariants + map alignment
npm run data-report    # read-only data health snapshot (coverage, integrity, sanity)
```

Install with `--legacy-peer-deps` (react-simple-maps has an unresolved React 19 peer dep).

### Data scripts

- `scripts/format-data.mjs` — canonical reader/writer; **all data edits go through it**.
- `scripts/tag-reasons.mjs` — (re)derives `reason` tags from source prose.
- `scripts/merge-osm-sources.mjs` / `scripts/osm-cuisine-counts.mjs` — OSM density toolchain.
- `scripts/generate-centroids.mjs` — per-country centroids for the reveal wave ordering.
- `scripts/validate-data.mjs` / `scripts/data-report.mjs` — invariants and health report.

## Stack

React 19 · react-simple-maps · d3-geo · Tailwind CSS v4 · TypeScript · Vite ·
react-router-dom. Static JSON data, no backend. Map uses the world-atlas 110m TopoJSON on a
`geoEqualEarth` projection; geolocation is IP-based (`ipapi.co`) to pulse your home country
while idle.

Desktop-first: map interaction relies on hover/click. The 28 micro/island states without a
shape in the 110m TopoJSON are reachable via URL or panel links.
