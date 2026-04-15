# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Who Eats What

Interactive map showing cross-country food preference relationships. Click a country to see which other countries love its cuisine (primary view), or flip to see what that country loves eating from elsewhere.

## Commands

```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # TypeScript compile + Vite production build
npm run lint      # ESLint
npm run preview   # Preview production build locally
```

Always use `--legacy-peer-deps` when installing packages — react-simple-maps has an unresolved peer dep conflict with React 19.

No test suite yet.

## Critical Rule

The **default view is "who loves this country's cuisine"** — NOT "what does this country eat." This is the emotional hook and must be the landing state for every country click. The reverse view ("what [country] loves") is secondary and accessed via a panel link.

## Architecture

**Stack:** React 19 + react-simple-maps + d3-geo + Tailwind CSS v4 + TypeScript + Vite + react-router-dom. Data is static JSON (no backend).

**URL scheme:** `/:countryId/:mode` where mode is `loved-by` or `loves`. Root `/` is the empty/idle state. Share button appends `?ref=share`.

**Component structure:**
- `src/App.tsx` — router, geolocation fetch on mount, passes `homeCountry` down
- `src/components/EuropeMap.tsx` — react-simple-maps map, handles all SVG fill logic
- `src/components/SidePanel.tsx` — cuisine relationship panel, share button, mode toggle
- `src/hooks/useColorScheme.ts` — listens to `prefers-color-scheme`, returns `'light' | 'dark'`

**Dark/light mode:**
- Components use Tailwind `dark:` variants (media-query based, no toggle)
- EuropeMap SVG fills can't use CSS classes — uses `useColorScheme()` hook + `MAP_COLORS` object keyed by `'light' | 'dark'`

**Data schema:** `src/data/cuisines.json` — keyed by country slug. Each country has `name`, `code` (ISO alpha-2), and `loves` array. The "loved-by" view is derived at runtime by scanning all `loves` arrays — no redundant storage.

**Map:** Mercator projection, `scale: 680, center: [13, 53]`, world-atlas TopoJSON. Countries matched via ISO 3166-1 numeric IDs in `NUMERIC_TO_ID` map. 16 European countries are interactive; all others render as non-interactive background.

**Geolocation:** IP-based via `ipapi.co/json/` on app mount — no permission prompt. Silently fails if outside the 16 mapped countries. Pulses the home country on the map while idle.

## Scope

MVP: 15–20 European countries, flat map, shareable URLs. Mobile is an afterthought — map interaction requires desktop hover/click patterns. The plan doc (`food-map-mvp-plan-v5.md`, gitignored) contains full decisions on data scoring methodology, roadmap, and brand voice.
