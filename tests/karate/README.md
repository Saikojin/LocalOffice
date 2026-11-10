# LocalOffice Karate E2E Automation Framework

This directory houses the complete **Karate End-to-End (E2E) Test Suite** for **LocalOffice**. It drives full browser automation across the entire office suite using Chrome DevTools Protocol (CDP) and headless Chromium/Chrome.

---

## 🛡️ Build Isolation Guarantee (Installer Exclusion)

This framework is strictly isolated from the production compilation pipeline:
- **Location**: `tests/karate/` lives completely outside `src/`.
- **TypeScript (`tsconfig.json`)**: Configured with `"include": ["src"]`, completely ignoring `tests/`.
- **Vite Bundler (`vite.config.ts`)**: Roots solely at `src/main.tsx` and compiles into `dist/`. The watcher ignores `**/target/**` and `**/tests/**`.
- **Tauri Native Bundler (`src-tauri/tauri.conf.json`)**: Configured with `"frontendDist": "../dist"`. Only compiled web assets in `dist/` are packaged into the native desktop installers (Windows `.msi`/`.exe`, macOS `.dmg`/`.app`, Linux `.deb`/`.AppImage`, and Android `.apk`).
- **Zero Bytes of Test Code**: Running `npm run build` generates 0 bytes of test code, Java dependencies, or feature specifications in `dist/`.

---

## 📁 Framework Structure

```
tests/karate/
├── pom.xml                               # Maven build configuration for Karate JUnit5
├── README.md                             # Test framework architecture & runbook
├── run-karate.ps1                        # PowerShell runner (auto-manages dev server lifecycle)
├── run-karate.bat                        # Windows CMD wrapper
└── src/test/java/
    ├── LocalOfficeTest.java              # JUnit5 Karate runner
    ├── karate-config.js                  # Browser, viewport, and environment config
    ├── logback-test.xml                  # Clean test console logging
    └── features/
        ├── smoke.feature                 # App shell mounting & local-first zero-cloud checks
        ├── writer.feature                # LocalWriter rich text, tables, divider, export tests
        ├── sheets.feature                # LocalSheets grid, reactive formula recalculation, sheets tabs
        ├── pdf.feature                   # LocalPDF Studio vector rendering, annotations, whiteout, reflow
        └── shell.feature                 # Tabs manager, global Command Palette (Ctrl+K), theme toggle
```

---

## 🚀 How to Run the Tests

### Option 1: Via npm Scripts (Recommended)

The automated npm scripts automatically detect whether the local Vite dev server is running on port 3000. If it is not running, the script spawns a background Vite server, runs the tests, and cleanly shuts it down upon completion.

```bash
# Run the entire test suite (all modules)
npm run test:karate

# Run specific module test suites:
npm run test:karate:writer   # LocalWriter tests only
npm run test:karate:sheets   # LocalSheets tests only
npm run test:karate:pdf      # LocalPDF Studio tests only
npm run test:karate:shell    # Shell & Command Palette tests only
```

### Option 2: Via Maven directly

If you already have `npm run dev` running in a separate terminal:

```bash
mvn test -f tests/karate/pom.xml
```

To run a specific module:
```bash
mvn test -f tests/karate/pom.xml -Dtest=LocalOfficeTest#testWriter
mvn test -f tests/karate/pom.xml -Dtest=LocalOfficeTest#testSheets
mvn test -f tests/karate/pom.xml -Dtest=LocalOfficeTest#testPdf
mvn test -f tests/karate/pom.xml -Dtest=LocalOfficeTest#testShell
```

### Option 3: Via CLI scripts

On Windows CMD or PowerShell:
```cmd
tests\karate\run-karate.bat
```

---

## 📊 Viewing HTML Execution Reports

Upon test completion, Karate generates detailed HTML execution reports with step-by-step timings and interactive failure analysis:

Open in any browser:
```
tests/karate/target/karate-reports/karate-summary.html
```
