# BoraScan – Offline Borax Test Strip Screening Android App

BoraScan is an offline Android smartphone application that screens food samples for borax using a test strip (BoraNata curcumin strip) placed on a printed 85 × 55 mm calibration card. All computer vision processing, ArUco card detection, perspective homography rectification, color calibration, and CIELAB colorimetric analysis run 100% on-device with zero network dependencies and zero cloud AI calls.

---

## Key Features

1. **100% Offline & Private:** No external network requests, no location tracking, no user data collection.
2. **WCAG 2.2 SC 1.4.1 Compliant Results:** Color is never the only signal. Every result is communicated through **Code + Symbol + CSS Pattern + Text + TTS Speech + Haptic Vibration** using the Okabe–Ito color palette.
3. **Automated Optical Calibration:** Detects 4 ArUco markers (`ARUCO_MIP_36h12`), computes perspective homography via Normalized DLT, warps into canonical 850 × 550 px canvas, fits a 3 × 3 color correction matrix $M$ via least-squares over 6 reference patches, and converts to CIELAB coordinates.
4. **Two-Stage Screening & Ammonia Confirmation:**
   - **Stage 1 (10-minute reaction):** Categorizes test pad into 0 (○), 1 (△), or 2 (□).
   - **Stage 2 (Ammonia confirmation):** If 1 or 2 is detected, applying 1 drop of dilute ammonia separates borax ($B+ \otimes$ greenish-black, $\Delta L^* \le dL$ and $a^* \le a_{max}$) from food alkalinity ($B- \ominus$).
5. **Direct BPOM WhatsApp Reporting:** Pre-fills official HaloBPOM complaint template (`+62 811 9181 533`) with attached strip photo.
6. **Calibration Card Download & Print:** Built-in generator for standard 85 × 55 mm printable calibration cards (PNG & PDF with 50 mm verification ruler).
7. **Native Android Capabilities:** Camera capture with runtime permissions, haptic feedback vibrator bridge, MediaStore gallery/downloads integration.

---

## Result Categories (Okabe–Ito & WCAG)

| Code | Symbol | Pattern | Colour | Bahasa Indonesia | English | Vibration (ms) |
|---|---|---|---|---|---|---|
| **0** | ○ | Plain | Blue `#0072B2` | Boraks tidak terdeteksi | No borax detected | `[120]` |
| **1** | △ | Dots | Orange `#E69F00` | Belum jelas – lakukan tes amonia | Unclear – do the ammonia step | `[120, 120, 120]` |
| **2** | □ | Stripes | Vermillion `#D55E00` | Boraks terdeteksi – lakukan tes amonia | Borax detected – do the ammonia step | `[120, 120, 120]` |
| **B+** | ⊗ | Cross-hatch | Black `#1D1D1B` | Boraks terkonfirmasi – jangan dimakan, laporkan | Borax confirmed – do not eat, report it | `[600, 200, 600, 200, 600]` |
| **B−** | ⊖ | Diagonal stripes | Sky Blue `#56B4E9` | Bukan boraks – makanan hanya bersifat basa | Not borax – food is only alkaline | `[600]` |

---

## Android Build

The app is built using modern Jetpack Compose, Kotlin, and Gradle:
```bash
gradle assembleDebug
```
To run local JVM Robolectric unit tests:
```bash
gradle :app:testDebugUnitTest
```
