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

/** Fixed sensor sampling interval (simulation seconds). Samples sit on t_i = i · interval. */
export const SENSOR_SAMPLE_INTERVAL_S = 0.05;

/** Per-channel noise amplitudes (std dev) for the practicum sensor. */
export const SENSOR_NOISE_STD = {
  s: 0.005,
  v: SENSOR_NOISE_AMPLITUDE,
  omega: 0.05,
} as const;

export type SensorChannel = keyof typeof SENSOR_NOISE_STD;

const SHAPE_SEED_CODE: Record<CylinderShape, number> = { solid: 1, hollow: 2, block: 3 };
const CHANNEL_SEED_OFFSET: Record<SensorChannel, number> = { s: 0, v: 1, omega: 2 };

/**
 * Deterministic noise seed. Depends ONLY on shape, angle, sample index and channel —
 * never on wall-clock time, frame timing, or Math.random.
 *
 * seed = shapeCode·10⁷ + round(θ·10)·10⁴ + sampleIndex·10 + channelOffset
 *
 * (shapeCode: solid=1, hollow=2, block=3; channelOffset: s=0, v=1, omega=2.)
 * Unique for θ in [0°, 99.9°] and sampleIndex in [0, 999].
 */
export function sensorNoiseSeed(
  shape: CylinderShape,
  thetaDeg: number,
  sampleIndex: number,
  channel: SensorChannel
): number {
  return (
    SHAPE_SEED_CODE[shape] * 10_000_000 +
    Math.round(thetaDeg * 10) * 10_000 +
    sampleIndex * 10 +
    CHANNEL_SEED_OFFSET[channel]
  );
}

export interface RollingSensorSample {
  index: number;
  t: number;
  s: number;
  v: number;
  omega: number;
  theta: number;
}

/**
 * Noisy sensor reading for sample `sampleIndex` (t = index · SENSOR_SAMPLE_INTERVAL_S).
 * Same (shape, θ, index) → identical sample. The physics (a) is not affected by noise.
 */
export function generateSensorSample(
  shape: CylinderShape,
  thetaDeg: number,
  sampleIndex: number,
  a: number,
  r: number
): RollingSensorSample {
  const t = sampleIndex * SENSOR_SAMPLE_INTERVAL_S;
  const clean = getRollingState(t, a, r, shape === "block");
  return {
    index: sampleIndex,
    t,
    s: applySensorNoise(clean.s, sensorNoiseSeed(shape, thetaDeg, sampleIndex, "s"), SENSOR_NOISE_STD.s),
    v: applySensorNoise(clean.v, sensorNoiseSeed(shape, thetaDeg, sampleIndex, "v"), SENSOR_NOISE_STD.v),
    omega: applySensorNoise(clean.omega, sensorNoiseSeed(shape, thetaDeg, sampleIndex, "omega"), SENSOR_NOISE_STD.omega),
    theta: clean.theta,
  };
}
