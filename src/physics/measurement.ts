/**
 * Measurement and Significant Figures Physics Engine
 */

export function countSigFigs(value: string): number {
  // Remove scientific notation part if exists, but we'll handle standard decimals first.
  let str = value.trim().toLowerCase();
  
  // Handle scientific notation e.g., 1.20e3
  if (str.includes('e')) {
    str = str.split('e')[0];
  }

  // Remove negative sign
  if (str.startsWith('-')) {
    str = str.substring(1);
  }

  // If there's a decimal point
  if (str.includes('.')) {
    // Remove leading zeros before and after decimal until first non-zero
    const noLeading = str.replace(/^0+\.?0*/, '');
    if (noLeading === '') return str.split('.')[1].length || 1; // If it's just "0.00", return the number of zeros after decimal (as precision)

    if (/^[0.]+$/.test(str)) {
      return str.split('.')[1].length || 1;
    }
    
    // Number of sig figs is simply the length of the string without the decimal point, 
    // AFTER leading zeros are removed.
    // e.g., "0.04050" -> noLeading = "4050". length = 4.
    const withoutDecimal = str.replace('.', '');
    const firstNonZero = withoutDecimal.search(/[1-9]/);
    if (firstNonZero === -1) return 1; // all zeros
    return withoutDecimal.length - firstNonZero;
  } else {
    // No decimal point.
    // Trailing zeros are not significant unless there's a decimal.
    // "100" -> 1. "100." -> 3 (but string ends with . handled above if we kept it)
    const firstNonZero = str.search(/[1-9]/);
    if (firstNonZero === -1) return 1; // "0" -> 1
    
    const noTrailing = str.replace(/0+$/, '');
    return noTrailing.length - firstNonZero;
  }
}

export function roundToSigFigs(value: number, sigFigs: number): string {
  if (value === 0) {
    // Return "0" with required decimals if sigFigs > 1
    if (sigFigs <= 1) return "0";
    return "0." + "0".repeat(sigFigs - 1);
  }

  const isNegative = value < 0;
  const absVal = Math.abs(value);

  // Math.floor(Math.log10(absVal)) gets the order of magnitude
  const magnitude = Math.floor(Math.log10(absVal));
  const shift = sigFigs - 1 - magnitude;
  
  // shift can be positive or negative
  const factor = Math.pow(10, shift);
  let rounded = Math.round(absVal * factor) / factor;

  // Convert to string to handle trailing zeros
  // We want exactly `sigFigs` digits in the final output string (excluding decimal and sign)
  // Easiest is to use toPrecision
  let result = rounded.toPrecision(sigFigs);

  // toPrecision might return scientific notation "1.2e+3" if it's large.
  // The problem asks for standard notation where possible, or scientific if needed.
  // Let's stick to toPrecision's default behavior, but we can format it out of scientific if it's small enough.
  if (result.includes('e')) {
    const [base, exp] = result.split('e');
    const expNum = parseInt(exp, 10);
    const superscripts: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '+': '', '-': '⁻'
    };
    const expStr = exp.split('').map(c => c in superscripts ? superscripts[c] : c).join('');
    return (isNegative ? "-" : "") + `${base} × 10${expStr}`;
  }
  
  return (isNegative ? "-" : "") + result;
}

export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

export function calculateStdDev(values: number[], isSample = true): number {
  if (values.length <= 1) return 0;
  const mean = calculateMean(values);
  const sumSq = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
  return Math.sqrt(sumSq / (values.length - (isSample ? 1 : 0)));
}

/**
 * Get absolute uncertainty (Δx) for a single measurement.
 * Usually 1/2 of smallest scale (NST).
 * Jangka Sorong (0.05 mm or 0.02 mm depending on scale). 
 * Let's assume standard caliper NST = 0.05 mm -> Δx = 0.05 mm. (Wait, for standard 20 division vernier, NST = 1/20 = 0.05mm. Single measurement absolute uncertainty = 0.05mm. Some use 1/2 NST = 0.025, but in Indonesia, Jangka Sorong uncertainty is often taken as 0.05mm or 0.01cm for 10 div).
 * We will pass NST to this function.
 */
export function getSingleMeasurementUncertainty(nst: number): number {
  return nst / 2;
}

/**
 * Get relative uncertainty (Ketidakpastian Relatif = (Δx / x) * 100%)
 */
export function getRelativeUncertainty(x: number, deltaX: number): number {
  if (x === 0) return Infinity; // Relative error is undefined/infinite for zero
  return Math.abs((deltaX / x) * 100);
}

/**
 * Calculates the readings for a Vernier Caliper given the physical jaw opening (openMm)
 * and the instrument's least count (nstMm).
 * Handles edge cases where precision loss might round the remainder up to the total vernier scale length.
 */
export function readVernierCaliper(openMm: number, nstMm: number): {
  mainScaleReading: number;
  vernierLineIndex: number;
  vernierReading: number;
  totalReading: number;
} {
  let mainScaleReading = Math.floor(openMm);
  const remainder = openMm - mainScaleReading;
  
  let vernierLineIndex = Math.round(remainder / nstMm);
  const totalVernierLines = Math.round(1 / nstMm);
  
  // Edge case: if remainder is very close to 1mm, vernierLineIndex might round up to totalVernierLines.
  // For example: openMm = 26.999999, main=26, rem=0.999999. Index rounds to 20 (for 0.05 nst).
  // 20 * 0.05 = 1.00. This means it actually hit the next main scale tick.
  if (vernierLineIndex >= totalVernierLines) {
    vernierLineIndex = 0;
    mainScaleReading += 1;
  }
  
  const vernierReading = Number((vernierLineIndex * nstMm).toFixed(4));
  
  // To avoid floating point math errors on addition like 12 + 0.35 = 12.350000000000001
  const totalReading = Number((mainScaleReading + vernierReading).toFixed(4));
  
  return {
    mainScaleReading,
    vernierLineIndex,
    vernierReading,
    totalReading
  };
}
