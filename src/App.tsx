import { useState } from 'react';
import { FileText, Table, FileSpreadsheet, Plus, FolderOpen, Sun, Moon, ShieldCheck } from 'lucide-react';
import { openLocalFile, OpenedFile } from './core/fs/fileSystemBus';
import { LocalWriter } from './modules/writer/LocalWriter';
import { LocalSheets } from './modules/sheets/LocalSheets';

export type ActiveModule = 'writer' | 'sheets' | 'pdf';

export function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('writer');
  const [activeFile, setActiveFile] = useState<OpenedFile | null>(null);
  const [isDark, setIsDark] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>('Ready');

  const handleOpenFile = async () => {
    const file = await openLocalFile();
    if (file) {
      setActiveFile(file);
      // Auto-detect module from extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'csv' || ext === 'xls') {
        setActiveModule('sheets');
      } else if (ext === 'pdf') {
        setActiveModule('pdf');
      } else {
        setActiveModule('writer');
      }
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'dark bg-stone-950 text-stone-100' : 'bg-stone-50 text-stone-900'}`}>
      {/* Top Bar / Navigation */}
      <header className="h-12 border-b border-stone-200 dark:border-stone-800 px-4 flex items-center justify-between select-none">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-bold tracking-tight text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
            <span>LocalOffice</span>
          </div>

          <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 mx-2" />

          {/* Module Switcher */}
          <nav className="flex items-center space-x-1 text-xs">
            <button
              onClick={() => setActiveModule('writer')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-colors ${
                activeModule === 'writer'
                  ? 'bg-stone-200 dark:bg-stone-800 font-medium text-stone-900 dark:text-stone-100'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Writer (Word/DOCX)</span>
            </button>

            <button
              onClick={() => setActiveModule('sheets')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-colors ${
                activeModule === 'sheets'
                  ? 'bg-stone-200 dark:bg-stone-800 font-medium text-stone-900 dark:text-stone-100'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Sheets (Excel/XLSX)</span>
            </button>

            <button
              onClick={() => setActiveModule('pdf')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-colors ${
                activeModule === 'pdf'
                  ? 'bg-stone-200 dark:bg-stone-800 font-medium text-stone-900 dark:text-stone-100'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>PDF Studio</span>
            </button>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={handleOpenFile}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open File</span>
          </button>

          <button
            onClick={() => setActiveFile(null)}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Document</span>
          </button>

          <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 mx-1" />

          <button
            onClick={() => setIsDark(!isDark)}
            className="p-1.5 rounded-md text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Status banner */}
        <div className="bg-stone-100 dark:bg-stone-900/50 border-b border-stone-200 dark:border-stone-800/80 px-4 py-1.5 text-xs text-stone-500 flex items-center justify-between select-none">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-stone-700 dark:text-stone-300">
              {activeFile ? activeFile.name : 'Untitled Document'}
            </span>
            {activeFile && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800">
                {(activeFile.size / 1024).toFixed(1)} KB
              </span>
            )}
            <span className="text-[11px] text-stone-400">({statusMessage})</span>
          </div>
          <div className="flex items-center space-x-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3 h-3" />
            <span>100% Local-First &amp; Private</span>
          </div>
        </div>

        {/* Active Module Canvas */}
        {activeModule === 'writer' ? (
          <LocalWriter initialFile={activeFile} onSaveStatus={setStatusMessage} />
        ) : activeModule === 'sheets' ? (
          <LocalSheets initialFile={activeFile} onSaveStatus={setStatusMessage} />
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold capitalize">LocalPDF Studio</h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                  Ready for component activation.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
