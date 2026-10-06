export type CylinderShape = "solid" | "hollow" | "block";

/**
 * Calculates the acceleration of an object rolling (or sliding) down an inclined plane.
 * @param shape "solid", "hollow", or "block"
 * @param thetaDeg Incline angle in degrees
 * @param r Outer radius (in meters)
 * @param rInner Inner radius (in meters, for hollow cylinder)
 * @param g Gravitational acceleration (default 9.8 m/s²)
 * @returns acceleration in m/s²
 */
export function calculateRollingAcceleration(
  shape: CylinderShape,
  thetaDeg: number,
  r: number,
  rInner: number = 0,
  g: number = 9.8
): number {
  const thetaRad = (thetaDeg * Math.PI) / 180;
  const aSlide = g * Math.sin(thetaRad);

  if (shape === "block") {
    // Sliding block with no friction
    return aSlide;
  }

  // Rolling without slipping: a = g * sin(theta) / (1 + I_cm / (m*r^2))
  let inertiaFactor = 0; // I_cm / (m*r^2)

  if (shape === "solid") {
    inertiaFactor = 0.5; // 1/2 m r^2
  } else if (shape === "hollow") {
    // I = 1/2 m (r^2 + rInner^2)
    inertiaFactor = 0.5 * (1 + Math.pow(rInner / r, 2));
  }

  return aSlide / (1 + inertiaFactor);
}

/**
 * Calculates the state of a rolling object at time t.
 */
export function getRollingState(
  t: number,
  a: number,
  r: number,
  isBlock: boolean = false
) {
  const s = 0.5 * a * t * t;
  const v = a * t;
  const omega = isBlock ? 0 : v / r;
  const theta = isBlock ? 0 : (0.5 * (a / r) * t * t); // angle rotated in radians

  return { s, v, omega, theta };
}

/**
 * Pseudo-random seeded generator
 */
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * Adds seeded gaussian noise to measurement (for practicum mode).
 * Same seed gives the same data.
 */
export const SENSOR_NOISE_AMPLITUDE = 0.02; // Name constant for amplitude

export function applySensorNoise(value: number, seed: number, stdDev: number = SENSOR_NOISE_AMPLITUDE): number {
  // Box-Muller transform for gaussian noise, but with deterministic seed
  let u = seededRandom(seed + 1.1);
  if (u === 0) u = 0.001; 
  let v = seededRandom(seed + 2.2);
  if (v === 0) v = 0.001;
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return value + num * stdDev;
}
