# BoraScan – FIX prompt (paste into the same AI Studio project)

The previous update was only partly implemented. Fix exactly these points, then go through the checklist at the end and implement anything from the earlier update that is still missing.

## 1. Bug: simulated B+ gives "Bukan boraks"

The quick-test (simulation) buttons must run the **same pipeline** as a real photo. They must use simulated **corrected pad colours in CIELAB** and the **full two-scan flow**: before and after ammonia. Expected results:

| Simulation | Scan 1 (L\*, a\*, b\*) | Scan 2 after ammonia (L\*, a\*, b\*) | valid_fraction 1 / 2 | Expected |
|---|---|---|---|---|
| 0 ○ Negatif | 80, 0, 64 (h ≈ 90°) | – | 0.9 | **Code 0** |
| 1 △ Meragukan | 70, 20, 58 (h ≈ 71°) | – | 0.9 | **Code 1** |
| 2 □ Positif | 51, 37, 35 (h ≈ 44°) | – | 0.9 | **Code 2**, estimate from A_G |
| B+ ⊗ Amonia (+) | 51, 37, 35 | 27, −5, 8 (h ≈ 120°, C\* 9) | 0.9 / 0.8 | **B+** |
| B− ⊖ Basa saja (add this button) | 56, 30, 44 | 55, 31, 43.5 | 0.9 / 0.9 | **B−** |
| Pad tebal (add this button) | 19, 12, 9 | 15.5, 1, 3.3 | 0.1 / 0.05 | **B+**, with the note "pad sangat gelap" (§3) |

The ammonia step must always compare with the **stored first scan of the same test**. If no first scan exists, the result is "Tidak pasti", **never B−**.

Also make the simulation buttons readable: show them as real buttons using the same badge style as the results (code + symbol + text). The current pale yellow/green text on white fails the contrast requirement.

## 2. Bug: estimate text on a dark pad

The current screen shows "≈ > 0,25 % (16.120 mg/kg), rentang 1,60–1,62 %". That is wrong: the number lies outside the calibration range.

- When the estimate is unreliable (pad too dark) or `x > lin`, show **"≥ 0,25 % (≥ 2.500 mg/kg) – di atas rentang kalibrasi"**.
- Show **no range** in that case.
- Never show a number above `lin`.

## 3. Thick / dark pads must still report borax

**Scan 1:**
- If the hue code is 2, show **code 2 "Boraks terdeteksi"**, even when the pad is very dark.
- Add the yellow note: "Pad sangat gelap – kadar tidak bisa dihitung, gunakan pad lebih tipis untuk estimasi."

**Ammonia, dark-pad fallback:** use this when `valid_fraction < 0.3` in either scan.
- Compute the colours from **all pad pixels** (median), still excluding glare.
- **B+** if `C*_before ≥ 10` and `a*_after ≤ 0.6 × a*_before` and `C*_after ≤ 0.6 × C*_before`.
- **Otherwise:** keep **code 2 □** with the title "**Indikasi kuat boraks**". Message: "Konfirmasi amonia tidak bisa dibaca karena pad terlalu gelap. Ulangi dengan pad tipis atau uji laboratorium."
- **Never B−** in the fallback.

**B− is only allowed** when both scans have `valid_fraction ≥ 0.3` and the red clearly stays: `a*_after ≥ 0.85 × a*_before` and `C*_after ≥ 0.8 × C*_before`.

## 4. Two analyses on every result screen (S10–S14)

Show the results in this order:

1. **"Analisis Standar"** (always visible). Contents:
   - the main badge, message and estimate;
   - a small table: L\*, a\*, b\*, h, Δh, A_G, valid_fraction;
   - quality notes;
   - the decision rule that was used, in one sentence, e.g. "Warna bergeser 43° dari kuning ke merah (≥ 12°) → kode 2".
2. **"Analisis Detail AI"**, a collapsible card. The header row says "Analisis Detail AI" with a chevron and the text "Tampilkan / Sembunyikan". It is **closed by default**, and its open/closed state is remembered in settings. When open it shows:
   - **Pendapat AI:** borax_likely and ammonia_change as plain text;
   - **Keyakinan:** Tinggi ≥ 0.75, Sedang 0.5–0.75, Rendah < 0.5;
   - **Warna pad menurut AI:** pad_description and closest_patch;
   - **Masalah foto:** chips;
   - **Penjelasan:** explanation_id or explanation_en;
   - **Kesesuaian:** "Sesuai dengan analisis standar" or "Berbeda – lihat catatan", with the combine-logic note from the earlier update §5.

   If AI is not available, the card still appears with the reason: "AI tidak aktif", "Tidak ada internet", "API key belum diatur" or "AI gagal: {pesan}", plus a button **Coba lagi**.

## 5. Gemini API key

- **Inside AI Studio:** use the key that AI Studio provides to the app, i.e. the environment key this project already uses (`process.env.API_KEY` or `process.env.GEMINI_API_KEY`). Create the client once: `new GoogleGenAI({ apiKey })`.
- **Outside AI Studio (APK / local build):** add a field in Settings, **"Gemini API key"**.
  - It is a password input with show/hide and a **Tes koneksi** button that sends a tiny request and shows ✓ or the error.
  - Save the key on the device only (IndexedDB settings). Never print it in logs, PDF or CSV.
  - Key order: environment key first, then the Settings key.
- Show the current status in Settings: "AI: aktif / tidak ada key / offline".

## 6. Referensi as its own bottom-navigation tab

The S21 content from the earlier update §8 must be a **tab in the bottom navigation**, not only a link.

- **New bottom navigation:** **Beranda · Riwayat · Panduan · Referensi · Pengaturan** (5 tabs, book icon for Referensi).
- Keep the extra entry points: the Guide link, Settings → Tentang, and "Kenapa hasilnya begini?" on result screens, which opens the tab at section 5.
- Use the full Bahasa Indonesia text and the 20-item reference list from §8 exactly as written, with an English version for the EN setting.

## 7. PDF report: full, with procedure, analysis and references

Replace the one-page PDF with a multi-page A4 report (jsPDF). Use the same content in ID or EN, following the app language.

1. **Header:** "Laporan Skrining Boraks – BoraScan", test ID, date and time, app version, batch (name, made / expiry date), food type and note. Add the line "Hasil skrining, bukan hasil laboratorium".
2. **Result summary:** large code + symbol + pattern box (printed, so not colour-only) and the final message. Then the estimate (or "≥ 0,25 %"), and the ammonia result.
3. **Procedure performed:** numbered steps with actual times from the test log:
   - persiapan (1 sendok makanan + 2 sendok air, remas 1 menit, diamkan 2 menit);
   - celup 5 detik;
   - tunggu 10 menit (actual minutes);
   - pindai 1;
   - 1 tetes amonia, tunggu 1 menit;
   - pindai 2.

   Mark any skipped step.
4. **Photos:** the straightened card image of scan 1 and scan 2 side by side, with the pad area outlined.
5. **Analisis Standar:**
   - a table of measured values for both scans: corrected RGB, L\*, a\*, b\*, C\*, h, Δh, A_G, valid_fraction, saturated_fraction, stained patches, quality checks;
   - the rule applied, in words;
   - the calibration used: m, b, LOD, cut-off, linear range.
6. **Analisis Detail AI** (if available): all fields from §4 of this prompt, plus model name and time. If not available, say why.
7. **Interpretasi & batasan:** 3–4 sentences from S21 sections 3 and 8.
8. **Referensi:** numbered list of the references actually used in the report: at least [1], [2], [6], [7], [9], [10], [11], [12], [13], [14], [19], [20] from the S21 list. In the text of sections 5 and 7, cite them with the same numbers.
9. **Footer on every page:** "BoraScan – skrining, bukan hasil laboratorium · halaman X/Y".

## 8. Tests to add

- The 6 simulation rows in §1 give exactly the expected results.
- The dark-pad estimate never exceeds `lin` and shows no range (§2).
- The dark-pad fallback gives B+ or "Indikasi kuat boraks" and never B− (§3).
- The AI card renders all 4 "not available" states (§4).
- The PDF contains all 9 sections, and every citation number in it appears in its reference list (§7).

## 9. Checklist from the previous update – verify each, implement if missing

- [ ] Pad segmentation with glare removal, valid/saturated pixels, `h_p10` (update §1)
- [ ] Stained-patch check and robust 3 × 3 colour correction (update §2)
- [ ] Hue-based scan-1 decision with h0 / dh1 / dh2 / Lsat in config and batch QR (update §3)
- [ ] New ammonia rule (a)/(b)/(c) and "Tidak pasti" (update §4)
- [ ] Gemini call on **both** scans, the scan-2 call with both images, JSON schema, system instruction, combine-logic table (update §5)
- [ ] Settings switch "Analisis AI (butuh internet)" (update §5)
- [ ] Research-mode CSV columns (update §5)
- [ ] Guide tips: thin pad, drain 10–20 s, replace stained card (update §6)
- [ ] S21 Referensi content and reference list (update §8, now a tab per §6 above)

At the end, list which items were already done and which you added now.
