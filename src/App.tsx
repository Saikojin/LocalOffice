import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Table, FileSpreadsheet, Plus, FolderOpen, Sun, Moon,
  ShieldCheck, X, Command
} from 'lucide-react';
import { openLocalFile, OpenedFile, isTauri, getStartupFile } from './core/fs/fileSystemBus';
import { LocalWriter } from './modules/writer/LocalWriter';
import { LocalSheets } from './modules/sheets/LocalSheets';
import { LocalPdfStudio } from './modules/pdf/LocalPdfStudio';
import { CommandPalette, CommandItem } from './components/CommandPalette';

export type ActiveModule = 'writer' | 'sheets' | 'pdf';

export interface OfficeTab {
  id: string;
  title: string;
  module: ActiveModule;
  file?: OpenedFile | null;
}

function getModuleFromFilename(filename: string): ActiveModule {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'csv' || ext === 'xls') return 'sheets';
  if (ext === 'pdf') return 'pdf';
  return 'writer';
}

export function App() {
  const [tabs, setTabs] = useState<OfficeTab[]>([
    { id: '1', title: 'Document 1', module: 'writer' },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('1');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>('Ready');
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const openFileInTab = useCallback((file: OpenedFile, replaceBlankFirstTab: boolean = false) => {
    const mod = getModuleFromFilename(file.name);
    const newTab: OfficeTab = {
      id: Math.random().toString(36).substring(7),
      title: file.name,
      module: mod,
      file,
    };

    setTabs((prev) => {
      if (replaceBlankFirstTab && prev.length === 1 && prev[0].title === 'Document 1' && !prev[0].file) {
        return [newTab];
      }
      return [...prev, newTab];
    });
    setActiveTabId(newTab.id);
    setStatusMessage(`Opened ${file.name}`);
  }, []);

  // Tauri cold start file loading & subsequent single-instance open events
  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | undefined;

    // Check cold-start launch file
    getStartupFile().then((file) => {
      if (file) {
        openFileInTab(file, true);
      }
    });

    // Listen for files opened while app is already running
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<{ name: string; path: string; data: number[]; size: number }>(
        'open-file-payload',
        (event) => {
          const payload = event.payload;
          if (payload && payload.name && payload.data) {
            const uint8 = new Uint8Array(payload.data);
            const opened: OpenedFile = {
              name: payload.name,
              size: payload.size,
              type: 'application/octet-stream',
              lastModified: Date.now(),
              data: uint8.buffer as ArrayBuffer,
            };
            openFileInTab(opened, false);
          }
        }
      ).then((unsub) => {
        unlisten = unsub;
      });
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [openFileInTab]);

  // Global Ctrl+K hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenFile = async () => {
    const file = await openLocalFile();
    if (file) {
      openFileInTab(file, false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (!droppedFiles.length) return;

    for (const file of droppedFiles) {
      const buffer = await file.arrayBuffer();
      const opened: OpenedFile = {
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        lastModified: file.lastModified,
        data: buffer,
      };
      openFileInTab(opened, false);
    }
  };

  const createNewTab = (module: ActiveModule) => {
    const defaultTitle =
      module === 'writer' ? `Document ${tabs.length + 1}` :
      module === 'sheets' ? `Workbook ${tabs.length + 1}` : `PDF Document ${tabs.length + 1}`;

    const newTab: OfficeTab = {
      id: Math.random().toString(36).substring(7),
      title: defaultTitle,
      module,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Keep at least one tab
    const nextTabs = tabs.filter((t) => t.id !== id);
    setTabs(nextTabs);
    if (activeTabId === id) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
  };

  const handleOpenPdfInWriter = (htmlContent: string, title: string) => {
    const newTab: OfficeTab = {
      id: Math.random().toString(36).substring(7),
      title: `${title} (Editable)`,
      module: 'writer',
      file: {
        name: `${title}.html`,
        size: htmlContent.length,
        type: 'text/html',
        lastModified: Date.now(),
        data: new TextEncoder().encode(htmlContent).buffer as ArrayBuffer,
      },
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setStatusMessage(`Extracted ${title} into LocalWriter for editing.`);
  };

  // Commands for the Ctrl+K palette
  const commands: CommandItem[] = [
    {
      id: 'new-writer',
      title: 'New Word Document (.docx)',
      subtitle: 'Create a new rich text document in LocalWriter',
      category: 'Create',
      icon: <FileText className="w-4 h-4" />,
      run: () => createNewTab('writer'),
    },
    {
      id: 'new-sheets',
      title: 'New Spreadsheet (.xlsx)',
      subtitle: 'Create a new reactive spreadsheet in LocalSheets',
      category: 'Create',
      icon: <Table className="w-4 h-4" />,
      run: () => createNewTab('sheets'),
    },
    {
      id: 'new-pdf',
      title: 'New PDF Studio Canvas',
      subtitle: 'Create or load an interactive PDF in LocalPDF Studio',
      category: 'Create',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      run: () => createNewTab('pdf'),
    },
    {
      id: 'open-file',
      title: 'Open Local File...',
      subtitle: 'Open DOCX, XLSX, or PDF directly from your hard drive',
      category: 'Actions',
      icon: <FolderOpen className="w-4 h-4" />,
      shortcut: 'Ctrl+O',
      run: handleOpenFile,
    },
    {
      id: 'toggle-theme',
      title: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      subtitle: 'Toggle between dark and light theme minimalist aesthetic',
      category: 'Settings',
      icon: isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
      run: () => setIsDark(!isDark),
    },
  ];

  return (
    <div
      data-testid="app-root"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`min-h-screen flex flex-col ${isDark ? 'dark bg-stone-950 text-stone-100' : 'bg-stone-50 text-stone-900'}`}
    >
      {/* Top Header Bar */}
      <header className="h-10 border-b border-stone-200 dark:border-stone-800 px-3 flex items-center justify-between select-none bg-white dark:bg-stone-900">
        <div className="flex items-center space-x-3">
          <div data-testid="brand-logo" className="flex items-center space-x-1.5 font-bold tracking-tight text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
            <span>LocalOffice</span>
          </div>

          <div className="h-4 w-px bg-stone-200 dark:bg-stone-800" />

          {/* Document Tabs */}
          <div data-testid="tabs-container" className="flex items-center space-x-1 overflow-x-auto max-w-xl">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab.id;
              return (
                <div
                  key={tab.id}
                  data-testid={`tab-${tab.id}`}
                  data-active={isActive}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs cursor-pointer border transition-colors ${
                    isActive
                      ? 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 font-medium text-stone-900 dark:text-stone-100'
                      : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                  }`}
                >
                  {tab.module === 'writer' && <FileText className="w-3 h-3 text-blue-500" />}
                  {tab.module === 'sheets' && <Table className="w-3 h-3 text-emerald-500" />}
                  {tab.module === 'pdf' && <FileSpreadsheet className="w-3 h-3 text-rose-500" />}
                  <span className="truncate max-w-[120px]">{tab.title}</span>
                  {tabs.length > 1 && (
                    <button
                      data-testid={`tab-close-${tab.id}`}
                      onClick={(e) => closeTab(tab.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-stone-900 dark:hover:text-stone-100 p-0.5 rounded transition-opacity"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              data-testid="btn-new-tab"
              onClick={() => createNewTab(activeTab.module)}
              className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded transition-colors"
              title="New Tab"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center space-x-2 text-xs">
          {/* Command Palette Trigger */}
          <button
            data-testid="btn-command-palette"
            onClick={() => setIsPaletteOpen(true)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
          >
            <Command className="w-3 h-3" />
            <span className="text-[11px]">Command Palette</span>
            <kbd className="text-[9px] font-mono px-1 bg-stone-200 dark:bg-stone-700 rounded text-stone-400">
              Ctrl+K
            </kbd>
          </button>

          <button
            data-testid="btn-open-file"
            onClick={handleOpenFile}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
          >
            <FolderOpen className="w-3 h-3" />
            <span>Open</span>
          </button>

          <div className="h-4 w-px bg-stone-200 dark:bg-stone-800" />

          <button
            data-testid="btn-theme-toggle"
            onClick={() => setIsDark(!isDark)}
            className="p-1 rounded text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
            title="Toggle Dark / Light Theme"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Status sub-bar */}
        <div className="bg-stone-50 dark:bg-stone-900/60 border-b border-stone-200 dark:border-stone-800 px-4 py-1 text-[11px] text-stone-500 flex items-center justify-between select-none">
          <div className="flex items-center space-x-2">
            <span data-testid="status-tab-title" className="font-medium text-stone-700 dark:text-stone-300">{activeTab.title}</span>
            <span data-testid="status-message" className="text-stone-400">({statusMessage})</span>
          </div>
          <div data-testid="zero-cloud-badge" className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-3 h-3" />
            <span>100% Local-First &amp; Zero-Cloud</span>
          </div>
        </div>

        {/* Active Module Canvas */}
        {activeTab.module === 'writer' ? (
          <LocalWriter initialFile={activeTab.file} onSaveStatus={setStatusMessage} />
        ) : activeTab.module === 'sheets' ? (
          <LocalSheets initialFile={activeTab.file} onSaveStatus={setStatusMessage} />
        ) : (
          <LocalPdfStudio
            initialFile={activeTab.file}
            onSaveStatus={setStatusMessage}
            onOpenInWriter={handleOpenPdfInWriter}
          />
        )}
      </main>

      {/* Global Command Palette Modal */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        commands={commands}
      />
    </div>
  );
}

export default App;
