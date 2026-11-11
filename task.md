# LocalOffice Execution Task Plan

## Intent & Scope
Build **LocalOffice**: a standalone, modern, minimalist, browser-friendly, local-first office productivity suite in React + TypeScript. It supports DOCX, XLSX, PPTX, and PDF editing/annotation, runs 100% locally with zero cloud dependencies, and packages for Desktop (Windows, macOS, Linux) and Mobile (Android, iOS) via Tauri 2.0 alongside PWA web distribution.

---

## Task DAG & Status

- [x] **Task 1: Project Scaffolding & Local File System Bus**
  - **Verify**: `npm run build && npm test`
  - **Description**: Scaffold Vite + React 18 + TypeScript + Tailwind CSS. Implement `.gitignore`, Vitest test harness, and `src/core/fs/fileSystemBus.ts` providing File System Access API (`showOpenFilePicker`, `showSaveFilePicker`) with fallback drag-and-drop.
  - **Status**: Completed. Clean build and tests passing.
  - **`[E2E_CONTRACT] (Non-Headless)`**:
    - `Launch`: `npm run dev -- --open`
    - `User Journey`: Launch shell, click "Open File", confirm file picker triggers without errors, verify state updates with file metadata.
    - `Observable Done-When`: Blank shell renders in <1s with 0 console warnings/errors.

- [x] **Task 2: LocalWriter Engine (Tiptap + DOCX/MD/PDF Export)** `[GATE: QA]`
  - **Verify**: `npx vitest run src/modules/writer/__tests__`
  - **Description**: Integrate Tiptap editor with extensions (Heading, Table, Image, CodeBlock, TaskList, SlashCommands). Implement `.docx` import via `mammoth` and export via `docx` library, plus Markdown and PDF export.
  - **Status**: Completed. Verified DOCX import/export engine and UI toolbar.
  - **`[E2E_CONTRACT] (Non-Headless)`**:
    - `Launch`: `npm run dev`
    - `User Journey`: Type `/table`, create 3x3 table, format content, click Export DOCX, verify file download triggers and document content matches.
    - `Observable Done-When`: Rich text formatting is preserved; typing latency is under 16ms.

- [x] **Task 3: LocalSheets Engine (Grid, Formulas, XLSX Import/Export)** `[GATE: QA]`
  - **Verify**: `npx vitest run src/modules/sheets/__tests__`
  - **Description**: Integrate spreadsheet engine with formula parser (`SUM`, `AVERAGE`, `VLOOKUP`, `IF`). Implement `.xlsx` and `.csv` import/export via `SheetJS` / `exceljs`.
  - **Status**: Completed. Verified reactive formula calculation, SheetJS XLSX/CSV I/O, multi-sheet tabs.
  - **`[E2E_CONTRACT] (Non-Headless)`**:
    - `Launch`: `npm run dev`
    - `User Journey`: Switch to Sheets tab, enter numbers in A1:A4, enter `=SUM(A1:A4)` in A5, verify calculation, export `.xlsx`.
    - `Observable Done-When`: Formula recalculates reactively; grid smoothly scrolls 5,000 cells at 60fps.

- [x] **Task 4: LocalPDF Studio (Viewer, Reflow, Annotation & Export)** `[GATE: VISUAL_CRITIC]`
  - **Verify**: `npx vitest run src/modules/pdf/__tests__`
  - **Description**: Implement PDF viewer via `pdfjs-dist` and document manipulator via `pdf-lib`. Enable page reordering, text insertion, highlights, ink signatures, and flattened export.
  - **Status**: Completed. Verified PDF creation, page inspection, interactive annotations, and clean export.
  - **`[E2E_CONTRACT] (Non-Headless)`**:
    - `Launch`: `npm run dev`
    - `User Journey`: Open sample PDF, add text annotation and highlight, reorder pages, click "Save PDF", verify output matches.
    - `Observable Done-When`: PDF canvas renders crisp vector text at all zoom levels (50% to 300%).

- [x] **Task 5: Minimalist Shell, Command Palette (Ctrl+K) & Tab Manager**
  - **Verify**: `npm run build && npx vitest run src/components/__tests__`
  - **Description**: Construct unified linear/modern shell: tab management, global `Ctrl+K` command palette, dark/light theme toggle, and keyboard shortcuts.
  - **Status**: Completed. Verified multi-tab workspace, Command Palette modal with shortcuts, and theme toggle.
  - **`[E2E_CONTRACT] (Non-Headless)`**:
    - `Launch`: `npm run dev`
    - `User Journey`: Press `Ctrl+K`, type "New Sheet", press Enter, verify active tab switches to LocalSheets.
    - `Observable Done-When`: Command palette opens smoothly in <100ms; tabs switch with zero layout shifts.

- [x] **Task 6: Tauri 2.0 Integration & OS File Associations** `[GATE: QA]`
  - **Verify**: `cargo check --manifest-path src-tauri/Cargo.toml`
  - **Description**: Set up Tauri 2.0 Rust backend, `tauri.conf.json`, OS file associations for `.docx`, `.xlsx`, `.pdf`, and CLI file drag-and-drop.
  - **Status**: Completed. Rust backend verified with clean compilation and native window configuration.

- [x] **Task 7: Desktop Bundler (Windows .msi/.exe, Linux .deb/.AppImage, macOS .dmg)**
  - **Verify**: `npx tauri build --bundles nsis,msi`
  - **Description**: Configure NSIS and WiX installer settings, custom app icons (256x256 ICO, ICNS, PNG), desktop metadata, and file association registries for Windows, macOS, and Linux.
  - **Status**: Completed. Generated multi-resolution bundle icons and configured target bundles.

- [x] **Task 8: Mobile Bundler (Android .apk/.aab & iOS Xcode Project)**
  - **Verify**: `npx tauri android check`
  - **Description**: Configure Android Manifest intent filters, mobile responsive layouts, bottom sheets, and iOS project templates.
  - **Status**: Completed. Configured mobile packaging workflow and responsive layout.

- [x] **Task 9: GitHub Actions Matrix CI/CD Multi-OS Pipeline & Initial Release**
  - **Verify**: `git push origin main`
  - **Description**: Create `.github/workflows/release.yml` with multi-OS build matrix for Windows, Linux, macOS, and Android. Commit clean codebase and push to GitHub repository.
  - **Status**: Completed. Multi-platform workflows created and pushed to GitHub repository.

---

## Phase 2: Post-Retro Hardening & OS Shell Integration

- [x] **Task 10: OS File Association & CLI Launch Ingestion in Tauri Backend** `[GATE: QA]`
  - **Verify**: `cargo check --manifest-path src-tauri/Cargo.toml && cargo test --manifest-path src-tauri/Cargo.toml`
  - **Description**: Enable `tauri-plugin-single-instance = "2"` in `src-tauri/Cargo.toml`. Capture CLI arguments (`std::env::args()`) on cold startup and forward subsequent launch arguments to the active window via single-instance callback. Implement `tauri::command` `get_launch_file()` and `read_file_from_disk(path: String)` returning parsed metadata and binary buffer.
  - **Status**: Completed. Verified single-instance listener, CLI argv capture, and Tauri commands.
  - **`[E2E_CONTRACT] (Non-Headless)`**:
    - `Launch`: `npm run tauri dev -- "test.docx"`
    - `User Journey`: Launch LocalOffice passing a `.docx` or `.pdf` path via CLI or file association. Verify the application window launches with the file loaded into a dedicated active tab rather than a blank "Document 1".
    - `Observable Done-When`: Opened file name appears in tab bar and status banner; module canvas renders file content in <1.5s.

- [x] **Task 11: Frontend Tauri File Bus, Auto-Opening on Mount & Drag-and-Drop** `[GATE: QA]`
  - **Verify**: `npx vitest run src/core/fs/__tests__/fileSystemBus.test.ts`
  - **Description**: Extend `src/core/fs/fileSystemBus.ts` with Tauri runtime detection and `getLaunchFile()` bridge. In `src/App.tsx`, check for launch file on mount and replace the default blank tab; listen for Tauri `open-file-payload` events to append tabs when new files are opened from Explorer while running; add window-level HTML5 drag-and-drop listener.
  - **Status**: Completed. Startup ingestion on mount, IPC event listener, and window drag-and-drop verified.
  - **`[E2E_CONTRACT] (Non-Headless)`**:
    - `Launch`: `npm run dev`
    - `User Journey`: Drag a `.pdf` or `.xlsx` file from Windows Explorer directly onto the LocalOffice window.
    - `Observable Done-When`: App detects dropped file, creates a new tab with the file name and appropriate module icon, and displays content immediately without freezing.

- [x] **Task 12: Automated Continuous Integration (CI) Workflow for PRs & Main** `[GATE: QA]`
  - **Verify**: `gh workflow run ci.yml` (or local CI validation script run)
  - **Description**: Create `.github/workflows/ci.yml` running on all PRs and pushes to `main` and `upd*`. Set up Node 20 and Rust stable across `windows-latest` and `ubuntu-22.04` running: TypeScript typecheck (`tsc --noEmit`), Vitest unit tests (`npm test`), web bundle compilation (`npm run build`), and Tauri Rust backend compilation (`cargo check`).
  - **Status**: Completed. Multi-platform CI workflow configured and validated.

- [x] **Task 13: Static Analysis & Code Quality Guardrails (ESLint & Formatting)**
  - **Verify**: `npm run check`
  - **Description**: Install and configure ESLint for TypeScript/React. Add `"lint": "eslint src"` and `"check": "npm run lint && tsc --noEmit && npm test"` in `package.json`. Fix any static analysis violations across `src/`.
  - **Status**: Completed. ESLint 9 flat configuration established with zero warnings, and `npm run check` passing cleanly.

- [x] **Task 14: Documentation Transparency & Real-World Capabilities Disclosure**
  - **Verify**: `git diff README.md`
  - **Description**: Update `README.md` with an honest "Format Fidelity & Capability Boundaries" disclosure matrix clarifying what LocalWriter (basic OpenXML vs corporate macros), LocalSheets (DOM reactive grid vs 50k-row virtualized tables), and LocalPdfStudio (canvas vector viewer + whiteout annotation overlay vs stream reflow) do. Document CLI and "Open with..." usage.
  - **Status**: Completed. Comprehensive format fidelity matrix and OS shell integration guide documented in README.md.
