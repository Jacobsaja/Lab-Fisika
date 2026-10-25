/**
 * Physics engine for linear momentum, kinetic energy, and 1D collisions.
 * Pure, deterministic functions with zero external UI/React dependencies.
 * 
 * ==============================================================================
 * EXPLICIT ASSUMPTION FOR MODUL 7 (FISIKA DASAR I - TUMBUKAN):
 * - Base mass of each glider (cart) without extra weight is m (e.g. 0.150 kg).
 * - Extra mass added is M (e.g. 0.050 kg).
 * - In Case (B) [Elastic, mA != mB] and Case (D) [Inelastic, mA != mB], the extra
 *   mass M is attached to Cart A, giving:
 *     mA = m + M
 *     mB = m
 * - Theoretical consequences:
 *   Case (A): mA = m, mB = m, e = 1, vB = 0
 *             vA' = 0,  vB' = vA
 *             (Cart A stops dead between gates; Gate 2 records only Cart B -> P22 is absent)
 *   Case (B): mA = m + M, mB = m, e = 1, vB = 0
 *             vA' = (M / (2m + M)) * vA > 0
 *             vB' = (2(m + M) / (2m + M)) * vA = vA + vA'
 *             (Cart A keeps moving forward and passes Gate 2 after Cart B -> Gate 2 records P21 & P22)
 *   Case (C): mA = m, mB = m, e = 0, vB = 0
 *             vA' = vB' = vA / 2
 *   Case (D): mA = m + M, mB = m, e = 0, vB = 0
 *             vA' = vB' = ((m + M) / (2m + M)) * vA
 * ==============================================================================
 */

import {
  Collision1DResult,
  ModulCaseParams,
  ModulCaseTheory,
  ModulTrialData,
  HkmVectorState,
  HkmVectors,
  HkmSimulationConfig,
  HkmSimulationState,
} from "./types";

export type { HkmVectorState, HkmVectors, HkmSimulationConfig, HkmSimulationState };

/**
 * Calculates instantaneous 1D vectors for velocities and momentums.
 * Pure function: deterministic, sign-preserving (positive = rightward, negative = leftward).
 */
export function getHkmVectors(state: HkmVectorState): HkmVectors {
  const vA = Number.isFinite(state.vA) ? state.vA : 0;
  const vB = Number.isFinite(state.vB) ? state.vB : 0;
  const mA = Math.max(0, state.mA || 0);
  const mB = Math.max(0, state.mB || 0);

  const pA = momentum(mA, vA);
  const pB = momentum(mB, vB);
  const pTotal = pA + pB;

  return {
    vA,
    vB,
    pA,
    pB,
    pTotal,
  };
}

/**
 * Calculates linear momentum p = m * v.
 * @param mass Mass in kg
 * @param velocity Velocity in m/s
 * @returns Momentum in kg·m/s
 */
export function momentum(mass: number, velocity: number): number {
  return mass * velocity;
}

/**
 * Calculates velocity through a photogate with double-finger/flag of known width:
 * v = flagWidth / time
 * @param flagWidth Width of photogate flag in meters (e.g. 0.03 m)
 * @param time Passage duration in seconds
 * @returns Velocity in m/s (returns 0 if time <= 0 or invalid)
 */
export function velocityFromGate(flagWidth: number, time: number): number {
  if (time <= 0 || !Number.isFinite(time)) return 0;
  return flagWidth / time;
}

/**
 * Calculates transit time through a photogate given flag width and velocity:
 * time = flagWidth / |velocity|
 */
export function gateTimeFromVelocity(flagWidth: number, velocity: number): number | null {
  const absV = Math.abs(velocity);
  if (absV < 1e-6 || !Number.isFinite(absV)) return null;
  return flagWidth / absV;
}

/**
 * Calculates total linear momentum for an array of bodies:
 * p_total = sum(m_i * v_i)
 */
export function totalMomentum(
  items: { mass: number; velocity: number }[]
): number {
  return items.reduce((acc, item) => acc + item.mass * item.velocity, 0);
}

/**
 * Calculates kinetic energy:
 * E_k = 0.5 * m * v^2
 */
export function kineticEnergy(mass: number, velocity: number): number {
  return 0.5 * mass * velocity * velocity;
}

/**
 * Calculates total kinetic energy for an array of bodies:
 * E_total = sum(0.5 * m_i * v_i^2)
 */
export function totalKineticEnergy(
  items: { mass: number; velocity: number }[]
): number {
  return items.reduce(
    (acc, item) => acc + 0.5 * item.mass * item.velocity * item.velocity,
    0
  );
}

/**
 * Calculates ratio of lost kinetic energy:
 * ratio = (E_before - E_after) / E_before
 */
export function energyLossRatio(eBefore: number, eAfter: number): number {
  if (eBefore <= 1e-9) return 0;
  const lost = eBefore - eAfter;
  return Math.max(0, lost / eBefore);
}

/**
 * Calculates the coefficient of restitution:
 * e = - (vA' - vB') / (vA - vB) = (vB' - vA') / (vA - vB)
 */
export function restitutionCoefficient(
  vA: number,
  vB: number,
  vAPrime: number,
  vBPrime: number
): number {
  const relativeBefore = vA - vB;
  if (Math.abs(relativeBefore) < 1e-9) return 0;
  return -(vAPrime - vBPrime) / relativeBefore;
}

/**
 * General 1D Collision Solver.
 * Solves final velocities from conservation of momentum and restitution coefficient:
 *   vA' = [(mA - e*mB)*vA + mB*(1 + e)*vB] / (mA + mB)
 *   vB' = [mA*(1 + e)*vA + (mB - e*mA)*vB] / (mA + mB)
 * 
 * Works for:
 * - Elastic (e = 1)
 * - Partially inelastic (0 < e < 1)
 * - Perfectly inelastic (e = 0, both stick together)
 */
export function solve1DCollision(
  mA: number,
  mB: number,
  vA: number,
  vB: number,
  restitution: number = 1.0
): Collision1DResult {
  const clampedE = Math.max(0, Math.min(1, restitution));
  const totalMass = mA + mB;

  if (totalMass <= 0) {
    throw new Error("Total mass must be strictly positive");
  }

  const vAPrime =
    ((mA - clampedE * mB) * vA + mB * (1 + clampedE) * vB) / totalMass;
  const vBPrime =
    (mA * (1 + clampedE) * vA + (mB - clampedE * mA) * vB) / totalMass;

  const pInitial = momentum(mA, vA) + momentum(mB, vB);
  const pFinal = momentum(mA, vAPrime) + momentum(mB, vBPrime);

  const eKInitial = kineticEnergy(mA, vA) + kineticEnergy(mB, vB);
  const eKFinal = kineticEnergy(mA, vAPrime) + kineticEnergy(mB, vBPrime);
  const eKLoss = Math.max(0, eKInitial - eKFinal);
  const eKLossRatio = energyLossRatio(eKInitial, eKFinal);

  return {
    vAPrime,
    vBPrime,
    pTotalInitial: pInitial,
    pTotalFinal: pFinal,
    eKInitial,
    eKFinal,
    eKLoss,
    eKLossRatio,
    restitution: clampedE,
  };
}

/**
 * Solves the theoretical state for each case in Modul 7 Table 7.9.
 */
export function getModulCaseTheory(params: ModulCaseParams): ModulCaseTheory {
  const { caseId, baseMass, addedMass, vA } = params;
  const vB = 0; // always at rest before collision in Modul 7

  let mA = baseMass;
  let mB = baseMass;
  let restitution = 1.0;
  let hasP22 = false;

  switch (caseId) {
    case "A": {
      // Elastic, equal mass
      mA = baseMass;
      mB = baseMass;
      restitution = 1.0;
      hasP22 = false; // Cart A stops between gates (vA' = 0)
      break;
    }
    case "B": {
      // Elastic, Cart A has extra weight M
      mA = baseMass + addedMass;
      mB = baseMass;
      restitution = 1.0;
      hasP22 = true; // Cart A moves forward (vA' > 0) and passes Gate 2
      break;
    }
    case "C": {
      // Inelastic (stick together), equal mass
      mA = baseMass;
      mB = baseMass;
      restitution = 0.0;
      hasP22 = true; // Both stick together and pass Gate 2
      break;
    }
    case "D": {
      // Inelastic (stick together), Cart A has extra weight M
      mA = baseMass + addedMass;
      mB = baseMass;
      restitution = 0.0;
      hasP22 = true; // Both stick together and pass Gate 2
      break;
    }
  }

  const collision = solve1DCollision(mA, mB, vA, vB, restitution);

  return {
    caseId,
    mA,
    mB,
    vA,
    vB,
    vAPrime: collision.vAPrime,
    vBPrime: collision.vBPrime,
    pTotalInitial: collision.pTotalInitial,
    pTotalFinal: collision.pTotalFinal,
    eKInitial: collision.eKInitial,
    eKFinal: collision.eKFinal,
    restitution,
    hasP22,
  };
}

/**
 * Simple, fast, deterministic PRNG (Mulberry32) for reproducible realistic laboratory variations.
 */
export function createMulberry32(seed: number): () => number {
  let s = Math.floor(seed);
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates realistic experimental trial data with deterministic slight sensor/air jitter.
 * Noise magnitude: ~0.5% - 1.2% variation on timing, preserving close physical momentum.
 */
export function simulateModulTrial(
  params: ModulCaseParams,
  trialIndex: number,
  sessionSeed: number = 42
): ModulTrialData {
  const theory = getModulCaseTheory(params);
  const flagWidth = params.flagWidth || 0.03;

  // Derive unique seed per case and trial
  const caseOffset = { A: 100, B: 200, C: 300, D: 400 }[params.caseId];
  const rng = createMulberry32(sessionSeed + caseOffset + trialIndex * 17);

  // Slight jitter on initial launch velocity (+/- 0.8%)
  const launchJitter = 1.0 + (rng() - 0.5) * 0.016;
  const actualVA = params.vA * launchJitter;

  // Real collision with tiny energy drag or bumper coefficient imperfection (~0.992 for elastic)
  const effectiveRestitution =
    theory.restitution === 1.0 ? 0.992 + rng() * 0.007 : 0.0;

  const collision = solve1DCollision(
    theory.mA,
    theory.mB,
    actualVA,
    0,
    effectiveRestitution
  );

  // Convert velocities to raw gate passage times with micro photogate noise (+/- 0.4%)
  const p11Jitter = 1.0 + (rng() - 0.5) * 0.008;
  const p11 = (flagWidth / actualVA) * p11Jitter;

  const p21Jitter = 1.0 + (rng() - 0.5) * 0.008;
  const p21 = (flagWidth / collision.vBPrime) * p21Jitter;

  let p22: number | null = null;
  if (theory.hasP22 && collision.vAPrime > 1e-4) {
    const p22Jitter = 1.0 + (rng() - 0.5) * 0.008;
    p22 = (flagWidth / collision.vAPrime) * p22Jitter;
  }

  // Calculate measured velocities from gate readings
  const measuredVA = velocityFromGate(flagWidth, p11);
  const measuredVB = 0;
  const measuredVBPrime = velocityFromGate(flagWidth, p21);
  const measuredVAPrime = p22 !== null ? velocityFromGate(flagWidth, p22) : 0;

  // Calculate measured momentum
  const pA = momentum(theory.mA, measuredVA);
  const pB = 0;
  const pAPrime = momentum(theory.mA, measuredVAPrime);
  const pBPrime = momentum(theory.mB, measuredVBPrime);

  const pTotalInitial = pA + pB;
  const pTotalFinal = pAPrime + pBPrime;
  const deltaP = pTotalFinal - pTotalInitial;

  const ksrP =
    pTotalInitial > 0
      ? (Math.abs(deltaP) / pTotalInitial) * 100
      : 0;

  const measuredRestitution = restitutionCoefficient(
    measuredVA,
    measuredVB,
    measuredVAPrime,
    measuredVBPrime
  );

  return {
    trialIndex,
    p11: Number(p11.toFixed(4)),
    p21: Number(p21.toFixed(4)),
    p22: p22 !== null ? Number(p22.toFixed(4)) : null,
    vA: Number(measuredVA.toFixed(4)),
    pA: Number(pA.toFixed(4)),
    vB: 0,
    pB: 0,
    vAPrime: Number(measuredVAPrime.toFixed(4)),
    pAPrime: Number(pAPrime.toFixed(4)),
    vBPrime: Number(measuredVBPrime.toFixed(4)),
    pBPrime: Number(pBPrime.toFixed(4)),
    pTotalInitial: Number(pTotalInitial.toFixed(4)),
    pTotalFinal: Number(pTotalFinal.toFixed(4)),
    deltaP: Number(deltaP.toFixed(4)),
    ksrP: Number(ksrP.toFixed(2)),
    restitution: Number(Math.max(0, Math.min(1, measuredRestitution)).toFixed(3)),
  };
}

/**
 * Calculates Kesalahan Relatif (KSR) / Percentage Error:
 * KSR = |teori - eksperimen| / teori * 100%
 */
export function calculateKSR(theory: number, experiment: number): number {
  if (Math.abs(theory) < 1e-9) {
    return Math.abs(experiment) < 1e-9 ? 0 : 100;
  }
  return (Math.abs(theory - experiment) / Math.abs(theory)) * 100;
}

// ─── Fixed-step Substepping Simulation Engine ─────────────────────────────────

export const DEFAULT_HKM_FIXED_DT = 0.001; // 1 ms fixed integration step

/**
 * Creates the initial state of the air track 1D collision simulation.
 */
export function createInitialHkmState(config: HkmSimulationConfig): HkmSimulationState {
  const cartAInitPos = config.cartAInitPos ?? 0.15;
  const cartBInitPos = config.cartBInitPos ?? 0.65;
  const launchSpeed = config.launchSpeed;

  return {
    t: 0,
    xA: cartAInitPos,
    xB: cartBInitPos,
    vA: launchSpeed,
    vB: 0,
    collided: false,
    gate1Active: false,
    gate2Active: false,
    g1EnterTime: null,
    g1ExitTime: null,
    p11: null,
    g2EnterTimeB: null,
    g2ExitTimeB: null,
    p21: null,
    g2EnterTimeA: null,
    g2ExitTimeA: null,
    p22: null,
    completed: false,
    stopped: false,
  };
}

/**
 * Advances the simulation by exactly one fixed substep `dt` (seconds).
 * Pure and deterministic. Resolves collisions using conservation of momentum
 * without tunneling or double-collision, and uses linear interpolation for
 * photogate entry/exit timestamps to achieve frame-rate and playback-speed independence.
 */
export function stepHkm(
  state: HkmSimulationState,
  config: HkmSimulationConfig,
  dt: number = DEFAULT_HKM_FIXED_DT
): HkmSimulationState {
  if (state.stopped) {
    return { ...state, t: state.t + dt };
  }

  const cartLength = config.cartLength ?? 0.12;
  const flagWidth = config.flagWidth ?? 0.03;
  const trackLength = config.trackLength ?? 1.4;
  const gate1Pos = config.gate1Pos ?? 0.40;
  const gate2Pos = config.gate2Pos ?? 0.90;
  const restitution = Math.max(0, Math.min(1, config.restitution));
  const frictionDecel = config.frictionDecel ?? (config.compressorOn ? 0.005 : 0.85);
  const hasP22Expected =
    config.hasP22Expected ??
    (restitution > 0 && config.effectiveMA > config.effectiveMB);

  const tStart = state.t;
  let xA = state.xA;
  let xB = state.xB;
  let vA = state.vA;
  let vB = state.vB;
  let collided = state.collided;

  let g1EnterTime = state.g1EnterTime;
  let g1ExitTime = state.g1ExitTime;
  let p11 = state.p11;

  let g2EnterTimeB = state.g2EnterTimeB;
  let g2ExitTimeB = state.g2ExitTimeB;
  let p21 = state.p21;

  let g2EnterTimeA = state.g2EnterTimeA;
  let g2ExitTimeA = state.g2ExitTimeA;
  let p22 = state.p22;

  // 1. Friction deceleration during this step
  if (Math.abs(vA) > 1e-6) {
    vA = vA > 0 ? Math.max(0, vA - frictionDecel * dt) : Math.min(0, vA + frictionDecel * dt);
  } else {
    vA = 0;
  }
  if (Math.abs(vB) > 1e-6) {
    vB = vB > 0 ? Math.max(0, vB - frictionDecel * dt) : Math.min(0, vB + frictionDecel * dt);
  } else {
    vB = 0;
  }
  if (collided && restitution === 0) {
    vA = vB;
  }

  // 2. Motion and collision detection
  const vRel = vA - vB;
  const d0 = xB - (xA + cartLength);

  // Helper for photogate edge crossing interpolation
  const checkGate = (
    edgeStart: number,
    edgeEnd: number,
    gatePos: number,
    vEdge: number,
    tIntervalStart: number,
    dtInterval: number
  ): number | null => {
    if (vEdge > 0 && edgeStart < gatePos && edgeEnd >= gatePos) {
      const alpha = (gatePos - edgeStart) / (edgeEnd - edgeStart);
      return tIntervalStart + alpha * dtInterval;
    }
    return null;
  };

  // Flag edges offset from cart front-left:
  // Cart length L, flag centered: left edge is x + (L - W)/2, right edge is x + (L + W)/2
  const flagOffsetLeft = (cartLength - flagWidth) / 2; // 0.045 m
  const flagOffsetRight = flagOffsetLeft + flagWidth; // 0.075 m

  if (!collided && d0 > 0 && vRel > 0 && d0 <= vRel * dt) {
    // Collision happens within this substep at fraction tau
    const tau = Math.max(0, Math.min(dt, d0 / vRel));
    const tCol = tStart + tau;

    // Pre-collision positions at impact
    const xACol = xA + vA * tau;
    const xBCol = xACol + cartLength;

    // Check Gate 1 during [tStart, tCol]
    if (vA > 0) {
      if (g1EnterTime === null) {
        const tHit = checkGate(xA + flagOffsetRight, xACol + flagOffsetRight, gate1Pos, vA, tStart, tau);
        if (tHit !== null) g1EnterTime = tHit;
      }
      if (g1EnterTime !== null && g1ExitTime === null) {
        const tHit = checkGate(xA + flagOffsetLeft, xACol + flagOffsetLeft, gate1Pos, vA, tStart, tau);
        if (tHit !== null) {
          g1ExitTime = tHit;
          p11 = Math.max(0.001, g1ExitTime - g1EnterTime);
        }
      }
    }

    // Resolve collision at tCol
    const col = solve1DCollision(config.effectiveMA, config.effectiveMB, vA, vB, restitution);
    vA = col.vAPrime;
    vB = col.vBPrime;
    collided = true;
    if (restitution === 0) {
      vA = vB;
    }

    // Post-collision motion for remaining time (dt - tau)
    const dtRem = dt - tau;
    const xANew = restitution === 0 ? xBCol + vB * dtRem - cartLength : xACol + vA * dtRem;
    const xBNew = xBCol + vB * dtRem;

    // Check Gate 2 for Cart B during [tCol, tStart + dt]
    if (vB > 0) {
      if (g2EnterTimeB === null) {
        const tHit = checkGate(xBCol + flagOffsetRight, xBNew + flagOffsetRight, gate2Pos, vB, tCol, dtRem);
        if (tHit !== null) g2EnterTimeB = tHit;
      }
      if (g2EnterTimeB !== null && g2ExitTimeB === null) {
        const tHit = checkGate(xBCol + flagOffsetLeft, xBNew + flagOffsetLeft, gate2Pos, vB, tCol, dtRem);
        if (tHit !== null) {
          g2ExitTimeB = tHit;
          p21 = Math.max(0.001, g2ExitTimeB - g2EnterTimeB);
        }
      }
    }

    // Check Gate 2 for Cart A (P22) during [tCol, tStart + dt]
    if (hasP22Expected && vA > 0 && (g2ExitTimeB !== null || xBNew >= gate2Pos)) {
      if (g2EnterTimeA === null) {
        const tHit = checkGate(xACol + flagOffsetRight, xANew + flagOffsetRight, gate2Pos, vA, tCol, dtRem);
        if (tHit !== null) g2EnterTimeA = tHit;
      }
      if (g2EnterTimeA !== null && g2ExitTimeA === null) {
        const tHit = checkGate(xACol + flagOffsetLeft, xANew + flagOffsetLeft, gate2Pos, vA, tCol, dtRem);
        if (tHit !== null) {
          g2ExitTimeA = tHit;
          p22 = Math.max(0.001, g2ExitTimeA - g2EnterTimeA);
        }
      }
    }

    xA = xANew;
    xB = xBNew;
  } else {
    // Normal motion without collision event in this substep
    const xAOld = xA;
    const xBOld = xB;
    xA = xAOld + vA * dt;
    xB = xBOld + vB * dt;

    if (collided && restitution === 0) {
      vA = vB;
      xA = xB - cartLength;
    }

    // Check Gate 1 (Cart A before collision)
    if (!collided && vA > 0) {
      if (g1EnterTime === null) {
        const tHit = checkGate(xAOld + flagOffsetRight, xA + flagOffsetRight, gate1Pos, vA, tStart, dt);
        if (tHit !== null) g1EnterTime = tHit;
      }
      if (g1EnterTime !== null && g1ExitTime === null) {
        const tHit = checkGate(xAOld + flagOffsetLeft, xA + flagOffsetLeft, gate1Pos, vA, tStart, dt);
        if (tHit !== null) {
          g1ExitTime = tHit;
          p11 = Math.max(0.001, g1ExitTime - g1EnterTime);
        }
      }
    }

    // Check Gate 2 for Cart B
    if (vB > 0) {
      if (g2EnterTimeB === null) {
        const tHit = checkGate(xBOld + flagOffsetRight, xB + flagOffsetRight, gate2Pos, vB, tStart, dt);
        if (tHit !== null) g2EnterTimeB = tHit;
      }
      if (g2EnterTimeB !== null && g2ExitTimeB === null) {
        const tHit = checkGate(xBOld + flagOffsetLeft, xB + flagOffsetLeft, gate2Pos, vB, tStart, dt);
        if (tHit !== null) {
          g2ExitTimeB = tHit;
          p21 = Math.max(0.001, g2ExitTimeB - g2EnterTimeB);
        }
      }
    }

    // Check Gate 2 for Cart A (Pulse P22)
    if (hasP22Expected && vA > 0 && (g2ExitTimeB !== null || xB >= gate2Pos)) {
      if (g2EnterTimeA === null) {
        const tHit = checkGate(xAOld + flagOffsetRight, xA + flagOffsetRight, gate2Pos, vA, tStart, dt);
        if (tHit !== null) g2EnterTimeA = tHit;
      }
      if (g2EnterTimeA !== null && g2ExitTimeA === null) {
        const tHit = checkGate(xAOld + flagOffsetLeft, xA + flagOffsetLeft, gate2Pos, vA, tStart, dt);
        if (tHit !== null) {
          g2ExitTimeA = tHit;
          p22 = Math.max(0.001, g2ExitTimeA - g2EnterTimeA);
        }
      }
    }
  }

  // 3. Track boundaries
  const rightBound = trackLength - cartLength - 0.02;
  if (xB >= rightBound) {
    xB = rightBound;
    vB = 0;
    if (restitution === 0) {
      xA = xB - cartLength;
      vA = 0;
    }
  }
  if (xA <= 0.02) {
    xA = 0.02;
    vA = 0;
  }

  // 4. Photogate LED indicator state at step end
  const flagALeft = xA + flagOffsetLeft;
  const flagARight = xA + flagOffsetRight;
  const flagBLeft = xB + flagOffsetLeft;
  const flagBRight = xB + flagOffsetRight;

  const gate1Active =
    (flagALeft <= gate1Pos && flagARight >= gate1Pos) ||
    (flagBLeft <= gate1Pos && flagBRight >= gate1Pos);
  const gate2Active =
    (flagALeft <= gate2Pos && flagARight >= gate2Pos) ||
    (flagBLeft <= gate2Pos && flagBRight >= gate2Pos);

  // 5. Completion & stop condition
  const readyToComplete =
    p11 !== null &&
    p21 !== null &&
    (!hasP22Expected || p22 !== null || (collided && Math.abs(vA) < 1e-3) || xA >= rightBound - 0.03);

  const stopped =
    (collided && Math.abs(vA) < 1e-4 && Math.abs(vB) < 1e-4) ||
    (readyToComplete && Math.abs(vA) < 1e-4 && (xB >= rightBound || Math.abs(vB) < 1e-4));

  return {
    t: tStart + dt,
    xA,
    xB,
    vA,
    vB,
    collided,
    gate1Active,
    gate2Active,
    g1EnterTime,
    g1ExitTime,
    p11,
    g2EnterTimeB,
    g2ExitTimeB,
    p21,
    g2EnterTimeA,
    g2ExitTimeA,
    p22,
    completed: readyToComplete,
    stopped,
  };
}

/**
 * Runs the fixed-step simulation loop with an accumulator, scaling simulation time
 * strictly by playback speed: simDt = wallDt * speed.
 */
export function advanceHkmSimulation(
  state: HkmSimulationState,
  config: HkmSimulationConfig,
  wallDtSec: number,
  speed: number,
  accumulator: number,
  fixedDt: number = DEFAULT_HKM_FIXED_DT,
  maxWallDt: number = 0.05
): { state: HkmSimulationState; accumulator: number } {
  const dt = Math.min(Math.max(wallDtSec, 0), maxWallDt);
  const s = speed > 0 ? speed : 1.0;
  let acc = accumulator + dt * s;
  let curState = state;
  const MAX_SUBSTEPS = 250;
  let steps = 0;

  while (acc >= fixedDt && steps < MAX_SUBSTEPS) {
    curState = stepHkm(curState, config, fixedDt);
    acc -= fixedDt;
    steps++;
  }

  return { state: curState, accumulator: acc };
}
