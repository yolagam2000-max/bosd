import { ReferenceItem, SectionContent, REFERENCES_LIST } from "./referensi.id";

export const REFERENSI_SECTIONS_EN: SectionContent[] = [
  {
    id: "masalah",
    title: "1. The Problem",
    iconName: "alert-triangle",
    content: `Borax (Na₂B₄O₇·10H₂O) is strictly prohibited as a food additive in Indonesia [1]. In animal studies, high intake is associated with reproductive and developmental impairments [2]. Despite prohibitions, borax is still occasionally detected in meatballs sold in traditional markets [3, 4]. Conventional turmeric stick tests are inexpensive but fail to reliably detect low levels such as 0.1% [5], also turn red in alkaline foods [7], and require subjective visual interpretation.`,
    citations: [1, 2, 3, 4, 5, 7],
  },
  {
    id: "strip_boranata",
    title: "2. BoraNata Strip – Nata de Coco as Reaction Matrix",
    iconName: "layers",
    content: `Nata de coco is bacterial cellulose produced by Komagataeibacter xylinus from coconut water fermentation. Its ultrafine nanofibers (20–100 nm) form a 3D network capable of holding over 100 times its dry weight in water [6]. Consequently, nata uniformly absorbs turmeric extract and food sample extracts. Nata is also food-safe and economical. Nata de coco has previously been demonstrated as a substrate for glucose sensor films [8] and as curcumin freshness indicator labels [7].
Preparation method: thinly sliced nata is boiled and rinsed in fresh water to remove residual sugars and acids, immersed in 10% turmeric extract + citric acid solution, and dried. Thinner pads yield clearer, more accurate optical readings.`,
    citations: [6, 8, 7],
  },
  {
    id: "kurkumin",
    title: "3. Curcumin – Borax Detection Chemistry",
    iconName: "flask-conical",
    content: `Curcumin is the principal yellow pigment of turmeric (Curcuma longa).
• Stage 1: Under acidic conditions and upon drying, boric acid from borax complexes with curcumin to form rosocyanine, an intensely red coordination complex. This reaction forms the basis of the standard spectrophotometric method for boron determination [9]. Higher borax concentrations produce deeper red to dark red-brown hues.
• The pH challenge: Curcumin is also an acid–base indicator turning reddish-brown in alkaline environments [7], which can cause false positives in alkaline foods (e.g., alkaline yellow noodles). Citric acid in the test strip maintains an acidic reaction zone, ensuring red coloration occurs specifically due to borax complexation.
• Stage 2 – Ammonia confirmation: In classical qualitative analysis, the presence of rosocyanine is confirmed with dilute base/ammonia, which shifts the color to greenish-black [10]. Red coloration resulting merely from food alkalinity does not exhibit this distinct greenish-black transition.`,
    citations: [9, 7, 10],
  },
  {
    id: "kartu",
    title: "4. BoraScan Calibration Card",
    iconName: "credit-card",
    content: `The four black squares at the corners are ArUco fiducial markers [12]. The application uses them to automatically detect and rectify card perspective. Six color patches (W, G, 0, 1, 2, B+) serve as printed on-card references that share identical ambient lighting conditions with the test pad.`,
    citations: [12],
  },
  {
    id: "cara_baca",
    title: "5. Digital Reading & Calibration Pipeline",
    iconName: "cpu",
    content: `1. Card detection: Locates 4 markers and rectifies the photo into a canonical 850 × 550 px card canvas.
2. Quality inspection: Evaluates focus blur, specular glare, exposure levels, pad placement, and surface stains. Stained patches are excluded from color calibration.
3. Optical calibration: Compares measured patch colors against ground truth to fit a 3 × 3 color correction matrix, mitigating variations across different smartphone cameras and lighting [11].
4. Pad segmentation: Automatically segments non-glare, non-saturated pad pixels and transforms coordinates into CIELAB color space (L* lightness, a* red–green, b* yellow–blue, hue angle h) [13].
5. Code decision:
   • Hue shift from yellow to red (Δh) determines the qualitative presence of borax;
   • Green-channel optical absorption (A_G) is evaluated against batch calibration parameters to estimate borax concentration in % and mg/kg;
   • Detection limit is defined via the ICH 3.3 σ / slope guideline [14].
6. Ammonia confirmation: Pre- and post-ammonia scans are compared. If red chromaticity collapses or the pad turns greenish-black, the result is B+. If redness persists, it is B−. If the pad is too dark to evaluate reliably, the outcome is marked "Uncertain" (Tidak pasti).
7. AI second opinion (optional, online): Card image and measured telemetry are evaluated by Google Gemini [20] as an auxiliary review. The deterministic rules remain primary; AI may heighten scrutiny but never overrides a positive finding to safe.`,
    citations: [11, 13, 14, 20],
  },
  {
    id: "aksesibilitas",
    title: "6. Universal Accessibility & Color-Blind Design",
    iconName: "eye",
    content: `Approximately 1 in 12 men experiences color vision deficiency [15]. Consequently, color is never used as the sole conveyor of information [16]. Every result combines Code + Symbol + Pattern + Text, audible speech synthesis, and unique haptic vibration signatures. Palette design follows Okabe–Ito color universal design [17] and has been validated against red–green and blue–yellow deficiency simulations [18].`,
    citations: [15, 16, 17, 18],
  },
  {
    id: "lapor_bpom",
    title: "7. BPOM Food Safety Reporting",
    iconName: "send",
    content: `Confirmed B+ results can be directly submitted to the Indonesian FDA (HaloBPOM WhatsApp hotline +62 811 9181 533) [19], pre-populated with food category, timestamp, estimated concentration, strip batch ID, and the rectified card image.`,
    citations: [19],
  },
  {
    id: "batasan",
    title: "8. Screening Scope & Limitations",
    iconName: "shield-alert",
    content: `BoraScan is a preliminary screening tool, not a certified laboratory assay. Suspected positive findings require formal laboratory validation. Detection accuracy depends on proper strip condition (thin, dry, unexpired), a clean card, and adherence to scanning guidelines. Calibration thresholds are continuously refined with empirical testing.`,
    citations: [],
  },
];

export { REFERENCES_LIST };
