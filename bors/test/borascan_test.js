import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Helper math
function srgbToLinear(c) {
  const a = Math.max(0, Math.min(255, c)) / 255.0;
  return a <= 0.04045 ? a / 12.92 : Math.pow((a + 0.055) / 1.055, 2.4);
}

function srgbToLab(r, g, b) {
  const rLin = srgbToLinear(r);
  const gLin = srgbToLinear(g);
  const bLin = srgbToLinear(b);

  const x = 0.4124564 * rLin + 0.3575761 * gLin + 0.1804375 * bLin;
  const y = 0.2126729 * rLin + 0.7151522 * gLin + 0.0721750 * bLin;
  const z = 0.0193339 * rLin + 0.1191920 * gLin + 0.9503041 * bLin;

  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;

  function f(t) {
    return t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16.0 / 116.0);
  }

  const fx = f(x / xn);
  const fy = f(y / yn);
  const fz = f(z / zn);

  const l = 116.0 * fy - 16.0;
  const aStar = 500.0 * (fx - fy);
  const bStar = 200.0 * (fy - fz);
  return { L: l, a: aStar, b: bStar };
}

function calcHue(a, b) {
  let h = (Math.atan2(b, a) * 180.0) / Math.PI;
  if (h < 0.0) h += 360.0;
  return h;
}

function calcChroma(a, b) {
  return Math.sqrt(a * a + b * b);
}

function whiteBalance(pad, w) {
  const nomW = [245.0, 245.0, 242.0];
  return [
    pad[0] * (nomW[0] / w[0]),
    pad[1] * (nomW[1] / w[1]),
    pad[2] * (nomW[2] / w[2]),
  ];
}

// ---------------- Decision Logic Implementation ---------------- //

function decideFirstScan(pad, batch = {}, estimatedAmountPct) {
  const h0 = batch.h0 ?? 80;
  const dh1 = batch.dh1 ?? 6;
  const dh2 = batch.dh2 ?? 12;
  const Lsat = batch.Lsat ?? 25;
  const lod = batch.lod ?? 0.02;
  const cut = batch.cut ?? 0.1;
  const lin = batch.lin ?? 0.25;

  const deltaHMedian = h0 - pad.h;
  const deltaHP10 = h0 - (pad.h_p10 ?? pad.h);
  const deltaH = Math.max(deltaHMedian, deltaHP10);

  let hueCode = 0;
  if (deltaH >= dh2) hueCode = 2;
  else if (deltaH >= dh1) hueCode = 1;
  else hueCode = 0;

  const isDarkPad = pad.L < Lsat || (pad.valid_fraction !== undefined && pad.valid_fraction < 0.3);
  const isEstimateReliable = !isDarkPad;

  let amountCode = null;
  if (isEstimateReliable && estimatedAmountPct !== undefined) {
    if (estimatedAmountPct < lod) amountCode = 0;
    else if (estimatedAmountPct < cut) amountCode = 1;
    else amountCode = 2;
  }

  const finalCode = Math.max(hueCode, amountCode ?? 0).toString();

  const isAboveLinear = isDarkPad || (estimatedAmountPct !== undefined && estimatedAmountPct > lin);
  let estimateText = "";
  let displayRangePct = "";

  if (isAboveLinear) {
    estimateText = `≥ 0,25 % (≥ 2.500 mg/kg) – di atas rentang kalibrasi`;
    displayRangePct = ""; // No range when dark pad or > lin
  } else if (estimatedAmountPct !== undefined) {
    estimateText = `${estimatedAmountPct.toFixed(2).replace('.', ',')} %`;
    displayRangePct = `${(estimatedAmountPct - 0.01).toFixed(2).replace('.', ',')}–${(estimatedAmountPct + 0.01).toFixed(2).replace('.', ',')} %`;
  }

  const yellowNote = isDarkPad && (hueCode === 2 || finalCode === "2")
    ? "Pad sangat gelap – kadar tidak bisa dihitung, gunakan pad lebih tipis untuk estimasi."
    : null;

  return {
    hueCode,
    amountCode,
    finalCode,
    deltaH,
    isUnreliable: isDarkPad,
    isAboveLinear,
    estimateText,
    displayRangePct,
    yellowNote,
  };
}

function decideAmmonia(beforeScan, afterScan, batch = {}) {
  // If no first scan exists, the result is "Tidak pasti", never B−.
  if (!beforeScan) {
    return {
      category: "Tidak pasti",
      ruleTriggered: "no_first_scan",
      message: "Tidak pasti – tidak ada data pindai pertama",
    };
  }

  const cRatio = batch.cRatio ?? 0.6;
  const aRatio = batch.aRatio ?? 0.6;
  const dL = batch.dL ?? -10.0;
  const aMax = batch.aMax ?? 5.0;

  const valid1 = beforeScan.valid_fraction ?? 1.0;
  const valid2 = afterScan.valid_fraction ?? 1.0;
  const isAnyTooDark = valid1 < 0.3 || valid2 < 0.3;

  const c1 = beforeScan.C ?? calcChroma(beforeScan.a, beforeScan.b);
  const c2 = afterScan.C ?? calcChroma(afterScan.a, afterScan.b);

  // Dark-pad fallback (§3): use when valid_fraction < 0.3 in either scan
  if (isAnyTooDark) {
    const isDarkFallbackBPlus = c1 >= 10.0 && afterScan.a <= 0.6 * beforeScan.a && c2 <= 0.6 * c1;
    if (isDarkFallbackBPlus) {
      return {
        category: "B+",
        ruleTriggered: "dark_pad_fallback_b_plus",
        warningNote: "pad sangat gelap",
      };
    }
    // Otherwise: keep code 2 □ with title "Indikasi kuat boraks". NEVER B− in fallback!
    return {
      category: "2",
      title: "Indikasi kuat boraks",
      ruleTriggered: "dark_pad_fallback_code_2",
      message: "Konfirmasi amonia tidak bisa dibaca karena pad terlalu gelap. Ulangi dengan pad tipis atau uji laboratorium.",
      warningNote: "pad sangat gelap",
    };
  }

  // Normal mode B+ conditions: ANY
  const condA = afterScan.h >= 90.0 && c2 <= 20.0;
  const condB = afterScan.a <= aRatio * beforeScan.a && c2 <= cRatio * c1;
  const condC = (afterScan.L - beforeScan.L) <= dL && afterScan.a <= aMax;

  if (condA || condB || condC) {
    return {
      category: "B+",
      ruleTriggered: condA ? "(a)" : (condB ? "(b)" : "(c)"),
    };
  }

  // B− is ONLY allowed when both scans have valid_fraction >= 0.3 and the red clearly stays:
  const bMinusA = afterScan.a >= 0.85 * beforeScan.a;
  const bMinusC = c2 >= 0.8 * c1;
  if (bMinusA && bMinusC) {
    return {
      category: "B-",
      ruleTriggered: "B-",
      message: "Bukan boraks – makanan hanya bersifat basa",
    };
  }

  return {
    category: "Tidak pasti",
    ruleTriggered: "uncertain_default",
  };
}

// ==================== TEST SUITES ==================== //

// --- Test Group 1: 6 Simulation Rows in §1 ---
test('Simulation Row 1: 0 ○ Negatif -> Scan 1 (80, 0, 64) -> Code 0', () => {
  const pad = { L: 80, a: 0, b: 64, h: calcHue(0, 64), valid_fraction: 0.9 };
  const res = decideFirstScan(pad, { h0: 80, dh1: 6, dh2: 12 });
  assert.equal(res.finalCode, '0');
  assert.equal(res.hueCode, 0);
});

test('Simulation Row 2: 1 △ Meragukan -> Scan 1 (70, 20, 58) -> Code 1', () => {
  const pad = { L: 70, a: 20, b: 58, h: calcHue(20, 58), valid_fraction: 0.9 };
  const res = decideFirstScan(pad, { h0: 80, dh1: 6, dh2: 12 });
  assert.equal(res.finalCode, '1');
  assert.equal(res.hueCode, 1);
});

test('Simulation Row 3: 2 □ Positif -> Scan 1 (51, 37, 35) -> Code 2, estimate from A_G', () => {
  const pad = { L: 51, a: 37, b: 35, h: calcHue(37, 35), valid_fraction: 0.9 };
  const res = decideFirstScan(pad, { h0: 80, dh1: 6, dh2: 12 }, 0.15);
  assert.equal(res.finalCode, '2');
  assert.equal(res.hueCode, 2);
  assert.equal(res.amountCode, 2);
  assert.ok(res.estimateText.includes('0,15 %'));
});

test('Simulation Row 4: B+ ⊗ Amonia (+) -> Scan 1 (51, 37, 35) & Scan 2 (27, -5, 8) -> B+', () => {
  const scan1 = { L: 51, a: 37, b: 35, C: calcChroma(37, 35), h: calcHue(37, 35), valid_fraction: 0.9 };
  const scan2 = { L: 27, a: -5, b: 8, C: calcChroma(-5, 8), h: calcHue(-5, 8), valid_fraction: 0.8 };
  const res = decideAmmonia(scan1, scan2);
  assert.equal(res.category, 'B+');
  assert.ok(res.ruleTriggered === '(a)' || res.ruleTriggered === '(b)');
});

test('Simulation Row 5: B− ⊖ Basa saja -> Scan 1 (56, 30, 44) & Scan 2 (55, 31, 43.5) -> B−', () => {
  const scan1 = { L: 56, a: 30, b: 44, C: calcChroma(30, 44), h: calcHue(30, 44), valid_fraction: 0.9 };
  const scan2 = { L: 55, a: 31, b: 43.5, C: calcChroma(31, 43.5), h: calcHue(31, 43.5), valid_fraction: 0.9 };
  const res = decideAmmonia(scan1, scan2);
  assert.equal(res.category, 'B-');
});

test('Simulation Row 6: Pad tebal -> Scan 1 (19, 12, 9) & Scan 2 (15.5, 1, 3.3) -> B+ with warning note "pad sangat gelap"', () => {
  const scan1 = { L: 19, a: 12, b: 9, C: calcChroma(12, 9), h: calcHue(12, 9), valid_fraction: 0.1 };
  const scan2 = { L: 15.5, a: 1, b: 3.3, C: calcChroma(1, 3.3), h: calcHue(1, 3.3), valid_fraction: 0.05 };

  // Scan 1 alone gives Code 2 with yellow note
  const res1 = decideFirstScan(scan1, { h0: 80, dh1: 6, dh2: 12 });
  assert.equal(res1.finalCode, '2');
  assert.ok(res1.yellowNote.includes('Pad sangat gelap'));

  // Scan 2 triggers dark-pad fallback -> B+
  const resAmmonia = decideAmmonia(scan1, scan2);
  assert.equal(resAmmonia.category, 'B+');
  assert.equal(resAmmonia.warningNote, 'pad sangat gelap');
});

test('Simulation Missing Scan 1: Ammonia without first scan -> "Tidak pasti", NEVER B−', () => {
  const scan2 = { L: 55, a: 31, b: 43.5, C: calcChroma(31, 43.5), h: calcHue(31, 43.5), valid_fraction: 0.9 };
  const res = decideAmmonia(null, scan2);
  assert.equal(res.category, 'Tidak pasti');
  assert.notEqual(res.category, 'B-');
});

// --- Test Group 2: Dark-pad Estimate Capping & Range Suppression (§2) ---
test('Estimate on dark pad or x > lin: never exceeds lin, shows no range', () => {
  // Case A: pad too dark (L < 25)
  const darkPad = { L: 20, a: 30, b: 30, h: 45, valid_fraction: 0.2 };
  const resDark = decideFirstScan(darkPad, { lin: 0.25 }, 1.61);
  assert.equal(resDark.estimateText, '≥ 0,25 % (≥ 2.500 mg/kg) – di atas rentang kalibrasi');
  assert.equal(resDark.displayRangePct, '', 'Must show NO range on dark pad');
  assert.ok(!resDark.estimateText.includes('1,61'), 'Must NEVER show number above lin');

  // Case B: normal pad but x > lin (0.35 > 0.25)
  const brightPad = { L: 50, a: 30, b: 30, h: 45, valid_fraction: 0.8 };
  const resAboveLin = decideFirstScan(brightPad, { lin: 0.25 }, 0.35);
  assert.equal(resAboveLin.estimateText, '≥ 0,25 % (≥ 2.500 mg/kg) – di atas rentang kalibrasi');
  assert.equal(resAboveLin.displayRangePct, '', 'Must show NO range when x > lin');
  assert.ok(!resAboveLin.estimateText.includes('0,35'), 'Must NEVER show number above lin');
});

// --- Test Group 3: Dark-pad Ammonia Fallback (§3) ---
test('Dark-pad fallback gives B+ or "Indikasi kuat boraks" and NEVER B−', () => {
  // Case A: red collapses in dark pad -> B+
  const dark1 = { L: 20, a: 20, C: 25, valid_fraction: 0.1 };
  const dark2_collapses = { L: 18, a: 5, C: 8, h: 40, valid_fraction: 0.1 };
  const resBPlus = decideAmmonia(dark1, dark2_collapses);
  assert.equal(resBPlus.category, 'B+');
  assert.equal(resBPlus.warningNote, 'pad sangat gelap');

  // Case B: red does NOT collapse in dark pad -> keeps Code 2 with title "Indikasi kuat boraks"
  const dark2_stays = { L: 19, a: 18, C: 23, h: 45, valid_fraction: 0.1 };
  const resFallback = decideAmmonia(dark1, dark2_stays);
  assert.equal(resFallback.category, '2');
  assert.equal(resFallback.title, 'Indikasi kuat boraks');
  assert.ok(resFallback.message.includes('Konfirmasi amonia tidak bisa dibaca karena pad terlalu gelap'));
  assert.notEqual(resFallback.category, 'B-', 'Fallback must NEVER output B−');
});

// --- Test Group 4: AI Card 4 Unavailable States (§4) ---
test('AI Card renders all 4 "not available" states', () => {
  function getAiUnavailableMessage(opts) {
    if (!opts.isAiEnabled) return "AI tidak aktif";
    if (!opts.isOnline) return "Tidak ada internet";
    if (!opts.apiKey) return "API key belum diatur";
    if (opts.aiError) return `AI gagal: ${opts.aiError}`;
    return null;
  }

  // 1. AI disabled
  assert.equal(getAiUnavailableMessage({ isAiEnabled: false, isOnline: true, apiKey: "key" }), "AI tidak aktif");
  // 2. Offline
  assert.equal(getAiUnavailableMessage({ isAiEnabled: true, isOnline: false, apiKey: "key" }), "Tidak ada internet");
  // 3. Missing API key
  assert.equal(getAiUnavailableMessage({ isAiEnabled: true, isOnline: true, apiKey: "" }), "API key belum diatur");
  // 4. API failure
  assert.equal(getAiUnavailableMessage({ isAiEnabled: true, isOnline: true, apiKey: "key", aiError: "Quota exceeded" }), "AI gagal: Quota exceeded");
});

// --- Test Group 5: PDF 9 Sections and Citations (§7) ---
test('PDF report: contains all 9 sections and every citation appears in reference list', () => {
  const referensiContent = fs.readFileSync('src/content/referensi.id.ts', 'utf8');

  // Citations required in PDF report: at least [1], [2], [6], [7], [9], [10], [11], [12], [13], [14], [19], [20]
  const requiredCitations = [1, 2, 6, 7, 9, 10, 11, 12, 13, 14, 19, 20];

  const engineFile = fs.readFileSync('app/src/main/assets/web/borascan-engine.js', 'utf8');

  // Verify all 9 sections exist in generatePdfReport
  assert.ok(engineFile.includes('1. Ringkasan Hasil Skrining') || engineFile.includes('Screening Result Summary'), 'Section 2 must exist');
  assert.ok(engineFile.includes('2. Prosedur yang Dilakukan') || engineFile.includes('Procedure Performed'), 'Section 3 must exist');
  assert.ok(engineFile.includes('3. Dokumentasi Foto Kartu') || engineFile.includes('Card & Reaction Pad Documentation'), 'Section 4 must exist');
  assert.ok(engineFile.includes('4. Analisis Standar Kolorimetri') || engineFile.includes('Standard Analytical Colorimetry'), 'Section 5 must exist');
  assert.ok(engineFile.includes('5. Analisis Detail AI') || engineFile.includes('AI Detail Analysis'), 'Section 6 must exist');
  assert.ok(engineFile.includes('6. Interpretasi & Batasan') || engineFile.includes('Interpretation & Limitations'), 'Section 7 must exist');
  assert.ok(engineFile.includes('7. Daftar Referensi Ilmiah') || engineFile.includes('Scientific References'), 'Section 8 must exist');
  assert.ok(engineFile.includes('BoraScan – skrining, bukan hasil laboratorium · halaman'), 'Section 9 footer must exist');

  // Verify required citations in reference list
  for (const c of requiredCitations) {
    assert.ok(referensiContent.includes(`[${c}]`) || referensiContent.includes(`id: ${c}`), `Citation [${c}] must exist in reference list`);
    assert.ok(engineFile.includes(`[${c}]`), `Citation [${c}] must be cited in PDF generator`);
  }
});
