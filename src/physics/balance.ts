export const BALANCE_TOLERANCE_G = 0.05;

export interface OhausSliders {
  topGrams: number;
  middleGrams: number;
  bottomGrams: number;
}

export interface BalanceState {
  totalSliderMass: number;
  difference: number;
  isBalanced: boolean;
  pointerDeflection: number; // Range: -1.0 (pegged down) to 1.0 (pegged up)
}

/**
 * Menghitung status fisis keseimbangan lengan O'haus.
 * @param sliders Nilai massa saat ini di ketiga lengan
 * @param objectMassGrams Massa sebenarnya (ground truth) benda di atas piringan
 */
export function calculateOhausBalance(sliders: OhausSliders, objectMassGrams: number): BalanceState {
  const totalSliderMass = sliders.topGrams + sliders.middleGrams + sliders.bottomGrams;
  
  // Selisih: jika benda lebih berat dari slider, lengan piringan turun, lengan panjang terangkat (jarum naik -> positif)
  // Jika benda lebih ringan dari slider, lengan panjang jatuh (jarum turun -> negatif)
  const difference = objectMassGrams - totalSliderMass;
  
  const isBalanced = Math.abs(difference) <= BALANCE_TOLERANCE_G;
  
  // Defleksi jarum (pointer): 
  // Kita asumsikan selisih 5 gram sudah cukup membuat jarum mentok maksimum ke atas/bawah (pegged).
  // Di dunia nyata, kepekaan (sensitivity) neraca menentukan ini.
  const SENSITIVITY_G = 5.0; 
  
  let pointerDeflection = difference / SENSITIVITY_G;
  
  // Clamp nilai antara -1.0 dan 1.0
  if (pointerDeflection > 1.0) pointerDeflection = 1.0;
  if (pointerDeflection < -1.0) pointerDeflection = -1.0;

  return {
    totalSliderMass,
    difference,
    isBalanced,
    pointerDeflection
  };
}
