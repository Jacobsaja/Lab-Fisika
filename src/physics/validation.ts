/**
 * Generic Student Calculation Validation Utility
 *
 * Validates a student's numerical entry against expected ground truth for lab practicums.
 *
 * Evaluation rules:
 * - Empty string, whitespace-only, or non-numeric input evaluates to false.
 * - Supports both '.' and ',' as decimal separators.
 * - For near-zero values (|groundTruth| < 0.01), uses a tightened absolute bound of 1e-4 (0.0001).
 * - Otherwise, applies a relative tolerance of ±2.0% (0.02) to accept reasonable
 *   3-significant-figure roundings while strictly rejecting erroneous calculations.
 */
export function validateStudentCalculation(
  enteredStr: string,
  groundTruth: number,
  relativeTolerance = 0.02,
  absoluteNearZeroBound = 0.0001
): boolean {
  if (!enteredStr || typeof enteredStr !== "string") return false;
  const trimmed = enteredStr.trim();
  if (trimmed === "") return false;
  const normalized = trimmed.replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || isNaN(parsed)) return false;

  const absTruth = Math.abs(groundTruth);
  const absDiff = Math.abs(parsed - groundTruth);

  if (absTruth < 0.01) {
    return absDiff <= absoluteNearZeroBound;
  }

  return absDiff / absTruth <= relativeTolerance;
}
