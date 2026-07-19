import { useState } from 'react'
import type { ViewMode } from '../types'
import { lovesModeUsed, markLovesModeUsed } from '../modeDiscovery'

// Thumb colors match the map's mode accents (MODE_ACCENTS in EuropeMap).
const THUMB_COLOR: Record<ViewMode, string> = {
  'loved-by': '#c4802e',
  'loves': '#cf4d68',
}

interface Props {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}

/**
 * Big glass mode switch next to the search bar: amber "loved by" (who loves
 * this country's food — the default view) vs rose "loves" (what it loves).
 * The thumb springs across and morphs color; until the loves view has been
 * opened once, the whole pill breathes an accent ring begging to be clicked.
 */
export function ModeToggle({ mode, onChange }: Props) {
  const [used, setUsed] = useState(lovesModeUsed)
  const isLoves = mode === 'loves'

  const flip = (next: ViewMode) => {
    if (next === mode) return
    markLovesModeUsed()
    setUsed(true)
    onChange(next)
  }

  return (
    <div
      role="group"
      aria-label="View mode"
      className={`relative flex w-60 rounded-full p-1 select-none
        bg-white/55 dark:bg-white/[0.06]
        backdrop-blur-xl backdrop-saturate-150
        border border-white/60 dark:border-white/10
        shadow-lg shadow-black/[0.07] dark:shadow-black/40
        ${!used ? 'animate-toggle-beckon' : ''}`}
    >
      {/* springy color-morphing thumb */}
      <div
        aria-hidden
        className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full"
        style={{
          backgroundColor: THUMB_COLOR[mode],
          boxShadow: `0 2px 12px ${THUMB_COLOR[mode]}59`,
          transform: isLoves ? 'translateX(100%)' : 'translateX(0)',
          transition:
            'transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 450ms ease, box-shadow 450ms ease',
        }}
      />

      <button
        type="button"
        aria-pressed={!isLoves}
        onClick={() => flip('loved-by')}
        className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full cursor-pointer
          text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-300
          ${!isLoves ? 'text-[#fdf6e9]' : 'text-[#8a7e68] dark:text-[#7a7260] hover:text-[#5a5040] dark:hover:text-[#a89e8a]'}`}
      >
        {/* incoming heart — the world loves this cuisine */}
        <svg key={String(!isLoves)} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
          className={`w-3.5 h-3.5 ${!isLoves ? 'animate-mode-pop' : ''}`}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        loved by
      </button>

      <button
        type="button"
        aria-pressed={isLoves}
        onClick={() => flip('loves')}
        className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full cursor-pointer
          text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-300
          ${isLoves ? 'text-[#fdf0f2]' : 'text-[#8a7e68] dark:text-[#7a7260] hover:text-[#5a5040] dark:hover:text-[#a89e8a]'}`}
      >
        {/* fork & knife — this country's appetite */}
        <svg key={String(isLoves)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          className={`w-3.5 h-3.5 ${isLoves ? 'animate-mode-pop' : ''}`}>
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
        </svg>
        loves
      </button>
    </div>
  )
}
