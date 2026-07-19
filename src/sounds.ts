// Synthesized UI sounds via Web Audio API — no external files.
// All sounds are quiet by design: present but never intrusive.

// ─── Primitives ──────────────────────────────────────────────────────────────

function buildUp(ctx: AudioContext, startTime: number, duration: number): OscillatorNode {
  // A gentle rising sine sweep that creates pre-reveal tension.
  // Fades in, peaks, then fades to silence just before the first tick.
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(180, startTime)
  osc.frequency.exponentialRampToValueAtTime(480, startTime + duration)

  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(0.06, startTime + duration * 0.30)
  gain.gain.linearRampToValueAtTime(0.09, startTime + duration * 0.75)
  gain.gain.linearRampToValueAtTime(0.001, startTime + duration)  // fade before first tick

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.01)

  return osc
}

function tick(ctx: AudioContext, when: number, pitchHz: number): OscillatorNode {
  // Short sine burst with a slight pitch glide downward — gives a soft "thud" quality.
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(pitchHz, when)
  osc.frequency.exponentialRampToValueAtTime(pitchHz * 0.65, when + 0.045)

  gain.gain.setValueAtTime(0, when)
  gain.gain.linearRampToValueAtTime(0.10, when + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.07)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(when)
  osc.stop(when + 0.08)

  return osc
}

function completionDing(ctx: AudioContext, when: number): OscillatorNode[] {
  // Soft two-note interval: E5 + B5 (major fifth — open and resolved).
  return [659, 988].map((freq, j) => {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    const t    = when + j * 0.05

    osc.type = 'sine'
    osc.frequency.value = freq

    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.07, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.6)

    return osc
  })
}

// ─── Public API ──────────────────────────────────────────────────────────────

// Single shared AudioContext for the app. Created lazily inside a user
// gesture (click) to satisfy browser autoplay policy; null until then,
// which keeps direct URL loads silent (the browser would block them anyway).
let sharedCtx: AudioContext | null = null

/**
 * Unlock audio on the first user gesture anywhere on the page.
 * Needed for direct-link loads (e.g. /usa/loved-by?ref=share): the initial
 * reveal must run silently (browser autoplay policy), but the very first
 * pointer/key input primes the context so every subsequent reveal — panel
 * mode toggles included — has sound. Idempotent; safe under StrictMode.
 */
export function installAudioUnlock() {
  const unlock = () => ensureAudioReady()
  window.addEventListener('pointerdown', unlock, { once: true, capture: true })
  window.addEventListener('keydown', unlock, { once: true, capture: true })
}

/** Whether a user gesture has unlocked audio yet (false on direct-link loads). */
export function isAudioUnlocked(): boolean {
  return sharedCtx !== null
}

/**
 * Create (on first call) and resume the shared AudioContext.
 * Must be called from a user-gesture handler.
 */
export function ensureAudioReady(): AudioContext {
  if (!sharedCtx) {
    sharedCtx = new AudioContext()
    // Prime with a silent buffer to avoid the browser's initial click/pop.
    const buf = sharedCtx.createBuffer(1, 1, sharedCtx.sampleRate)
    const src = sharedCtx.createBufferSource()
    src.buffer = buf
    src.connect(sharedCtx.destination)
    src.start()
  }
  if (sharedCtx.state === 'suspended') void sharedCtx.resume()
  return sharedCtx
}

/**
 * Schedule all sounds for a country reveal sequence.
 *
 * Timing model:
 *   - Build-up plays immediately, rising for (initialMs - 50ms), then fades.
 *   - First tick fires at exactly initialMs — same for ALL countries.
 *   - Remaining ticks accelerate via a sqrt curve from initialMs → totalMs.
 *   - Completion ding fires just after the last tick.
 *   - If count === 0, nothing plays (no audio without a visual counterpart).
 *
 * Tolerates a still-suspended context (the first click): scheduling is
 * deferred until resume() settles, and cancelled if cleanup ran meanwhile.
 *
 * Returns a cleanup fn that stops and disconnects all scheduled nodes,
 * safe to call even if nodes have already finished naturally.
 */
export function scheduleRevealSounds(
  count: number,
  initialMs: number,
  totalMs: number,
  // 'rising' for loved-by (affection arriving), 'falling' for loves
  // (appetite reaching out) — the modes sound mirrored.
  pitchDirection: 'rising' | 'falling' = 'rising',
  // Extra wait before the completion ding (heart flight time — the ding
  // marks the last heart LANDING, in sync with the visual finale).
  dingExtraMs = 0,
  // Landing plips, one flight time after each tick. 'sparse' mirrors the
  // ripple thinning (first 6, then every 6th) so sound matches what's
  // visible; 'all' for the small loves lists; 'none' keeps them silent.
  landPattern: 'all' | 'sparse' | 'none' = 'none',
): () => void {
  const ctx = sharedCtx
  if (!ctx || count === 0) return () => {}

  let cancelled = false
  const nodes: OscillatorNode[] = []

  const schedule = () => {
    if (cancelled) return
    const now      = ctx.currentTime
    const initSec  = initialMs / 1000
    const totalSec = totalMs   / 1000
    const span     = totalSec - initSec

    // EXPERIMENT: build-up + reveal ticks muted to audition the arrival
    // plips in isolation — restore by unsetting MUTE_LAUNCH_SOUNDS.
    const MUTE_LAUNCH_SOUNDS = true

    if (!MUTE_LAUNCH_SOUNDS) {
      // 1. Build-up — fills the anticipation window
      nodes.push(buildUp(ctx, now, initSec - 0.05))

      // 2. Ticks, one per revealed country
      for (let i = 0; i < count; i++) {
        // Anchored sqrt curve: i=0 → frac=0 → t=initSec,  i=N-1 → frac=1 → t=totalSec
        const frac  = count === 1 ? 0 : i / (count - 1)
        const t     = now + initSec + span * Math.sqrt(frac)
        const pitch = pitchDirection === 'rising'
          ? 380 + 200 * frac   // 380 Hz → 580 Hz, rising with the cascade
          : 580 - 200 * frac   // 580 Hz → 380 Hz, falling
        nodes.push(tick(ctx, t, pitch))
      }
    }

    // 3. Arrival ticks — the og reveal-tick sound, played as each heart
    // touches down one flight after launch; pitch still walks the cascade.
    if (landPattern !== 'none' && dingExtraMs > 0) {
      for (let i = 0; i < count; i++) {
        if (landPattern === 'sparse' && !(i < 6 || i % 6 === 0)) continue
        const frac = count === 1 ? 0 : i / (count - 1)
        const t = now + initSec + span * Math.sqrt(frac) + dingExtraMs / 1000
        const pitch = pitchDirection === 'rising' ? 380 + 200 * frac : 580 - 200 * frac
        nodes.push(tick(ctx, t, pitch))
      }
    }

    nodes.push(...completionDing(ctx, now + totalSec + dingExtraMs / 1000 + 0.04))
  }

  if (ctx.state === 'running') {
    schedule()
  } else {
    // First click: resume() from the gesture handler hasn't settled yet.
    void ctx.resume().then(schedule).catch(() => {})
  }

  return () => {
    cancelled = true
    nodes.forEach(n => {
      try { n.stop(); n.disconnect() } catch { /* already finished */ }
    })
  }
}
