/**
 * Air track + pulley system (cart on a horizontal air track pulled by a hanging
 * mass over a pulley at the end of the track).
 *
 * Shared pure physics for:
 *  - HKEM (Hukum Kekekalan Energi Mekanik, Modul 6 Fisika Dasar 1)
 *  - H2N  (Hukum II Newton) — planned reuse of the same apparatus.
 *
 * Pure, deterministic, React-free. Every public function is guarded so that it
 * never returns NaN or Infinity (edge cases return 0 or null instead).
 *
 * Model
 * -----
 * Phase 1 (hanging mass falling, x < dropHeight):
 *   a = (m·g − f) / (M + m + m_eff)          (ideal: f = 0, m_eff = 0 → a = m·g/(M+m))
 * Phase 2 (hanging mass resting on the floor, string slack):
 *   cart coasts and is slowed only by the residual air-track friction:
 *   a₂ = −f / M
 * The cart is stopped by the end bumper at `railTravel`.
 *
 * Position x is the displacement of the flag's leading edge from its release
 * point. A photogate at x_g is blocked while the flag (width w) occupies it,
 * i.e. from x = x_g to x = x_g + w.
 */

/** Standard gravitational acceleration used by the lab manual (m/s²). */
export const G_STANDARD = 9.8;

/**
 * [CATATAN ASUMSI DESAIN SIMULASI]:
 * Buku panduan Modul 6 Fisika Dasar 1 (HKEM) mencantumkan variabel massa kereta M
 * dan beban gantung m pada Tabel 6.1 tanpa mendikte nilai nominal beban gantung secara spesifik.
 * Pemilihan variasi beban gantung kelipatan 5 g (5 g, 10 g, 15 g, 20 g) pada modul praktikum
 * adalah ASUMSI perancangan antarmuka simulasi, BUKAN batasan mutlak dari teks panduan praktikum.
 */

export interface AirTrackPulleyParams {
  /** M — cart (glider) mass in kg, including any slotted mass on the cart. */
  cartMass: number;
  /** m — total hanging mass in kg (hanger + slotted weights). */
  hangingMass: number;
  /** Gravitational acceleration (m/s²). Default 9.8. */
  g?: number;
  /** f — residual air-track friction force in N. Default 0 (ideal). */
  frictionForce?: number;
  /** m_eff — effective mass of the pulley's rotational inertia (I/r²) in kg. Default 0 (ideal). */
  pulleyEffectiveMass?: number;
}

export interface AirTrackGeometry {
  /** H0 — initial height of the hanging mass above the floor (m). Equals the max accelerated travel of the cart. */
  dropHeight: number;
  /** Max travel of the flag before the cart hits the end bumper (m). Must be ≥ dropHeight to be meaningful. */
  railTravel: number;
}

export type MotionPhase = "rest" | "accelerating" | "coasting" | "stopped";

export interface MotionState {
  t: number;
  x: number;
  v: number;
  a: number;
  phase: MotionPhase;
}

// ─── Guards ──────────────────────────────────────────────────────────────────

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function nonNegative(value: number | undefined, fallback = 0): number {
  const v = finiteOr(value ?? fallback, fallback);
  return v > 0 ? v : 0;
}

function resolved(params: AirTrackPulleyParams) {
  return {
    M: nonNegative(params.cartMass),
    m: nonNegative(params.hangingMass),
    g: nonNegative(params.g, G_STANDARD),
    f: nonNegative(params.frictionForce),
    mEff: nonNegative(params.pulleyEffectiveMass),
  };
}

// ─── Dynamics ────────────────────────────────────────────────────────────────

/**
 * Acceleration of the system while the hanging mass falls.
 * a = (m·g − f) / (M + m + m_eff). Returns 0 when the system cannot move
 * (no hanging mass, zero total mass, or friction ≥ driving force).
 */
export function systemAcceleration(params: AirTrackPulleyParams): number {
  const { M, m, g, f, mEff } = resolved(params);
  const totalInertia = M + m + mEff;
  if (totalInertia <= 0) return 0;
  const drive = m * g - f;
  if (drive <= 0) return 0;
  return finiteOr(drive / totalInertia, 0);
}

/** Cart deceleration magnitude after the hanging mass lands (f / M). 0 if M = 0. */
export function coastingDeceleration(params: AirTrackPulleyParams): number {
  const { M, f } = resolved(params);
  if (M <= 0 || f <= 0) return 0;
  return finiteOr(f / M, 0);
}

/**
 * String tension on the cart side (T₁ = M·a + f) and on the hanging side
 * (T₂ = m·(g − a)). Equal when the pulley is ideal (m_eff = 0) and there is no friction.
 */
export function stringTensions(params: AirTrackPulleyParams): { cartSide: number; hangingSide: number } {
  const { M, m, g, f } = resolved(params);
  const a = systemAcceleration(params);
  if (a <= 0) {
    // Static: friction holds the cart, the string carries the hanging weight.
    return { cartSide: m * g, hangingSide: m * g };
  }
  return {
    cartSide: finiteOr(M * a + f, 0),
    hangingSide: finiteOr(m * (g - a), 0),
  };
}

/** Instantaneous speed after accelerating from rest over distance x: v = √(2·a·x). */
export function velocityAtPosition(acceleration: number, x: number): number {
  if (!(acceleration > 0) || !(x > 0)) return 0;
  return finiteOr(Math.sqrt(2 * acceleration * x), 0);
}

/** Time to reach x from rest with constant acceleration: t = √(2x/a). Null if never reached. */
export function timeToReachPosition(acceleration: number, x: number): number | null {
  if (!Number.isFinite(x)) return null;
  if (x <= 0) return 0;
  if (!(acceleration > 0)) return null;
  return finiteOr(Math.sqrt((2 * x) / acceleration), 0);
}

/**
 * Time for a flag of width w to pass a gate at x_g, constant acceleration from rest:
 *   t = (√(2a(x_g + w)) − √(2a·x_g)) / a
 * evaluated in the algebraically identical, cancellation-free form
 *   t = 2w / (√(2a(x_g + w)) + √(2a·x_g)).
 * Null if a ≤ 0 or w ≤ 0.
 */
export function gateTransitTime(acceleration: number, gatePosition: number, flagWidth: number): number | null {
  if (!(acceleration > 0) || !(flagWidth > 0) || !Number.isFinite(gatePosition)) return null;
  const xg = gatePosition > 0 ? gatePosition : 0;
  const denom = Math.sqrt(2 * acceleration * (xg + flagWidth)) + Math.sqrt(2 * acceleration * xg);
  if (!(denom > 0)) return null;
  return finiteOr((2 * flagWidth) / denom, 0);
}

/** Velocity reported from a photogate: v = w / t (mean speed during the transit). 0 if t invalid. */
export function measuredVelocity(flagWidth: number, transitTime: number | null): number {
  if (transitTime === null || !(transitTime > 0) || !(flagWidth > 0)) return 0;
  return finiteOr(flagWidth / transitTime, 0);
}

// ─── Two-phase motion (used by the apparatus animation) ──────────────────────

/** Kinematic state at time t after release (from rest at x = 0). */
export function motionStateAtTime(
  params: AirTrackPulleyParams,
  geometry: AirTrackGeometry,
  t: number
): MotionState {
  const a1 = systemAcceleration(params);
  const H0 = nonNegative(geometry.dropHeight);
  const xEnd = Math.max(nonNegative(geometry.railTravel), H0);
  const time = finiteOr(t, 0);

  if (time <= 0 || a1 <= 0 || H0 <= 0) {
    return { t: Math.max(time, 0), x: 0, v: 0, a: a1 > 0 && H0 > 0 ? a1 : 0, phase: "rest" };
  }

  const tLand = Math.sqrt((2 * H0) / a1);
  if (time < tLand) {
    return { t: time, x: 0.5 * a1 * time * time, v: a1 * time, a: a1, phase: "accelerating" };
  }

  // Phase 2: coasting after the hanging mass lands.
  const vLand = a1 * tLand;
  const dec = coastingDeceleration(params);
  const tau = time - tLand;
  const tStopByFriction = dec > 0 ? vLand / dec : Infinity;
  const tauEff = Math.min(tau, tStopByFriction);
  let x = H0 + vLand * tauEff - 0.5 * dec * tauEff * tauEff;
  let v = vLand - dec * tauEff;

  if (x >= xEnd) {
    return { t: time, x: xEnd, v: 0, a: 0, phase: "stopped" };
  }
  if (tau >= tStopByFriction) {
    v = 0;
    return { t: time, x, v, a: 0, phase: "stopped" };
  }
  x = finiteOr(x, H0);
  v = finiteOr(v, 0);
  return { t: time, x, v, a: -dec, phase: "coasting" };
}

/** Time at which the flag reaches position x (two-phase). Null if never reached. */
export function timeAtPosition(
  params: AirTrackPulleyParams,
  geometry: AirTrackGeometry,
  x: number
): number | null {
  if (!Number.isFinite(x)) return null;
  if (x <= 0) return 0;
  const a1 = systemAcceleration(params);
  const H0 = nonNegative(geometry.dropHeight);
  const xEnd = Math.max(nonNegative(geometry.railTravel), H0);
  if (a1 <= 0 || H0 <= 0 || x > xEnd) return null;

  if (x <= H0) return Math.sqrt((2 * x) / a1);

  const tLand = Math.sqrt((2 * H0) / a1);
  const vLand = a1 * tLand;
  const dec = coastingDeceleration(params);
  const dx = x - H0;
  const disc = vLand * vLand - 2 * dec * dx;
  if (disc < 0) return null; // friction stops the cart first
  const tau = (2 * dx) / (vLand + Math.sqrt(disc));
  const total = tLand + tau;
  return Number.isFinite(total) ? total : null;
}

/**
 * Two-phase gate transit time. Uses the cancellation-free closed form when the
 * whole transit happens during the accelerating phase; otherwise differences
 * the two-phase arrival times (handles a flag that is too wide / gate past H0).
 */
export function gateTransitTimeTwoPhase(
  params: AirTrackPulleyParams,
  geometry: AirTrackGeometry,
  gatePosition: number,
  flagWidth: number
): number | null {
  if (!(flagWidth > 0)) return null;
  const H0 = nonNegative(geometry.dropHeight);
  const a1 = systemAcceleration(params);
  if (gatePosition + flagWidth <= H0) {
    return gateTransitTime(a1, gatePosition, flagWidth);
  }
  const tIn = timeAtPosition(params, geometry, gatePosition);
  const tOut = timeAtPosition(params, geometry, gatePosition + flagWidth);
  if (tIn === null || tOut === null) return null;
  const dt = tOut - tIn;
  return dt > 0 && Number.isFinite(dt) ? dt : null;
}

// ─── Energy ──────────────────────────────────────────────────────────────────

/** EK = ½ (M + m) v² — kinetic energy of the moving system (cart + hanging mass). */
export function kineticEnergy(cartMass: number, hangingMass: number, v: number): number {
  const total = nonNegative(cartMass) + nonNegative(hangingMass);
  const speed = finiteOr(v, 0);
  return finiteOr(0.5 * total * speed * speed, 0);
}

/** EP = m g h — gravitational potential energy of the hanging mass (floor as reference). */
export function potentialEnergy(hangingMass: number, h: number, g: number = G_STANDARD): number {
  return finiteOr(nonNegative(hangingMass) * nonNegative(g, G_STANDARD) * finiteOr(h, 0), 0);
}

/** EM = EK + EP. */
export function mechanicalEnergy(ek: number, ep: number): number {
  return finiteOr(finiteOr(ek, 0) + finiteOr(ep, 0), 0);
}

/** Height of the hanging mass above the floor when the cart has travelled x: h = H0 − x (≥ 0). */
export function hangingHeight(dropHeight: number, x: number): number {
  const h = finiteOr(dropHeight, 0) - finiteOr(x, 0);
  return h > 0 ? h : 0;
}

/** EM1 − EM2 (positive means mechanical energy was lost between point 1 and point 2). */
export function energyDifference(em1: number, em2: number): number {
  return finiteOr(finiteOr(em1, 0) - finiteOr(em2, 0), 0);
}

/**
 * Percentage difference relative to EM1: (EM1 − EM2) / EM1 × 100 %.
 * ASSUMPTION: the lab manual does not define the reference; EM1 is used. Returns 0 if EM1 = 0.
 */
export function energyDifferencePercent(em1: number, em2: number): number {
  const ref = finiteOr(em1, 0);
  if (Math.abs(ref) < 1e-15) return 0;
  return finiteOr(((ref - finiteOr(em2, 0)) / Math.abs(ref)) * 100, 0);
}

// ─── Full trial (Tabel 6.1 + 6.2 in one call) ────────────────────────────────

export interface GateSetup {
  /** x₁ — position of gate 1 along the track, measured from the flag's release point (m). */
  gate1Position: number;
  /** x₂ — position of gate 2 (m). */
  gate2Position: number;
  /** w — width of the light blocker flag (m). */
  flagWidth: number;
}

export interface AirTrackTrialResult {
  acceleration: number;
  /** Photogate readings (ACCELERATION mode). Null if the flag never fully passes the gate. */
  t1: number | null;
  t2: number | null;
  /** Interval from gate 1 blocking start to gate 2 blocking start. */
  t12: number | null;
  h1: number;
  h2: number;
  /** v = w/t (what the student computes). */
  v1: number;
  v2: number;
  /** True instantaneous speed when the flag's leading edge reaches the gate. */
  v1True: number;
  v2True: number;
  ek1: number;
  ep1: number;
  em1: number;
  ek2: number;
  ep2: number;
  em2: number;
  difference: number;
  differencePercent: number;
}

/**
 * Simulates one HKEM run and returns the timer readings plus the energy
 * quantities computed exactly the way the student is asked to (v = w/t,
 * EK = ½(M+m)v², EP = m·g·h, h = H0 − x).
 */
export function computeAirTrackTrial(
  params: AirTrackPulleyParams,
  geometry: AirTrackGeometry,
  gates: GateSetup
): AirTrackTrialResult {
  const { M, m, g } = resolved(params);
  const a = systemAcceleration(params);
  const H0 = nonNegative(geometry.dropHeight);

  const t1 = gateTransitTimeTwoPhase(params, geometry, gates.gate1Position, gates.flagWidth);
  const t2 = gateTransitTimeTwoPhase(params, geometry, gates.gate2Position, gates.flagWidth);
  const tIn1 = timeAtPosition(params, geometry, gates.gate1Position);
  const tIn2 = timeAtPosition(params, geometry, gates.gate2Position);
  const t12 = tIn1 !== null && tIn2 !== null && tIn2 > tIn1 ? tIn2 - tIn1 : null;

  const h1 = hangingHeight(H0, gates.gate1Position);
  const h2 = hangingHeight(H0, gates.gate2Position);

  const v1 = measuredVelocity(gates.flagWidth, t1);
  const v2 = measuredVelocity(gates.flagWidth, t2);

  const ek1 = kineticEnergy(M, m, v1);
  const ep1 = potentialEnergy(m, h1, g);
  const em1 = mechanicalEnergy(ek1, ep1);
  const ek2 = kineticEnergy(M, m, v2);
  const ep2 = potentialEnergy(m, h2, g);
  const em2 = mechanicalEnergy(ek2, ep2);

  return {
    acceleration: a,
    t1,
    t2,
    t12,
    h1,
    h2,
    v1,
    v2,
    v1True: velocityAtPosition(a, Math.min(nonNegative(gates.gate1Position), H0)),
    v2True: velocityAtPosition(a, Math.min(nonNegative(gates.gate2Position), H0)),
    ek1,
    ep1,
    em1,
    ek2,
    ep2,
    em2,
    difference: energyDifference(em1, em2),
    differencePercent: energyDifferencePercent(em1, em2),
  };
}

/**
 * Energy of the system at an arbitrary instant (for the energy–time graph).
 * Uses the TRUE instantaneous speed. After the hanging mass lands it is at rest
 * on the floor, so only the cart's kinetic energy remains (EP = 0).
 */
export function energyAtState(
  params: AirTrackPulleyParams,
  geometry: AirTrackGeometry,
  state: MotionState
): { ek: number; ep: number; em: number } {
  const { M, m, g } = resolved(params);
  const H0 = nonNegative(geometry.dropHeight);
  const landed = state.x >= H0 && H0 > 0 && state.phase !== "rest";
  const ek = landed ? kineticEnergy(M, 0, state.v) : kineticEnergy(M, m, state.v);
  const ep = potentialEnergy(m, hangingHeight(H0, state.x), g);
  return { ek, ep, em: mechanicalEnergy(ek, ep) };
}
