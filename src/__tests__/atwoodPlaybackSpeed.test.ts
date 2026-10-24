import {
  calculateTrueAcceleration1,
  calculateTrueAcceleration2,
  calculateFallTime,
  calculateGLBTime,
  getAtwoodVelocityAt,
  getAtwoodVectors,
} from "../physics/atwood";
import { DEFAULT_PLAYBACK_SPEEDS } from "../components/simulation/PlaybackSpeedControl";

describe("Atwood Apparatus Characterization & Playback Speed Invariance", () => {
  const g = 9.8;
  const m1 = 250; // g
  const m2 = 250; // g
  const m3 = 5;   // g
  const m4 = 5;   // g

  describe("Characterization: Default Configurations Ground Truth", () => {
    test("GLBB Tahap 2 (m3 only): theoretical acceleration and fall time for s = 0.4 m", () => {
      const a1 = calculateTrueAcceleration1({ m1, m2, m3, m4, g });
      // a1 = (5 * 9.8) / (250 + 250 + 5) = 49 / 505 ≈ 0.09703 m/s²
      expect(a1).toBeCloseTo(49 / 505, 5);

      const s_AB = 0.4;
      const t_ideal = calculateFallTime(s_AB, a1, false);
      // t = sqrt(2 * 0.4 / 0.09703) = sqrt(0.8 * 505 / 49) = sqrt(8.244898) ≈ 2.8714 s
      expect(t_ideal).toBeCloseTo(2.8714, 3);
    });

    test("GLBB Tahap 3 (m3 + m4): theoretical acceleration and fall time for s = 0.4 m", () => {
      const a2 = calculateTrueAcceleration2({ m1, m2, m3, m4, g });
      // a2 = (10 * 9.8) / (250 + 250 + 10) = 98 / 510 ≈ 0.19216 m/s²
      expect(a2).toBeCloseTo(98 / 510, 5);

      const s_AB = 0.4;
      const t_ideal = calculateFallTime(s_AB, a2, false);
      // t = sqrt(2 * 0.4 / 0.19216) = sqrt(0.8 * 510 / 98) = sqrt(4.163265) ≈ 2.0404 s
      expect(t_ideal).toBeCloseTo(2.0404, 3);
    });

    test("GLB (m3 + m4 caught at B, s_AB = 0.2 m, s_BC = 0.4 m): theoretical velocity and GLB time", () => {
      const a2 = calculateTrueAcceleration2({ m1, m2, m3, m4, g });
      const s_AB = 0.2;
      const v_true = Math.sqrt(2 * a2 * s_AB);
      // v = sqrt(2 * 0.19215686 * 0.2) ≈ 0.27724 m/s
      expect(v_true).toBeCloseTo(0.27724, 4);

      const s_BC = 0.4;
      const t_glb_ideal = calculateGLBTime(s_BC, v_true, false);
      // t = 0.4 / 0.27724 ≈ 1.4428 s
      expect(t_glb_ideal).toBeCloseTo(1.4428, 3);
    });
  });

  describe("Playback Speed Simulation Invariance: Stopwatch & Physical State", () => {
    // Stepper function modeling the apparatus animation loop
    function simulateAtwoodRun({
      mode,
      speed,
      a_true,
      v_true,
      s_AB,
      s_BC,
      frameIntervalWallSec = 1 / 60,
    }: {
      mode: "GLBB" | "GLB";
      speed: number;
      a_true: number;
      v_true?: number;
      s_AB: number;
      s_BC: number;
      frameIntervalWallSec?: number;
    }) {
      const t_AB = calculateFallTime(s_AB, a_true, false);
      let t_BC = 0;
      let v_anim = 0;

      if (mode === "GLB" && v_true) {
        t_BC = calculateGLBTime(s_BC, v_true, false);
        v_anim = s_BC / t_BC;
      } else {
        v_anim = Math.sqrt(2 * a_true * s_AB);
        t_BC = s_BC / v_anim;
      }

      let simTime = 0;
      let stopwatchDisplay = "0.00";
      let stopwatchRunning = mode === "GLBB";
      let passedB = false;
      let isFinished = false;

      // Run until simulation reaches total duration
      const totalDuration = t_AB + t_BC;
      while (!isFinished) {
        simTime += frameIntervalWallSec * speed;

        if (simTime <= t_AB) {
          if (mode === "GLBB") {
            stopwatchDisplay = simTime.toFixed(2);
          }
        } else if (simTime <= totalDuration) {
          if (!passedB) {
            passedB = true;
            if (mode === "GLBB") {
              stopwatchRunning = false;
              stopwatchDisplay = t_AB.toFixed(2); // Analytical lock
            } else if (mode === "GLB") {
              stopwatchRunning = true;
            }
          }

          if (mode === "GLB" && stopwatchRunning) {
            stopwatchDisplay = (simTime - t_AB).toFixed(2);
          }
        } else {
          // Finished
          isFinished = true;
          if (mode === "GLB") {
            stopwatchRunning = false;
            stopwatchDisplay = t_BC.toFixed(2); // Analytical lock
          }
        }
      }

      return {
        t_AB,
        t_BC,
        finalStopwatch: stopwatchDisplay,
      };
    }

    test("GLBB: Stopwatch final reading is exactly identical across all speeds (1x, 0.75x, 0.5x, 0.25x)", () => {
      const a1 = calculateTrueAcceleration1({ m1, m2, m3, m4, g });
      const s_AB = 0.4;
      const s_BC = 0.6;

      const results = DEFAULT_PLAYBACK_SPEEDS.map((speed) => {
        return simulateAtwoodRun({
          mode: "GLBB",
          speed,
          a_true: a1,
          s_AB,
          s_BC,
        });
      });

      // Expected analytical reading: 2.87 s
      const baseline = results[0].finalStopwatch;
      expect(baseline).toBe("2.87");

      results.forEach((res) => {
        expect(res.finalStopwatch).toBe(baseline);
      });
    });

    test("GLB: Stopwatch final reading is exactly identical across all speeds (1x, 0.75x, 0.5x, 0.25x)", () => {
      const a2 = calculateTrueAcceleration2({ m1, m2, m3, m4, g });
      const s_AB = 0.2;
      const v_true = Math.sqrt(2 * a2 * s_AB);
      const s_BC = 0.4;

      const results = DEFAULT_PLAYBACK_SPEEDS.map((speed) => {
        return simulateAtwoodRun({
          mode: "GLB",
          speed,
          a_true: a2,
          v_true,
          s_AB,
          s_BC,
        });
      });

      // Expected analytical reading: 1.44 s
      const baseline = results[0].finalStopwatch;
      expect(baseline).toBe("1.44");

      results.forEach((res) => {
        expect(res.finalStopwatch).toBe(baseline);
      });
    });

    test("Old vs New Stopwatch comparison characterization", () => {
      const a1 = calculateTrueAcceleration1({ m1, m2, m3, m4, g });
      const s_AB = 0.4;
      const t_AB = calculateFallTime(s_AB, a1, false); // 2.8714 s

      // Old behavior: started 50ms late, stopped at first frame when elapsed >= t_AB
      // e.g., frame rate 60 FPS (dt = 0.01667 s).
      const oldFrames = Math.ceil(t_AB / (1 / 60));
      const oldWallTimeAtDetection = oldFrames * (1 / 60);
      const oldStopwatchValue = oldWallTimeAtDetection - 0.05; // 50ms late start

      // New behavior: analytical lock to exact event time t_AB
      const newStopwatchValue = t_AB;

      // Difference between old frame-rate-dependent and new analytical
      const delta = Math.abs(newStopwatchValue - oldStopwatchValue);
      // Delta is approximately 0.04 to 0.05 seconds due to the removal of the 50ms start delay
      expect(delta).toBeLessThan(0.06);
      expect(delta).toBeGreaterThan(0.03);
    });
  });
});
