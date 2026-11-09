(function() {
  const REFERENSI_SECTIONS_ID = [
    {
      id: "masalah",
      title: "1. Masalahnya",
      icon: "alert-triangle",
      content: "Boraks (Na₂B₄O₇·10H₂O) dilarang sebagai bahan tambahan pangan di Indonesia [1]. Pada hewan, asupan tinggi dikaitkan dengan gangguan reproduksi dan perkembangan [2]. Boraks masih ditemukan pada bakso di pasar [3, 4]. Tes stik kunyit memang murah, tetapi tidak bisa mendeteksi 0,1 % [5], ikut berubah merah pada makanan yang bersifat basa [7], dan harus dinilai dengan mata.",
      citations: [1, 2, 3, 4, 5, 7]
    },
    {
      id: "strip_boranata",
      title: "2. Strip BoraNata – nata de coco sebagai wadah",
      icon: "layers",
      content: "Nata de coco adalah selulosa bakteri yang dibuat oleh bakteri Komagataeibacter xylinus dari air kelapa. Seratnya sangat halus (20–100 nm) dan membentuk jaring 3 dimensi yang bisa menahan air lebih dari 100 kali beratnya sendiri [6]. Karena itu nata bisa menyerap ekstrak kunyit dan cairan sampel dengan rata. Nata juga aman untuk makanan dan murah. Nata de coco sudah pernah dipakai sebagai wadah pereaksi sensor glukosa [8] dan sebagai label indikator kurkumin [7].\n\nCara membuatnya: nata diiris tipis, direbus dan direndam air bersih untuk membuang gula dan asam, lalu direndam dalam ekstrak kunyit + asam sitrat 10 % dan dikeringkan. Pad yang tipis memberi warna yang lebih mudah dibaca.",
      citations: [6, 8, 7]
    },
    {
      id: "kurkumin",
      title: "3. Kurkumin – cara mendeteksi boraks",
      icon: "flask-conical",
      content: "Kurkumin adalah pigmen kuning dari kunyit (Curcuma longa).\n• Tahap 1: dalam suasana asam dan saat mengering, asam borat dari boraks bergabung dengan kurkumin membentuk rosocyanine, kompleks berwarna merah. Reaksi ini adalah dasar metode standar penentuan boron dengan kurkumin [9]. Makin banyak boraks, warnanya makin merah hingga merah-cokelat tua.\n• Masalah pH: kurkumin juga indikator asam–basa yang menjadi merah-cokelat di suasana basa [7], sehingga makanan basa (misalnya mi kuning) bisa terbaca palsu sebagai boraks. Asam sitrat di strip menjaga suasana tetap asam, jadi warna merah hanya muncul karena boraks.\n• Tahap 2 – konfirmasi amonia: dalam analisis kualitatif, warna boraks pada kertas kunyit dipastikan dengan basa, yang mengubahnya menjadi hijau-kehitaman [10]. Warna merah yang hanya karena makanan basa tidak berubah seperti itu.",
      citations: [9, 7, 10]
    },
    {
      id: "kartu",
      title: "4. Kartu BoraScan",
      icon: "credit-card",
      content: "Empat kotak hitam di sudut adalah marker ArUco [12]. Aplikasi memakainya untuk menemukan dan meluruskan kartu secara otomatis. Enam patch warna (W, G, 0, 1, 2, B+) adalah warna pembanding yang dicetak di kartu yang sama, sehingga ikut terkena cahaya yang sama dengan pad.",
      citations: [12]
    },
    {
      id: "cara_baca",
      title: "5. Cara aplikasi membaca hasil",
      icon: "cpu",
      content: "1. Menemukan kartu: mendeteksi 4 marker, lalu meluruskan foto menjadi gambar kartu yang lurus.\n2. Cek kualitas: fokus, pantulan cahaya, terang-gelap, posisi pad, dan noda pada kartu. Patch yang bernoda tidak dipakai.\n3. Koreksi cahaya: warna terukur keenam patch dibandingkan dengan warna aslinya untuk menghitung matriks koreksi 3 × 3. Koreksi seperti ini mengurangi perbedaan antar-HP dan antar-cahaya [11].\n4. Membaca pad: aplikasi hanya mengambil bagian pad yang tidak mengkilap dan tidak terlalu gelap, lalu mengubah warnanya ke ruang warna CIELAB (L* terang, a* merah–hijau, b* kuning–biru, sudut warna h) [13].\n5. Memutuskan kode:\n   • pergeseran warna dari kuning ke merah (Δh) menunjukkan ada atau tidaknya boraks;\n   • penyerapan cahaya hijau (A_G) dibandingkan dengan kalibrasi batch strip (QR di sachet) untuk memperkirakan kadar boraks dalam % dan mg/kg;\n   • batas deteksi dihitung dengan rumus 3,3 σ / slope [14].\n6. Tes amonia: foto sebelum dan sesudah amonia dibandingkan. Kalau warna merah hilang atau pad berubah hijau-kehitaman, hasilnya B+. Kalau merahnya tetap, hasilnya B−. Kalau padnya terlalu gelap untuk dinilai, hasilnya \"Tidak pasti\".\n7. Analisis AI (opsional, online): foto kartu dan angka hasil ukur dikirim ke model AI Gemini [20] sebagai pendapat kedua. Hasil utama tetap dari aturan di atas. AI hanya boleh menambah kewaspadaan dan tidak pernah mengubah hasil positif menjadi aman.",
      citations: [11, 13, 14, 20]
    },
    {
      id: "aksesibilitas",
      title: "6. Untuk semua orang, termasuk buta warna",
      icon: "eye",
      content: "Sekitar 1 dari 12 laki-laki mengalami buta warna [15]. Karena itu warna tidak pernah menjadi satu-satunya tanda [16]. Setiap hasil ditampilkan sebagai kode + simbol + pola + tulisan, dibacakan, dan diberi getaran yang berbeda. Warnanya memakai palet ramah buta warna Okabe–Ito [17], dan sudah dicek dengan simulasi buta warna merah–hijau dan biru–kuning [18].",
      citations: [15, 16, 17, 18]
    },
    {
      id: "lapor_bpom",
      title: "7. Lapor ke BPOM",
      icon: "send",
      content: "Hasil B+ bisa langsung dikirim ke kanal pengaduan HaloBPOM lewat WhatsApp (+62 811 9181 533) [19], berisi jenis makanan, tanggal, hasil, perkiraan kadar, batch strip, dan foto strip.",
      citations: [19]
    },
    {
      id: "batasan",
      title: "8. Batasan",
      icon: "shield-alert",
      content: "BoraScan adalah tes skrining, bukan hasil laboratorium. Hasil positif perlu dikonfirmasi laboratorium. Ketepatan bergantung pada strip yang baik (tipis, kering, belum kedaluwarsa), kartu yang bersih, dan foto yang sesuai panduan. Angka ambang masih disesuaikan dengan data uji.",
      citations: []
    }
  ];

  const REFERENSI_SECTIONS_EN = [
    {
      id: "masalah",
      title: "1. The Problem",
      icon: "alert-triangle",
      content: "Borax (Na₂B₄O₇·10H₂O) is strictly prohibited as a food additive in Indonesia [1]. In animal studies, high intake is associated with reproductive and developmental impairments [2]. Despite prohibitions, borax is still occasionally detected in meatballs sold in traditional markets [3, 4]. Conventional turmeric stick tests are inexpensive but fail to reliably detect low levels such as 0.1% [5], also turn red in alkaline foods [7], and require subjective visual interpretation.",
      citations: [1, 2, 3, 4, 5, 7]
    },
    {
      id: "strip_boranata",
      title: "2. BoraNata Strip – Nata de Coco as Reaction Matrix",
      icon: "layers",
      content: "Nata de coco is bacterial cellulose produced by Komagataeibacter xylinus from coconut water fermentation. Its ultrafine nanofibers (20–100 nm) form a 3D network capable of holding over 100 times its dry weight in water [6]. Consequently, nata uniformly absorbs turmeric extract and food sample extracts. Nata is also food-safe and economical. Nata de coco has previously been demonstrated as a substrate for glucose sensor films [8] and as curcumin freshness indicator labels [7].\n\nPreparation method: thinly sliced nata is boiled and rinsed in fresh water to remove residual sugars and acids, immersed in 10% turmeric extract + citric acid solution, and dried. Thinner pads yield clearer, more accurate optical readings.",
      citations: [6, 8, 7]
    },
    {
      id: "kurkumin",
      title: "3. Curcumin – Borax Detection Chemistry",
      icon: "flask-conical",
      content: "Curcumin is the principal yellow pigment of turmeric (Curcuma longa).\n• Stage 1: Under acidic conditions and upon drying, boric acid from borax complexes with curcumin to form rosocyanine, an intensely red coordination complex. This reaction forms the basis of the standard spectrophotometric method for boron determination [9]. Higher borax concentrations produce deeper red to dark red-brown hues.\n• The pH challenge: Curcumin is also an acid–base indicator turning reddish-brown in alkaline environments [7], which can cause false positives in alkaline foods (e.g., alkaline yellow noodles). Citric acid in the test strip maintains an acidic reaction zone, ensuring red coloration occurs specifically due to borax complexation.\n• Stage 2 – Ammonia confirmation: In classical qualitative analysis, the presence of rosocyanine is confirmed with dilute base/ammonia, which shifts the color to greenish-black [10]. Red coloration resulting merely from food alkalinity does not exhibit this distinct greenish-black transition.",
      citations: [9, 7, 10]
    },
    {
      id: "kartu",
      title: "4. BoraScan Calibration Card",
      icon: "credit-card",
      content: "The four black squares at the corners are ArUco fiducial markers [12]. The application uses them to automatically detect and rectify card perspective. Six color patches (W, G, 0, 1, 2, B+) serve as printed on-card references that share identical ambient lighting conditions with the test pad.",
      citations: [12]
    },
    {
      id: "cara_baca",
      title: "5. Digital Reading & Calibration Pipeline",
      icon: "cpu",
      content: "1. Card detection: Locates 4 markers and rectifies the photo into a canonical 850 × 550 px card canvas.\n2. Quality inspection: Evaluates focus blur, specular glare, exposure levels, pad placement, and surface stains. Stained patches are excluded from color calibration.\n3. Optical calibration: Compares measured patch colors against ground truth to fit a 3 × 3 color correction matrix, mitigating variations across different smartphone cameras and lighting [11].\n4. Pad segmentation: Automatically segments non-glare, non-saturated pad pixels and transforms coordinates into CIELAB color space (L* lightness, a* red–green, b* yellow–blue, hue angle h) [13].\n5. Code decision:\n   • Hue shift from yellow to red (Δh) determines the qualitative presence of borax;\n   • Green-channel optical absorption (A_G) is evaluated against batch calibration parameters to estimate borax concentration in % and mg/kg;\n   • Detection limit is defined via the ICH 3.3 σ / slope guideline [14].\n6. Ammonia confirmation: Pre- and post-ammonia scans are compared. If red chromaticity collapses or the pad turns greenish-black, the result is B+. If redness persists, it is B−. If the pad is too dark to evaluate reliably, the outcome is marked \"Uncertain\" (Tidak pasti).\n7. AI second opinion (optional, online): Card image and measured telemetry are evaluated by Google Gemini [20] as an auxiliary review. The deterministic rules remain primary; AI may heighten scrutiny but never overrides a positive finding to safe.",
      citations: [11, 13, 14, 20]
    },
    {
      id: "aksesibilitas",
      title: "6. Universal Accessibility & Color-Blind Design",
      icon: "eye",
      content: "Approximately 1 in 12 men experiences color vision deficiency [15]. Consequently, color is never used as the sole conveyor of information [16]. Every result combines Code + Symbol + Pattern + Text, audible speech synthesis, and unique haptic vibration signatures. Palette design follows Okabe–Ito color universal design [17] and has been validated against red–green and blue–yellow deficiency simulations [18].",
      citations: [15, 16, 17, 18]
    },
    {
      id: "lapor_bpom",
      title: "7. BPOM Food Safety Reporting",
      icon: "send",
      content: "Confirmed B+ results can be directly submitted to the Indonesian FDA (HaloBPOM WhatsApp hotline +62 811 9181 533) [19], pre-populated with food category, timestamp, estimated concentration, strip batch ID, and the rectified card image.",
      citations: [19]
    },
    {
      id: "batasan",
      title: "8. Screening Scope & Limitations",
      icon: "shield-alert",
      content: "BoraScan is a preliminary screening tool, not a certified laboratory assay. Suspected positive findings require formal laboratory validation. Detection accuracy depends on proper strip condition (thin, dry, unexpired), a clean card, and adherence to scanning guidelines. Calibration thresholds are continuously refined with empirical testing.",
      citations: []
    }
  ];

  const REFERENCES_LIST = [
    {
      id: 1,
      text: "Kementerian Kesehatan RI, Peraturan Menteri Kesehatan No. 033 Tahun 2012 tentang Bahan Tambahan Pangan, Jakarta, 2012."
    },
    {
      id: 2,
      text: "Hadrup N., Frederiksen M., Sharma A.K., Toxicity of boric acid, borax and other boron containing compounds: A review, Regulatory Toxicology and Pharmacology 121 (2021) 104873.",
      url: "https://doi.org/10.1016/j.yrtph.2021.104873"
    },
    {
      id: 3,
      text: "Suseno D., Analisis kualitatif dan kuantitatif kandungan boraks pada bakso menggunakan kertas turmerik, FT-IR spektrometer dan spektrofotometer UV-Vis, Indonesia Journal of Halal 2(1) (2019) 1–9.",
      url: "https://doi.org/10.14710/halal.v2i1.4968"
    },
    {
      id: 4,
      text: "Rahma D.A., Sari E.M., Nurfajriah S., Identifikasi kandungan boraks pada bakso yang beredar di pasar tradisional Kecamatan Tambun Selatan, Journal of Research and Education Chemistry 5(1) (2023).",
      url: "https://doi.org/10.25299/jrec.2023.vol5(1).12502"
    },
    {
      id: 5,
      text: "Darmawati, Putri S.K., Rahmayanti, Hadijah S., Detection of borax in meatball snacks using curcumin sticks, AICH 2(1) (2025) 25–33.",
      url: "https://journal.poltekkesaceh.ac.id/index.php/aich/article/view/1064"
    },
    {
      id: 6,
      text: "Gorgieva S., Trček J., Bacterial cellulose: Production, modification and perspectives in biomedical applications, Nanomaterials 9(10) (2019) 1352.",
      url: "https://doi.org/10.3390/nano9101352"
    },
    {
      id: 7,
      text: "Rahmayanti H.D. et al., Visual pH-sensing films based nata de coco containing curcumin as package indicator labels for detecting fish freshness, Proc. iCAST-ES (2022) 663–668.",
      url: "https://doi.org/10.5220/0011862000003575"
    },
    {
      id: 8,
      text: "Indarti D., Asnawati, Characterization of nata de coco–Benedict film by adsorption as sensor for glucose in urine sample, Jurnal Ilmu Dasar 12(2) (2011) 200–209.",
      url: "https://jurnal.unej.ac.id/index.php/JID/article/view/68"
    },
    {
      id: 9,
      text: "APHA, AWWA, WEF, Method 4500-B B: Boron by curcumin method, Standard Methods for the Examination of Water and Wastewater, 23rd ed., 2017."
    },
    {
      id: 10,
      text: "Svehla G., Vogel's Qualitative Inorganic Analysis, 7th ed., Longman, 1996."
    },
    {
      id: 11,
      text: "Fyfe C., Yu S., Zhang J., Reid M., RGB color correction and gamut limitations in smartphone-based kinetic analysis of chemical reactions, Analytical and Bioanalytical Chemistry 417(25) (2025) 5753–5770.",
      url: "https://doi.org/10.1007/s00216-025-06021-9"
    },
    {
      id: 12,
      text: "Garrido-Jurado S. et al., Automatic generation and detection of highly reliable fiducial markers under occlusion, Pattern Recognition 47(6) (2014) 2280–2292.",
      url: "https://doi.org/10.1016/j.patcog.2014.01.005"
    },
    {
      id: 13,
      text: "CIE, Colorimetry, 4th ed., CIE 015:2018.",
      url: "https://doi.org/10.25039/TR.015.2018"
    },
    {
      id: 14,
      text: "ICH, Q2(R1) Validation of Analytical Procedures: Text and Methodology, 2005."
    },
    {
      id: 15,
      text: "National Eye Institute, Color Blindness, NEI Research Overview.",
      url: "https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/color-blindness"
    },
    {
      id: 16,
      text: "W3C, Understanding Success Criterion 1.4.1: Use of Color, WCAG 2.2 Guidelines.",
      url: "https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html"
    },
    {
      id: 17,
      text: "Okabe M., Ito K., Color Universal Design (CUD), J*Fly, 2008.",
      url: "https://jfly.uni-koeln.de/color"
    },
    {
      id: 18,
      text: "Machado G.M., Oliveira M.M., Fernandes L.A.F., A physiologically-based model for simulation of color vision deficiency, IEEE TVCG 15(6) (2009) 1291–1298.",
      url: "https://lume.ufrgs.br/handle/10183/27630"
    },
    {
      id: 19,
      text: "BPOM, Laporkan melalui BPOM Mobile (HaloBPOM), Badan Pengawas Obat dan Makanan RI.",
      url: "https://www.pom.go.id/katabpom/laporkan-melalui-bpom-mobile"
    },
    {
      id: 20,
      text: "Google, Gemini API documentation, Google AI Developer Documentation.",
      url: "https://ai.google.dev/gemini-api/docs"
    }
  ];

  window.BoraScanReferensi = {
    REFERENSI_SECTIONS_ID,
    REFERENSI_SECTIONS_EN,
    REFERENCES_LIST
  };
})();
