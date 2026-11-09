/**
 * BoraScan Configuration & Tunable Parameters
 */

export const AI_MODEL = "gemini-2.5-flash";

export interface BatchThresholds {
  h0: number; // Hue of a blank pad (degrees)
  dh1: number; // Hue shift for code 1 (degrees)
  dh2: number; // Hue shift for code 2 (degrees)
  Lsat: number; // Lightness below which A_G is unreliable
  cRatio: number; // Chroma collapse ratio for ammonia B+ confirmation
  aRatio: number; // a* collapse ratio for ammonia B+ confirmation
  dL: number; // Old ammonia lightness change threshold
  aMax: number; // Old ammonia a* maximum threshold
  lod: number; // Limit of detection (%)
  cut: number; // Cutoff for code 2 (%)
  lin: number; // Linear range limit (%)
  m: number; // Calibration slope
  b: number; // Calibration intercept
  sy: number; // Standard error
  g0: number; // Blank normalization factor
}

export const DEFAULT_THRESHOLDS: BatchThresholds = {
  h0: 80,
  dh1: 6,
  dh2: 12,
  Lsat: 25,
  cRatio: 0.6,
  aRatio: 0.6,
  dL: -10,
  aMax: 5,
  lod: 0.02,
  cut: 0.1,
  lin: 0.25,
  m: 0.974,
  b: 0.002,
  sy: 0.006,
  g0: 1.0,
};

export const PAD_SEARCH_AREA_MM = {
  xMin: 31.0,
  xMax: 56.0,
  yMin: 26.0,
  yMax: 44.0,
};

export const PAD_SEARCH_AREA_CANONICAL_PX = {
  xMin: 310,
  xMax: 560,
  yMin: 260,
  yMax: 440,
};
