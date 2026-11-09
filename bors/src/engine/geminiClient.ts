/**
 * Gemini Online AI Second Opinion Client
 */

import { AI_MODEL } from "../config";
import { AiAnalysisResult } from "./borascanCore";

export const SYSTEM_INSTRUCTION = `You check photos of a borax screening strip. The card has 4 ArUco markers and reference patches W (white), G (grey), 0 (yellow = no borax), 1 (orange), 2 (red = borax), B+ (dark green = borax confirmed after ammonia). The pad is nata de coco loaded with curcumin and citric acid. Curcumin is yellow; with borax it forms red to dark red-brown rosocyanine. A thick pad can look almost black but still red-brown at its thinner edges. After one drop of ammonia, a borax pad turns greenish-black or much darker with the red disappearing; a pad that is red only because the food is alkaline stays red-brown or orange. Judge the pad only, ignore stains on the paper. Be conservative: if the photo quality does not allow a decision, answer "uncertain". This is screening, not a laboratory result. Reply only with the JSON schema.`;

export interface TelemetryNumbers {
  pad_L: number;
  pad_a: number;
  pad_b: number;
  pad_C: number;
  pad_h: number;
  delta_h: number;
  valid_fraction: number;
  saturated_fraction: number;
  stained_patches: string[];
  rule_code: string;
  estimate: string;
}

export async function analyzeWithGemini(params: {
  apiKey: string;
  scan1ImageBase64: string; // JPEG data URL or base64
  scan1Numbers: TelemetryNumbers;
  scan2ImageBase64?: string; // Optional ammonia scan
  scan2Numbers?: TelemetryNumbers;
  timeoutMs?: number;
}): Promise<AiAnalysisResult | null> {
  const {
    apiKey,
    scan1ImageBase64,
    scan1Numbers,
    scan2ImageBase64,
    scan2Numbers,
    timeoutMs = 15000,
  } = params;

  if (!apiKey || apiKey.trim() === "") {
    return null;
  }

  const cleanBase64_1 = scan1ImageBase64.includes(",")
    ? scan1ImageBase64.substring(scan1ImageBase64.indexOf(",") + 1)
    : scan1ImageBase64;

  const parts: any[] = [
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64_1,
      },
    },
    {
      text: `Measured data for Scan 1 (Reaction pad):\n${JSON.stringify(scan1Numbers, null, 2)}`,
    },
  ];

  if (scan2ImageBase64 && scan2Numbers) {
    const cleanBase64_2 = scan2ImageBase64.includes(",")
      ? scan2ImageBase64.substring(scan2ImageBase64.indexOf(",") + 1)
      : scan2ImageBase64;

    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64_2,
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

  const requestBody = {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.warn("Gemini API call failed with status:", response.status);
      return null;
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text) as AiAnalysisResult;
    return parsed;
  } catch (err: any) {
    clearTimeout(timer);
    console.warn("Gemini second opinion error or timeout:", err?.message || err);
    return null;
  }
}
