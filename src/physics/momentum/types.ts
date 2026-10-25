/**
 * Type definitions for linear momentum and 1D collision physics.
 * Pure TypeScript, zero external UI/React dependencies.
 */

export type CollisionType = "elastic" | "inelastic" | "perfectly_inelastic";

export interface GliderParams {
  mass: number; // in kg
  initialVelocity: number; // in m/s (positive = rightward)
}

export interface Collision1DResult {
  vAPrime: number; // final velocity of cart A in m/s
  vBPrime: number; // final velocity of cart B in m/s
  pTotalInitial: number; // initial total momentum in kg·m/s
  pTotalFinal: number; // final total momentum in kg·m/s
  eKInitial: number; // initial total kinetic energy in Joules
  eKFinal: number; // final total kinetic energy in Joules
  eKLoss: number; // energy lost in Joules
  eKLossRatio: number; // fraction of kinetic energy lost [0, 1]
  restitution: number; // coefficient of restitution e
}

export interface HkmVectorState {
  mA: number; // Mass of Cart A in kg
  mB: number; // Mass of Cart B in kg
  vA: number; // Instantaneous velocity of Cart A in m/s
  vB: number; // Instantaneous velocity of Cart B in m/s
}

export interface HkmVectors {
  vA: number; // Velocity of Cart A in m/s (signed 1D)
  vB: number; // Velocity of Cart B in m/s (signed 1D)
  pA: number; // Linear momentum of Cart A in kg·m/s (signed 1D)
  pB: number; // Linear momentum of Cart B in kg·m/s (signed 1D)
  pTotal: number; // Total linear momentum in kg·m/s (signed 1D: pA + pB)
}

export type ModulCase = "A" | "B" | "C" | "D";

export interface ModulCaseParams {
  caseId: ModulCase;
  baseMass: number; // m (kg), mass of single base cart
  addedMass: number; // M (kg), extra mass added to Cart A in cases B & D
  vA: number; // initial velocity of cart A (m/s)
  flagWidth: number; // width of photogate flag (m), e.g. 0.03 m
}

export interface ModulCaseTheory {
  caseId: ModulCase;
  mA: number; // kg
  mB: number; // kg
  vA: number; // m/s
  vB: number; // m/s (always 0 in Modul 7 setup)
  vAPrime: number; // theoretical vA'
  vBPrime: number; // theoretical vB'
  pTotalInitial: number; // kg·m/s
  pTotalFinal: number; // kg·m/s
  eKInitial: number; // J
  eKFinal: number; // J
  restitution: number; // theoretical e
  hasP22: boolean; // whether Cart A passes Gate 2 after collision
}

export interface GateTimeReadings {
  tA: number; // Gate 1 pulse 1 (P11) in seconds
  tBPrime: number; // Gate 2 pulse 1 (P21) in seconds
  tAPrime: number | null; // Gate 2 pulse 2 (P22) in seconds, null if Cart A stops before Gate 2
}

export interface ModulTrialData {
  trialIndex: number;
  // Raw Gate Readings
  p11: number; // tA (s)
  p21: number; // tB' (s)
  p22: number | null; // tA' (s)
  // Derived Kinematics & Momentum
  vA: number; // m/s
  pA: number; // kg·m/s
  vB: number; // m/s (0)
  pB: number; // kg·m/s (0)
  vAPrime: number; // m/s
  pAPrime: number; // kg·m/s
  vBPrime: number; // m/s
  pBPrime: number; // kg·m/s
  pTotalInitial: number;
  pTotalFinal: number;
  deltaP: number; // pFinal - pInitial
  ksrP: number; // percentage error of momentum conservation
  restitution: number;
}

export interface HkmSimulationConfig {
  effectiveMA: number; // in kg
  effectiveMB: number; // in kg
  restitution: number; // [0, 1]
  launchSpeed: number; // in m/s
  compressorOn: boolean;
  frictionDecel?: number; // default 0.005 if compressorOn else 0.85
  trackLength?: number; // default 1.4 m
  cartLength?: number; // default 0.12 m
  flagWidth?: number; // default 0.03 m
  gate1Pos?: number; // default 0.40 m
  gate2Pos?: number; // default 0.90 m
  cartAInitPos?: number; // default 0.15 m
  cartBInitPos?: number; // default 0.65 m
  hasP22Expected?: boolean;
}

export interface HkmSimulationState {
  t: number; // simulation time in seconds
  xA: number; // cart A position (m)
  xB: number; // cart B position (m)
  vA: number; // cart A velocity (m/s)
  vB: number; // cart B velocity (m/s)
  collided: boolean;
  gate1Active: boolean;
  gate2Active: boolean;
  g1EnterTime: number | null;
  g1ExitTime: number | null;
  p11: number | null;
  g2EnterTimeB: number | null;
  g2ExitTimeB: number | null;
  p21: number | null;
  g2EnterTimeA: number | null;
  g2ExitTimeA: number | null;
  p22: number | null;
  completed: boolean;
  stopped: boolean;
}
