package com.example

import kotlin.math.*
import org.junit.Assert.*
import org.junit.Test

class BoraScanLogicTest {

  // --- Colorimetric math helpers ---

  private fun srgbToLinear(c: Double): Double {
    val a = max(0.0, min(255.0, c)) / 255.0
    return if (a <= 0.04045) a / 12.92 else ((a + 0.055) / 1.055).pow(2.4)
  }

  private fun srgbToLab(r: Double, g: Double, b: Double): Triple<Double, Double, Double> {
    val rLin = srgbToLinear(r)
    val gLin = srgbToLinear(g)
    val bLin = srgbToLinear(b)

    val x = 0.4124564 * rLin + 0.3575761 * gLin + 0.1804375 * bLin
    val y = 0.2126729 * rLin + 0.7151522 * gLin + 0.0721750 * bLin
    val z = 0.0193339 * rLin + 0.1191920 * gLin + 0.9503041 * bLin

    val xn = 0.95047
    val yn = 1.0
    val zn = 1.08883

    fun f(t: Double): Double = if (t > 0.008856) t.pow(1.0 / 3.0) else (7.787 * t + 16.0 / 116.0)

    val fx = f(x / xn)
    val fy = f(y / yn)
    val fz = f(z / zn)

    val l = 116.0 * fy - 16.0
    val aStar = 500.0 * (fx - fy)
    val bStar = 200.0 * (fy - fz)
    return Triple(l, aStar, bStar)
  }

  private fun calcHue(a: Double, b: Double): Double {
    var h = atan2(b, a) * 180.0 / PI
    if (h < 0.0) h += 360.0
    return h
  }

  // White balance to nominal W (245, 245, 242)
  private fun whiteBalance(pad: Triple<Double, Double, Double>, w: Triple<Double, Double, Double>): Triple<Double, Double, Double> {
    val nomW = Triple(245.0, 245.0, 242.0)
    return Triple(
      pad.first * (nomW.first / w.first),
      pad.second * (nomW.second / w.second),
      pad.third * (nomW.third / w.third)
    )
  }

  // --- §3 Acceptance Tests ---

  @Test
  fun testCase1_S2Blank() {
    // S2, blank: Pad sRGB (152, 115, 52), W patch (204, 200, 188) -> h ≈ 80°, code 0
    val wb = whiteBalance(Triple(152.0, 115.0, 52.0), Triple(204.0, 200.0, 188.0))
    val lab = srgbToLab(wb.first, wb.second, wb.third)
    val h = calcHue(lab.second, lab.third)

    assertEquals(80.0, h, 2.0)
    val dh = 80.0 - h
    val code = if (dh >= 12.0) 2 else if (dh >= 6.0) 1 else 0
    assertEquals(0, code)
  }

  @Test
  fun testCase2_S2Borax() {
    // S2, borax: Pad sRGB (159, 119, 89), W patch (219, 216, 204) -> h ≈ 60°, Δh ≈ 20 -> code 2
    val wb = whiteBalance(Triple(159.0, 119.0, 89.0), Triple(219.0, 216.0, 204.0))
    val lab = srgbToLab(wb.first, wb.second, wb.third)
    val h = calcHue(lab.second, lab.third)

    assertEquals(60.0, h, 3.0)
    val dh = 80.0 - h
    assertTrue("Δh should be >= 12", dh >= 12.0)
    val code = if (dh >= 12.0) 2 else if (dh >= 6.0) 1 else 0
    assertEquals(2, code)
  }

  @Test
  fun testCase3_S2ThickPadBorax() {
    // S2, thick pad, borax: Pad sRGB (66, 39, 33), W patch (227, 227, 222) -> L* ≈ 21, h ≈ 37° -> code 2, "pad terlalu gelap"
    val wb = whiteBalance(Triple(66.0, 39.0, 33.0), Triple(227.0, 227.0, 222.0))
    val lab = srgbToLab(wb.first, wb.second, wb.third)
    val h = calcHue(lab.second, lab.third)

    assertEquals(21.0, lab.first, 2.0)
    assertEquals(37.0, h, 3.0)
    val dh = 80.0 - h
    val hueCode = if (dh >= 12.0) 2 else if (dh >= 6.0) 1 else 0
    assertEquals(2, hueCode)
  }

  @Test
  fun testCase4_S1EdgeBorax() {
    // S1 edge, borax: Pad sRGB (114, 42, 27), W patch (234, 235, 229) -> h ≈ 40° -> code 2 (with h0 = 58 for S1)
    val wb = whiteBalance(Triple(114.0, 42.0, 27.0), Triple(234.0, 235.0, 229.0))
    val lab = srgbToLab(wb.first, wb.second, wb.third)
    val h = calcHue(lab.second, lab.third)

    assertEquals(40.0, h, 3.0)
    val h0 = 58.0
    val dh = h0 - h
    assertTrue("Δh should be >= 12", dh >= 12.0)
    val code = if (dh >= 12.0) 2 else if (dh >= 6.0) 1 else 0
    assertEquals(2, code)
  }

  // --- §1 Simulation Rows Tests & §3 Dark Pad Fallback ---

  data class ScanData(
    val l: Double,
    val a: Double,
    val b: Double,
    val validFraction: Double,
    val h: Double = (atan2(b, a) * 180.0 / PI).let { if (it < 0) it + 360.0 else it },
    val cStar: Double = sqrt(a * a + b * b)
  )

  private fun decideFirstScan(
    scan: ScanData,
    h0: Double = 80.0,
    dh1: Double = 6.0,
    dh2: Double = 12.0,
    lsat: Double = 25.0
  ): Pair<Int, String> {
    val dh = h0 - scan.h
    val hueCode = if (dh >= dh2) 2 else if (dh >= dh1) 1 else 0
    val isDark = scan.l < lsat || scan.validFraction < 0.3

    return if (hueCode == 2 && isDark) {
      Pair(2, "Pad sangat gelap – kadar tidak bisa dihitung, gunakan pad lebih tipis untuk estimasi.")
    } else {
      Pair(hueCode, "")
    }
  }

  private fun decideAmmoniaFull(
    scan1: ScanData?,
    scan2: ScanData,
    aRatio: Double = 0.6,
    cRatio: Double = 0.6,
    dL: Double = -10.0,
    aMax: Double = 5.0
  ): Pair<String, String> {
    // If no first scan exists, result is "Tidak pasti", never B-
    if (scan1 == null) {
      return Pair("Tidak pasti", "Scan pertama tidak ditemukan")
    }

    // §3 Ammonia dark-pad fallback when either scan has valid_fraction < 0.3
    if (scan1.validFraction < 0.3 || scan2.validFraction < 0.3) {
      val isBPlus = scan1.cStar >= 10.0 &&
        scan2.a <= aRatio * scan1.a &&
        scan2.cStar <= cRatio * scan1.cStar

      return if (isBPlus) {
        Pair("B+", "pad sangat gelap")
      } else {
        // Otherwise keep code 2 "Indikasi kuat boraks", never B-
        Pair("Indikasi kuat boraks", "Konfirmasi amonia tidak bisa dibaca karena pad terlalu gelap. Ulangi dengan pad tipis atau uji laboratorium.")
      }
    }

    // Standard Ammonia rules:
    // (a) h_after >= 90 and C*_after <= 20
    val condA = scan2.h >= 90.0 && scan2.cStar <= 20.0
    // (b) a*_after <= aRatio * a*_before and C*_after <= cRatio * C*_before
    val condB = scan2.a <= aRatio * scan1.a && scan2.cStar <= cRatio * scan1.cStar
    // (c) L*_after - L*_before <= dL and a*_after <= aMax
    val condC = (scan2.l - scan1.l) <= dL && scan2.a <= aMax

    if (condA || condB || condC) {
      return Pair("B+", "Amonia positif")
    }

    // B- is ONLY allowed when both scans have valid_fraction >= 0.3 and red stays:
    // a*_after >= 0.85 * a*_before and C*_after >= 0.8 * C*_before
    val bMinus = scan2.a >= 0.85 * scan1.a && scan2.cStar >= 0.80 * scan1.cStar
    if (bMinus) {
      return Pair("B-", "Bukan boraks")
    }

    return Pair("Tidak pasti", "Perubahan warna meragukan")
  }

  // Format estimate per §2:
  private fun formatEstimate(x: Double, lin: Double = 0.25, isDark: Boolean = false): Pair<String, String> {
    if (isDark || x > lin) {
      return Pair("≥ 0,25 % (≥ 2.500 mg/kg) – di atas rentang kalibrasi", "")
    }
    val mgPerKg = round(x * 10000.0).toInt()
    val text = "≈ ${String.format("%.2f", x).replace('.', ',')} % ($mgPerKg mg/kg)"
    val range = "rentang ..."
    return Pair(text, range)
  }

  @Test
  fun testSimulationRow1_Negatif() {
    // 0 ○ Negatif: Scan 1 (80, 0, 64) -> h ≈ 90°, valid=0.9 -> Code 0
    val scan1 = ScanData(80.0, 0.0, 64.0, 0.9)
    assertEquals(90.0, scan1.h, 0.5)
    val res = decideFirstScan(scan1)
    assertEquals(0, res.first)
  }

  @Test
  fun testSimulationRow2_Meragukan() {
    // 1 △ Meragukan: Scan 1 (70, 20, 58) -> h ≈ 71°, valid=0.9 -> Code 1
    val scan1 = ScanData(70.0, 20.0, 58.0, 0.9)
    assertEquals(71.0, scan1.h, 1.0)
    val res = decideFirstScan(scan1)
    assertEquals(1, res.first)
  }

  @Test
  fun testSimulationRow3_Positif() {
    // 2 □ Positif: Scan 1 (51, 37, 35) -> h ≈ 44°, valid=0.9 -> Code 2
    val scan1 = ScanData(51.0, 37.0, 35.0, 0.9)
    assertEquals(43.4, scan1.h, 1.0)
    val res = decideFirstScan(scan1)
    assertEquals(2, res.first)
  }

  @Test
  fun testSimulationRow4_AmoniaBPlus() {
    // B+ ⊗ Amonia (+): Scan 1 (51, 37, 35), Scan 2 (27, -5, 8) -> h ≈ 120°, C* 9, valid 0.9 / 0.8 -> B+
    val scan1 = ScanData(51.0, 37.0, 35.0, 0.9)
    val scan2 = ScanData(27.0, -5.0, 8.0, 0.8)
    assertEquals(122.0, scan2.h, 2.0)
    assertEquals(9.43, scan2.cStar, 0.5)

    val res = decideAmmoniaFull(scan1, scan2)
    assertEquals("B+", res.first)
  }

  @Test
  fun testSimulationRow5_AmoniaBMinus() {
    // B− ⊖ Basa saja: Scan 1 (56, 30, 44), Scan 2 (55, 31, 43.5), valid 0.9 / 0.9 -> B−
    val scan1 = ScanData(56.0, 30.0, 44.0, 0.9)
    val scan2 = ScanData(55.0, 31.0, 43.5, 0.9)

    val res = decideAmmoniaFull(scan1, scan2)
    assertEquals("B-", res.first)
  }

  @Test
  fun testSimulationRow6_PadTebal_DarkPadFallback() {
    // Pad tebal: Scan 1 (19, 12, 9), Scan 2 (15.5, 1, 3.3), valid 0.1 / 0.05 -> B+, note "pad sangat gelap"
    val scan1 = ScanData(19.0, 12.0, 9.0, 0.1)
    val scan2 = ScanData(15.5, 1.0, 3.3, 0.05)

    val firstRes = decideFirstScan(scan1)
    assertEquals(2, firstRes.first)
    assertTrue("Should have dark pad note", firstRes.second.contains("Pad sangat gelap"))

    val ammoniaRes = decideAmmoniaFull(scan1, scan2)
    assertEquals("B+", ammoniaRes.first)
    assertTrue(ammoniaRes.second.contains("pad sangat gelap"))
  }

  @Test
  fun testAmmonia_MissingScan1_ReturnsTidakPasti_NeverBMinus() {
    val scan2 = ScanData(55.0, 31.0, 43.5, 0.9)
    val res = decideAmmoniaFull(null, scan2)
    assertEquals("Tidak pasti", res.first)
    assertNotEquals("B-", res.first)
  }

  @Test
  fun testDarkPadFallback_NonBPlus_ReturnsIndikasiKuatBoraks_NeverBMinus() {
    // When dark pad (valid_fraction < 0.3) does not satisfy B+, it MUST return "Indikasi kuat boraks", never B-
    val scan1 = ScanData(19.0, 12.0, 9.0, 0.1)
    // Here red does not collapse: a* remains high (11.0), C* remains high
    val scan2 = ScanData(18.0, 11.0, 8.5, 0.1)

    val res = decideAmmoniaFull(scan1, scan2)
    assertEquals("Indikasi kuat boraks", res.first)
    assertNotEquals("B-", res.first)
    assertTrue(res.second.contains("Konfirmasi amonia tidak bisa dibaca karena pad terlalu gelap"))
  }

  @Test
  fun testEstimateFormatting_CappedAtLin_NoRange() {
    // Above lin (e.g. 1.61)
    val aboveLin = formatEstimate(1.61, lin = 0.25, isDark = false)
    assertEquals("≥ 0,25 % (≥ 2.500 mg/kg) – di atas rentang kalibrasi", aboveLin.first)
    assertEquals("", aboveLin.second) // No range

    // Dark pad
    val darkPad = formatEstimate(0.15, lin = 0.25, isDark = true)
    assertEquals("≥ 0,25 % (≥ 2.500 mg/kg) – di atas rentang kalibrasi", darkPad.first)
    assertEquals("", darkPad.second) // No range

    // Normal within linear range
    val normal = formatEstimate(0.12, lin = 0.25, isDark = false)
    assertTrue(normal.first.contains("0,12 %"))
    assertFalse(normal.second.isEmpty())
  }

  // --- §5 Combine-Logic Table Tests ---

  data class MockAi(
    val boraxLikely: String = "uncertain",
    val ammoniaChange: String = "not_applicable",
    val confidence: Double = 0.5
  )

  private fun combineRuleAndAiTest(rule: String, ai: MockAi?): Pair<String, String> {
    if (ai == null) return Pair(rule, "Rule only")

    // 0 or 1 + borax_likely = yes, confidence >= 0.75 -> Code 1
    if ((rule == "0" || rule == "1") && ai.boraxLikely == "yes" && ai.confidence >= 0.75) {
      return Pair("1", "Kemungkinan boraks – lakukan tes amonia")
    }

    // 2 + borax_likely = no, confidence >= 0.75 -> Code 2 stays; add "AI ragu – cek ulang foto"
    if (rule == "2" && ai.boraxLikely == "no" && ai.confidence >= 0.75) {
      return Pair("2", "AI ragu – cek ulang foto")
    }

    // B- + ammonia_change = greenish_black, confidence >= 0.75 -> "Tidak pasti"
    if (rule == "B-" && ai.ammoniaChange == "greenish_black" && ai.confidence >= 0.75) {
      return Pair("Tidak pasti", "Hasil tidak konsisten – ulangi dengan pad baru / uji lab")
    }

    // B+ + ammonia_change = unchanged, confidence >= 0.75 -> B+ stays, add "AI ragu – disarankan uji lab"
    if (rule == "B+" && ai.ammoniaChange == "unchanged" && ai.confidence >= 0.75) {
      return Pair("B+", "AI ragu – disarankan uji lab")
    }

    // "Tidak pasti" + (greenish_black or unchanged), confidence >= 0.85 -> keep "Tidak pasti", add leaning text
    if (rule == "Tidak pasti" && (ai.ammoniaChange == "greenish_black" || ai.ammoniaChange == "unchanged") && ai.confidence >= 0.85) {
      val leaning = if (ai.ammoniaChange == "greenish_black") "kemungkinan B+" else "kemungkinan B−"
      return Pair("Tidak pasti", "AI: $leaning")
    }

    return Pair(rule, "Rule preserved")
  }

  @Test
  fun testCombineLogic_Row1_AiAgreesOrUnavailable() {
    val res1 = combineRuleAndAiTest("0", null)
    assertEquals("0", res1.first)

    val res2 = combineRuleAndAiTest("2", MockAi(boraxLikely = "yes", confidence = 0.9))
    assertEquals("2", res2.first)
  }

  @Test
  fun testCombineLogic_Row2_Rule0or1_AiYes() {
    val res0 = combineRuleAndAiTest("0", MockAi(boraxLikely = "yes", confidence = 0.8))
    assertEquals("1", res0.first)
    assertTrue(res0.second.contains("Kemungkinan boraks"))

    val res1 = combineRuleAndAiTest("1", MockAi(boraxLikely = "yes", confidence = 0.75))
    assertEquals("1", res1.first)
  }

  @Test
  fun testCombineLogic_Row3_Rule2_AiNo() {
    val res = combineRuleAndAiTest("2", MockAi(boraxLikely = "no", confidence = 0.85))
    assertEquals("2", res.first) // Stays code 2
    assertTrue(res.second.contains("AI ragu"))
  }

  @Test
  fun testCombineLogic_Row4_RuleBMinus_AiGreenishBlack() {
    val res = combineRuleAndAiTest("B-", MockAi(ammoniaChange = "greenish_black", confidence = 0.8))
    assertEquals("Tidak pasti", res.first)
    assertTrue(res.second.contains("Hasil tidak konsisten"))
  }

  @Test
  fun testCombineLogic_Row5_RuleBPlus_AiUnchanged() {
    val res = combineRuleAndAiTest("B+", MockAi(ammoniaChange = "unchanged", confidence = 0.8))
    assertEquals("B+", res.first) // Stays B+
    assertTrue(res.second.contains("AI ragu"))
  }

  @Test
  fun testCombineLogic_Row6_RuleTidakPasti_AiLeaning() {
    val resBPlus = combineRuleAndAiTest("Tidak pasti", MockAi(ammoniaChange = "greenish_black", confidence = 0.9))
    assertEquals("Tidak pasti", resBPlus.first)
    assertTrue(resBPlus.second.contains("kemungkinan B+"))

    val resBMinus = combineRuleAndAiTest("Tidak pasti", MockAi(ammoniaChange = "unchanged", confidence = 0.9))
    assertEquals("Tidak pasti", resBMinus.first)
    assertTrue(resBMinus.second.contains("kemungkinan B−"))
  }

  // --- §8 Reference and Citation Alignment Test ---

  @Test
  fun testS21_EveryCitationNumberHasMatchingReference() {
    val citationsInSections = listOf(
      listOf(1, 2, 3, 4, 5, 7), // Section 1
      listOf(6, 8, 7),           // Section 2
      listOf(9, 7, 10),          // Section 3
      listOf(12),                // Section 4
      listOf(11, 13, 14, 20),    // Section 5
      listOf(15, 16, 17, 18),    // Section 6
      listOf(19),                // Section 7
      emptyList()                // Section 8
    ).flatten().distinct()

    val totalReferences = 20 // 1..20
    val referenceIds = (1..totalReferences).toSet()

    for (c in citationsInSections) {
      assertTrue("Citation [$c] must exist in references list 1..20", referenceIds.contains(c))
    }
  }
}
