import { describe, it, expect } from 'vitest';
import { evaluateCell, colLetterToIndex, indexToColLetter, expandRange } from '../formulaEngine';

describe('formulaEngine', () => {
  it('converts between column letters and indices', () => {
    expect(colLetterToIndex('A')).toBe(0);
    expect(colLetterToIndex('Z')).toBe(25);
    expect(colLetterToIndex('AA')).toBe(26);

    expect(indexToColLetter(0)).toBe('A');
    expect(indexToColLetter(25)).toBe('Z');
    expect(indexToColLetter(26)).toBe('AA');
  });

  it('expands ranges accurately', () => {
    expect(expandRange('A1:A3')).toEqual(['A1', 'A2', 'A3']);
    expect(expandRange('B2:C3')).toEqual(['B2', 'B3', 'C2', 'C3']);
  });

  it('evaluates basic math formulas', () => {
    const data = {
      A1: 10,
      B1: 20,
      C1: '=A1 + B1',
      D1: '=A1 * 3',
    };

    expect(evaluateCell(data.C1, data)).toBe(30);
    expect(evaluateCell(data.D1, data)).toBe(30);
  });

  it('evaluates SUM, AVERAGE, and COUNT formulas', () => {
    const data = {
      A1: 10,
      A2: 20,
      A3: 30,
      A4: '=SUM(A1:A3)',
      A5: '=AVERAGE(A1:A3)',
      A6: '=COUNT(A1:A3)',
    };

    expect(evaluateCell(data.A4, data)).toBe(60);
    expect(evaluateCell(data.A5, data)).toBe(20);
    expect(evaluateCell(data.A6, data)).toBe(3);
  });

  it('detects circular references cleanly', () => {
    const data = {
      A1: '=B1',
      B1: '=A1',
    };

    expect(evaluateCell(data.A1, data)).toBe('#CIRCULAR!');
  });
});
