// Synthesized UI sounds via Web Audio API — no external files.
// All sounds are quiet by design: present but never intrusive.

// ─── Primitives ──────────────────────────────────────────────────────────────

function impact(ctx: AudioContext, when: number): AudioScheduledSourceNode[] {
  // Thump on the click: a low sine dropping 165 → 62Hz. The first arrival is
  // a full REVEAL_INITIAL_MS away, so without this the click lands in silence
  // and reads as lag. A ~10ms filtered-noise transient rides on top — the
  // body alone booms, and the transient is what makes it read as a strike
  // landing on something rather than a tone fading in.
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(165, when)
  osc.frequency.exponentialRampToValueAtTime(62, when + 0.09)

  gain.gain.setValueAtTime(0, when)
  gain.gain.linearRampToValueAtTime(0.13, when + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.19)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(when)
  osc.stop(when + 0.2)

  // Attack transient: a very short burst of noise, high-passed so it adds
  // edge without hiss, and quiet enough to be felt more than heard.
  const len = Math.floor(ctx.sampleRate * 0.012)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2   // decays over the burst
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buf

  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 1400

  const noiseGain = ctx.createGain()
  noiseGain.gain.value = 0.05

  noise.connect(hp)
  hp.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noise.start(when)

  return [osc, noise]
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

// E major pentatonic, E4 → B5. Arrival pitches SNAP to these instead of
// gliding continuously: a pentatonic scale has no dissonant interval, so a
// 30-tick cascade reads as a melody rather than a siren, and repeated
// neighbours land as sustained steps. The top note is B5 and the completion
// ding is E5+B5 — the cascade climbs into the chord that resolves it.
const PENTATONIC_HZ = [
  329.63, 369.99, 415.30, 493.88, 554.37,
  659.25, 739.99, 830.61, 987.77,
]

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
 * The reveal is scored on ARRIVALS only: a tick as each heart touches down,
 * never at launch. Auditioned against the alternatives (a build-up riser and
 * a tick per light-up, kept on the `sound-layer-toggles` branch) — scoring
 * both ends made the cascade a wall of noise, and the landings are the beat
 * worth hearing. Don't re-add launch sounds without re-auditioning.
 *
 * Timing model:
 *   - Reveal i lights up on a sqrt curve from initialMs → totalMs; its tick
 *     fires one flight time (dingExtraMs) later, when the heart lands.
 *   - Completion ding fires just after the last landing.
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
  // Which landings get a tick, from accentIndices() — the same set that
  // decides which landings get a visible ripple, so sound matches sight.
  // Omit to leave only the ding.
  accents?: Set<number>,
): () => void {
  const ctx = sharedCtx
  if (!ctx || count === 0) return () => {}

  let cancelled = false
  const nodes: AudioScheduledSourceNode[] = []

  const schedule = () => {
    if (cancelled) return
    const now      = ctx.currentTime
    const initSec  = initialMs / 1000
    const totalSec = totalMs   / 1000
    const span     = totalSec - initSec

    // Impact on the click itself, before the anticipation gap.
    nodes.push(...impact(ctx, now))

    // Arrival ticks — one per heart landing, a flight time after its
    // country lit up. Anchored sqrt curve: i=0 → frac=0 → t=initSec,
    // i=N-1 → frac=1 → t=totalSec, then shifted by the flight.
    if (accents && dingExtraMs > 0) {
      for (let i = 0; i < count; i++) {
        if (!accents.has(i)) continue
        const frac = count === 1 ? 0 : i / (count - 1)
        const t    = now + initSec + span * Math.sqrt(frac) + dingExtraMs / 1000
        // Walk the scale up in loved-by (affection arriving), down in loves.
        const step = pitchDirection === 'rising' ? frac : 1 - frac
        nodes.push(tick(ctx, t, PENTATONIC_HZ[Math.round(step * (PENTATONIC_HZ.length - 1))]))
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
