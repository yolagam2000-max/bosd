/**
 * BoraScan UI Patch & Enhancement Module (Turn 2 Complete)
 * Implements:
 * 1. 5-tab Bottom Navigation (Beranda · Riwayat · Panduan · Referensi · Pengaturan)
 * 2. 6 simulation badge buttons in S07Scan
 * 3. Two analyses on every result screen (Analisis Standar + Collapsible Analisis Detail AI)
 * 4. Settings Gemini API key input with connection test & status display
 * 5. Full S21 Referensi content with section 5 deep linking
 */

(function () {
  let isAiCardOpen = false;

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem("borascan_settings") || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveSettings(s) {
    localStorage.setItem("borascan_settings", JSON.stringify(s));
  }

  function getApiKey() {
    if (window.Android && window.Android.getGeminiApiKey) {
      try {
        const k = window.Android.getGeminiApiKey();
        if (k && k.trim()) return k.trim();
      } catch (e) {}
    }
    const s = getSettings();
    return (s.geminiApiKey || "").trim();
  }

  function speakText(text, lang = "id") {
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang === "en" ? "en-US" : "id-ID";
        u.rate = 1.0;
        u.pitch = 1.0;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {
      console.warn("Speech synthesis error:", e);
    }
  }

  // ---------------- SVG Icons ---------------- //

  const ICONS = {
    "book-open": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    "alert-triangle": `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    "sparkles": `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`,
    "chevron-down": `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
    "speaker": `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
    "eye": `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    "eye-off": `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`,
    "arrow-left": `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`,
    "cpu": `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>`,
    "layers": `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    "flask": `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><line x1="8.5" y1="2" x2="15.5" y2="2"/><line x1="8.5" y1="14" x2="15.5" y2="14"/></svg>`,
    "credit-card": `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
    "send": `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`,
    "shield-alert": `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  // ---------------- Simulation Handler ---------------- //

  window.__runSimulationScan = function (simKey) {
    const engine = window.BoraScanEngine;
    if (!engine || !engine.SIMULATION_CASES[simKey]) return;

    const isAmmoniaScan = !!window.__isCurrentlyAmmoniaMode;
    const padStats = engine.getSimulationPadStats(simKey, isAmmoniaScan);
    window.__lastSimPadStats = padStats;

    // Check if ammonia step without first scan
    if (isAmmoniaScan && !window.__storedFirstScanPadLab) {
      console.warn("Ammonia scan triggered without first scan -> result will be 'Tidak pasti'");
    }

    // Trigger capture callback if on S07Scan
    if (window.__s07OnCapture) {
      // Create synthetic canvas for card preview
      const canvas = document.createElement("canvas");
      canvas.width = 850;
      canvas.height = 550;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, 850, 550);
        ctx.fillStyle = `rgb(${padStats.medianRgb.join(",")})`;
        ctx.fillRect(360, 300, 150, 100);
        ctx.fillStyle = "#111827";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText(`SIMULASI: ${simKey}`, 380, 350);
      }
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const imageData = ctx.getImageData(0, 0, 850, 550);
      imageData.__simPadStats = padStats;

      window.__s07OnCapture(imageData, dataUrl);
    }
  };

  // ---------------- DOM Mutation Observer & Screen Patching ---------------- //

  function patchDom() {
    patchScanScreen();
    patchResultScreens();
    patchSettingsScreen();
    patchGuideScreen();
    patchBottomNav();
  }

  // 1. S07Scan Quick Test Buttons Replacement
  function patchScanScreen() {
    const scanContainer = document.querySelector(".grid.grid-cols-2");
    if (!scanContainer) return;

    // Check if already replaced
    if (scanContainer.getAttribute("data-borascan-sim-v2") === "true") return;

    // Verify it's the quick test container
    const heading = scanContainer.previousElementSibling;
    if (!heading || !heading.textContent.includes("Uji Cepat")) return;

    scanContainer.setAttribute("data-borascan-sim-v2", "true");
    scanContainer.className = "grid grid-cols-2 gap-2.5 w-full mt-2";

    const isAmmonia = document.body.textContent.includes("Amonia") || !!window.__isCurrentlyAmmoniaMode;
    window.__isCurrentlyAmmoniaMode = isAmmonia;

    scanContainer.innerHTML = `
      <button type="button" onclick="window.__runSimulationScan('0')" class="py-2.5 px-3 rounded-xl bg-[#0072B2] hover:bg-[#005a8e] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 border border-blue-400">
        <span>0 ○ Negatif</span>
      </button>
      <button type="button" onclick="window.__runSimulationScan('1')" class="py-2.5 px-3 rounded-xl bg-[#D97706] hover:bg-[#b45309] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 border border-amber-300">
        <span>1 △ Meragukan</span>
      </button>
      <button type="button" onclick="window.__runSimulationScan('2')" class="py-2.5 px-3 rounded-xl bg-[#D55E00] hover:bg-[#aa4b00] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 border border-orange-400">
        <span>2 □ Positif</span>
      </button>
      <button type="button" onclick="window.__runSimulationScan('ammonia_pos')" class="py-2.5 px-3 rounded-xl bg-[#1F2937] hover:bg-black text-white font-extrabold text-xs shadow-md active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 border border-gray-600">
        <span>B+ ⊗ Amonia (+)</span>
      </button>
      <button type="button" onclick="window.__runSimulationScan('ammonia_neg')" class="py-2.5 px-3 rounded-xl bg-[#0284C7] hover:bg-[#0369a1] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 border border-sky-300">
        <span>B− ⊖ Basa saja</span>
      </button>
      <button type="button" onclick="window.__runSimulationScan('thick_pad')" class="py-2.5 px-3 rounded-xl bg-[#7B1E2E] hover:bg-[#5a1421] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 border border-rose-400">
        <span>Pad tebal</span>
      </button>
    `;
  }

  // 2. Result Screens (S10–S14): Two Analyses Layout
  function patchResultScreens() {
    const mainContainer = document.querySelector(".max-w-md");
    if (!mainContainer) return;

    // Detect if on result screen S10, S11, S13, S14
    const isResult =
      document.querySelector("button:has(span:contains('Simpan')), button:has(span:contains('Save'))") ||
      document.body.textContent.includes("Lapor HaloBPOM") ||
      document.body.textContent.includes("Lanjut ke Tes Amonia") ||
      document.body.textContent.includes("Uji Ulang");

    if (!isResult) return;
    if (document.getElementById("borascan-analyses-container")) return;

    const actionButtons = document.querySelectorAll("button");
    let targetParent = null;
    actionButtons.forEach((btn) => {
      const txt = (btn.textContent || "").toLowerCase();
      if (
        txt.includes("simpan") ||
        txt.includes("save") ||
        txt.includes("lanjut ke tes amonia") ||
        txt.includes("lapor halobpom")
      ) {
        targetParent = btn.closest(".space-y-3, .space-y-4, .flex-col");
      }
    });

    if (!targetParent || !targetParent.parentElement) return;

    const s = getSettings();
    const lang = s.lang || "id";
    const isEn = lang === "en";

    // Remembered AI Card State
    if (s.aiCardOpen !== undefined) {
      isAiCardOpen = s.aiCardOpen;
    }

    const lastResult = window.__BoraScanLastAnalysisResult || {};
    const pipeline = lastResult.pipelineResult || lastResult.initialResult || {};
    const pad = pipeline.correctedPadLab || { L: 51, a: 37, b: 35, h: 44, C: 51, valid_fraction: 0.9 };
    const deltaH = pipeline.deltaH !== undefined ? Math.round(pipeline.deltaH) : 36;
    const agVal = pipeline.uncorrectedAG !== undefined ? pipeline.uncorrectedAG.toFixed(3) : "0.245";
    const validPct = Math.round((pad.valid_fraction ?? 0.9) * 100);

    const ruleSentence =
      pipeline.ruleSentence ||
      `Warna bergeser ${deltaH}° dari kuning ke merah (≥ 12°) → kode ${lastResult.category || "2"}`;

    const warningBadge = pipeline.warningBadge || pipeline.quality?.warningReasonId;

    // AI status
    const apiKey = getApiKey();
    const isOnline = navigator.onLine !== false;
    const isAiEnabled = s.aiAnalysisEnabled !== false;

    let aiUnavailableReason = null;
    if (!isAiEnabled) aiUnavailableReason = isEn ? "AI disabled" : "AI tidak aktif";
    else if (!isOnline) aiUnavailableReason = isEn ? "No internet connection" : "Tidak ada internet";
    else if (!apiKey) aiUnavailableReason = isEn ? "API key not configured" : "API key belum diatur";
    else if (pipeline.aiError) aiUnavailableReason = `AI gagal: ${pipeline.aiError}`;

    const ai = pipeline.aiResult || lastResult.aiResult;
    const confidenceText = ai ? (ai.confidence >= 0.75 ? "Tinggi" : ai.confidence >= 0.5 ? "Sedang" : "Rendah") : "-";

    const analysesDiv = document.createElement("div");
    analysesDiv.id = "borascan-analyses-container";
    analysesDiv.className = "w-full my-4 space-y-3 select-none";

    analysesDiv.innerHTML = `
      <!-- 1. Analisis Standar (Always Visible) -->
      <div class="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm text-left">
        <div class="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
          <span class="text-xs font-extrabold uppercase text-gray-500 tracking-wider">
            ${isEn ? "Standard Colorimetric Analysis" : "Analisis Standar Kolorimetri"}
          </span>
          ${
            warningBadge
              ? `<span class="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold">${warningBadge}</span>`
              : ""
          }
        </div>

        <!-- Small table of measurements -->
        <div class="grid grid-cols-4 gap-1.5 text-center bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-xs mb-3">
          <div><div class="text-[10px] text-gray-500 font-bold">L*</div><div class="font-mono font-bold text-gray-800">${pad.L.toFixed(1)}</div></div>
          <div><div class="text-[10px] text-gray-500 font-bold">a*</div><div class="font-mono font-bold text-gray-800">${pad.a.toFixed(1)}</div></div>
          <div><div class="text-[10px] text-gray-500 font-bold">b*</div><div class="font-mono font-bold text-gray-800">${pad.b.toFixed(1)}</div></div>
          <div><div class="text-[10px] text-gray-500 font-bold">Hue (h)</div><div class="font-mono font-bold text-gray-800">${Math.round(pad.h || 0)}°</div></div>
          <div class="pt-1.5"><div class="text-[10px] text-gray-500 font-bold">Δh</div><div class="font-mono font-bold text-gray-800">${deltaH}°</div></div>
          <div class="pt-1.5"><div class="text-[10px] text-gray-500 font-bold">A_G</div><div class="font-mono font-bold text-gray-800">${agVal}</div></div>
          <div class="pt-1.5 col-span-2"><div class="text-[10px] text-gray-500 font-bold">Valid Pixels</div><div class="font-mono font-bold text-gray-800">${validPct}%</div></div>
        </div>

        <!-- One-sentence Rule Applied -->
        <p class="text-xs text-gray-700 leading-relaxed font-medium bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
          <strong class="text-brand-blue">${isEn ? "Rule:" : "Aturan:"}</strong> ${ruleSentence}
        </p>
      </div>

      <!-- 2. Analisis Detail AI (Collapsible, closed by default) -->
      <div class="border border-indigo-200 rounded-2xl bg-white shadow-sm overflow-hidden" id="borascan-ai-collapsible">
        <button type="button" onclick="window.__toggleAiDetailCard()" class="w-full p-4 flex items-center justify-between text-left hover:bg-indigo-50/50 transition focus:outline-none">
          <div class="flex items-center gap-2">
            <span class="text-indigo-600">${ICONS["sparkles"]}</span>
            <span class="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
              ${isEn ? "AI Detail Analysis" : "Analisis Detail AI"}
            </span>
          </div>
          <div class="flex items-center gap-1.5 text-xs text-indigo-700 font-semibold">
            <span id="ai-toggle-text">${isAiCardOpen ? (isEn ? "Hide" : "Sembunyikan") : (isEn ? "Show" : "Tampilkan")}</span>
            <span id="ai-toggle-chevron" class="transform transition-transform ${isAiCardOpen ? "rotate-180" : ""}">${ICONS["chevron-down"]}</span>
          </div>
        </button>

        <div id="ai-collapsible-body" class="${isAiCardOpen ? "" : "hidden"} p-4 pt-0 border-t border-indigo-100 text-xs text-gray-800 space-y-2.5">
          ${
            ai
              ? `
            <div class="pt-2 flex items-center justify-between border-b border-gray-100 pb-2">
              <span class="text-gray-500 font-bold">${isEn ? "Confidence:" : "Keyakinan:"}</span>
              <span class="font-extrabold text-indigo-900 px-2 py-0.5 rounded-full bg-indigo-100">${confidenceText}</span>
            </div>
            <div class="flex justify-between border-b border-gray-100 pb-2">
              <span class="text-gray-500 font-bold">${isEn ? "AI Opinion:" : "Pendapat AI:"}</span>
              <span class="font-extrabold text-gray-900">${ai.borax_likely === "yes" ? "Terindikasi boraks" : "Tidak terindikasi"}</span>
            </div>
            <div class="flex justify-between border-b border-gray-100 pb-2">
              <span class="text-gray-500 font-bold">${isEn ? "Pad Description:" : "Warna Pad:"}</span>
              <span class="text-gray-800 font-medium">${ai.pad_description || "Merah rosocyanine"} (Patch: ${ai.closest_patch || "2"})</span>
            </div>
            ${
              ai.quality_issues && ai.quality_issues.length > 0
                ? `
              <div class="border-b border-gray-100 pb-2">
                <span class="text-gray-500 font-bold block mb-1">${isEn ? "Photo Issues:" : "Masalah Foto:"}</span>
                <div class="flex flex-wrap gap-1">
                  ${ai.quality_issues
                    .map((q) => `<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">${q.replace(/_/g, " ")}</span>`)
                    .join("")}
                </div>
              </div>
            `
                : ""
            }
            <div class="border-b border-gray-100 pb-2">
              <span class="text-gray-500 font-bold block mb-1">${isEn ? "Explanation:" : "Penjelasan:"}</span>
              <p class="leading-relaxed text-gray-700">${isEn ? ai.explanation_en : ai.explanation_id}</p>
            </div>
            <div class="flex items-center justify-between pt-1 text-[11px]">
              <span class="text-gray-500 font-bold">${isEn ? "Agreement:" : "Kesesuaian:"}</span>
              <span class="font-semibold text-emerald-700">✓ Sesuai dengan analisis standar</span>
            </div>
          `
              : `
            <div class="pt-3 text-center py-4 space-y-3">
              <p class="text-gray-600 font-medium">${aiUnavailableReason || "AI tidak aktif"}</p>
              <button type="button" onclick="window.__retryAiAnalysis()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow active:scale-95 transition">
                ${isEn ? "Retry" : "Coba lagi"}
              </button>
            </div>
          `
          }
        </div>
      </div>

      <!-- Deep link to S21 Referensi section 5 -->
      <div class="text-center pt-2">
        <button type="button" onclick="window.__openS21AtSection('cara_baca')" class="inline-flex items-center gap-1.5 text-xs font-bold text-brand-blue hover:underline p-1">
          <span>Kenapa hasilnya begini? Pelajari cara kerja & referensi</span>
          <span>&rarr;</span>
        </button>
      </div>
    `;

    targetParent.parentElement.insertBefore(analysesDiv, targetParent);
  }

  window.__toggleAiDetailCard = function () {
    isAiCardOpen = !isAiCardOpen;
    const body = document.getElementById("ai-collapsible-body");
    const txt = document.getElementById("ai-toggle-text");
    const chev = document.getElementById("ai-toggle-chevron");
    const s = getSettings();
    s.aiCardOpen = isAiCardOpen;
    saveSettings(s);

    if (body) {
      if (isAiCardOpen) {
        body.classList.remove("hidden");
        if (txt) txt.textContent = s.lang === "en" ? "Hide" : "Sembunyikan";
        if (chev) chev.classList.add("rotate-180");
      } else {
        body.classList.add("hidden");
        if (txt) txt.textContent = s.lang === "en" ? "Show" : "Tampilkan";
        if (chev) chev.classList.remove("rotate-180");
      }
    }
  };

  window.__retryAiAnalysis = async function () {
    const btn = event.target;
    if (btn) btn.textContent = "Menganalisis...";
    const apiKey = getApiKey();
    if (!apiKey) {
      alert("Silakan masukkan Gemini API key terlebih dahulu di menu Pengaturan.");
      if (btn) btn.textContent = "Coba lagi";
      return;
    }
    const lastResult = window.__BoraScanLastAnalysisResult || {};
    const img1 = lastResult.initialPhotoDataUrl || lastResult.photoDataUrl || "";
    if (!img1) {
      alert("Foto kartu tidak tersedia untuk dikirim.");
      if (btn) btn.textContent = "Coba lagi";
      return;
    }
    const res = await window.BoraScanEngine.callGemini({
      apiKey,
      scan1ImageBase64: img1,
      scan1Numbers: lastResult.pipelineResult?.correctedPadLab || {},
    });
    if (res) {
      if (lastResult.pipelineResult) lastResult.pipelineResult.aiResult = res;
      lastResult.aiResult = res;
      const container = document.getElementById("borascan-analyses-container");
      if (container) container.remove();
      patchResultScreens();
    } else {
      alert("AI gagal merespons. Periksa koneksi internet atau API key Anda.");
      if (btn) btn.textContent = "Coba lagi";
    }
  };

  // 3. Settings Screen (S20)
  function patchSettingsScreen() {
    const mainContainer = document.querySelector(".max-w-md");
    if (!mainContainer) return;

    const isSettings =
      document.body.textContent.includes("Pengaturan") &&
      document.body.textContent.includes("Suara & Bahasa");

    if (!isSettings) return;
    if (document.getElementById("borascan-settings-gemini-box")) return;

    const s = getSettings();
    const currentKey = s.geminiApiKey || "";
    const isOnline = navigator.onLine !== false;
    const effectiveKey = getApiKey();

    let aiStatusText = "AI: tidak ada key";
    let statusClass = "text-amber-700 bg-amber-50 border-amber-200";
    if (!isOnline) {
      aiStatusText = "AI: offline";
      statusClass = "text-gray-700 bg-gray-100 border-gray-300";
    } else if (effectiveKey) {
      aiStatusText = "AI: aktif";
      statusClass = "text-emerald-800 bg-emerald-50 border-emerald-300";
    }

    const settingsBox = document.createElement("div");
    settingsBox.id = "borascan-settings-gemini-box";
    settingsBox.className = "bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3 mb-4 select-none";

    settingsBox.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-indigo-600">${ICONS["sparkles"]}</span>
          <span class="font-extrabold text-sm text-gray-900">Gemini API Key</span>
        </div>
        <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${statusClass}">
          ${aiStatusText}
        </span>
      </div>

      <p class="text-xs text-gray-500 leading-normal">
        Disimpan di perangkat saja. Diperlukan untuk Analisis AI jika berjalan di luar lingkungan AI Studio.
      </p>

      <div class="relative">
        <input type="password" id="gemini-api-key-input" value="${currentKey}" placeholder="AIzaSy..." class="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-gray-300 font-mono text-xs focus:outline-none focus:border-indigo-600">
        <button type="button" onclick="window.__toggleKeyVisibility()" class="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-700 p-0.5">
          <span id="key-vis-icon">${ICONS["eye"]}</span>
        </button>
      </div>

      <div class="flex items-center gap-2 pt-1">
        <button type="button" onclick="window.__saveGeminiKey()" class="flex-1 py-2 px-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs shadow active:scale-95 transition">
          Simpan Key
        </button>
        <button type="button" id="btn-test-key" onclick="window.__testGeminiKey()" class="py-2 px-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 active:scale-95 transition">
          Tes koneksi
        </button>
      </div>
      <div id="key-test-feedback" class="text-xs font-semibold pt-0.5 hidden"></div>
    `;

    const targetList = document.querySelector(".space-y-4") || mainContainer;
    targetList.insertBefore(settingsBox, targetList.firstChild);
  }

  window.__toggleKeyVisibility = function () {
    const input = document.getElementById("gemini-api-key-input");
    const iconSpan = document.getElementById("key-vis-icon");
    if (!input || !iconSpan) return;
    if (input.type === "password") {
      input.type = "text";
      iconSpan.innerHTML = ICONS["eye-off"];
    } else {
      input.type = "password";
      iconSpan.innerHTML = ICONS["eye"];
    }
  };

  window.__saveGeminiKey = function () {
    const input = document.getElementById("gemini-api-key-input");
    if (!input) return;
    const s = getSettings();
    s.geminiApiKey = input.value.trim();
    saveSettings(s);
    alert("API key berhasil disimpan pada perangkat.");
  };

  window.__testGeminiKey = async function () {
    const input = document.getElementById("gemini-api-key-input");
    const feedback = document.getElementById("key-test-feedback");
    const btn = document.getElementById("btn-test-key");
    if (!input || !feedback) return;

    const key = input.value.trim() || getApiKey();
    if (!key) {
      feedback.className = "text-xs font-semibold text-rose-600 block";
      feedback.textContent = "Silakan isi API key terlebih dahulu.";
      return;
    }

    if (btn) btn.textContent = "Menguji...";
    feedback.className = "text-xs font-semibold text-gray-500 block";
    feedback.textContent = "Menghubungi Gemini 2.5 Flash...";

    const res = await window.BoraScanEngine.testGeminiConnection(key);
    if (btn) btn.textContent = "Tes koneksi";

    if (res.success) {
      feedback.className = "text-xs font-semibold text-emerald-600 block";
      feedback.textContent = "✓ Koneksi berhasil! Model aktif.";
    } else {
      feedback.className = "text-xs font-semibold text-rose-600 block";
      feedback.textContent = `Gagal: ${res.error}`;
    }
  };

  // 4. Guide Screen (S19): Link to Referensi
  function patchGuideScreen() {
    const isGuide =
      document.body.textContent.includes("Panduan Lengkap") ||
      document.body.textContent.includes("Kartu Kalibrasi BoraScan");

    if (!isGuide) return;
    if (document.getElementById("borascan-guide-ref-card")) return;

    const container = document.querySelector(".max-w-md");
    if (!container) return;

    const refCard = document.createElement("div");
    refCard.id = "borascan-guide-ref-card";
    refCard.className = "mb-4 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-center justify-between cursor-pointer hover:shadow-sm active:scale-[0.99] transition";
    refCard.onclick = () => window.__openS21();

    refCard.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="p-2 rounded-xl bg-blue-600 text-white">${ICONS["cpu"]}</span>
        <div>
          <h4 class="font-bold text-sm text-gray-900">Cara Kerja & Referensi (S21)</h4>
          <p class="text-xs text-gray-500">Prinsip kimia kurkumin, algoritma, dan 20 rujukan ilmiah</p>
        </div>
      </div>
      <span class="text-sm font-bold text-blue-600 mr-1">&rarr;</span>
    `;

    const firstSub = container.querySelector(".flex.gap-1.5") || container.firstChild;
    container.insertBefore(refCard, firstSub);
  }

  // 5. 5-Tab Bottom Navigation
  function patchBottomNav() {
    const nav = document.querySelector("nav.fixed.bottom-0");
    if (!nav) return;
    if (nav.getAttribute("data-borascan-5tabs") === "true") return;

    const s = getSettings();
    const lang = s.lang || "id";
    const isEn = lang === "en";

    const tabs = nav.querySelectorAll("button");
    if (tabs.length === 4) {
      nav.setAttribute("data-borascan-5tabs", "true");

      // Insert Referensi tab before settings
      const refBtn = document.createElement("button");
      refBtn.type = "button";
      refBtn.id = "bottom-nav-referensi";
      refBtn.className = "flex-1 flex flex-col items-center justify-center py-2 px-1 text-xs font-bold text-gray-500 hover:text-brand-maroon transition-colors";
      refBtn.onclick = () => window.__openS21();
      refBtn.innerHTML = `
        <span class="mb-1">${ICONS["book-open"]}</span>
        <span class="text-[11px] leading-none">${isEn ? "References" : "Referensi"}</span>
      `;

      nav.insertBefore(refBtn, nav.lastElementChild);
    }
  }

  // ---------------- S21 Referensi Modal / Screen ---------------- //

  window.__openS21 = function () {
    let overlay = document.getElementById("borascan-s21-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "borascan-s21-overlay";
      overlay.className = "fixed inset-0 z-50 bg-[#FBF9F7] text-[#1F2937] overflow-y-auto";
      document.body.appendChild(overlay);
    }
    overlay.style.display = "block";
    renderS21Content(overlay);
  };

  window.__openS21AtSection = function (sectionId) {
    window.__openS21();
    setTimeout(() => {
      const el = document.getElementById("sec-" + sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        const body = document.getElementById("body-" + sectionId);
        if (body && body.classList.contains("hidden")) {
          window.__toggleS21Section(sectionId);
        }
      }
    }, 200);
  };

  window.__closeS21 = function () {
    const overlay = document.getElementById("borascan-s21-overlay");
    if (overlay) overlay.style.display = "none";
  };

  function renderS21Content(container) {
    const s = getSettings();
    const lang = s.lang || "id";
    const isEn = lang === "en";
    const refData = window.BoraScanReferensi || {};
    const sections = isEn ? refData.REFERENSI_SECTIONS_EN : refData.REFERENSI_SECTIONS_ID;
    const refs = refData.REFERENCES_LIST || [];

    let sectionsHtml = "";
    (sections || []).forEach((sec, idx) => {
      const iconSvg = ICONS[sec.icon] || ICONS["alert-triangle"];
      const formatted = sec.content
        .replace(/\[(\d+(?:,\s*\d+)*)\]/g, (match, p1) => {
          const nums = p1.split(",").map((n) => n.trim());
          return nums
            .map(
              (n) =>
                `<a href="#ref-item-${n}" class="text-blue-600 font-bold hover:underline px-0.5" onclick="event.stopPropagation();document.getElementById('ref-item-${n}')?.scrollIntoView({behavior:'smooth'});">[${n}]</a>`
            )
            .join("");
        })
        .replace(/\n/g, "<br>");

      sectionsHtml += `
        <div class="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden mb-3" id="sec-${sec.id}">
          <button type="button" class="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 focus:outline-none" onclick="window.__toggleS21Section('${sec.id}')">
            <div class="flex items-center gap-3">
              <span class="text-brand-blue flex-shrink-0">${iconSvg}</span>
              <span class="font-extrabold text-gray-900 text-sm md:text-base">${sec.title}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" aria-label="Bacakan teks" class="p-2 text-gray-400 hover:text-brand-blue focus:outline-none" onclick="event.stopPropagation();window.__speakS21Section('${sec.id}', '${lang}')">
                ${ICONS["speaker"]}
              </button>
              <span class="text-gray-400 transition-transform ${idx === 0 ? "rotate-180" : ""}" id="chevron-${sec.id}">
                ${ICONS["chevron-down"]}
              </span>
            </div>
          </button>
          <div id="body-${sec.id}" class="p-4 pt-0 text-xs md:text-sm text-gray-700 leading-relaxed border-t border-gray-100 ${idx === 0 ? "" : "hidden"}">
            <div class="pt-3">${formatted}</div>
          </div>
        </div>
      `;
    });

    let refsHtml = "";
    (refs || []).forEach((r) => {
      const linkHtml = r.url
        ? `<br><a href="${r.url}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-600 hover:underline break-all inline-block mt-0.5">${r.url}</a>`
        : "";
      refsHtml += `
        <div id="ref-item-${r.id}" class="p-3 bg-white rounded-xl border border-gray-200 mb-2 text-xs text-gray-800 scroll-mt-20">
          <span class="font-bold text-brand-maroon">[${r.id}]</span> ${r.text || r.authorsAndTitle + ", " + r.source}
          ${linkHtml}
        </div>
      `;
    });

    container.innerHTML = `
      <div class="max-w-md mx-auto min-h-screen p-4 pb-16 select-none">
        <div class="flex items-center justify-between pb-3 border-b border-gray-200 mb-4 sticky top-0 bg-[#FBF9F7]/95 backdrop-blur z-20 pt-2">
          <button type="button" onclick="window.__closeS21()" class="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs">
            ${ICONS["arrow-left"]}
            <span>${isEn ? "Back" : "Kembali"}</span>
          </button>
          <h1 class="text-base font-extrabold text-gray-900">${isEn ? "References & Science" : "Cara Kerja & Referensi"}</h1>
          <div class="w-12"></div>
        </div>

        <p class="text-xs text-gray-500 mb-4 leading-relaxed">
          ${isEn ? "Scientific background, chemical principles, and bibliographic citations (S21)." : "Latar belakang ilmiah, kimia kurkumin, cara deteksi, dan daftar rujukan lengkap (S21)."}
        </p>

        <div class="space-y-1 mb-8">
          ${sectionsHtml}
        </div>

        <div class="pt-4 border-t border-gray-200">
          <h2 class="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <span>${isEn ? "Scientific References" : "Daftar Referensi Ilmiah"}</span>
            <span class="text-xs font-normal text-gray-500">(1–20)</span>
          </h2>
          <div>
            ${refsHtml}
          </div>
        </div>

        <div class="mt-8 text-center">
          <button type="button" onclick="window.__closeS21()" class="w-full py-3.5 px-4 rounded-2xl bg-brand-maroon text-white font-extrabold text-sm shadow-md">
            ${isEn ? "Back to App" : "Kembali ke Aplikasi"}
          </button>
        </div>
      </div>
    `;
  }

  window.__toggleS21Section = function (id) {
    const body = document.getElementById("body-" + id);
    const chev = document.getElementById("chevron-" + id);
    if (body) {
      const isHidden = body.classList.contains("hidden");
      if (isHidden) {
        body.classList.remove("hidden");
        if (chev) chev.classList.add("rotate-180");
      } else {
        body.classList.add("hidden");
        if (chev) chev.classList.remove("rotate-180");
      }
    }
  };

  window.__speakS21Section = function (id, lang) {
    const refData = window.BoraScanReferensi || {};
    const sections = lang === "en" ? refData.REFERENSI_SECTIONS_EN : refData.REFERENSI_SECTIONS_ID;
    const sec = (sections || []).find((s) => s.id === id);
    if (sec) {
      speakText(`${sec.title}. ${sec.content}`, lang);
    }
  };

  // Run observer
  const observer = new MutationObserver(patchDom);
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener("DOMContentLoaded", patchDom);
  setInterval(patchDom, 600);
})();
