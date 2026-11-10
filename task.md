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

- [ ] **Task 3: LocalSheets Engine (Grid, Formulas, XLSX Import/Export)** `[GATE: QA]`
  - **Verify**: `npx vitest run src/modules/sheets/__tests__`
  - **Description**: Integrate spreadsheet engine with formula parser (`SUM`, `AVERAGE`, `VLOOKUP`, `IF`). Implement `.xlsx` and `.csv` import/export via `SheetJS` / `exceljs`.
  - **`[E2E_CONTRACT] (Non-Headless)`**:
    - `Launch`: `npm run dev`
    - `User Journey`: Switch to Sheets tab, enter numbers in A1:A4, enter `=SUM(A1:A4)` in A5, verify calculation, export `.xlsx`.
    - `Observable Done-When`: Formula recalculates reactively; grid smoothly scrolls 5,000 cells at 60fps.

- [ ] **Task 4: LocalPDF Studio (Viewer, Reflow, Annotation & Export)** `[GATE: VISUAL_CRITIC]`
  - **Verify**: `npx vitest run src/modules/pdf/__tests__`
  - **Description**: Implement PDF viewer via `pdfjs-dist` and document manipulator via `pdf-lib`. Enable page reordering, text insertion, highlights, ink signatures, and flattened export.
  - **`[E2E_CONTRACT] (Non-Headless)`**:
    - `Launch`: `npm run dev`
    - `User Journey`: Open sample PDF, add text annotation and highlight, reorder pages, click "Save PDF", verify output matches.
    - `Observable Done-When`: PDF canvas renders crisp vector text at all zoom levels (50% to 300%).

- [ ] **Task 5: Minimalist Shell, Command Palette (Ctrl+K) & Tab Manager**
  - **Verify**: `npm run build && npx vitest run src/components/__tests__`
  - **Description**: Construct unified linear/modern shell: tab management, global `Ctrl+K` command palette, dark/light theme toggle, and keyboard shortcuts.
  - **`[E2E_CONTRACT] (Non-Headless)`**:
    - `Launch`: `npm run dev`
    - `User Journey`: Press `Ctrl+K`, type "New Sheet", press Enter, verify active tab switches to LocalSheets.
    - `Observable Done-When`: Command palette opens smoothly in <100ms; tabs switch with zero layout shifts.

- [ ] **Task 6: Tauri 2.0 Integration & OS File Associations** `[GATE: QA]`
  - **Verify**: `cargo check --manifest-path src-tauri/Cargo.toml`
  - **Description**: Set up Tauri 2.0 Rust backend, `tauri.conf.json`, OS file associations for `.docx`, `.xlsx`, `.pdf`, and CLI file drag-and-drop.
  - **`[E2E_CONTRACT] (Non-Headless)`**:
    - `Launch`: `npx tauri dev`
    - `User Journey`: Native desktop window opens, drop file into window, verify app handles file without browser sandbox dialogs.
    - `Observable Done-When`: Native window spawns in <500ms; memory consumption < 90MB.

- [ ] **Task 7: Desktop Bundler (Windows .msi/.exe, Linux .deb/.AppImage, macOS .dmg)**
  - **Verify**: `npx tauri build --bundles nsis,msi`
  - **Description**: Configure NSIS and WiX installers, desktop icons (ICO, ICNS, PNG), Start menu shortcuts, and uninstaller.
  - **`[E2E_CONTRACT] (Non-Headless)`**:
    - `Launch`: Run generated `LocalOffice_*_x64-setup.exe`
    - `User Journey`: Complete installation wizard, launch from Start Menu, verify app operates properly.
    - `Observable Done-When`: Installs to Program Files, creates shortcuts, cleanly uninstalls.

- [ ] **Task 8: Mobile Bundler (Android .apk/.aab & iOS Xcode Project)**
  - **Verify**: `npx tauri android check`
  - **Description**: Configure Android Manifest intent filters, mobile responsive layouts, bottom sheets, and iOS project templates.
  - **`[E2E_CONTRACT] (Non-Headless)`**:
    - `Launch`: `npx tauri android build --apk`
    - `User Journey`: Install APK on test device/emulator, launch app, open file from mobile storage.
    - `Observable Done-When`: UI responds to touch gestures, virtual keyboard, and safe-area insets.

- [ ] **Task 9: GitHub Actions Matrix CI/CD Multi-OS Pipeline & Initial Release**
  - **Verify**: `git push origin main`
  - **Description**: Create `.github/workflows/release.yml` with multi-OS build matrix for Windows, Linux, macOS, and Android. Commit clean codebase and push to GitHub repository.
