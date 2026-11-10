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

```bash
# Windows (.exe & .msi)
npm run tauri build -- --bundles nsis,msi

# Linux (.deb & .AppImage)
npm run tauri build -- --bundles deb,appimage

# macOS (.dmg & .app)
npm run tauri build -- --bundles dmg

# Android (.apk)
npm run tauri android build --apk
```

---

## 📄 Supported Formats
* **Documents:** `.docx`, `.doc` (import), `.md`, `.txt`, `.html`, `.rtf`
* **Spreadsheets:** `.xlsx`, `.xls`, `.csv`, `.tsv`
* **Presentations:** `.pptx`
* **PDF:** Interactive view, annotate, fill forms, and export flattened `.pdf`

---

## 🛡️ License
MIT License.
