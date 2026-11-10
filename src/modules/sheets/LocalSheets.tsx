import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Download, Plus, Calculator } from 'lucide-react';
import { SheetData, evaluateCell, indexToColLetter } from './formulaEngine';
import { importFromXlsx, exportToXlsx, exportToCsv } from './xlsxConverter';
import { saveLocalFile, downloadBlob, OpenedFile } from '../../core/fs/fileSystemBus';

interface LocalSheetsProps {
  initialFile?: OpenedFile | null;
  onSaveStatus?: (message: string) => void;
}

const DEFAULT_ROWS = 50;
const DEFAULT_COLS = 26; // A - Z

export const LocalSheets: React.FC<LocalSheetsProps> = ({ initialFile, onSaveStatus }) => {
  const [sheetNames, setSheetNames] = useState<string[]>(['Sheet1']);
  const [activeSheet, setActiveSheet] = useState<string>('Sheet1');
  const [sheetsData, setSheetsData] = useState<Record<string, SheetData>>({
    Sheet1: {
      A1: 'Item',
      B1: 'Quantity',
      C1: 'Unit Price',
      D1: 'Total',
      A2: 'Laptops',
      B2: 5,
      C2: 899,
      D2: '=B2*C2',
      A3: 'Keyboards',
      B3: 15,
      C3: 45,
      D3: '=B3*C3',
      A4: 'Monitors',
      B4: 8,
      C4: 220,
      D4: '=B4*C4',
      A5: 'Grand Total',
      D5: '=SUM(D2:D4)',
    },
  });

  const [selectedCell, setSelectedCell] = useState<string>('A1');
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [docTitle, setDocTitle] = useState<string>('Workbook');
  const formulaInputRef = useRef<HTMLInputElement>(null);

  // Load imported file if present
  useEffect(() => {
    if (!initialFile) return;

    try {
      const ext = initialFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        const { sheets, sheetNames } = importFromXlsx(initialFile.data);
        setSheetsData(sheets);
        setSheetNames(sheetNames);
        setActiveSheet(sheetNames[0] || 'Sheet1');
        setDocTitle(initialFile.name.replace(/\.[^/.]+$/, ''));
        onSaveStatus?.(`Loaded ${initialFile.name}`);
      }
    } catch (err) {
      console.error('Failed to import spreadsheet:', err);
      onSaveStatus?.('Failed to import spreadsheet');
    }
  }, [initialFile, onSaveStatus]);

  // Current sheet data
  const currentSheetData = useMemo(() => {
    return sheetsData[activeSheet] || {};
  }, [sheetsData, activeSheet]);

  // Pre-calculate evaluated cell values for smooth rendering
  const evaluatedSheet = useMemo(() => {
    const evaluated: Record<string, string | number | boolean | null> = {};
    Object.keys(currentSheetData).forEach((key) => {
      evaluated[key] = evaluateCell(currentSheetData[key], currentSheetData);
    });
    return evaluated;
  }, [currentSheetData]);

  const updateCellValue = (cellKey: string, value: string) => {
    setSheetsData((prev) => ({
      ...prev,
      [activeSheet]: {
        ...prev[activeSheet],
        [cellKey]: value.startsWith('=') || isNaN(Number(value)) || value.trim() === '' ? value : Number(value),
      },
    }));
  };

  const handleCellClick = (cellKey: string) => {
    setSelectedCell(cellKey);
    setEditingCell(null);
  };

  const handleCellDoubleClick = (cellKey: string) => {
    setSelectedCell(cellKey);
    setEditingCell(cellKey);
    const rawVal = currentSheetData[cellKey];
    setEditValue(rawVal !== undefined && rawVal !== null ? String(rawVal) : '');
  };

  const handleFormulaCommit = () => {
    if (selectedCell) {
      updateCellValue(selectedCell, editValue);
      setEditingCell(null);
    }
  };

  const handleSaveXlsx = async () => {
    try {
      const bytes = exportToXlsx(sheetsData, sheetNames);
      await saveLocalFile(bytes.buffer as ArrayBuffer, {
        suggestedName: `${docTitle}.xlsx`,
        existingHandle: initialFile?.handle,
      });
      onSaveStatus?.(`Saved ${docTitle}.xlsx`);
    } catch (err) {
      console.error('Save failed:', err);
      onSaveStatus?.('Save failed');
    }
  };

  const handleExportCsv = () => {
    const csvContent = exportToCsv(currentSheetData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    downloadBlob(blob, `${docTitle}_${activeSheet}.csv`);
  };

  const addSheet = () => {
    let nextNum = sheetNames.length + 1;
    let newName = `Sheet${nextNum}`;
    while (sheetNames.includes(newName)) {
      nextNum++;
      newName = `Sheet${nextNum}`;
    }
    setSheetNames([...sheetNames, newName]);
    setSheetsData((prev) => ({ ...prev, [newName]: {} }));
    setActiveSheet(newName);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-stone-900 select-none overflow-hidden">
      {/* Top Action Bar */}
      <div className="h-10 border-b border-stone-200 dark:border-stone-800 px-4 flex items-center justify-between bg-stone-50/50 dark:bg-stone-900/50 text-xs">
        <div className="flex items-center space-x-3">
          <input
            data-testid="sheets-title-input"
            type="text"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="font-medium bg-transparent border-b border-transparent hover:border-stone-300 dark:hover:border-stone-700 focus:border-blue-500 focus:outline-hidden px-1 py-0.5 max-w-[180px]"
            title="Workbook Name"
          />

          <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 mx-1" />

          {/* Quick Functions */}
          <button
            data-testid="btn-autosum"
            onClick={() => {
              updateCellValue(selectedCell, `=SUM(A1:${selectedCell})`);
            }}
            className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
            title="Insert AutoSum formula"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>AutoSum</span>
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center space-x-2">
          <button
            data-testid="btn-save-xlsx"
            onClick={handleSaveXlsx}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
            title="Save as Excel Workbook (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save .xlsx</span>
          </button>

          <button
            data-testid="btn-export-csv"
            onClick={handleExportCsv}
            className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
            title="Export Active Sheet as CSV"
          >
            .csv
          </button>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="h-8 border-b border-stone-200 dark:border-stone-800 px-3 flex items-center space-x-2 bg-white dark:bg-stone-900 text-xs">
        {/* Active Cell Reference badge */}
        <div data-testid="sheets-active-cell" className="w-14 font-mono font-medium text-center py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
          {selectedCell}
        </div>

        <span className="text-stone-400 font-serif italic text-sm">fx</span>

        {/* Formula Input */}
        <input
          ref={formulaInputRef}
          data-testid="sheets-formula-input"
          type="text"
          value={editingCell === selectedCell ? editValue : currentSheetData[selectedCell] !== undefined ? String(currentSheetData[selectedCell]) : ''}
          onChange={(e) => {
            setEditValue(e.target.value);
            setEditingCell(selectedCell);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleFormulaCommit();
            }
          }}
          placeholder="Enter value or formula (e.g. =SUM(B2:B10))"
          className="flex-1 bg-transparent px-2 py-1 focus:outline-hidden font-mono text-xs text-stone-800 dark:text-stone-200"
        />
      </div>

      {/* Spreadsheet Grid Viewport */}
      <div data-testid="sheets-grid-viewport" className="flex-1 overflow-auto relative">
        <table className="border-collapse table-fixed text-xs font-mono">
          <thead>
            <tr className="bg-stone-100 dark:bg-stone-800/90 sticky top-0 z-20">
              <th className="w-10 h-6 border-b border-r border-stone-300 dark:border-stone-700 text-stone-400 font-normal sticky left-0 z-30 bg-stone-100 dark:bg-stone-800"></th>
              {Array.from({ length: DEFAULT_COLS }).map((_, c) => {
                const colLetter = indexToColLetter(c);
                return (
                  <th
                    key={colLetter}
                    className="w-24 h-6 border-b border-r border-stone-300 dark:border-stone-700 font-medium text-stone-600 dark:text-stone-400 text-center select-none"
                  >
                    {colLetter}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: DEFAULT_ROWS }).map((_, r) => {
              const rowNum = r + 1;
              return (
                <tr key={rowNum} className="hover:bg-blue-50/20 dark:hover:bg-blue-900/10">
                  {/* Row Header */}
                  <td className="w-10 h-6 border-b border-r border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800/90 text-stone-500 font-normal text-center sticky left-0 z-10 select-none">
                    {rowNum}
                  </td>

                  {/* Cells */}
                  {Array.from({ length: DEFAULT_COLS }).map((_, c) => {
                    const colLetter = indexToColLetter(c);
                    const cellKey = `${colLetter}${rowNum}`;
                    const isSelected = selectedCell === cellKey;
                    const isEditing = editingCell === cellKey;
                    const displayValue = evaluatedSheet[cellKey];

                    return (
                      <td
                        key={cellKey}
                        data-testid={`cell-${cellKey}`}
                        onClick={() => handleCellClick(cellKey)}
                        onDoubleClick={() => handleCellDoubleClick(cellKey)}
                        className={`w-24 h-6 px-1.5 border-b border-r border-stone-200 dark:border-stone-800 truncate text-left relative cursor-cell ${
                          isSelected ? 'outline-2 outline-blue-500 outline-offset-[-2px] z-10 bg-blue-50/40 dark:bg-blue-950/40' : ''
                        }`}
                      >
                        {isEditing ? (
                          <input
                            data-testid="cell-edit-input"
                            type="text"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleFormulaCommit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleFormulaCommit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="w-full h-full bg-white dark:bg-stone-900 focus:outline-hidden font-mono text-xs px-0.5"
                          />
                        ) : (
                          <span className={typeof displayValue === 'number' ? 'text-right block w-full text-blue-600 dark:text-blue-400' : ''}>
                            {displayValue !== undefined && displayValue !== null ? String(displayValue) : ''}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sheet Tabs Bar (Bottom) */}
      <footer className="h-8 border-t border-stone-200 dark:border-stone-800 px-2 flex items-center space-x-1 bg-stone-100 dark:bg-stone-900 text-xs select-none">
        <div data-testid="sheet-tabs-container" className="flex items-center space-x-1 overflow-x-auto">
          {sheetNames.map((name) => (
            <button
              key={name}
              data-testid={`sheet-tab-${name}`}
              onClick={() => setActiveSheet(name)}
              className={`px-3 py-1 rounded-t border-t border-x transition-colors ${
                activeSheet === name
                  ? 'bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 font-medium text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        <button
          data-testid="btn-add-sheet"
          onClick={addSheet}
          className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
          title="Add New Sheet"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1" />

        <div className="text-[11px] text-stone-400 pr-2">
          <span>LocalSheets • Excel Compatible</span>
        </div>
      </footer>
    </div>
  );
};
