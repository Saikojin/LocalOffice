/**
 * LocalOffice High-Performance Formula Engine
 * 
 * Evaluates Excel-compatible expressions (=SUM, =AVERAGE, =COUNT, =MAX, =MIN, math operators)
 */

export type CellValue = string | number | boolean | null;
export type SheetData = Record<string, CellValue>; // e.g. { "A1": 10, "A2": 20, "A3": "=SUM(A1:A2)" }

/**
 * Converts column letter to 0-based index: 'A' -> 0, 'Z' -> 25, 'AA' -> 26
 */
export function colLetterToIndex(col: string): number {
  let index = 0;
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + (col.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * Converts 0-based index to column letter: 0 -> 'A', 25 -> 'Z', 26 -> 'AA'
 */
export function indexToColLetter(index: number): string {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Parses cell reference like 'A1' into { col: 'A', row: 1 }
 */
export function parseCellRef(ref: string): { col: string; row: number } | null {
  const match = ref.trim().toUpperCase().match(/^([A-Z]+)([1-9][0-9]*)$/);
  if (!match) return null;
  return { col: match[1], row: parseInt(match[2], 10) };
}

/**
 * Expands range reference like 'A1:A4' or 'B2:D3' into array of cell keys ['A1', 'A2', 'A3', 'A4']
 */
export function expandRange(rangeStr: string): string[] {
  const parts = rangeStr.split(':');
  if (parts.length === 1) return [parts[0].trim().toUpperCase()];
  if (parts.length !== 2) return [];

  const start = parseCellRef(parts[0]);
  const end = parseCellRef(parts[1]);
  if (!start || !end) return [];

  const startCol = colLetterToIndex(start.col);
  const endCol = colLetterToIndex(end.col);
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);

  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);

  const result: string[] = [];
  for (let c = minCol; c <= maxCol; c++) {
    const colName = indexToColLetter(c);
    for (let r = minRow; r <= maxRow; r++) {
      result.push(`${colName}${r}`);
    }
  }
  return result;
}

/**
 * Evaluates a single cell value or formula against sheet state
 */
export function evaluateCell(
  raw: CellValue,
  sheetData: SheetData,
  visited: Set<string> = new Set()
): CellValue {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'number' || typeof raw === 'boolean') return raw;
  if (!raw.startsWith('=')) return raw;

  const formula = raw.slice(1).trim();

  // Function calls: =FUNCTION(...)
  const funcMatch = formula.match(/^([A-Z]+)\((.*)\)$/i);
  if (funcMatch) {
    const funcName = funcMatch[1].toUpperCase();
    const argStr = funcMatch[2].trim();
    const cellsToEvaluate = expandRange(argStr);

    const values: number[] = [];
    for (const key of cellsToEvaluate) {
      if (visited.has(key)) return '#CIRCULAR!';
      visited.add(key);
      const val = evaluateCell(sheetData[key], sheetData, new Set(visited));
      visited.delete(key);

      const num = typeof val === 'number' ? val : parseFloat(String(val));
      if (!isNaN(num)) {
        values.push(num);
      }
    }

    switch (funcName) {
      case 'SUM':
        return values.reduce((acc, curr) => acc + curr, 0);
      case 'AVERAGE':
      case 'AVG':
        return values.length > 0 ? values.reduce((acc, curr) => acc + curr, 0) / values.length : 0;
      case 'COUNT':
        return values.length;
      case 'MAX':
        return values.length > 0 ? Math.max(...values) : 0;
      case 'MIN':
        return values.length > 0 ? Math.min(...values) : 0;
      default:
        return `#NAME?`;
    }
  }

  // Arithmetic expression replacement: replace cell refs with values
  try {
    let expr = formula.toUpperCase();
    const cellRefMatches = expr.match(/[A-Z]+[1-9][0-9]*/g) || [];

    for (const cellKey of cellRefMatches) {
      if (visited.has(cellKey)) return '#CIRCULAR!';
      visited.add(cellKey);
      const val = evaluateCell(sheetData[cellKey], sheetData, new Set(visited));
      visited.delete(cellKey);

      if (typeof val === 'string' && val.startsWith('#')) return val;
      const num = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
      expr = expr.replace(new RegExp(`\\b${cellKey}\\b`, 'g'), String(num));
    }

    // Safely evaluate simple math expression containing only numbers and + - * / ( ) .
    if (/^[0-9+\-*/().\s]+$/.test(expr)) {
      // eslint-disable-next-line no-eval
      const result = Function(`"use strict"; return (${expr});`)();
      if (!isFinite(result)) return '#DIV/0!';
      return typeof result === 'number' ? Math.round(result * 100000) / 100000 : result;
    }
  } catch {
    return '#VALUE!';
  }

  return raw;
}
