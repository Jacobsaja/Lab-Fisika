import { 
  countSignificantFigures, 
  roundToSignificantFigures, 
  calculateMean, 
  calculateStdDev, 
  getSingleMeasurementUncertainty, 
  getRelativeUncertainty,
  readVernierCaliper,
  quantizeToResolution,
  uncertaintyFromLeastCount,
  formatMeasurement
} from "../physics/measurement";

describe("Measurement Physics Engine", () => {
  describe("countSignificantFigures", () => {
    it("counts trailing zeros after decimal", () => {
      expect(countSignificantFigures("2.00").count).toBe(3);
      expect(countSignificantFigures("1.500").count).toBe(4);
    });

    it("ignores leading zeros", () => {
      expect(countSignificantFigures("0.050").count).toBe(2);
      expect(countSignificantFigures("0.0004").count).toBe(1);
    });

    it("counts sandwiched zeros", () => {
      expect(countSignificantFigures("1.002").count).toBe(4);
      expect(countSignificantFigures("10.05").count).toBe(4);
    });

    it("handles integers (no decimal)", () => {
      expect(countSignificantFigures("100").count).toBe(1);
      expect(countSignificantFigures("101").count).toBe(3);
    });
    
    it("handles scientific notation", () => {
      expect(countSignificantFigures("1.20e3").count).toBe(3);
      expect(countSignificantFigures("4.5e-4").count).toBe(2);
    });
  });

  describe("roundToSignificantFigures", () => {
    it("rounds decimals correctly", () => {
      expect(roundToSignificantFigures(0.04567, 2)).toBe("0.046");
      expect(roundToSignificantFigures(1.002, 2)).toBe("1.0");
    });

    it("adds trailing zeros to meet sig figs", () => {
      expect(roundToSignificantFigures(2, 3)).toBe("2.00");
      expect(roundToSignificantFigures(1.5, 4)).toBe("1.500");
    });

    it("uses scientific notation for large numbers if needed", () => {
      // 1500 to 2 sig figs -> 1.5e3 -> 1.5 × 10³
      expect(roundToSignificantFigures(1500, 2)).toBe("1.5 × 10³");
    });
  });

  describe("new explore functions", () => {
    it("quantizeToResolution", () => {
      expect(quantizeToResolution(12.34, 0.05)).toBe(12.35);
      expect(quantizeToResolution(12.32, 0.05)).toBe(12.30);
    });
    it("uncertaintyFromLeastCount", () => {
      expect(uncertaintyFromLeastCount(0.05)).toBe(0.025);
    });
    it("formatMeasurement", () => {
      expect(formatMeasurement(2.35, 0.05)).toBe("2,35 ± 0,05");
      expect(formatMeasurement(2.35, 0.025)).toBe("2,350 ± 0,025");
      expect(formatMeasurement(15, 0.1)).toBe("15,0 ± 0,1");
    });
  });

  describe("Statistics", () => {
    it("calculates mean", () => {
      expect(calculateMean([10, 20, 30])).toBe(20);
      expect(calculateMean([2.5, 2.7, 2.6])).toBeCloseTo(2.6);
    });

    it("calculates sample standard deviation", () => {
      // Data: 2, 4, 4, 4, 5, 5, 7, 9 -> Mean = 5
      const data = [2, 4, 4, 4, 5, 5, 7, 9];
      const stdDev = calculateStdDev(data);
      expect(stdDev).toBeCloseTo(2.138, 3);
    });
  });

  describe("Uncertainty", () => {
    it("calculates absolute uncertainty from NST", () => {
      expect(getSingleMeasurementUncertainty(0.05)).toBe(0.025);
      expect(getSingleMeasurementUncertainty(0.1)).toBe(0.05);
    });

    it("calculates relative uncertainty", () => {
      // (0.05 / 2.0) * 100% = 2.5%
      expect(getRelativeUncertainty(2.0, 0.05)).toBe(2.5);
      expect(getRelativeUncertainty(0, 0.05)).toBe(Infinity);
    });
  });

  describe("readVernierCaliper", () => {
    it("reads exactly on round mm", () => {
      const { mainScaleReading, vernierReading, totalReading } = readVernierCaliper(15.0, 0.05);
      expect(mainScaleReading).toBe(15);
      expect(vernierReading).toBe(0);
      expect(totalReading).toBe(15.00);
    });

    it("reads correctly in the middle of scale", () => {
      const { mainScaleReading, vernierLineIndex, vernierReading, totalReading } = readVernierCaliper(12.35, 0.05);
      expect(mainScaleReading).toBe(12);
      expect(vernierLineIndex).toBe(7); // 0.35 / 0.05 = 7
      expect(vernierReading).toBe(0.35);
      expect(totalReading).toBe(12.35);
    });

    it("handles edge case of rounding up to full mm", () => {
      // 26.999999 is slightly below 27, but vernier scale 0.05 can't show 0.999
      // it should round up to the next mm mark
      const { mainScaleReading, vernierLineIndex, vernierReading, totalReading } = readVernierCaliper(26.999999, 0.05);
      expect(mainScaleReading).toBe(27);
      expect(vernierLineIndex).toBe(0);
      expect(vernierReading).toBe(0);
      expect(totalReading).toBe(27.00);
    });

    it("handles 0.1 nst precision", () => {
      const { mainScaleReading, vernierLineIndex, vernierReading, totalReading } = readVernierCaliper(5.8, 0.1);
      expect(mainScaleReading).toBe(5);
      expect(vernierLineIndex).toBe(8); // 0.8 / 0.1 = 8
      expect(vernierReading).toBe(0.8);
      expect(totalReading).toBe(5.8);
    });

    it("handles absolute 0", () => {
      const res = readVernierCaliper(0, 0.05);
      expect(res.totalReading).toBe(0);
    });
  });
});
