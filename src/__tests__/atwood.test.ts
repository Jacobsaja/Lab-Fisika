import { 
  calculateTrueAcceleration1, 
  calculateTrueAcceleration2, 
  calculateFallTime, 
  calculateAtwoodRegression,
  calculateGLBTime,
  calculateAtwoodGLBRegression,
  AtwoodConfig
} from '../physics/atwood';

describe('Atwood Physics Module', () => {
  const config: AtwoodConfig = {
    m1: 100, // g
    m2: 100, // g
    m3: 10,  // g
    m4: 10,  // g
    g: 9.8   // m/s^2
  };

  test('calculateTrueAcceleration1 calculates correctly', () => {
    // a1 = (10 * 9.8) / (100 + 100 + 10) = 98 / 210 = 0.4666...
    const a1 = calculateTrueAcceleration1(config);
    expect(a1).toBeCloseTo(98 / 210, 4);
    // Should be in 0.1 - 0.5 range as requested
    expect(a1).toBeGreaterThan(0.1);
    expect(a1).toBeLessThan(0.5);
  });

  test('calculateTrueAcceleration2 calculates correctly and is greater than a1', () => {
    // a2 = (20 * 9.8) / (100 + 100 + 20) = 196 / 220 = 0.8909...
    const a1 = calculateTrueAcceleration1(config);
    const a2 = calculateTrueAcceleration2(config);
    expect(a2).toBeCloseTo(196 / 220, 4);
    expect(a2).toBeGreaterThan(a1);
  });

  test('calculateFallTime calculates ideal time correctly', () => {
    const s = 0.5; // 0.5 m
    const a = 0.4666; // m/s^2
    // t = sqrt(2 * 0.5 / 0.4666) = sqrt(1 / 0.4666) = sqrt(2.143) = 1.464
    const t = calculateFallTime(s, a, false);
    expect(t).toBeCloseTo(Math.sqrt(2 * s / a), 4);
  });

  test('calculateFallTime adds realistic noise', () => {
    const s = 0.5;
    const a = 0.4666;
    const t_ideal = calculateFallTime(s, a, false);
    
    // Check multiple times to ensure noise is within bounds (±0.3% of t_ideal)
    for (let i = 0; i < 10; i++) {
      const t_noisy = calculateFallTime(s, a, true);
      const diff = Math.abs(t_noisy - t_ideal) / t_ideal;
      expect(diff).toBeLessThanOrEqual(0.0031); // slightly above 0.003 for floating point errors
    }
  });

  test('calculateAtwoodRegression computes regression correctly without noise', () => {
    const a_true = 0.4;
    // Generate data points
    // s = 1/2 * a * t^2
    // t = sqrt(2s/a)
    const data = [
      { s: 0.2, t: calculateFallTime(0.2, a_true, false) },
      { s: 0.3, t: calculateFallTime(0.3, a_true, false) },
      { s: 0.4, t: calculateFallTime(0.4, a_true, false) },
      { s: 0.5, t: calculateFallTime(0.5, a_true, false) },
      { s: 0.6, t: calculateFallTime(0.6, a_true, false) },
    ];

    const result = calculateAtwoodRegression(data);

    // Because there's no noise, b = a_true directly
    expect(result.a).toBeCloseTo(a_true, 4);
    
    // Delta should be near 0
    expect(result.deltaA).toBeCloseTo(0, 4);
    
    // tk should be near 100%
    expect(result.tk).toBeCloseTo(100, 4);
  });
  
  test('calculateAtwoodRegression computes correctly with manual noise', () => {
    const a_true = 0.4;
    // Generate data points with some fixed small variance to test uncertainty calculation
    const data = [
      { s: 0.2, t: Math.sqrt(2 * 0.2 / a_true) + 0.05 },
      { s: 0.3, t: Math.sqrt(2 * 0.3 / a_true) - 0.02 },
      { s: 0.4, t: Math.sqrt(2 * 0.4 / a_true) + 0.04 },
      { s: 0.5, t: Math.sqrt(2 * 0.5 / a_true) - 0.03 },
      { s: 0.6, t: Math.sqrt(2 * 0.6 / a_true) + 0.01 },
    ];

    const result = calculateAtwoodRegression(data);

    // Should still be somewhat close to a_true
    expect(result.a).toBeGreaterThan(0.3);
    expect(result.a).toBeLessThan(0.5);
    
    // deltaA should be non-zero
    expect(result.deltaA).toBeGreaterThan(0);
    
    // tk should be valid and < 100
    expect(result.tk).toBeLessThan(100);
    expect(result.tk).toBeGreaterThan(0);
  });

  describe('GLB Phase (Modul 2.2)', () => {
    test('calculateGLBTime calculates ideal time correctly', () => {
      const s = 0.5; // 0.5 m
      const v = 0.4; // 0.4 m/s
      // t = 0.5 / 0.4 = 1.25
      const t = calculateGLBTime(s, v, false);
      expect(t).toBeCloseTo(1.25, 4);
    });

    test('calculateGLBTime adds realistic noise', () => {
      const s = 0.5;
      const v = 0.4;
      const t_ideal = calculateGLBTime(s, v, false);
      
      for (let i = 0; i < 10; i++) {
        const t_noisy = calculateGLBTime(s, v, true);
        const diff = Math.abs(t_noisy - t_ideal) / t_ideal;
        expect(diff).toBeLessThanOrEqual(0.0031);
      }
    });

    test('calculateAtwoodGLBRegression computes regression correctly without noise', () => {
      const v_true = 0.4;
      // y = s, x = t
      const data = [
        { s: 0.2, t: calculateGLBTime(0.2, v_true, false) },
        { s: 0.3, t: calculateGLBTime(0.3, v_true, false) },
        { s: 0.4, t: calculateGLBTime(0.4, v_true, false) },
        { s: 0.5, t: calculateGLBTime(0.5, v_true, false) },
        { s: 0.6, t: calculateGLBTime(0.6, v_true, false) },
      ];

      const result = calculateAtwoodGLBRegression(data);

      expect(result.v).toBeCloseTo(v_true, 4);
      expect(result.deltaV).toBeCloseTo(0, 4);
      expect(result.tk).toBeCloseTo(100, 4);
    });
  });
});
