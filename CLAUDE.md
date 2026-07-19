# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Who Eats What

Interactive map showing cross-country food preference relationships. Click a country to see which other countries love its cuisine (primary view), or flip to see what that country loves eating from elsewhere.

## Commands

```bash
npm run dev            # Start dev server (Vite HMR)
npm run build          # TypeScript compile + Vite production build
npm run lint           # ESLint
npm run preview        # Preview production build locally
npm run validate-data  # Check cuisines.json invariants + map alignment
npm run data-report    # Read-only data health snapshot (coverage, integrity, sanity)
npm test               # node:test data + geo invariant suite (no extra deps)
```

Always use `--legacy-peer-deps` when installing packages — react-simple-maps has an unresolved peer dep conflict with React 19.

Tests live in `tests/*.test.mjs` and use Node's built-in `node:test` (no framework dependency) — they assert data invariants (every country loved, one surprise pick, referential integrity, well-formed sources/reasons) and geo/centroid/`NAME_TO_ID` coverage. `validate-data` enforces hard invariants in CI-style; `npm test` overlaps but is assertion-based and extensible.

## Critical Rule

The **default view is "who loves this country's cuisine"** — NOT "what does this country eat." This is the emotional hook and must be the landing state for every country click. The reverse view ("what [country] loves") is secondary and accessed via a panel link.

## Architecture

**Stack:** React 19 + react-simple-maps + d3-geo + Tailwind CSS v4 + TypeScript + Vite + react-router-dom. Data is static JSON (no backend).

**URL scheme:** `/:countryId/:mode` where mode is `loved-by` or `loves`. Root `/` is the empty/idle state. Share button appends `?ref=share`.

**Component structure:**
- `src/App.tsx` — router, geolocation fetch on mount, passes `homeCountry` down; holds `idleMode` (mode used while no country is selected), the `--accent` CSS vars, the per-mode inner vignettes (amber/rose, cross-fading layers), and the `ThemeToggle` button. The map area reserves a **permanent 360px right rail** (flush to the panel) so selecting/deselecting never resizes the map or shifts click targets; top controls (search, dice random-pick, mode toggle) and the idle prompt center over the map area, not the window. In loves mode countries light up when their heart lands (`arrivedSet` from the reveal hook), not at launch
- `src/components/EuropeMap.tsx` — react-simple-maps map, handles all SVG fill logic; zoom/pan via `ZoomableGroup` (wheel/pinch 1–8×, `vector-effect: non-scaling-stroke` keeps borders crisp, marker radii divide by the settled zoom factor)
- `src/components/SidePanel.tsx` — always-mounted right rail: idle state shows dataset stats + quick-start picks (home country, curated picks, random "somewhere unexpected"); selection shows the cuisine relationship list, share button, mode toggle
- `src/components/SearchBar.tsx` + `src/components/ModeToggle.tsx` — floating glass controls at top-center; the toggle springs between amber "loved by" and rose "loves" and pulses until the loves view is first used (`src/modeDiscovery.ts`, localStorage `loves-mode-used` — also gates the panel CTA pulse)
- `src/hooks/useColorScheme.ts` — effective scheme store ('light' | 'dark'), system preference + manual override

**Mode theming:** the two views have distinct accent palettes — amber for "loved by" (default), rose for "loves". Map colors come from `MODE_ACCENTS` in EuropeMap; panel/UI accents come from the `--accent` vars set in App (`ACCENT_UI` — keep both in sync). Mode is also signalled by the toggle thumb color, the accent-tinted inner vignette (amber ↔ rose), and the idle prompt text.

**Dark/light mode:**
- Components use Tailwind `dark:` variants, class-based (`@custom-variant dark` in index.css). `useColorScheme.ts` mirrors the effective scheme onto `<html class="dark">`: system preference by default, manual override via the glass toggle button (bottom-left, `ThemeToggle` in App.tsx), persisted in localStorage (`color-scheme`); toggling back to the system's scheme clears the override
- EuropeMap SVG fills can't use CSS classes — uses `useColorScheme()` hook + `MAP_COLORS` object keyed by `'light' | 'dark'`

**Data schema:** `src/data/cuisines.json` — keyed by country slug. Each country has `name`, `code` (ISO alpha-2), and `loves` array. Each loves entry has `cuisineCountryId`, `cuisineName`, `exampleDishes`, `surprisePick` (exactly one per country), plus optional `strength` (0–100, % who like the cuisine from survey data), `source` (citation), and `reason` (influence category: migration/colonial/proximity/trade/soft-power/tourism — regenerate via `node scripts/tag-reasons.mjs`). Data edits go through the canonical serializer in `scripts/format-data.mjs`. The "loved-by" view is derived at runtime by scanning all `loves` arrays — no redundant storage.

**Data sourcing:** Nearly every `loves` entry is evidence-backed (1745 of 1748 sourced). Sourcing tiers, strongest first: (1) the **YouGov Global Cuisine Survey 2019** (24 markets × 34 cuisines) — 23 markets carry `strength` (% who like) + `source`; (2) **OpenStreetMap restaurant-density** counts, cited only where a cuisine ranks in a country's top-8 foreign cuisines AND has ≥8 tagged restaurants (`scripts/merge-osm-sources.mjs`, scraper `scripts/osm-cuisine-counts.mjs`); (3) **heritage/diaspora & documented global-reach** citations (colonial ties, diaspora population figures, gastrodiplomacy programmes); (4) **shared-region proximity** for neighbour pairs. The ≥8 floor is deliberate — don't lower it to inflate coverage. The 3 still-uncited entries are honest holds lacking real evidence. Run `npm run validate-data` after any data change.

**Loved-by coverage:** Every country is loved by at least one other, and all but San Marino (an enclave wholly within Italy) by at least two — the emotional hook is that clicking any country shows who loves its cuisine. Thin coverage was enriched with evidence-backed neighbour/diaspora relationships (`surprisePick: false`, always with a `source`); reasons are regenerated by `node scripts/tag-reasons.mjs`.

**Map:** `geoRobinson` projection (from `d3-geo-projection`, minimal typing in `src/d3-geo-projection.d.ts`; passed as a function so scale/rotate are baked in, not via `projectionConfig`), world-atlas TopoJSON (110m). Countries matched via ISO 3166-1 numeric IDs in `NUMERIC_TO_ID`; id-less geometries (Kosovo) fall back to a name match via `NAME_TO_ID` (`countryIdFromGeo`). 196 countries have data — all UN members plus Taiwan/Palestine/Kosovo — and all are clickable on the map. 28 micro/island states (Singapore, Malta, Monaco, the small Caribbean and Pacific islands — see SHAPELESS_COUNTRIES in useRevealSequence.ts) have no shape in the 110m TopoJSON and render as clickable centroid dot markers instead; every country is also reachable via the floating search bar (`SearchBar.tsx`) at the top of the map.

**Geolocation:** IP-based via `ipapi.co/json/` on app mount — no permission prompt. Silently fails if outside mapped countries. Pulses the home country on the map while idle.

## Scope

195 countries across all continents — full UN-member coverage. Flat world map, shareable URLs. Mobile is an afterthought — map interaction requires desktop hover/click patterns. The plan doc (`food-map-mvp-plan-v5.md`, gitignored) contains full decisions on data scoring methodology, roadmap, and brand voice.
