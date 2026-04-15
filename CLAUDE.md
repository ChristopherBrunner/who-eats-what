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

No test suite yet.

## Critical Rule

The **default view is "who loves this country's cuisine"** — NOT "what does this country eat." This is the emotional hook and must be the landing state for every country click. The reverse view ("what [country] loves") is secondary and accessed via a panel link.

## Architecture

**Stack:** React 19 + react-simple-maps + d3-geo + Tailwind CSS v4 + TypeScript + Vite. Data is static JSON (no backend).

**Planned component structure:**
- Map component (react-simple-maps) — renders Europe with hover/select states
- Side panel — single-scroll, no tabs; shows cuisine relationships for selected country
- URL router — every country+mode combination gets a shareable URL

**URL scheme:** `/[country-slug]/loved-by` (default) and `/[country-slug]/loves`. Share button copies URL and appends `?ref=share`.

**Data schema:** Static JSON with a flat list per country: cuisines that country loves, with example dishes and a "surprise pick" tag for the least-expected cuisine.

**Map visual design:** Subdued base map, data layer carries all visual energy. Selected country gets glow + border. Connected countries use warm accent color. Inspired by earth.nullschool.net and submarinecablemap.com.

**Side panel behavior:**
- Header shows e.g. "12 countries love French cuisine"
- Lists connected countries with example dishes
- Bottom link: "See what France loves →" to flip perspective
- After flipping, a persistent "Back to who loves France" link appears
- Mode (loved-by vs. loves) persists across country clicks

**Onboarding:** Detect user's country via geolocation and have it pulsing on map load.

**Dark/light mode:** Both from the start, using `prefers-color-scheme` auto-detection. Base styles already use `bg-gray-950`.

**OG images:** Dynamic per-country previews via Vercel OG (non-negotiable for MVP shareability).

## Scope

MVP: 15–20 European countries, flat Natural Earth or Robinson projection map. Globe view is v2. The plan doc (`food-map-mvp-plan-v5.md`, gitignored) contains full decisions on data scoring methodology, roadmap, and brand voice.
