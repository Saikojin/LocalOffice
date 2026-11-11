import * as XLSX from 'xlsx';
import { SheetData, parseCellRef, evaluateCell } from './formulaEngine';

/**
 * Imports an XLSX / XLS / CSV ArrayBuffer into LocalOffice sheet data
 */
export function importFromXlsx(buffer: ArrayBuffer): {
  sheets: Record<string, SheetData>;
  sheetNames: string[];
} {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheets: Record<string, SheetData> = {};

  workbook.SheetNames.forEach((name) => {
    const ws = workbook.Sheets[name];
    const data: SheetData = {};

    Object.keys(ws).forEach((key) => {
      if (key.startsWith('!')) return; // Ignore sheet metadata like !ref
      const cell = ws[key];
      // If cell has formula, preserve formula
      if (cell.f) {
        data[key] = `=${cell.f}`;
      } else {
        data[key] = cell.v ?? '';
      }
    });

    sheets[name] = data;
  });

  return {
    sheets,
    sheetNames: workbook.SheetNames.length > 0 ? workbook.SheetNames : ['Sheet1'],
  };
}

/**
 * Exports LocalOffice sheet data into an XLSX binary array
 */
export function exportToXlsx(
  sheets: Record<string, SheetData>,
  sheetNames: string[]
): Uint8Array {
  const workbook = XLSX.utils.book_new();

  sheetNames.forEach((name) => {
    const rawData = sheets[name] || {};
    const ws: XLSX.WorkSheet = {};
    let maxRow = 1;
    let maxCol = 1;

    Object.entries(rawData).forEach(([key, val]) => {
      const parsed = parseCellRef(key);
      if (!parsed) return;

      if (parsed.row > maxRow) maxRow = parsed.row;
      let colIdx = 0;
      for (let i = 0; i < parsed.col.length; i++) {
        colIdx = colIdx * 26 + (parsed.col.charCodeAt(i) - 64);
      }
      if (colIdx > maxCol) maxCol = colIdx;

      // Evaluate formula value for export
      const calculatedVal = evaluateCell(val, rawData);
      const isNum = typeof calculatedVal === 'number';

      ws[key] = {
        t: isNum ? 'n' : 's',
        v: isNum ? calculatedVal : String(calculatedVal ?? ''),
        f: typeof val === 'string' && val.startsWith('=') ? val.slice(1) : undefined,
      };
    });

    ws['!ref'] = `A1:${XLSX.utils.encode_cell({ r: Math.max(maxRow, 10), c: Math.max(maxCol, 10) })}`;
    XLSX.utils.book_append_sheet(workbook, ws, name);
  });

  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(output);
}

/**
 * Exports a single sheet to CSV string
 */
export function exportToCsv(sheetData: SheetData): string {
  let maxRow = 1;
  let maxColIndex = 0;

  Object.keys(sheetData).forEach((key) => {
    const parsed = parseCellRef(key);
    if (!parsed) return;
    if (parsed.row > maxRow) maxRow = parsed.row;
    let colIdx = 0;
    for (let i = 0; i < parsed.col.length; i++) {
      colIdx = colIdx * 26 + (parsed.col.charCodeAt(i) - 64);
    }
    if (colIdx > maxColIndex) maxColIndex = colIdx;
  });

  const rows: string[][] = [];
  for (let r = 1; r <= Math.max(maxRow, 1); r++) {
    const row: string[] = [];
    for (let c = 0; c < Math.max(maxColIndex, 1); c++) {
      let colLetter = '';
      let temp = c;
      while (temp >= 0) {
        colLetter = String.fromCharCode((temp % 26) + 65) + colLetter;
        temp = Math.floor(temp / 26) - 1;
      }
      const val = evaluateCell(sheetData[`${colLetter}${r}`], sheetData);
      const strVal = String(val ?? '').replace(/"/g, '""');
      row.push(`"${strVal}"`);
    }
    rows.push(row);
  }

  return rows.map((r) => r.join(',')).join('\n');
}
