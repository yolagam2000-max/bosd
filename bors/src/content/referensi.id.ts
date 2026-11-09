export interface ReferenceItem {
  id: number;
  authorsAndTitle: string;
  source: string;
  url?: string;
}

export interface SectionContent {
  id: string;
  title: string;
  iconName: string;
  content: string;
  citations: number[];
}

export const REFERENSI_SECTIONS_ID: SectionContent[] = [
  {
    id: "masalah",
    title: "1. Masalahnya",
    iconName: "alert-triangle",
    content: `Boraks (Na₂B₄O₇·10H₂O) dilarang sebagai bahan tambahan pangan di Indonesia [1]. Pada hewan, asupan tinggi dikaitkan dengan gangguan reproduksi dan perkembangan [2]. Boraks masih ditemukan pada bakso di pasar [3, 4]. Tes stik kunyit memang murah, tetapi tidak bisa mendeteksi 0,1 % [5], ikut berubah merah pada makanan yang bersifat basa [7], dan harus dinilai dengan mata.`,
    citations: [1, 2, 3, 4, 5, 7],
  },
  {
    id: "strip_boranata",
    title: "2. Strip BoraNata – nata de coco sebagai wadah",
    iconName: "layers",
    content: `Nata de coco adalah selulosa bakteri yang dibuat oleh bakteri Komagataeibacter xylinus dari air kelapa. Seratnya sangat halus (20–100 nm) dan membentuk jaring 3 dimensi yang bisa menahan air lebih dari 100 kali beratnya sendiri [6]. Karena itu nata bisa menyerap ekstrak kunyit dan cairan sampel dengan rata. Nata juga aman untuk makanan dan murah. Nata de coco sudah pernah dipakai sebagai wadah pereaksi sensor glukosa [8] dan sebagai label indikator kurkumin [7].
Cara membuatnya: nata diiris tipis, direbus dan direndam air bersih untuk membuang gula dan asam, lalu direndam dalam ekstrak kunyit + asam sitrat 10 % dan dikeringkan. Pad yang tipis memberi warna yang lebih mudah dibaca.`,
    citations: [6, 8, 7],
  },
  {
    id: "kurkumin",
    title: "3. Kurkumin – cara mendeteksi boraks",
    iconName: "flask-conical",
    content: `Kurkumin adalah pigmen kuning dari kunyit (Curcuma longa).
• Tahap 1: dalam suasana asam dan saat mengering, asam borat dari boraks bergabung dengan kurkumin membentuk rosocyanine, kompleks berwarna merah. Reaksi ini adalah dasar metode standar penentuan boron dengan kurkumin [9]. Makin banyak boraks, warnanya makin merah hingga merah-cokelat tua.
• Masalah pH: kurkumin juga indikator asam–basa yang menjadi merah-cokelat di suasana basa [7], sehingga makanan basa (misalnya mi kuning) bisa terbaca palsu sebagai boraks. Asam sitrat di strip menjaga suasana tetap asam, jadi warna merah hanya muncul karena boraks.
• Tahap 2 – konfirmasi amonia: dalam analisis kualitatif, warna boraks pada kertas kunyit dipastikan dengan basa, yang mengubahnya menjadi hijau-kehitaman [10]. Warna merah yang hanya karena makanan basa tidak berubah seperti itu.`,
    citations: [9, 7, 10],
  },
  {
    id: "kartu",
    title: "4. Kartu BoraScan",
    iconName: "credit-card",
    content: `Empat kotak hitam di sudut adalah marker ArUco [12]. Aplikasi memakainya untuk menemukan dan meluruskan kartu secara otomatis. Enam patch warna (W, G, 0, 1, 2, B+) adalah warna pembanding yang dicetak di kartu yang sama, sehingga ikut terkena cahaya yang sama dengan pad.`,
    citations: [12],
  },
  {
    id: "cara_baca",
    title: "5. Cara aplikasi membaca hasil",
    iconName: "cpu",
    content: `1. Menemukan kartu: mendeteksi 4 marker, lalu meluruskan foto menjadi gambar kartu yang lurus.
2. Cek kualitas: fokus, pantulan cahaya, terang-gelap, posisi pad, dan noda pada kartu. Patch yang bernoda tidak dipakai.
3. Koreksi cahaya: warna terukur keenam patch dibandingkan dengan warna aslinya untuk menghitung matriks koreksi 3 × 3. Koreksi seperti ini mengurangi perbedaan antar-HP dan antar-cahaya [11].
4. Membaca pad: aplikasi hanya mengambil bagian pad yang tidak mengkilap dan tidak terlalu gelap, lalu mengubah warnanya ke ruang warna CIELAB (L* terang, a* merah–hijau, b* kuning–biru, sudut warna h) [13].
5. Memutuskan kode:
   • pergeseran warna dari kuning ke merah (Δh) menunjukkan ada atau tidaknya boraks;
   • penyerapan cahaya hijau (A_G) dibandingkan dengan kalibrasi batch strip (QR di sachet) untuk memperkirakan kadar boraks dalam % dan mg/kg;
   • batas deteksi dihitung dengan rumus 3,3 σ / slope [14].
6. Tes amonia: foto sebelum dan sesudah amonia dibandingkan. Kalau warna merah hilang atau pad berubah hijau-kehitaman, hasilnya B+. Kalau merahnya tetap, hasilnya B−. Kalau padnya terlalu gelap untuk dinilai, hasilnya "Tidak pasti".
7. Analisis AI (opsional, online): foto kartu dan angka hasil ukur dikirim ke model AI Gemini [20] sebagai pendapat kedua. Hasil utama tetap dari aturan di atas. AI hanya boleh menambah kewaspadaan dan tidak pernah mengubah hasil positif menjadi aman.`,
    citations: [11, 13, 14, 20],
  },
  {
    id: "aksesibilitas",
    title: "6. Untuk semua orang, termasuk buta warna",
    iconName: "eye",
    content: `Sekitar 1 dari 12 laki-laki mengalami buta warna [15]. Karena itu warna tidak pernah menjadi satu-satunya tanda [16]. Setiap hasil ditampilkan sebagai kode + simbol + pola + tulisan, dibacakan, dan diberi getaran yang berbeda. Warnanya memakai palet ramah buta warna Okabe–Ito [17], dan sudah dicek dengan simulasi buta warna merah–hijau dan biru–kuning [18].`,
    citations: [15, 16, 17, 18],
  },
  {
    id: "lapor_bpom",
    title: "7. Lapor ke BPOM",
    iconName: "send",
    content: `Hasil B+ bisa langsung dikirim ke kanal pengaduan HaloBPOM lewat WhatsApp (+62 811 9181 533) [19], berisi jenis makanan, tanggal, hasil, perkiraan kadar, batch strip, dan foto strip.`,
    citations: [19],
  },
  {
    id: "batasan",
    title: "8. Batasan",
    iconName: "shield-alert",
    content: `BoraScan adalah tes skrining, bukan hasil laboratorium. Hasil positif perlu dikonfirmasi laboratorium. Ketepatan bergantung pada strip yang baik (tipis, kering, belum kedaluwarsa), kartu yang bersih, dan foto yang sesuai panduan. Angka ambang masih disesuaikan dengan data uji.`,
    citations: [],
  },
];

export const REFERENCES_LIST: ReferenceItem[] = [
  {
    id: 1,
    authorsAndTitle: "Kementerian Kesehatan RI, Peraturan Menteri Kesehatan No. 033 Tahun 2012 tentang Bahan Tambahan Pangan",
    source: "Jakarta, 2012.",
  },
  {
    id: 2,
    authorsAndTitle: "Hadrup N., Frederiksen M., Sharma A.K., Toxicity of boric acid, borax and other boron containing compounds: A review",
    source: "Regulatory Toxicology and Pharmacology 121 (2021) 104873.",
    url: "https://doi.org/10.1016/j.yrtph.2021.104873",
  },
  {
    id: 3,
    authorsAndTitle: "Suseno D., Analisis kualitatif dan kuantitatif kandungan boraks pada bakso menggunakan kertas turmerik, FT-IR spektrometer dan spektrofotometer UV-Vis",
    source: "Indonesia Journal of Halal 2(1) (2019) 1–9.",
    url: "https://doi.org/10.14710/halal.v2i1.4968",
  },
  {
    id: 4,
    authorsAndTitle: "Rahma D.A., Sari E.M., Nurfajriah S., Identifikasi kandungan boraks pada bakso yang beredar di pasar tradisional Kecamatan Tambun Selatan",
    source: "Journal of Research and Education Chemistry 5(1) (2023).",
    url: "https://doi.org/10.25299/jrec.2023.vol5(1).12502",
  },
  {
    id: 5,
    authorsAndTitle: "Darmawati, Putri S.K., Rahmayanti, Hadijah S., Detection of borax in meatball snacks using curcumin sticks",
    source: "AICH 2(1) (2025) 25–33.",
    url: "https://journal.poltekkesaceh.ac.id/index.php/aich/article/view/1064",
  },
  {
    id: 6,
    authorsAndTitle: "Gorgieva S., Trček J., Bacterial cellulose: Production, modification and perspectives in biomedical applications",
    source: "Nanomaterials 9(10) (2019) 1352.",
    url: "https://doi.org/10.3390/nano9101352",
  },
  {
    id: 7,
    authorsAndTitle: "Rahmayanti H.D. et al., Visual pH-sensing films based nata de coco containing curcumin as package indicator labels for detecting fish freshness",
    source: "Proc. iCAST-ES (2022) 663–668.",
    url: "https://doi.org/10.5220/0011862000003575",
  },
  {
    id: 8,
    authorsAndTitle: "Indarti D., Asnawati, Characterization of nata de coco–Benedict film by adsorption as sensor for glucose in urine sample",
    source: "Jurnal Ilmu Dasar 12(2) (2011) 200–209.",
    url: "https://jurnal.unej.ac.id/index.php/JID/article/view/68",
  },
  {
    id: 9,
    authorsAndTitle: "APHA, AWWA, WEF, Method 4500-B B: Boron by curcumin method",
    source: "Standard Methods for the Examination of Water and Wastewater, 23rd ed., 2017.",
  },
  {
    id: 10,
    authorsAndTitle: "Svehla G., Vogel's Qualitative Inorganic Analysis",
    source: "7th ed., Longman, 1996.",
  },
  {
    id: 11,
    authorsAndTitle: "Fyfe C., Yu S., Zhang J., Reid M., RGB color correction and gamut limitations in smartphone-based kinetic analysis of chemical reactions",
    source: "Analytical and Bioanalytical Chemistry 417(25) (2025) 5753–5770.",
    url: "https://doi.org/10.1007/s00216-025-06021-9",
  },
  {
    id: 12,
    authorsAndTitle: "Garrido-Jurado S. et al., Automatic generation and detection of highly reliable fiducial markers under occlusion",
    source: "Pattern Recognition 47(6) (2014) 2280–2292.",
    url: "https://doi.org/10.1016/j.patcog.2014.01.005",
  },
  {
    id: 13,
    authorsAndTitle: "CIE, Colorimetry",
    source: "4th ed., CIE 015:2018.",
    url: "https://doi.org/10.25039/TR.015.2018",
  },
  {
    id: 14,
    authorsAndTitle: "ICH, Q2(R1) Validation of Analytical Procedures: Text and Methodology",
    source: "2005.",
  },
  {
    id: 15,
    authorsAndTitle: "National Eye Institute, Color Blindness",
    source: "NEI Research Overview.",
    url: "https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/color-blindness",
  },
  {
    id: 16,
    authorsAndTitle: "W3C, Understanding Success Criterion 1.4.1: Use of Color",
    source: "WCAG 2.2 Guidelines.",
    url: "https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html",
  },
  {
    id: 17,
    authorsAndTitle: "Okabe M., Ito K., Color Universal Design (CUD)",
    source: "J*Fly, 2008.",
    url: "https://jfly.uni-koeln.de/color",
  },
  {
    id: 18,
    authorsAndTitle: "Machado G.M., Oliveira M.M., Fernandes L.A.F., A physiologically-based model for simulation of color vision deficiency",
    source: "IEEE TVCG 15(6) (2009) 1291–1298.",
    url: "https://lume.ufrgs.br/handle/10183/27630",
  },
  {
    id: 19,
    authorsAndTitle: "BPOM, Laporkan melalui BPOM Mobile (HaloBPOM)",
    source: "Badan Pengawas Obat dan Makanan RI.",
    url: "https://www.pom.go.id/katabpom/laporkan-melalui-bpom-mobile",
  },
  {
    id: 20,
    authorsAndTitle: "Google, Gemini API documentation",
    source: "Google AI Developer Documentation.",
    url: "https://ai.google.dev/gemini-api/docs",
  },
];
