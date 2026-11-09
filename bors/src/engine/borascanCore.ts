/**
 * BoraScan Core Computer Vision & Analytical Chemistry Engine
 * Full implementation compliant with BoraScan Fix Prompt
 */

export interface LabColor {
  L: number;
  a: number;
  b: number;
}

export interface PadStats {
  medianRgb: [number, number, number];
  correctedRgb: [number, number, number];
  L: number;
  a: number;
  b: number;
  C: number;
  h: number;
  h_p10: number;
  pad_area_mm2: number;
  valid_fraction: number;
  saturated_fraction: number;
  total_pad_pixels: number;
  valid_count: number;
  saturated_count: number;
  warningBadge?: string;
  qualityError?: { code: string; reasonId: string; reasonEn: string; fixId?: string; fixEn?: string };
}

export interface PatchMeasurement {
  name: string;
  medianRgb?: [number, number, number];
  medianRGB?: [number, number, number];
  nominalRgb: [number, number, number];
  sdG?: number;
}

export interface StainedPatchResult {
  matrix: number[][]; // 3x3 matrix
  stainedPatches: string[];
  cleanPatches: string[];
  success: boolean;
  errorMessageId?: string;
  errorMessageEn?: string;
}

export interface FirstScanDecision {
  hueCode: number; // 0, 1, or 2
  amountCode: number | null; // 0, 1, 2 or null if unreliable
  finalCode: string; // "0", "1", or "2"
  deltaH: number;
  isUnreliable: boolean;
  estimateText: string;
  estimateDisplayRange: string;
  categoryName: string;
  warningNote?: string;
  ruleExplanation: string;
}

export interface AmmoniaDecision {
  category: "B+" | "B-" | "2" | "Tidak pasti";
  ruleTriggered: string; // "(a)", "(b)", "(c)", "dark_pad_b_plus", "dark_pad_strong_ind", "B-", "uncertain_no_first_scan", "uncertain_default"
  messageId: string;
  messageEn: string;
  titleId: string;
  titleEn: string;
  warningNote?: string;
  ruleExplanation: string;
}

export interface AiAnalysisResult {
  pad_visible: boolean;
  pad_description: string;
  closest_patch: "W" | "G" | "0" | "1" | "2" | "B+";
  borax_likely: "yes" | "no" | "uncertain";
  ammonia_change: "greenish_black" | "darker_only" | "unchanged" | "not_applicable";
  confidence: number;
  quality_issues: string[];
  explanation_id: string;
  explanation_en: string;
}

export interface CombinedResult {
  finalCode: string; // "0", "1", "2", "B+", "B-", "Tidak pasti"
  displayTitle: string;
  displayMessageId: string;
  displayMessageEn: string;
  aiNote?: string;
  aiExplanation?: string;
  aiConfidenceText?: "Tinggi" | "Sedang" | "Rendah";
  qualityChips: string[];
}

// ---------------- Color Conversion Utilities ---------------- //

export function srgbToLinear(rgb: [number, number, number]): [number, number, number] {
  return [
    srgbComponentToLinear(rgb[0]),
    srgbComponentToLinear(rgb[1]),
    srgbComponentToLinear(rgb[2]),
  ];
}

function srgbComponentToLinear(c: number): number {
  const a = Math.max(0, Math.min(255, c)) / 255.0;
  return a <= 0.04045 ? a / 12.92 : Math.pow((a + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(linear: [number, number, number]): [number, number, number] {
  return [
    linearComponentToSrgb(linear[0]),
    linearComponentToSrgb(linear[1]),
    linearComponentToSrgb(linear[2]),
  ];
}

function linearComponentToSrgb(c: number): number {
  const a = Math.max(0, c);
  const s = a <= 0.0031308 ? 12.92 * a : 1.055 * Math.pow(a, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(s * 255)));
}

export function linearToXyz(linear: [number, number, number]): [number, number, number] {
  const [r, g, b] = linear;
  const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
  return [x, y, z];
}

export function xyzToLab(
  xyz: [number, number, number],
  whiteRef: [number, number, number] = [0.95047, 1.0, 1.08883]
): LabColor {
  const [x, y, z] = xyz;
  function f(t: number): number {
    return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  }
  const fx = f(x / whiteRef[0]);
  const fy = f(y / whiteRef[1]);
  const fz = f(z / whiteRef[2]);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  return { L, a, b };
}

export function srgbToLab(rgb: [number, number, number]): LabColor {
  const lin = srgbToLinear(rgb);
  const xyz = linearToXyz(lin);
  return xyzToLab(xyz);
}

export function deltaE76(c1: LabColor, c2: LabColor): number {
  const dL = c1.L - c2.L;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

export function calcHue(a: number, b: number): number {
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return h;
}

export function calcChroma(a: number, b: number): number {
  return Math.sqrt(a * a + b * b);
}

export function applyMatrix3x3(
  vec: [number, number, number],
  mat: number[][]
): [number, number, number] {
  const r = vec[0] * mat[0][0] + vec[1] * mat[1][0] + vec[2] * mat[2][0];
  const g = vec[0] * mat[0][1] + vec[1] * mat[1][1] + vec[2] * mat[2][1];
  const b = vec[0] * mat[0][2] + vec[1] * mat[1][2] + vec[2] * mat[2][2];
  return [Math.max(0, r), Math.max(0, g), Math.max(0, b)];
}

export function fitMatrix3x3(
  measuredList: [number, number, number][],
  nominalList: [number, number, number][]
): number[][] {
  const n = measuredList.length;
  if (n < 3 || n !== nominalList.length) {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
  }
  const S: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let k = 0; k < n; k++) {
    const p = measuredList[k];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        S[r][c] += p[r] * p[c];
      }
    }
  }

  const T: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let k = 0; k < n; k++) {
    const p = measuredList[k];
    const q = nominalList[k];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        T[r][c] += p[r] * q[c];
      }
    }
  }

  const a00 = S[0][0], a01 = S[0][1], a02 = S[0][2];
  const a10 = S[1][0], a11 = S[1][1], a12 = S[1][2];
  const a20 = S[2][0], a21 = S[2][1], a22 = S[2][2];

  const det =
    a00 * (a11 * a22 - a12 * a21) -
    a01 * (a10 * a22 - a12 * a20) +
    a02 * (a10 * a21 - a11 * a20);

  if (Math.abs(det) < 1e-12) {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
  }
  const invDet = 1.0 / det;
  const S_inv = [
    [
      (a11 * a22 - a12 * a21) * invDet,
      (a02 * a21 - a01 * a22) * invDet,
      (a01 * a12 - a02 * a11) * invDet,
    ],
    [
      (a12 * a20 - a10 * a22) * invDet,
      (a00 * a22 - a02 * a20) * invDet,
      (a02 * a10 - a00 * a12) * invDet,
    ],
    [
      (a10 * a21 - a11 * a20) * invDet,
      (a01 * a20 - a00 * a21) * invDet,
      (a00 * a11 - a01 * a10) * invDet,
    ],
  ];

  const M: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      for (let k = 0; k < 3; k++) {
        M[r][c] += S_inv[r][k] * T[k][c];
      }
    }
  }
  return M;
}

// ---------------- Section 2: Stained-Card Check & Refit ---------------- //

export function checkStainedPatchesAndFitMatrix(
  patches: PatchMeasurement[]
): StainedPatchResult {
  const measuredLin = patches.map((p) => srgbToLinear(p.medianRgb || p.medianRGB || [128, 128, 128]));
  const nominalLin = patches.map((p) => srgbToLinear(p.nominalRgb));

  const initialMatrix = fitMatrix3x3(measuredLin, nominalLin);
  const stained: string[] = [];
  const clean: string[] = [];

  for (let i = 0; i < patches.length; i++) {
    const p = patches[i];
    const corrLin = applyMatrix3x3(measuredLin[i], initialMatrix);
    const corrLab = xyzToLab(linearToXyz(corrLin));
    const targetLab = xyzToLab(linearToXyz(nominalLin[i]));
    const dE = deltaE76(corrLab, targetLab);

    if (dE > 12.0 || (p.sdG !== undefined && p.sdG > 10.0)) {
      stained.push(p.name);
    } else {
      clean.push(p.name);
    }
  }

  const isWStained = stained.includes("W");
  if (isWStained || clean.length < 4) {
    return {
      matrix: initialMatrix,
      stainedPatches: stained,
      cleanPatches: clean,
      success: false,
      errorMessageId: "Kartu bernoda – ganti kartu",
      errorMessageEn: "Card is stained – replace card",
    };
  }

  const cleanMeasuredLin: [number, number, number][] = [];
  const cleanNominalLin: [number, number, number][] = [];
  for (let i = 0; i < patches.length; i++) {
    if (!stained.includes(patches[i].name)) {
      cleanMeasuredLin.push(measuredLin[i]);
      cleanNominalLin.push(nominalLin[i]);
    }
  }

  const finalMatrix = fitMatrix3x3(cleanMeasuredLin, cleanNominalLin);
  return {
    matrix: finalMatrix,
    stainedPatches: stained,
    cleanPatches: clean,
    success: true,
  };
}

// ---------------- Section 1: Pad Segmentation ---------------- //

export function segmentPad(
  canonicalData: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  colorCorrectionMatrix: number[][],
  correctedWLab: LabColor,
  searchBoundsPx = { xMin: 310, xMax: 560, yMin: 260, yMax: 440 }
): PadStats {
  const { xMin, xMax, yMin, yMax } = searchBoundsPx;
  const gridW = xMax - xMin;
  const gridH = yMax - yMin;

  const candidateGrid = new Uint8Array(gridW * gridH);
  const pixelLabs: (LabColor | null)[] = new Array(gridW * gridH).fill(null);
  const pixelRgbs: ([number, number, number] | null)[] = new Array(gridW * gridH).fill(null);

  for (let gy = 0; gy < gridH; gy++) {
    const py = yMin + gy;
    const rowOffset = py * imageWidth * 4;
    for (let gx = 0; gx < gridW; gx++) {
      const px = xMin + gx;
      const idx = rowOffset + px * 4;
      const r = canonicalData[idx];
      const g = canonicalData[idx + 1];
      const b = canonicalData[idx + 2];

      // Remove glare: any channel >= 250
      if (r >= 250 || g >= 250 || b >= 250) continue;

      // Remove glare in HSV: V > 0.92 and S < 0.25
      const maxC = Math.max(r, g, b) / 255.0;
      const minC = Math.min(r, g, b) / 255.0;
      const delta = maxC - minC;
      const V = maxC;
      const S = maxC === 0 ? 0 : delta / maxC;
      if (V > 0.92 && S < 0.25) continue;

      // Color correction
      const lin = srgbToLinear([r, g, b]);
      const corrLin = applyMatrix3x3(lin, colorCorrectionMatrix);
      const corrRgb = linearToSrgb(corrLin);
      const lab = xyzToLab(linearToXyz(corrLin));

      // Pad pixels: deltaE76 from corrected W > 20
      const dE = deltaE76(lab, correctedWLab);
      if (dE > 20.0) {
        const gIdx = gy * gridW + gx;
        candidateGrid[gIdx] = 1;
        pixelLabs[gIdx] = lab;
        pixelRgbs[gIdx] = corrRgb;
      }
    }
  }

  // Connected component analysis to keep largest blob
  const labels = new Int32Array(gridW * gridH);
  let currentLabel = 1;
  const componentSizes = new Map<number, number>();

  for (let i = 0; i < gridW * gridH; i++) {
    if (candidateGrid[i] === 1 && labels[i] === 0) {
      let size = 0;
      const queue: number[] = [i];
      labels[i] = currentLabel;

      while (queue.length > 0) {
        const curr = queue.pop()!;
        size++;
        const cy = Math.floor(curr / gridW);
        const cx = curr % gridW;

        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
            const nIdx = ny * gridW + nx;
            if (candidateGrid[nIdx] === 1 && labels[nIdx] === 0) {
              labels[nIdx] = currentLabel;
              queue.push(nIdx);
            }
          }
        }
      }

      componentSizes.set(currentLabel, size);
      currentLabel++;
    }
  }

  let largestLabel = 0;
  let maxSize = 0;
  for (const [lbl, sz] of componentSizes.entries()) {
    if (sz > maxSize) {
      maxSize = sz;
      largestLabel = lbl;
    }
  }

  const largestBlob = new Uint8Array(gridW * gridH);
  if (largestLabel > 0) {
    for (let i = 0; i < gridW * gridH; i++) {
      if (labels[i] === largestLabel) largestBlob[i] = 1;
    }
  }

  // Erode 0.5 mm = 5 px
  const erodedMask = new Uint8Array(gridW * gridH);
  const radius = 5;
  for (let y = radius; y < gridH - radius; y++) {
    for (let x = radius; x < gridW - radius; x++) {
      if (largestBlob[y * gridW + x] === 1) {
        let fits = true;
        for (let dy = -radius; dy <= radius; dy += radius) {
          for (let dx = -radius; dx <= radius; dx += radius) {
            if (largestBlob[(y + dy) * gridW + (x + dx)] === 0) {
              fits = false;
              break;
            }
          }
          if (!fits) break;
        }
        if (fits) erodedMask[y * gridW + x] = 1;
      }
    }
  }

  const validPixels: { lab: LabColor; rgb: [number, number, number]; h: number }[] = [];
  const allPadPixels: { lab: LabColor; rgb: [number, number, number]; h: number }[] = [];
  let saturatedCount = 0;
  let totalPadPixels = 0;

  for (let i = 0; i < gridW * gridH; i++) {
    if (erodedMask[i] === 1) {
      totalPadPixels++;
      const lab = pixelLabs[i]!;
      const rgb = pixelRgbs[i]!;
      const h = calcHue(lab.a, lab.b);
      allPadPixels.push({ lab, rgb, h });

      if (lab.L < 25.0) {
        saturatedCount++;
      } else if (lab.L <= 85.0) {
        validPixels.push({ lab, rgb, h });
      }
    }
  }

  const validCount = validPixels.length;
  const validFraction = totalPadPixels > 0 ? validCount / totalPadPixels : 0;
  const saturatedFraction = totalPadPixels > 0 ? saturatedCount / totalPadPixels : 0;
  const padAreaMm2 = totalPadPixels / 100.0;

  let qualityError: { code: string; reasonId: string; reasonEn: string; fixId?: string; fixEn?: string } | undefined;
  if (padAreaMm2 < 40.0) {
    qualityError = {
      code: "PAD_NOT_VISIBLE",
      reasonId: "Pad tidak terlihat",
      reasonEn: "Pad is not clearly visible",
      fixId: "Posisikan pad di area bertanda strip kartu",
      fixEn: "Position pad inside the marked card slot",
    };
  } else if (validFraction < 0.15 && saturatedFraction <= 0.5) {
    qualityError = {
      code: "PAD_TOO_DARK",
      reasonId: "Pad terlalu tebal/gelap – pakai pad yang lebih tipis",
      reasonEn: "Pad is too thick or dark – use a thinner pad",
      fixId: "Tekan nata sampai tipis (1–2 mm) sebelum direndam",
      fixEn: "Flatten nata to 1-2 mm before soaking",
    };
  }

  let warningBadge: string | undefined;
  if (saturatedFraction > 0.5) {
    warningBadge = "Pad sangat gelap";
  }

  // Median calculations: use validPixels if available, else allPadPixels
  const sourcePixels = validPixels.length > 0 ? validPixels : allPadPixels;
  let medianRgb: [number, number, number] = [0, 0, 0];
  let medianLab: LabColor = { L: 0, a: 0, b: 0 };
  let medianHue = 0;
  let h_p10 = 0;
  let medianC = 0;

  if (sourcePixels.length > 0) {
    const sortedR = sourcePixels.map((p) => p.rgb[0]).sort((x, y) => x - y);
    const sortedG = sourcePixels.map((p) => p.rgb[1]).sort((x, y) => x - y);
    const sortedB = sourcePixels.map((p) => p.rgb[2]).sort((x, y) => x - y);
    const mid = Math.floor(sourcePixels.length / 2);
    medianRgb = [sortedR[mid], sortedG[mid], sortedB[mid]];

    const sortedL = sourcePixels.map((p) => p.lab.L).sort((x, y) => x - y);
    const sortedA = sourcePixels.map((p) => p.lab.a).sort((x, y) => x - y);
    const sortedBLab = sourcePixels.map((p) => p.lab.b).sort((x, y) => x - y);
    medianLab = {
      L: sortedL[mid],
      a: sortedA[mid],
      b: sortedBLab[mid],
    };

    const sortedHues = sourcePixels.map((p) => p.h).sort((x, y) => x - y);
    medianHue = sortedHues[mid];
    const p10Idx = Math.floor(0.1 * (sortedHues.length - 1));
    h_p10 = sortedHues[p10Idx];
    medianC = calcChroma(medianLab.a, medianLab.b);
  }

  return {
    medianRgb,
    correctedRgb: medianRgb,
    L: medianLab.L,
    a: medianLab.a,
    b: medianLab.b,
    C: medianC,
    h: medianHue,
    h_p10,
    pad_area_mm2: padAreaMm2,
    valid_fraction: validFraction,
    saturated_fraction: saturatedFraction,
    total_pad_pixels: totalPadPixels,
    valid_count: validCount,
    saturated_count: saturatedCount,
    warningBadge,
    qualityError,
  };
}

// ---------------- Section 3: First-Scan Decision (Code 0 / 1 / 2) ---------------- //

export function decideFirstScan(
  pad: {
    L: number;
    h: number;
    h_p10: number;
    valid_fraction: number;
  },
  batch: {
    h0?: number;
    dh1?: number;
    dh2?: number;
    Lsat?: number;
    lod?: number;
    cut?: number;
    lin?: number;
  },
  estimatedAmountPct?: number
): FirstScanDecision {
  const h0 = batch.h0 ?? 80;
  const dh1 = batch.dh1 ?? 6;
  const dh2 = batch.dh2 ?? 12;
  const Lsat = batch.Lsat ?? 25;
  const lod = batch.lod ?? 0.02;
  const cut = batch.cut ?? 0.1;
  const lin = batch.lin ?? 0.25;

  const deltaHMedian = h0 - pad.h;
  const deltaHP10 = h0 - pad.h_p10;
  const deltaH = Math.max(deltaHMedian, deltaHP10);

  let hueCode = 0;
  if (deltaH >= dh2) {
    hueCode = 2;
  } else if (deltaH >= dh1) {
    hueCode = 1;
  } else {
    hueCode = 0;
  }

  // Amount code is reliable ONLY if L* >= Lsat and valid_fraction >= 0.3 and estimated <= lin
  const isEstimateReliable = pad.L >= Lsat && pad.valid_fraction >= 0.3 && (estimatedAmountPct === undefined || estimatedAmountPct <= lin);

  let amountCode: number | null = null;
  if (isEstimateReliable && estimatedAmountPct !== undefined) {
    if (estimatedAmountPct < lod) amountCode = 0;
    else if (estimatedAmountPct < cut) amountCode = 1;
    else amountCode = 2;
  }

  const finalNumeric = Math.max(hueCode, amountCode ?? 0);
  const finalCode = finalNumeric.toString();

  let estimateText = "";
  let estimateDisplayRange = "";
  let warningNote: string | undefined;

  const isDarkPad = pad.L < Lsat || pad.valid_fraction < 0.3;
  const isAboveLin = estimatedAmountPct !== undefined && estimatedAmountPct > lin;

  if (isDarkPad || isAboveLin) {
    estimateText = `≥ 0,25 % (≥ 2.500 mg/kg) – di atas rentang kalibrasi`;
    estimateDisplayRange = ""; // No range when above calibration or dark
    if (isDarkPad) {
      warningNote = "Pad sangat gelap – kadar tidak bisa dihitung, gunakan pad lebih tipis untuk estimasi.";
    }
  } else if (estimatedAmountPct !== undefined) {
    const mgKg = Math.round(estimatedAmountPct * 10000);
    estimateText = `${estimatedAmountPct.toFixed(2).replace(".", ",")} % (${mgKg.toLocaleString("id-ID")} mg/kg)`;
    estimateDisplayRange = `${Math.max(0, estimatedAmountPct - 0.01).toFixed(2).replace(".", ",")}–${(estimatedAmountPct + 0.01).toFixed(2).replace(".", ",")} %`;
  }

  let categoryName = "Boraks tidak terdeteksi";
  if (finalCode === "2") {
    categoryName = "Boraks terdeteksi – lakukan tes amonia";
  } else if (finalCode === "1") {
    categoryName = "Belum jelas – lakukan tes amonia";
  }

  const ruleExplanation = `Warna bergeser ${Math.round(deltaH)}° dari kuning ke merah (h0=${h0}°, h_pad=${Math.round(pad.h)}°, ambang dh2=${dh2}°) → kode ${finalCode}`;

  return {
    hueCode,
    amountCode,
    finalCode,
    deltaH,
    isUnreliable: !isEstimateReliable,
    estimateText,
    estimateDisplayRange,
    categoryName,
    warningNote,
    ruleExplanation,
  };
}

// ---------------- Section 4: Ammonia Decision (B+ / B− / dark fallback) ---------------- //

export function decideAmmonia(
  beforeScan: {
    L: number;
    a: number;
    C: number;
    valid_fraction: number;
  } | null | undefined,
  afterScan: {
    L: number;
    a: number;
    C: number;
    h: number;
    valid_fraction: number;
  },
  batch: {
    cRatio?: number;
    aRatio?: number;
    dL?: number;
    aMax?: number;
  }
): AmmoniaDecision {
  const cRatio = batch.cRatio ?? 0.6;
  const aRatio = batch.aRatio ?? 0.6;
  const dL = batch.dL ?? -10.0;
  const aMax = batch.aMax ?? 5.0;

  // The ammonia step must always compare with the stored first scan of the same test.
  // If no first scan exists, the result is "Tidak pasti", NEVER B−.
  if (!beforeScan) {
    return {
      category: "Tidak pasti",
      ruleTriggered: "uncertain_no_first_scan",
      titleId: "Tidak Pasti",
      titleEn: "Uncertain",
      messageId: "Konfirmasi amonia tidak jelas – data scan pertama tidak ditemukan",
      messageEn: "Ammonia confirmation unclear – first scan data missing",
      ruleExplanation: "Scan pertama tidak ditemukan, tidak dapat membandingkan perubahan warna amonia.",
    };
  }

  // Dark-pad fallback: when valid_fraction < 0.3 in either scan
  const isDarkFallback = beforeScan.valid_fraction < 0.3 || afterScan.valid_fraction < 0.3;

  if (isDarkFallback) {
    // B+ if C*_before >= 10 and a*_after <= 0.6 * a*_before and C*_after <= 0.6 * C*_before
    const isDarkBPlus =
      beforeScan.C >= 10.0 &&
      afterScan.a <= 0.6 * beforeScan.a &&
      afterScan.C <= 0.6 * beforeScan.C;

    if (isDarkBPlus) {
      return {
        category: "B+",
        ruleTriggered: "dark_pad_b_plus",
        titleId: "Boraks Terkonfirmasi",
        titleEn: "Borax Confirmed",
        messageId: "Boraks terkonfirmasi – jangan dimakan, laporkan",
        messageEn: "Borax confirmed – do not eat, report it",
        warningNote: "pad sangat gelap",
        ruleExplanation: `Fallback pad gelap: C*_before (${beforeScan.C.toFixed(1)}) ≥ 10, a* turun ke ${afterScan.a.toFixed(1)} (≤ 0,6×), C* turun ke ${afterScan.C.toFixed(1)} (≤ 0,6×) → B+`,
      };
    } else {
      // Otherwise: keep code 2 □ with title "Indikasi kuat boraks".
      // Message: "Konfirmasi amonia tidak bisa dibaca karena pad terlalu gelap. Ulangi dengan pad tipis atau uji laboratorium."
      // NEVER B− in the fallback.
      return {
        category: "2",
        ruleTriggered: "dark_pad_strong_ind",
        titleId: "Indikasi Kuat Boraks",
        titleEn: "Strong Borax Indication",
        messageId: "Konfirmasi amonia tidak bisa dibaca karena pad terlalu gelap. Ulangi dengan pad tipis atau uji laboratorium.",
        messageEn: "Ammonia confirmation could not be read because pad is too dark. Repeat with thin pad or laboratory test.",
        warningNote: "pad sangat gelap",
        ruleExplanation: "Pad terlalu gelap untuk memastikan reaksi amonia. Indikasi kuat boraks tetap berlaku dari scan awal.",
      };
    }
  }

  // Normal mode (both scans have valid_fraction >= 0.3):
  // B+ conditions: ANY
  const condA = afterScan.h >= 90.0 && afterScan.C <= 20.0;
  const condB = afterScan.a <= aRatio * beforeScan.a && afterScan.C <= cRatio * beforeScan.C;
  const condC = afterScan.L - beforeScan.L <= dL && afterScan.a <= aMax;

  if (condA || condB || condC) {
    const rule = condA ? "(a) pad kehijauan/gelap netral" : condB ? "(b) kroma merah kolaps" : "(c) penurunan intensitas L*";
    return {
      category: "B+",
      ruleTriggered: condA ? "(a)" : condB ? "(b)" : "(c)",
      titleId: "Boraks Terkonfirmasi",
      titleEn: "Borax Confirmed",
      messageId: "Boraks terkonfirmasi – jangan dimakan, laporkan",
      messageEn: "Borax confirmed – do not eat, report it",
      ruleExplanation: `Reaksi amonia positif via aturan ${rule} → B+`,
    };
  }

  // B− is ONLY allowed when both scans have valid_fraction >= 0.3 and the red clearly stays:
  const bMinusA = afterScan.a >= 0.85 * beforeScan.a;
  const bMinusC = afterScan.C >= 0.80 * beforeScan.C;
  const bMinusValid = afterScan.valid_fraction >= 0.3;

  if (bMinusA && bMinusC && bMinusValid) {
    return {
      category: "B-",
      ruleTriggered: "B-",
      titleId: "Bukan Boraks",
      titleEn: "Not Borax",
      messageId: "Bukan boraks – makanan hanya bersifat basa",
      messageEn: "Not borax – food is only alkaline",
      ruleExplanation: `Warna merah bertahan setelah amonia (a* ${afterScan.a.toFixed(1)} ≥ 0,85×, C* ${afterScan.C.toFixed(1)} ≥ 0,8×) → B− (basa)`,
    };
  }

  // Otherwise -> Tidak pasti
  return {
    category: "Tidak pasti",
    ruleTriggered: "uncertain_default",
    titleId: "Tidak Pasti",
    titleEn: "Uncertain",
    messageId: "Konfirmasi amonia tidak jelas – ulangi dengan pad tipis atau uji lab",
    messageEn: "Ammonia confirmation unclear – repeat with thin pad or lab test",
    ruleExplanation: "Perubahan warna setelah penambahan amonia tidak memenuhi kriteria B+ maupun B−.",
  };
}

// ---------------- Section 5: Combine Rule & AI Logic ---------------- //

export function combineRuleAndAi(
  ruleResult: string, // "0", "1", "2", "B+", "B-", "Tidak pasti"
  aiResult: AiAnalysisResult | null,
  lang: "id" | "en" = "id"
): CombinedResult {
  const qualityChips = aiResult?.quality_issues || [];

  let aiConfidenceText: "Tinggi" | "Sedang" | "Rendah" = "Sedang";
  if (aiResult) {
    if (aiResult.confidence >= 0.75) aiConfidenceText = "Tinggi";
    else if (aiResult.confidence >= 0.5) aiConfidenceText = "Sedang";
    else aiConfidenceText = "Rendah";
  }

  const aiExplanation = lang === "id" ? aiResult?.explanation_id : aiResult?.explanation_en;

  if (!aiResult) {
    return {
      finalCode: ruleResult,
      displayTitle: getTitleForCode(ruleResult, lang),
      displayMessageId: getMessageForCode(ruleResult, "id"),
      displayMessageEn: getMessageForCode(ruleResult, "en"),
      qualityChips,
    };
  }

  // Table §5:
  // 1. (0 or 1) and borax_likely = yes, confidence >= 0.75 -> Code 1
  if ((ruleResult === "0" || ruleResult === "1") && aiResult.borax_likely === "yes" && aiResult.confidence >= 0.75) {
    return {
      finalCode: "1",
      displayTitle: lang === "id" ? "Kemungkinan boraks" : "Possible borax",
      displayMessageId: "Kemungkinan boraks – lakukan tes amonia",
      displayMessageEn: "Possible borax – perform ammonia confirmation",
      aiNote: lang === "id" ? "AI mendeteksi kemungkinan boraks" : "AI flagged probable borax",
      aiExplanation,
      aiConfidenceText,
      qualityChips,
    };
  }

  // 2. 2 and borax_likely = no, confidence >= 0.75 -> Code 2 stays; add "AI ragu – cek ulang foto"
  if (ruleResult === "2" && aiResult.borax_likely === "no" && aiResult.confidence >= 0.75) {
    return {
      finalCode: "2",
      displayTitle: getTitleForCode("2", lang),
      displayMessageId: "Boraks terdeteksi – lakukan tes amonia",
      displayMessageEn: "Borax detected – perform ammonia confirmation",
      aiNote: lang === "id" ? "AI ragu – cek ulang foto" : "AI uncertainty – verify photo",
      aiExplanation,
      aiConfidenceText,
      qualityChips,
    };
  }

  // 3. B− and ammonia_change = greenish_black, confidence >= 0.75 -> "Tidak pasti"
  if (ruleResult === "B-" && aiResult.ammonia_change === "greenish_black" && aiResult.confidence >= 0.75) {
    return {
      finalCode: "Tidak pasti",
      displayTitle: lang === "id" ? "Hasil Tidak Konsisten" : "Inconsistent Result",
      displayMessageId: "Hasil tidak konsisten – ulangi dengan pad baru / uji lab",
      displayMessageEn: "Inconsistent result – repeat with new pad / lab test",
      aiNote: lang === "id" ? "AI mendeteksi perubahan hijau-kehitaman pada amonia" : "AI detected greenish-black change",
      aiExplanation,
      aiConfidenceText,
      qualityChips,
    };
  }

  // 4. B+ and ammonia_change = unchanged, confidence >= 0.75 -> B+ stays, add "AI ragu – disarankan uji lab"
  if (ruleResult === "B+" && aiResult.ammonia_change === "unchanged" && aiResult.confidence >= 0.75) {
    return {
      finalCode: "B+",
      displayTitle: getTitleForCode("B+", lang),
      displayMessageId: "Boraks terkonfirmasi – jangan dimakan, laporkan",
      displayMessageEn: "Borax confirmed – do not eat, report it",
      aiNote: lang === "id" ? "AI ragu – disarankan uji lab" : "AI uncertainty – lab test recommended",
      aiExplanation,
      aiConfidenceText,
      qualityChips,
    };
  }

  // 5. "Tidak pasti" and (greenish_black or unchanged), confidence >= 0.85
  if (
    ruleResult === "Tidak pasti" &&
    (aiResult.ammonia_change === "greenish_black" || aiResult.ammonia_change === "unchanged") &&
    aiResult.confidence >= 0.85
  ) {
    const leaning = aiResult.ammonia_change === "greenish_black" ? "kemungkinan B+" : "kemungkinan B−";
    const leaningEn = aiResult.ammonia_change === "greenish_black" ? "leaning B+" : "leaning B−";
    return {
      finalCode: "Tidak pasti",
      displayTitle: lang === "id" ? "Tidak Pasti" : "Uncertain",
      displayMessageId: `Konfirmasi amonia tidak jelas (AI: ${leaning}) – ulangi dengan pad tipis atau uji lab`,
      displayMessageEn: `Ammonia confirmation unclear (AI: ${leaningEn}) – repeat with thin pad or lab test`,
      aiNote: `AI: ${leaning}`,
      aiExplanation,
      aiConfidenceText,
      qualityChips,
    };
  }

  return {
    finalCode: ruleResult,
    displayTitle: getTitleForCode(ruleResult, lang),
    displayMessageId: getMessageForCode(ruleResult, "id"),
    displayMessageEn: getMessageForCode(ruleResult, "en"),
    aiExplanation,
    aiConfidenceText,
    qualityChips,
  };
}

function getTitleForCode(code: string, lang: "id" | "en"): string {
  if (code === "0") return lang === "id" ? "Boraks Tidak Terdeteksi" : "No Borax Detected";
  if (code === "1") return lang === "id" ? "Belum Jelas" : "Unclear";
  if (code === "2") return lang === "id" ? "Boraks Terdeteksi" : "Borax Detected";
  if (code === "B+") return lang === "id" ? "Boraks Terkonfirmasi" : "Borax Confirmed";
  if (code === "B-") return lang === "id" ? "Bukan Boraks" : "Not Borax";
  return lang === "id" ? "Tidak Pasti" : "Uncertain";
}

function getMessageForCode(code: string, lang: "id" | "en"): string {
  if (code === "0") return lang === "id" ? "Boraks tidak terdeteksi" : "No borax detected";
  if (code === "1") return lang === "id" ? "Belum jelas – lakukan tes amonia" : "Unclear – perform ammonia confirmation";
  if (code === "2") return lang === "id" ? "Boraks terdeteksi – lakukan tes amonia" : "Borax detected – perform ammonia confirmation";
  if (code === "B+") return lang === "id" ? "Boraks terkonfirmasi – jangan dimakan, laporkan" : "Borax confirmed – do not eat, report it";
  if (code === "B-") return lang === "id" ? "Bukan boraks – makanan hanya bersifat basa" : "Not borax – food is only alkaline";
  return lang === "id" ? "Konfirmasi amonia tidak jelas – ulangi dengan pad tipis atau uji lab" : "Ammonia confirmation unclear – repeat with thin pad or lab test";
}
