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

    // 1. Build-up — fills the anticipation window
    nodes.push(buildUp(ctx, now, initSec - 0.05))

    // 2. Ticks, one per revealed country
    for (let i = 0; i < count; i++) {
      // Anchored sqrt curve: i=0 → frac=0 → t=initSec,  i=N-1 → frac=1 → t=totalSec
      const frac  = count === 1 ? 0 : i / (count - 1)
      const t     = now + initSec + span * Math.sqrt(frac)
      const pitch = 380 + 200 * frac   // 380 Hz → 580 Hz, rising with the cascade
      nodes.push(tick(ctx, t, pitch))
    }

    nodes.push(...completionDing(ctx, now + totalSec + 0.04))
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
