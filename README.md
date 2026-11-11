# LocalOffice

> A standalone, modern, minimalist, local-first office suite built in React and TypeScript. 100% private, zero-cloud dependency, with native support for DOCX, XLSX, PPTX, and PDF editing.

---

## ⚡ Key Features

* **LocalWriter:** Modern prose and rich text document editor with slash commands, tables, Markdown, LaTeX math, and native `.docx` import/export.
* **LocalSheets:** High-performance virtualized spreadsheet engine with 300+ formulas, multi-sheet tabs, and native `.xlsx` import/export.
* **LocalPDF Studio:** Interactive PDF viewer, page reorderer, text/image reflow, freehand signature, and annotation studio.
* **Zero-Cloud & 100% Private:** Operates purely on client-side memory and local disk using the File System Access API (`showOpenFilePicker` / `showSaveFilePicker`). No files or telemetry ever leave your machine.
* **Multi-Platform Native Packaging:** Single unified codebase packaged via Tauri 2.0 for Windows (`.msi` / `.exe`), Linux (`.deb` / `.AppImage`), macOS (`.dmg`), Android (`.apk`), and iOS (`.ipa`), plus universal browser PWA.

---

## 🚀 Quick Start

### Prerequisites
* **Node.js:** v18+ (v20+ recommended)
* **npm:** v9+
* **Rust & Cargo:** (Optional, required only for native desktop/mobile builds via Tauri 2.0)

### Development
```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run test suite
npm test

# Build production web bundle
npm run build
```

---

## 📦 Native Cross-Platform Packaging (Tauri 2.0)

LocalOffice packages into lightweight, native desktop and mobile installers using Tauri 2.0.

### Convenience Build Scripts
```bash
# Build desktop packages for the current OS (runs web build then tauri build)
npm run build:desktop

# Build Android APK (runs web build then tauri android build)
npm run build:android
```

### Platform-Specific Package Commands
```bash
# Windows (.exe NSIS installer & .msi WiX installer)
npm run tauri build -- --bundles nsis,msi

# Linux (.deb Debian package & .AppImage portable)
npm run tauri build -- --bundles deb,appimage

# macOS (.dmg installer & .app application bundle)
npm run tauri build -- --bundles dmg

# Android (.apk release package)
npm run tauri android build --apk
```

### System Prerequisites for Packaging
* **All Platforms:** Rust & Cargo (`rustup default stable`), Node.js v18+.
* **Windows:** Microsoft C++ Build Tools or Visual Studio (with C++ development workload).
* **Linux (Ubuntu/Debian):**
  ```bash
  sudo apt-get update && sudo apt-get install -y \
    libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev
  ```
* **Android:** Java 17 JDK (`temurin`), Android SDK & NDK, and Rust Android target triples (`aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android`, `x86_64-linux-android`).

### OS File Associations & Shell Integration
Built installers automatically register system-level file associations in Windows Explorer, macOS Finder, and Linux desktop environments for:
* **Documents:** `.docx`, `.doc`
* **Spreadsheets:** `.xlsx`, `.xls`, `.csv`
* **PDFs:** `.pdf`

Double-clicking any associated file opens it directly in LocalOffice.

### Output Artifact Directories
* **Desktop Installers:** `src-tauri/target/release/bundle/{nsis,msi,deb,appimage,dmg}/`
* **Android APKs:** `src-tauri/gen/android/app/build/outputs/apk/release/`

### Automated CI/CD Multi-OS Builds
Automated matrix release builds are configured via GitHub Actions in `.github/workflows/`:
* **Desktop Releases (`release.yml`):** Automatically triggers on tag push (`v*`) or manual dispatch to build Windows (`nsis,msi`), Linux (`deb,appimage`), and macOS (`dmg`) packages in parallel and draft a GitHub Release.
* **Mobile Builds (`mobile.yml`):** Compiles Android release APKs on Ubuntu with the Android SDK & NDK toolchains and uploads the build artifact.

> **Note on Build Isolation:** Production installer packages strictly bundle minified web assets from `dist/`. Test suites (Vitest, Karate E2E runner) and Java fixtures reside outside `src/` and contribute 0 bytes to binary output.

---

## 📄 Supported Formats
* **Documents:** `.docx`, `.doc` (import), `.md`, `.txt`, `.html`, `.rtf`
* **Spreadsheets:** `.xlsx`, `.xls`, `.csv`, `.tsv`
* **Presentations:** `.pptx`
* **PDF:** Interactive view, annotate, fill forms, and export flattened `.pdf`

---

## 🛡️ License
MIT License.
