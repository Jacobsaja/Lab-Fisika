export interface SigFigDigitGroup {
  text: string;
  isSignificant: boolean;
  reason: string;
}

export interface SigFigAnalysis {
  count: number;
  groups: SigFigDigitGroup[];
}

export function countSignificantFigures(input: string): SigFigAnalysis {
  const groups: SigFigDigitGroup[] = [];
  let str = input.trim().toLowerCase();
  
  if (!str) return { count: 0, groups: [] };

  if (str.startsWith('-') || str.startsWith('+')) {
    groups.push({ text: str[0], isSignificant: false, reason: "Tanda plus/minus tidak dihitung sebagai angka penting." });
    str = str.substring(1);
  }

  let sci = "";
  if (str.includes('e')) {
    const idx = str.indexOf('e');
    sci = str.substring(idx);
    str = str.substring(0, idx);
  }

  const hasDecimal = str.includes('.');
  
  let firstNonZero = -1;
  let lastNonZero = -1;
  for (let i = 0; i < str.length; i++) {
    if (str[i] >= '1' && str[i] <= '9') {
      if (firstNonZero === -1) firstNonZero = i;
      lastNonZero = i;
    }
  }

  if (firstNonZero === -1) {
    groups.push({ text: str, isSignificant: true, reason: "Konvensi: angka nol tunggal dianggap 1 angka penting." });
    if (sci) groups.push({ text: sci, isSignificant: false, reason: "Eksponen tidak dihitung sebagai angka penting." });
    return { count: 1, groups };
  }

  if (firstNonZero > 0) {
    groups.push({ text: str.substring(0, firstNonZero), isSignificant: false, reason: "Angka nol di depan (leading zeros) tidak signifikan." });
  }

  if (hasDecimal) {
    groups.push({ text: str.substring(firstNonZero), isSignificant: true, reason: "Semua angka bukan nol, nol yang diapit, dan nol di akhir setelah desimal adalah signifikan." });
  } else {
    if (lastNonZero < str.length - 1) {
      groups.push({ text: str.substring(firstNonZero, lastNonZero + 1), isSignificant: true, reason: "Angka bukan nol dan nol yang diapit adalah signifikan." });
      groups.push({ text: str.substring(lastNonZero + 1), isSignificant: false, reason: "Angka nol di akhir (trailing zeros) tanpa titik desimal tidak signifikan." });
    } else {
      groups.push({ text: str.substring(firstNonZero), isSignificant: true, reason: "Semua angka bukan nol dan nol yang diapit adalah signifikan." });
    }
  }

  if (sci) {
    groups.push({ text: sci, isSignificant: false, reason: "Orde magnitudo (eksponen) tidak dihitung sebagai angka penting." });
  }

  const count = groups.filter(g => g.isSignificant).map(g => g.text.replace('.', '').length).reduce((a, b) => a + b, 0);

  return { count, groups };
}

export function quantizeToResolution(trueValue: number, leastCount: number): number {
  if (leastCount <= 0) return trueValue;
  // Use toFixed to avoid floating point math errors
  return Number((Math.round(trueValue / leastCount) * leastCount).toFixed(4));
}

export function uncertaintyFromLeastCount(leastCount: number): number {
  return Number((leastCount / 2).toFixed(4));
}

function getDecimalPlaces(num: number): number {
  if (Math.floor(num) === num) return 0;
  return num.toString().split(".")[1]?.length || 0;
}

export function formatMeasurement(value: number, uncertainty: number): string {
  const decimalPlaces = getDecimalPlaces(uncertainty);
  const valStr = value.toFixed(decimalPlaces).replace(".", ",");
  const uncStr = uncertainty.toFixed(decimalPlaces).replace(".", ",");
  return `${valStr} ± ${uncStr}`;
}

export function roundToSignificantFigures(value: number, sigFigs: number): string {
  if (value === 0) {
    if (sigFigs <= 1) return "0";
    return "0." + "0".repeat(sigFigs - 1);
  }

  const isNegative = value < 0;
  const absVal = Math.abs(value);

  const magnitude = Math.floor(Math.log10(absVal));
  const shift = sigFigs - 1 - magnitude;
  
  const factor = Math.pow(10, shift);
  const rounded = Math.round(absVal * factor) / factor;

  const result = rounded.toPrecision(sigFigs);

  if (result.includes('e')) {
    const [base, exp] = result.split('e');
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

export function getRelativeUncertainty(x: number, deltaX: number): number {
  if (x === 0) return Infinity;
  return Math.abs((deltaX / x) * 100);
}

// Keeping original getSingleMeasurementUncertainty to avoid breaking changes in other modules
export function getSingleMeasurementUncertainty(nst: number): number {
  return nst / 2;
}

// Keeping readVernierCaliper for compatibility
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
  
  if (vernierLineIndex >= totalVernierLines) {
    vernierLineIndex = 0;
    mainScaleReading += 1;
  }
  
  const vernierReading = Number((vernierLineIndex * nstMm).toFixed(4));
  const totalReading = Number((mainScaleReading + vernierReading).toFixed(4));
  
  return {
    mainScaleReading,
    vernierLineIndex,
    vernierReading,
    totalReading
  };
}
