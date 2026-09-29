/**
 * Core physics types and interfaces.
 * Pure and deterministic.
 */

export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  position: Vector2;
  velocity: Vector2;
  mass: number;
  radius?: number;
}

/**
 * A SimulationModel represents a pure, deterministic physics model.
 * It is completely decoupled from React and the DOM.
 */
export interface SimulationModel<TParams, TState> {
  /**
   * Initializes the state based on the provided parameters.
   */
  init(params: TParams): TState;

  /**
   * Advances the state by a fixed time step (dt).
   * Note: This must be a pure function. Do not mutate the previous state,
   * return a new state object.
   */
  step(state: TState, dt: number, params: TParams): TState;
}

// Vector math utilities
export const Vec2 = {
  add: (a: Vector2, b: Vector2): Vector2 => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a: Vector2, b: Vector2): Vector2 => ({ x: a.x - b.x, y: a.y - b.y }),
  scale: (v: Vector2, s: number): Vector2 => ({ x: v.x * s, y: v.y * s }),
  dot: (a: Vector2, b: Vector2): number => a.x * b.x + a.y * b.y,
  mag: (v: Vector2): number => Math.sqrt(v.x * v.x + v.y * v.y),
  norm: (v: Vector2): Vector2 => {
    const m = Vec2.mag(v);
    return m === 0 ? { x: 0, y: 0 } : Vec2.scale(v, 1 / m);
  },
};
