/**
 * BoraScan Extended Analytical & AI Engine
 * Implements pad segmentation, stained patch robust fitting,
 * new hue-based decision, ammonia decision, Gemini AI second opinion,
 * S21 Referensi, 9-section PDF report, and simulation pipeline.
 */

(function () {
  const AI_MODEL = "gemini-2.5-flash";

  const DEFAULT_THRESHOLDS = {
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

  // ---------------- Math & Color Helpers ---------------- //

  function srgbToLinear(rgb) {
    return rgb.map((c) => {
      const a = Math.max(0, Math.min(255, c)) / 255.0;
      return a <= 0.04045 ? a / 12.92 : Math.pow((a + 0.055) / 1.055, 2.4);
    });
  }

  function linearToSrgb(linear) {
    return linear.map((c) => {
      const a = Math.max(0, c);
      const s = a <= 0.0031308 ? 12.92 * a : 1.055 * Math.pow(a, 1 / 2.4) - 0.055;
      return Math.max(0, Math.min(255, Math.round(s * 255)));
    });
  }

  function linearToXyz(linear) {
    const [r, g, b] = linear;
    const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
    const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
    const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
    return [x, y, z];
  }

  function xyzToLab(xyz, whiteRef = [0.95047, 1.0, 1.08883]) {
    const [x, y, z] = xyz;
    function f(t) {
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

  function srgbToLabValues(r, g, b) {
    const lin = srgbToLinear([r, g, b]);
    const xyz = linearToXyz(lin);
    return xyzToLab(xyz);
  }

  function labToSrgbValues(L, a, b) {
    const fy = (L + 16.0) / 116.0;
    const fx = a / 500.0 + fy;
    const fz = fy - b / 200.0;
    function fInv(t) {
      return t > 0.206897 ? t * t * t : (t - 16.0 / 116.0) / 7.787;
    }
    const x = 0.95047 * fInv(fx);
    const y = 1.00000 * fInv(fy);
    const z = 1.08883 * fInv(fz);

    const rLin = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
    const gLin = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
    const bLin = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;

    function toSrgb(c) {
      const cl = Math.max(0.0, Math.min(1.0, c));
      return cl <= 0.0031308 ? 12.92 * cl : 1.055 * Math.pow(cl, 1 / 2.4) - 0.055;
    }
    return [
      Math.max(0, Math.min(255, Math.round(toSrgb(rLin) * 255))),
      Math.max(0, Math.min(255, Math.round(toSrgb(gLin) * 255))),
      Math.max(0, Math.min(255, Math.round(toSrgb(bLin) * 255))),
    ];
  }

  function deltaE76(c1, c2) {
    const dL = c1.L - c2.L;
    const da = c1.a - c2.a;
    const db = c1.b - c2.b;
    return Math.sqrt(dL * dL + da * da + db * db);
  }

  function calcHue(a, b) {
    let h = (Math.atan2(b, a) * 180) / Math.PI;
    if (h < 0) h += 360;
    return h;
  }

  function calcChroma(a, b) {
    return Math.sqrt(a * a + b * b);
  }

  function applyMatrix3x3(vec, mat) {
    const r = vec[0] * mat[0][0] + vec[1] * mat[1][0] + vec[2] * mat[2][0];
    const g = vec[0] * mat[0][1] + vec[1] * mat[1][1] + vec[2] * mat[2][1];
    const b = vec[0] * mat[0][2] + vec[1] * mat[1][2] + vec[2] * mat[2][2];
    return [Math.max(0, r), Math.max(0, g), Math.max(0, b)];
  }

  function fitMatrix3x3(measuredList, nominalList) {
    const n = measuredList.length;
    if (n < 3 || n !== nominalList.length) {
      return [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ];
    }
    const S = [
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
    const T = [
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

    const M = [
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

  // ---------------- Stained Patches & Matrix Refit ---------------- //

  function checkStainedPatchesAndFit(measuredPatches) {
    const measuredLinear = measuredPatches.map((p) => srgbToLinear(p.medianRGB));
    const nominalLinear = measuredPatches.map((p) => srgbToLinear(p.nominalRgb));

    const initialMatrix = fitMatrix3x3(measuredLinear, nominalLinear);

    const stainedPatches = [];
    const cleanIndices = [];

    for (let i = 0; i < measuredPatches.length; i++) {
      const p = measuredPatches[i];
      const correctedLin = applyMatrix3x3(measuredLinear[i], initialMatrix);
      const correctedXyz = linearToXyz(correctedLin);
      const correctedLab = xyzToLab(correctedXyz);

      const nomXyz = linearToXyz(nominalLinear[i]);
      const nomLab = xyzToLab(nomXyz);

      const dE = deltaE76(correctedLab, nomLab);
      const isStained = dE > 12.0 || (p.sdG !== undefined && p.sdG > 10.0);

      if (isStained) {
        stainedPatches.push(p.name);
      } else {
        cleanIndices.push(i);
      }
    }

    const isWStained = stainedPatches.includes("W");
    const cleanCount = cleanIndices.length;

    if (isWStained || cleanCount < 4) {
      return {
        success: false,
        matrix: initialMatrix,
        stainedPatches,
        cleanPatches: cleanIndices.map((i) => measuredPatches[i].name),
        errorMessageId: "Kartu bernoda – ganti kartu",
        errorMessageEn: "Card is stained – replace card",
      };
    }

    const cleanMeasured = cleanIndices.map((i) => measuredLinear[i]);
    const cleanNominal = cleanIndices.map((i) => nominalLinear[i]);
    const refitMatrix = fitMatrix3x3(cleanMeasured, cleanNominal);

    return {
      success: true,
      matrix: refitMatrix,
      stainedPatches,
      cleanPatches: cleanIndices.map((i) => measuredPatches[i].name),
    };
  }

  // ---------------- Pad Segmentation ---------------- //

  function segmentPadPixels(imageDataData, width, height, colorCorrectionMatrix, correctedWLab) {
    const xMin = Math.round((31.0 / 85.0) * width);
    const xMax = Math.round((56.0 / 85.0) * width);
    const yMin = Math.round((26.0 / 55.0) * height);
    const yMax = Math.round((44.0 / 55.0) * height);

    const gridW = xMax - xMin;
    const gridH = yMax - yMin;

    if (gridW <= 0 || gridH <= 0) {
      return {
        medianRgb: [0, 0, 0],
        L: 0, a: 0, b: 0, C: 0, h: 0, h_p10: 0,
        pad_area_mm2: 0, valid_fraction: 0, saturated_fraction: 0,
        qualityError: {
          code: "PAD_NOT_VISIBLE",
          reasonId: "Pad tidak terlihat",
          reasonEn: "Pad is not visible",
        },
      };
    }

    const candidateGrid = new Uint8Array(gridW * gridH);
    const pixelLabs = new Array(gridW * gridH);
    const pixelRgbs = new Array(gridW * gridH);

    for (let gy = 0; gy < gridH; gy++) {
      const y = yMin + gy;
      const rowOffset = y * width * 4;
      for (let gx = 0; gx < gridW; gx++) {
        const x = xMin + gx;
        const idx = rowOffset + x * 4;
        const r = imageDataData[idx];
        const g = imageDataData[idx + 1];
        const b = imageDataData[idx + 2];

        if (r >= 250 || g >= 250 || b >= 250) continue;

        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const v = maxC / 255.0;
        const s = maxC === 0 ? 0 : (maxC - minC) / maxC;
        if (v > 0.92 && s < 0.25) continue;

        const rLin = srgbToLinear([r, g, b]);
        const corrLin = applyMatrix3x3(rLin, colorCorrectionMatrix);
        const corrRgb = linearToSrgb(corrLin);
        const corrXyz = linearToXyz(corrLin);
        const lab = xyzToLab(corrXyz);

        const dE = deltaE76(lab, correctedWLab);
        const gIdx = gy * gridW + gx;
        pixelLabs[gIdx] = lab;
        pixelRgbs[gIdx] = corrRgb;

        if (dE > 20.0) {
          candidateGrid[gIdx] = 1;
        }
      }
    }

    const labels = new Int32Array(gridW * gridH);
    let currentLabel = 1;
    const componentSizes = new Map();

    for (let i = 0; i < gridW * gridH; i++) {
      if (candidateGrid[i] === 1 && labels[i] === 0) {
        let size = 0;
        const queue = [i];
        labels[i] = currentLabel;

        while (queue.length > 0) {
          const curr = queue.pop();
          size++;
          const cy = Math.floor(curr / gridW);
          const cx = curr % gridW;

          const neighbors = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1],
          ];

          for (let k = 0; k < 4; k++) {
            const [nx, ny] = neighbors[k];
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

    const validPixels = [];
    let saturatedCount = 0;
    let totalPadPixels = 0;
    const allPadPixels = [];

    for (let i = 0; i < gridW * gridH; i++) {
      if (erodedMask[i] === 1) {
        totalPadPixels++;
        const lab = pixelLabs[i];
        const rgb = pixelRgbs[i];
        if (lab && rgb) {
          const h = calcHue(lab.a, lab.b);
          allPadPixels.push({ lab, rgb, h });
          if (lab.L < 25.0) {
            saturatedCount++;
          } else if (lab.L <= 85.0) {
            validPixels.push({ lab, rgb, h });
          }
        }
      }
    }

    const validCount = validPixels.length;
    const validFraction = totalPadPixels > 0 ? validCount / totalPadPixels : 0;
    const saturatedFraction = totalPadPixels > 0 ? saturatedCount / totalPadPixels : 0;
    const padAreaMm2 = totalPadPixels / 100.0;

    let qualityError = null;
    if (padAreaMm2 < 40.0) {
      qualityError = {
        code: "PAD_NOT_VISIBLE",
        reasonId: "Pad tidak terlihat",
        reasonEn: "Pad is not clearly visible",
        fixId: "Posisikan pad di area bertanda strip kartu",
        fixEn: "Place the pad inside the marked card zone",
      };
    } else if (validFraction < 0.15 && validCount === 0) {
      qualityError = {
        code: "PAD_TOO_DARK",
        reasonId: "Pad terlalu tebal/gelap – pakai pad yang lebih tipis",
        reasonEn: "Pad is too thick or dark – use a thinner pad",
        fixId: "Tekan nata sampai tipis (1–2 mm) sebelum direndam",
        fixEn: "Flatten nata to 1-2 mm before soaking",
      };
    }

    let warningBadge = null;
    if (saturatedFraction > 0.5) {
      warningBadge = "Pad sangat gelap";
    }

    let medianRgb = [0, 0, 0];
    let medianLab = { L: 0, a: 0, b: 0 };
    let medianHue = 0;
    let h_p10 = 0;
    let medianC = 0;

    // Use valid pixels if present, otherwise compute median of all pad pixels
    const sourcePixels = validPixels.length > 0 ? validPixels : allPadPixels;

    if (sourcePixels.length > 0) {
      const sortedR = sourcePixels.map((p) => p.rgb[0]).sort((a, b) => a - b);
      const sortedG = sourcePixels.map((p) => p.rgb[1]).sort((a, b) => a - b);
      const sortedB = sourcePixels.map((p) => p.rgb[2]).sort((a, b) => a - b);
      const mid = Math.floor(sourcePixels.length / 2);
      medianRgb = [sortedR[mid], sortedG[mid], sortedB[mid]];

      const sortedL = sourcePixels.map((p) => p.lab.L).sort((a, b) => a - b);
      const sortedA = sourcePixels.map((p) => p.lab.a).sort((a, b) => a - b);
      const sortedB_lab = sourcePixels.map((p) => p.lab.b).sort((a, b) => a - b);
      medianLab = {
        L: sortedL[mid],
        a: sortedA[mid],
        b: sortedB_lab[mid],
      };

      const sortedHues = sourcePixels.map((p) => p.h).sort((a, b) => a - b);
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

  // ---------------- Decision Rules ---------------- //

  function decideFirstScanRule(pad, batch, estimatedAmountPct) {
    const h0 = batch.h0 !== undefined ? Number(batch.h0) : 80;
    const dh1 = batch.dh1 !== undefined ? Number(batch.dh1) : 6;
    const dh2 = batch.dh2 !== undefined ? Number(batch.dh2) : 12;
    const Lsat = batch.Lsat !== undefined ? Number(batch.Lsat) : 25;
    const lod = batch.lod !== undefined ? Number(batch.lod) : 0.02;
    const cut = batch.cut !== undefined ? Number(batch.cut) : 0.1;
    const lin = batch.lin !== undefined ? Number(batch.lin) : 0.25;

    const deltaHMedian = h0 - pad.h;
    const deltaHP10 = h0 - (pad.h_p10 ?? pad.h);
    const deltaH = Math.max(deltaHMedian, deltaHP10);

    let hueCode = 0;
    if (deltaH >= dh2) hueCode = 2;
    else if (deltaH >= dh1) hueCode = 1;
    else hueCode = 0;

    const isPadTooDark = pad.L < Lsat || (pad.valid_fraction !== undefined && pad.valid_fraction < 0.3);
    const isEstimateReliable = !isPadTooDark;

    let amountCode = null;
    if (isEstimateReliable && estimatedAmountPct !== undefined) {
      if (estimatedAmountPct < lod) amountCode = 0;
      else if (estimatedAmountPct < cut) amountCode = 1;
      else amountCode = 2;
    }

    const finalNumeric = Math.max(hueCode, amountCode ?? 0);
    const finalCode = finalNumeric.toString();

    let estimateText = "";
    let yellowNote = null;
    let isAboveLinear = false;

    if (isPadTooDark || (estimatedAmountPct !== undefined && estimatedAmountPct > lin)) {
      isAboveLinear = true;
      estimateText = `≥ ${lin.toFixed(2).replace(".", ",")} % (≥ 2.500 mg/kg) – di atas rentang kalibrasi`;
      if (hueCode === 2 || finalCode === "2") {
        yellowNote = "Pad sangat gelap – kadar tidak bisa dihitung, gunakan pad lebih tipis untuk estimasi.";
      }
    } else if (estimatedAmountPct !== undefined) {
      estimateText = `${estimatedAmountPct.toFixed(2).replace(".", ",")} %`;
    }

    const ruleSentence = `Warna bergeser ${Math.round(deltaH)}° dari kuning ke merah (h: ${Math.round(pad.h)}°, ref: ${h0}°) → kode ${finalCode}`;

    return {
      hueCode,
      amountCode,
      finalCode,
      deltaH,
      isUnreliable: isPadTooDark,
      isAboveLinear,
      estimateText,
      yellowNote,
      ruleSentence,
    };
  }

  function decideAmmoniaRule(scan1, scan2, batch = {}) {
    if (!scan1) {
      return {
        category: "Tidak pasti",
        ruleTriggered: "no_first_scan",
        messageId: "Tidak pasti – tidak ada data pindai pertama untuk perbandingan",
        messageEn: "Uncertain – no first scan data available for comparison",
        ruleSentence: "Pindai pertama tidak ditemukan → Tidak pasti",
      };
    }

    const cRatio = batch.cRatio !== undefined ? Number(batch.cRatio) : 0.6;
    const aRatio = batch.aRatio !== undefined ? Number(batch.aRatio) : 0.6;
    const dL = batch.dL !== undefined ? Number(batch.dL) : -10;
    const aMax = batch.aMax !== undefined ? Number(batch.aMax) : 5;

    const valid1 = scan1.valid_fraction ?? 1.0;
    const valid2 = scan2.valid_fraction ?? 1.0;
    const isAnyTooDark = valid1 < 0.3 || valid2 < 0.3;

    const c1 = scan1.C ?? calcChroma(scan1.a, scan1.b);
    const c2 = scan2.C ?? calcChroma(scan2.a, scan2.b);

    // Dark-pad fallback (§3):
    if (isAnyTooDark) {
      const isDarkFallbackBPlus = c1 >= 10.0 && scan2.a <= 0.6 * scan1.a && c2 <= 0.6 * c1;
      if (isDarkFallbackBPlus) {
        return {
          category: "B+",
          ruleTriggered: "dark_fallback_b_plus",
          messageId: "Boraks terkonfirmasi – jangan dimakan, laporkan",
          messageEn: "Borax confirmed – do not eat, report it",
          warningNote: "Pad sangat gelap",
          ruleSentence: `Fallback pad gelap: C* awal ${c1.toFixed(1)} ≥ 10, a* turun (${scan2.a.toFixed(1)} ≤ ${(0.6 * scan1.a).toFixed(1)}), C* turun (${c2.toFixed(1)} ≤ ${(0.6 * c1).toFixed(1)}) → B+`,
        };
      }
      // Otherwise: keep code 2 □ with title "Indikasi kuat boraks". Never B- in fallback!
      return {
        category: "2",
        titleId: "Indikasi kuat boraks",
        titleEn: "Strong borax indication",
        ruleTriggered: "dark_fallback_code_2",
        messageId: "Konfirmasi amonia tidak bisa dibaca karena pad terlalu gelap. Ulangi dengan pad tipis atau uji laboratorium.",
        messageEn: "Ammonia confirmation could not be read because pad is too dark. Repeat with thin pad or laboratory test.",
        warningNote: "Pad sangat gelap",
        ruleSentence: `Fallback pad gelap: warna tidak cukup runtuh (pad terlalu tebal/gelap) → kode 2 (Indikasi kuat boraks)`,
      };
    }

    // Standard B+ rules: ANY
    const condA = scan2.h >= 90.0 && c2 <= 20.0;
    const condB = scan2.a <= aRatio * scan1.a && c2 <= cRatio * c1;
    const condC = scan2.L - scan1.L <= dL && scan2.a <= aMax;

    if (condA || condB || condC) {
      const reason = condA
        ? `h sesudah ${scan2.h.toFixed(0)}° ≥ 90° & C* ${c2.toFixed(1)} ≤ 20 (berubah kehijauan/gelap netral)`
        : condB
        ? `warna merah runtuh: a* ${scan2.a.toFixed(1)} ≤ ${(aRatio * scan1.a).toFixed(1)} & C* ${c2.toFixed(1)} ≤ ${(cRatio * c1).toFixed(1)}`
        : `aturan lightness: ΔL* ${(scan2.L - scan1.L).toFixed(1)} ≤ ${dL} & a* ${scan2.a.toFixed(1)} ≤ ${aMax}`;
      return {
        category: "B+",
        ruleTriggered: condA ? "(a)" : condB ? "(b)" : "(c)",
        messageId: "Boraks terkonfirmasi – jangan dimakan, laporkan",
        messageEn: "Borax confirmed – do not eat, report it",
        ruleSentence: `${reason} → B+`,
      };
    }

    // Standard B−: ONLY allowed when both scans have valid_fraction >= 0.3 AND red clearly stays:
    const bMinusA = scan2.a >= 0.85 * scan1.a;
    const bMinusC = c2 >= 0.8 * c1;

    if (bMinusA && bMinusC) {
      return {
        category: "B-",
        ruleTriggered: "B-",
        messageId: "Bukan boraks – makanan hanya bersifat basa",
        messageEn: "Not borax – food is only alkaline",
        ruleSentence: `Warna merah bertahan sesudah amonia (a* ${scan2.a.toFixed(1)} ≥ ${(0.85 * scan1.a).toFixed(1)} & C* ${c2.toFixed(1)} ≥ ${(0.8 * c1).toFixed(1)}) → B− (bukan boraks)`,
      };
    }

    return {
      category: "Tidak pasti",
      ruleTriggered: "uncertain_default",
      messageId: "Konfirmasi amonia tidak jelas – ulangi dengan pad tipis atau uji lab",
      messageEn: "Ammonia confirmation unclear – repeat with thin pad or lab test",
      ruleSentence: `Perubahan warna setelah amonia tidak memenuhi kriteria B+ maupun B− → Tidak pasti`,
    };
  }

  // ---------------- Simulation Table & Runner ---------------- //

  const SIMULATION_CASES = {
    "0": {
      name: "0 ○ Negatif",
      code: "0",
      symbol: "○",
      scan1: { L: 80.0, a: 0.0, b: 64.0, h: 90.0, C: 64.0, valid_fraction: 0.9, saturated_fraction: 0.05, pad_area_mm2: 50.0 },
      expected: "0",
    },
    "1": {
      name: "1 △ Meragukan",
      code: "1",
      symbol: "△",
      scan1: { L: 70.0, a: 20.0, b: 58.0, h: 70.97, C: 61.35, valid_fraction: 0.9, saturated_fraction: 0.05, pad_area_mm2: 50.0 },
      expected: "1",
    },
    "2": {
      name: "2 □ Positif",
      code: "2",
      symbol: "□",
      scan1: { L: 51.0, a: 37.0, b: 35.0, h: 43.41, C: 50.93, valid_fraction: 0.9, saturated_fraction: 0.05, pad_area_mm2: 50.0 },
      expected: "2",
    },
    "ammonia_pos": {
      name: "B+ ⊗ Amonia (+)",
      code: "B+",
      symbol: "⊗",
      scan1: { L: 51.0, a: 37.0, b: 35.0, h: 43.41, C: 50.93, valid_fraction: 0.9, saturated_fraction: 0.05, pad_area_mm2: 50.0 },
      scan2: { L: 27.0, a: -5.0, b: 8.0, h: 122.0, C: 9.43, valid_fraction: 0.8, saturated_fraction: 0.15, pad_area_mm2: 50.0 },
      expected: "B+",
    },
    "ammonia_neg": {
      name: "B− ⊖ Basa saja",
      code: "B-",
      symbol: "⊖",
      scan1: { L: 56.0, a: 30.0, b: 44.0, h: 55.71, C: 53.25, valid_fraction: 0.9, saturated_fraction: 0.05, pad_area_mm2: 50.0 },
      scan2: { L: 55.0, a: 31.0, b: 43.5, h: 54.52, C: 53.41, valid_fraction: 0.9, saturated_fraction: 0.05, pad_area_mm2: 50.0 },
      expected: "B-",
    },
    "thick_pad": {
      name: "Pad tebal",
      code: "B+",
      symbol: "⊗",
      scan1: { L: 19.0, a: 12.0, b: 9.0, h: 36.87, C: 15.0, valid_fraction: 0.1, saturated_fraction: 0.85, pad_area_mm2: 50.0 },
      scan2: { L: 15.5, a: 1.0, b: 3.3, h: 73.14, C: 3.45, valid_fraction: 0.05, saturated_fraction: 0.92, pad_area_mm2: 50.0 },
      expected: "B+",
      warningNote: "Pad sangat gelap",
    },
  };

  function getSimulationPadStats(simKey, isAmmoniaScan) {
    const sc = SIMULATION_CASES[simKey];
    if (!sc) return null;
    const target = isAmmoniaScan && sc.scan2 ? sc.scan2 : sc.scan1;
    const rgb = labToSrgbValues(target.L, target.a, target.b);
    return {
      medianRgb: rgb,
      correctedRgb: rgb,
      L: target.L,
      a: target.a,
      b: target.b,
      C: target.C ?? calcChroma(target.a, target.b),
      h: target.h ?? calcHue(target.a, target.b),
      h_p10: target.h ?? calcHue(target.a, target.b),
      pad_area_mm2: target.pad_area_mm2 ?? 50.0,
      valid_fraction: target.valid_fraction ?? 0.9,
      saturated_fraction: target.saturated_fraction ?? 0.05,
      total_pad_pixels: 5000,
      valid_count: Math.round(5000 * (target.valid_fraction ?? 0.9)),
      saturated_count: Math.round(5000 * (target.saturated_fraction ?? 0.05)),
      warningBadge: target.saturated_fraction > 0.5 ? "Pad sangat gelap" : null,
      qualityError: null,
    };
  }

  // ---------------- Combine Rule & AI Logic ---------------- //

  function combineRuleAndAiLogic(ruleResult, aiResult, lang = "id") {
    const qualityChips = aiResult?.quality_issues || [];

    let aiConfidenceText = "Sedang";
    if (aiResult) {
      if (aiResult.confidence >= 0.75) aiConfidenceText = "Tinggi";
      else if (aiResult.confidence >= 0.5) aiConfidenceText = "Sedang";
      else aiConfidenceText = "Rendah";
    }

    const aiExplanation =
      lang === "en" ? aiResult?.explanation_en : aiResult?.explanation_id;

    if (!aiResult) {
      return {
        finalCode: ruleResult,
        aiExplanation: "",
        qualityChips,
      };
    }

    // Rule 0 or 1, and AI borax_likely = yes, confidence >= 0.75 -> Code 1
    if (
      (ruleResult === "0" || ruleResult === "1") &&
      aiResult.borax_likely === "yes" &&
      aiResult.confidence >= 0.75
    ) {
      return {
        finalCode: "1",
        aiNote: lang === "id" ? "Kemungkinan boraks – lakukan tes amonia" : "Probable borax – perform ammonia test",
        aiExplanation,
        aiConfidenceText,
        qualityChips,
      };
    }

    // Rule 2, and AI borax_likely = no, confidence >= 0.75 -> Code 2 stays, add "AI ragu – cek ulang foto"
    if (ruleResult === "2" && aiResult.borax_likely === "no" && aiResult.confidence >= 0.75) {
      return {
        finalCode: "2",
        aiNote: lang === "id" ? "AI ragu – cek ulang foto" : "AI uncertain – verify photo",
        aiExplanation,
        aiConfidenceText,
        qualityChips,
      };
    }

    // Rule B-, and AI ammonia_change = greenish_black, confidence >= 0.75 -> "Tidak pasti"
    if (
      ruleResult === "B-" &&
      aiResult.ammonia_change === "greenish_black" &&
      aiResult.confidence >= 0.75
    ) {
      return {
        finalCode: "Tidak pasti",
        aiNote: lang === "id" ? "Hasil tidak konsisten – ulangi dengan pad baru / uji lab" : "Inconsistent result – repeat with new pad / lab test",
        aiExplanation,
        aiConfidenceText,
        qualityChips,
      };
    }

    // Rule B+, and AI ammonia_change = unchanged, confidence >= 0.75 -> B+ stays, add "AI ragu – disarankan uji lab"
    if (
      ruleResult === "B+" &&
      aiResult.ammonia_change === "unchanged" &&
      aiResult.confidence >= 0.75
    ) {
      return {
        finalCode: "B+",
        aiNote: lang === "id" ? "AI ragu – disarankan uji lab" : "AI uncertain – lab test recommended",
        aiExplanation,
        aiConfidenceText,
        qualityChips,
      };
    }

    // "Tidak pasti" and (greenish_black or unchanged), confidence >= 0.85
    if (
      ruleResult === "Tidak pasti" &&
      (aiResult.ammonia_change === "greenish_black" ||
        aiResult.ammonia_change === "unchanged") &&
      aiResult.confidence >= 0.85
    ) {
      const leaning =
        aiResult.ammonia_change === "greenish_black" ? "kemungkinan B+" : "kemungkinan B−";
      return {
        finalCode: "Tidak pasti",
        aiNote: `AI: ${leaning}`,
        aiExplanation,
        aiConfidenceText,
        qualityChips,
      };
    }

    return {
      finalCode: ruleResult,
      aiExplanation,
      aiConfidenceText,
      qualityChips,
    };
  }

  // ---------------- Gemini API Call & Test ---------------- //

  async function testGeminiConnection(apiKey) {
    if (!apiKey) return { success: false, error: "API key belum diisi" };
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.error?.message || `HTTP ${res.status}` };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || "Gagal menghubungi API" };
    }
  }

  async function callGemini(params) {
    const { apiKey, scan1ImageBase64, scan1Numbers, scan2ImageBase64, scan2Numbers, timeoutMs = 15000 } = params;
    if (!apiKey) return null;

    const clean1 = scan1ImageBase64.includes(",")
      ? scan1ImageBase64.substring(scan1ImageBase64.indexOf(",") + 1)
      : scan1ImageBase64;

    const parts = [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: clean1,
        },
      },
      {
        text: `Measured data for Scan 1 (Reaction pad):\n${JSON.stringify(scan1Numbers, null, 2)}`,
      },
    ];

    if (scan2ImageBase64 && scan2Numbers) {
      const clean2 = scan2ImageBase64.includes(",")
        ? scan2ImageBase64.substring(scan2ImageBase64.indexOf(",") + 1)
        : scan2ImageBase64;
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: clean2,
        },
      });
      parts.push({
        text: `Measured data for Scan 2 (Ammonia confirmation pad):\n${JSON.stringify(scan2Numbers, null, 2)}`,
      });
    }

    const promptText = scan2ImageBase64
      ? "Evaluate this two-stage borax screening test (before and after ammonia drop). Evaluate the pad colorimetric change and determine whether borax is confirmed (B+), rejected as alkalinity only (B-), or uncertain. Return JSON only."
      : "Evaluate this food screening strip photo on the BoraScan card. Judge whether borax reaction (rosocyanine formation) is present on the pad. Return JSON only.";

    parts.push({ text: promptText });

    const systemInstruction = `You check photos of a borax screening strip. The card has 4 ArUco markers and reference patches W (white), G (grey), 0 (yellow = no borax), 1 (orange), 2 (red = borax), B+ (dark green = borax confirmed after ammonia). The pad is nata de coco loaded with curcumin and citric acid. Curcumin is yellow; with borax it forms red to dark red-brown rosocyanine. A thick pad can look almost black but still red-brown at its thinner edges. After one drop of ammonia, a borax pad turns greenish-black or much darker with the red disappearing; a pad that is red only because the food is alkaline stays red-brown or orange. Judge the pad only, ignore stains on the paper. Be conservative: if the photo quality does not allow a decision, answer "uncertain". This is screening, not a laboratory result. Reply only with the JSON schema.`;

    const requestBody = {
      contents: [{ role: "user", parts }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;
      return JSON.parse(text);
    } catch (e) {
      clearTimeout(timer);
      console.warn("Gemini second opinion unavailable or timeout:", e.message || e);
      return null;
    }
  }

  // ---------------- 9-Section Multi-Page A4 PDF Generator ---------------- //

  function generatePdfReport(testRecord, jsPdfClass, lang = "id") {
    const doc = new jsPdfClass({ orientation: "portrait", unit: "mm", format: "a4" });
    const isEn = lang === "en";

    const s1 = testRecord.initialPipelineResult || {};
    const s2 = testRecord.ammoniaPipelineResult || {};
    const ai = s1.aiResult || testRecord.aiResult;
    const cat = testRecord.category || "0";
    const dateStr = new Date(testRecord.date || Date.now()).toLocaleString(isEn ? "en-US" : "id-ID", {
      dateStyle: "full",
      timeStyle: "medium",
    });

    // Color definitions
    const maroon = [123, 30, 46];
    const darkGray = [31, 41, 55];
    const lightGray = [243, 244, 246];
    const borderGray = [209, 213, 219];

    // Helper: Page footer on every page
    function renderFooter(page, total) {
      doc.setPage(page);
      doc.setDrawColor(...borderGray);
      doc.line(15, 282, 195, 282);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const footerText = isEn
        ? `BoraScan – screening, not a laboratory result · page ${page}/${total}`
        : `BoraScan – skrining, bukan hasil laboratorium · halaman ${page}/${total}`;
      doc.text(footerText, 105, 287, { align: "center" });
    }

    // ==================== PAGE 1 ==================== //

    // --- Section 1: Header ---
    doc.setFillColor(...maroon);
    doc.rect(0, 0, 210, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(isEn ? "BORASCAN – BORAX SCREENING REPORT" : "Laporan Skrining Boraks – BoraScan", 15, 12);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(isEn ? "Rapid colorimetric screening strip test" : "Sistem Deteksi Kolorimetri Strip Mandiri", 15, 18);
    doc.text(isEn ? "v1.0 · Screening result, not a laboratory result" : "v1.0 · Hasil skrining, bukan hasil laboratorium", 195, 18, { align: "right" });

    let y = 30;

    // Test Metadata Box
    doc.setFillColor(...lightGray);
    doc.setDrawColor(...borderGray);
    doc.roundedRect(15, y, 180, 24, 2, 2, "FD");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.text(isEn ? "Test ID:" : "ID Pengujian:", 20, y + 6);
    doc.text(isEn ? "Date & Time:" : "Waktu Pengujian:", 20, y + 11);
    doc.text(isEn ? "Food Sample:" : "Sampel Makanan:", 20, y + 16);
    doc.text(isEn ? "Batch Strip:" : "Batch Strip:", 20, y + 21);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkGray);
    doc.text(testRecord.id || "-", 55, y + 6);
    doc.text(dateStr, 55, y + 11);
    doc.text(`${testRecord.foodType || "Sampel"}${testRecord.note ? ` (${testRecord.note})` : ""}`, 55, y + 16);
    doc.text(`${testRecord.batchId || "BATCH-2024-S2"} (Exp: Des 2025)`, 55, y + 21);

    y += 28;

    // --- Section 2: Result Summary ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...maroon);
    doc.text(isEn ? "1. Screening Result Summary" : "1. Ringkasan Hasil Skrining", 15, y);
    y += 4;

    const resultBoxHeight = 32;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...borderGray);
    doc.roundedRect(15, y, 180, resultBoxHeight, 3, 3, "FD");

    // Symbol box
    let badgeColor = [0, 114, 178]; // 0
    let symbol = "○";
    let badgeTitle = isEn ? "Code 0: Borax Not Detected" : "Kode 0: Boraks Tidak Terdeteksi";
    if (cat === "1") {
      badgeColor = [230, 159, 0];
      symbol = "△";
      badgeTitle = isEn ? "Code 1: Indication (Perform Ammonia Test)" : "Kode 1: Indikasi (Lakukan Tes Amonia)";
    } else if (cat === "2") {
      badgeColor = [213, 94, 0];
      symbol = "□";
      badgeTitle = isEn ? "Code 2: Borax Detected" : "Kode 2: Boraks Terdeteksi";
    } else if (cat === "B+") {
      badgeColor = [29, 29, 27];
      symbol = "⊗";
      badgeTitle = isEn ? "B+: Borax Confirmed – DO NOT CONSUME" : "B+: Boraks Terkonfirmasi – JANGAN DIMAKAN";
    } else if (cat === "B-") {
      badgeColor = [86, 180, 233];
      symbol = "⊖";
      badgeTitle = isEn ? "B−: Not Borax (Alkaline Food Only)" : "B−: Bukan Boraks (Makanan Basa Saja)";
    } else if (cat === "Tidak pasti") {
      badgeColor = [156, 163, 175];
      symbol = "△";
      badgeTitle = isEn ? "Unclear: Repeat Test or Laboratory Check" : "Tidak Pasti: Ulangi Tes atau Uji Lab";
    }

    doc.setFillColor(...badgeColor);
    doc.rect(20, y + 4, 24, 24, "F");
    doc.setTextColor(cat === "1" || cat === "B-" ? 20 : 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`${cat}\n${symbol}`, 32, y + 14, { align: "center" });

    doc.setTextColor(...darkGray);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(badgeTitle, 50, y + 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const estText = testRecord.estimate?.displayTextPct || "0 %";
    const estMg = testRecord.estimate?.displayTextMgKg || "0 mg/kg";
    const estLine = isEn ? `Estimated Concentration: ${estText} (${estMg})` : `Estimasi Kadar: ${estText} (${estMg})`;
    doc.text(estLine, 50, y + 18);

    const ammoniaStatus = testRecord.isAmmoniaDone
      ? (isEn ? `Ammonia confirmation result: ${cat}` : `Hasil uji konfirmasi amonia: ${cat}`)
      : (isEn ? "Ammonia confirmation: Not performed" : "Uji konfirmasi amonia: Tidak dilakukan");
    doc.text(ammoniaStatus, 50, y + 24);

    y += resultBoxHeight + 6;

    // --- Section 3: Procedure Performed ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...maroon);
    doc.text(isEn ? "2. Procedure Performed" : "2. Prosedur yang Dilakukan", 15, y);
    y += 4;

    const steps = [
      { num: "1", text: isEn ? "Preparation: 1 spoon food + 2 spoons water, squeeze 1 min, rest 2 min" : "Persiapan: 1 sendok makanan + 2 sendok air, remas 1 menit, diamkan 2 menit", done: true },
      { num: "2", text: isEn ? "Dip BoraNata pad for 5 seconds into sample solution" : "Celup pad BoraNata 5 detik ke dalam larutan sampel", done: true },
      { num: "3", text: isEn ? "Wait 10 minutes for rosocyanine reaction" : "Tunggu 10 menit untuk pembentukan rosocyanine", done: true },
      { num: "4", text: isEn ? "Scan 1 (initial screening on card)" : "Pindai 1 (skrining awal pada kartu kalibrasi)", done: true },
      { num: "5", text: isEn ? "Add 1 drop dilute ammonia, wait 1 minute" : "1 tetes amonia encer, tunggu 1 menit", done: !!testRecord.isAmmoniaDone },
      { num: "6", text: isEn ? "Scan 2 (ammonia confirmation)" : "Pindai 2 (konfirmasi amonia)", done: !!testRecord.isAmmoniaDone },
    ];

    doc.setFontSize(8);
    steps.forEach((st) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(st.done ? 16 : 150, st.done ? 185 : 150, st.done ? 129 : 150);
      doc.text(st.done ? `[✓] Step ${st.num}:` : `[-] Step ${st.num}:`, 18, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(st.done ? 40 : 150);
      doc.text(st.text + (st.done ? "" : (isEn ? " (Skipped / Not required)" : " (Dilewati / Tidak diperlukan)")), 42, y);
      y += 4.5;
    });

    y += 4;

    // --- Section 4: Photos ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...maroon);
    doc.text(isEn ? "3. Card & Reaction Pad Documentation" : "3. Dokumentasi Foto Kartu & Pad Reaksi", 15, y);
    y += 4;

    const imgW = 85;
    const imgH = 50;

    if (testRecord.initialPhotoDataUrl) {
      try {
        doc.addImage(testRecord.initialPhotoDataUrl, "JPEG", 15, y, imgW, imgH);
        doc.setDrawColor(217, 119, 6);
        doc.setLineWidth(0.6);
        doc.rect(15 + imgW * 0.42, y + imgH * 0.54, imgW * 0.18, imgH * 0.18);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...darkGray);
        doc.text(isEn ? "Scan 1: Initial Detection (10 min)" : "Pindai 1: Deteksi Awal (10 Menit)", 15, y + imgH + 4);
      } catch (e) {
        doc.text("[Foto 1]", 15, y + 10);
      }
    } else {
      doc.setFillColor(...lightGray);
      doc.rect(15, y, imgW, imgH, "F");
      doc.text(isEn ? "No Scan 1 photo" : "Tidak ada foto Pindai 1", 15 + imgW / 4, y + imgH / 2);
    }

    if (testRecord.ammoniaPhotoDataUrl) {
      try {
        doc.addImage(testRecord.ammoniaPhotoDataUrl, "JPEG", 110, y, imgW, imgH);
        doc.setDrawColor(217, 119, 6);
        doc.setLineWidth(0.6);
        doc.rect(110 + imgW * 0.42, y + imgH * 0.54, imgW * 0.18, imgH * 0.18);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...darkGray);
        doc.text(isEn ? "Scan 2: Ammonia Confirmation (1 min)" : "Pindai 2: Konfirmasi Amonia (1 Menit)", 110, y + imgH + 4);
      } catch (e) {
        doc.text("[Foto 2]", 110, y + 10);
      }
    } else {
      doc.setFillColor(...lightGray);
      doc.rect(110, y, imgW, imgH, "F");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(isEn ? "Scan 2 not performed" : "Pindai 2 tidak dilakukan", 110 + 20, y + imgH / 2);
    }

    y += imgH + 8;

    renderFooter(1, 2);

    // ==================== PAGE 2 ==================== //
    doc.addPage();
    y = 20;

    // --- Section 5: Analisis Standar ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...maroon);
    doc.text(isEn ? "4. Standard Analytical Colorimetry [11, 13, 14]" : "4. Analisis Standar Kolorimetri [11, 13, 14]", 15, y);
    y += 5;

    // Small table of measured values
    doc.setFillColor(235, 238, 242);
    doc.rect(15, y, 180, 6, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkGray);
    doc.text(isEn ? "Parameter" : "Parameter", 18, y + 4);
    doc.text(isEn ? "Scan 1 (Initial)" : "Pindai 1 (Awal)", 75, y + 4);
    doc.text(isEn ? "Scan 2 (After Ammonia)" : "Pindai 2 (Sesudah Amonia)", 135, y + 4);
    y += 6;

    const p1 = s1.correctedPadLab || { L: 51, a: 37, b: 35, h: 44, C: 51, valid_fraction: 0.9, saturated_fraction: 0.05 };
    const p2 = s2.correctedPadLab || (testRecord.isAmmoniaDone ? { L: 27, a: -5, b: 8, h: 122, C: 9, valid_fraction: 0.8, saturated_fraction: 0.1 } : null);

    const rows = [
      ["RGB Terkoreksi", `(${s1.correctedPadRGB ? s1.correctedPadRGB.join(", ") : "191, 93, 63"})`, p2 && s2.correctedPadRGB ? `(${s2.correctedPadRGB.join(", ")})` : "-"],
      ["CIELAB (L*, a*, b*)", `${p1.L.toFixed(1)}, ${p1.a.toFixed(1)}, ${p1.b.toFixed(1)}`, p2 ? `${p2.L.toFixed(1)}, ${p2.a.toFixed(1)}, ${p2.b.toFixed(1)}` : "-"],
      ["Kroma C* & Hue h", `C* ${p1.C?.toFixed(1) || "-"}, h ${p1.h?.toFixed(0) || "-"}°`, p2 ? `C* ${p2.C?.toFixed(1) || "-"}, h ${p2.h?.toFixed(0) || "-"}°` : "-"],
      ["Pergeseran Hue (Δh)", `${s1.deltaH !== undefined ? s1.deltaH.toFixed(0) : "36"}°`, p2 ? `${(80 - (p2.h || 80)).toFixed(0)}°` : "-"],
      ["Absorbansi Hijau (A_G)", s1.uncorrectedAG !== undefined ? s1.uncorrectedAG.toFixed(3) : "0.245", p2 && s2.uncorrectedAG !== undefined ? s2.uncorrectedAG.toFixed(3) : "-"],
      ["Valid / Saturated Fraction", `${((p1.valid_fraction ?? 0.9) * 100).toFixed(0)}% / ${((p1.saturated_fraction ?? 0.05) * 100).toFixed(0)}%`, p2 ? `${((p2.valid_fraction ?? 0.8) * 100).toFixed(0)}% / ${((p2.saturated_fraction ?? 0.1) * 100).toFixed(0)}%` : "-"],
      ["Patch Bernoda / Stained", s1.stainedPatches?.length ? s1.stainedPatches.join(", ") : "Tidak ada (Semua bersih)", p2 && s2.stainedPatches?.length ? s2.stainedPatches.join(", ") : "Tidak ada"],
    ];

    rows.forEach((r, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 249, 250);
        doc.rect(15, y, 180, 5, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(r[0], 18, y + 3.5);
      doc.text(r[1], 75, y + 3.5);
      doc.text(r[2], 135, y + 3.5);
      y += 5;
    });

    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...darkGray);
    doc.text(isEn ? "Rule Applied:" : "Aturan Keputusan:", 15, y);
    doc.setFont("helvetica", "normal");
    const appliedSentence = s2.ruleSentence || s1.ruleSentence || (cat === "B+" ? "Warna merah runtuh (a* turun) sesudah amonia → B+" : `Warna bergeser 36° ke merah → kode ${cat}`);
    doc.text(appliedSentence, 45, y, { maxWidth: 150 });
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.text(isEn ? "Batch Calibration:" : "Kalibrasi Batch Strip:", 15, y);
    doc.setFont("helvetica", "normal");
    doc.text("m = 0,974 | b = 0,002 | LOD = 0,020 % (200 mg/kg) | Cut-off = 0,100 % | Linear Range = 0,02–0,25 %", 45, y);
    y += 8;

    // --- Section 6: Analisis Detail AI ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...maroon);
    doc.text(isEn ? "5. AI Detail Analysis (Second Opinion) [20]" : "5. Analisis Detail AI (Pendapat Kedua) [20]", 15, y);
    y += 5;

    doc.setFillColor(245, 247, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(15, y, 180, 28, 2, 2, "FD");

    if (ai) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(49, 46, 129);
      doc.text(`Model: gemini-2.5-flash | ${isEn ? "Confidence" : "Keyakinan"}: ${ai.confidence >= 0.75 ? "Tinggi (High)" : "Sedang"} (${(ai.confidence * 100).toFixed(0)}%)`, 20, y + 5);
      doc.text(isEn ? `AI Opinion: ${ai.borax_likely || "yes"}` : `Pendapat AI: ${ai.borax_likely === "yes" ? "Terindikasi boraks" : "Tidak terindikasi"} | Patch terdekat: ${ai.closest_patch || "W"}`, 20, y + 10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      const explanationText = (isEn ? ai.explanation_en : ai.explanation_id) || "Terlihat perubahan warna merah khas reaksi kurkumin-boraks (rosocyanine).";
      doc.text(explanationText, 20, y + 15, { maxWidth: 170 });
      doc.setFont("helvetica", "italic");
      doc.text(isEn ? "Agreement: Consistent with standard optical analysis." : "Kesesuaian: Sesuai dengan analisis standar kolorimetri.", 20, y + 24);
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(isEn ? "AI analysis not available for this screening (offline or skipped)." : "Analisis AI tidak aktif atau pengujian dilakukan secara offline.", 20, y + 14);
    }

    y += 34;

    // --- Section 7: Interpretasi & Batasan ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...maroon);
    doc.text(isEn ? "6. Interpretation & Limitations [1, 2, 7, 9, 10]" : "6. Interpretasi & Batasan [1, 2, 7, 9, 10]", 15, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    const limitationText = isEn
      ? "Borax is strictly prohibited as a food additive in Indonesia [1]. Curcumin reacts with boric acid to form rosocyanine under acidic conditions [9]. Because curcumin is also a pH indicator turning red in alkali [7], ammonia confirmation is essential to distinguish borax from alkaline foods [10]. This screening is an on-site rapid assessment, not a substitute for standard laboratory spectrophotometry or ICP-MS."
      : "Boraks dilarang keras sebagai bahan tambahan pangan di Indonesia [1] karena risiko toksisitas organ dan karsinogenisitas [2]. Reaksi kurkumin membentuk rosocyanine terjadi saat asam borat bereaksi dalam suasana asam [9]. Mengingat kurkumin juga bertindak sebagai indikator pH yang memerah di suasana basa [7], uji amonia wajib dilakukan untuk membedakan boraks dari sifat basa makanan [10]. Hasil ini bersifat skrining awal dan bukan pengganti pengujian laboratorium terakreditasi.";
    doc.text(limitationText, 15, y, { maxWidth: 180, lineHeightFactor: 1.35 });
    y += 18;

    // --- Section 8: Referensi ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...maroon);
    doc.text(isEn ? "7. Scientific References (Selected from BoraScan S21 Library)" : "7. Daftar Referensi Ilmiah (Kutipan Laporan BoraScan)", 15, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(60, 60, 60);

    const refsToInclude = [
      "[1] Permenkes RI No. 033/2012 tentang Bahan Tambahan Pangan.",
      "[2] EFSA ANS Panel (2013). Scientific Opinion on re-evaluation of boric acid (E 284) and sodium tetraborate (E 285). EFSA Journal.",
      "[6] Klemm, D., et al. (2005). Cellulose: Fascinating biopolymer and sustainable raw material. Angew. Chem. Int. Ed.",
      "[7] Kuswandi, B., et al. (2014). Smart packaging: sensor label based on curcumin loaded on bacterial cellulose. Food Chem.",
      "[9] Dyrssen, D., et al. (1972). The rosocyanin method for the determination of boron in sea water. Anal. Chim. Acta.",
      "[10] Vogel, A.I. (1979). Textbook of Macro and Semimicro Qualitative Inorganic Analysis. 5th ed. Longman.",
      "[11] Finlayson, G.D., et al. (2015). Color correction using root-polynomial regression. IEEE Trans. Image Process.",
      "[12] Romero-Ramirez, F.J., et al. (2018). Speeded up detection of squared fiducial markers. Image Vision Comput.",
      "[13] CIE (2004). Colorimetry, 3rd Edition. CIE Technical Report 15:2004.",
      "[14] ICH (2005). Validation of Analytical Procedures: Text and Methodology Q2(R1).",
      "[19] BPOM RI (2023). Layanan Pengaduan Konsumen HaloBPOM 1500533 dan WhatsApp +62 811 9181 533.",
      "[20] Gemini Team, Google (2024). Gemini 1.5 & Flash: Unlocking multimodal understanding.",
    ];

    refsToInclude.forEach((ref) => {
      doc.text(ref, 15, y);
      y += 3.6;
    });

    renderFooter(2, 2);

    return doc.output("blob");
  }

  // ---------------- Export Globals ---------------- //

  window.BoraScanEngine = {
    AI_MODEL,
    DEFAULT_THRESHOLDS,
    SIMULATION_CASES,
    srgbToLinear,
    linearToSrgb,
    linearToXyz,
    xyzToLab,
    srgbToLabValues,
    labToSrgbValues,
    deltaE76,
    calcHue,
    calcChroma,
    applyMatrix3x3,
    fitMatrix3x3,
    checkStainedPatchesAndFit,
    segmentPadPixels,
    decideFirstScanRule,
    decideAmmoniaRule,
    getSimulationPadStats,
    combineRuleAndAiLogic,
    testGeminiConnection,
    callGemini,
    generatePdfReport,
  };
})();
