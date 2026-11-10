import { describe, it, expect } from 'vitest';
import { exportToDocx } from '../docxConverter';

describe('docxConverter', () => {
  it('exports simple HTML to a valid DOCX Blob', async () => {
    const html = '<h1>Hello World</h1><p>This is a <strong>test</strong> document.</p>';
    const blob = await exportToDocx(html, 'TestDoc');

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });

  it('exports tables and lists to DOCX Blob', async () => {
    const html = `
      <h2>Table Test</h2>
      <table>
        <tr><th>Header 1</th><th>Header 2</th></tr>
        <tr><td>Data 1</td><td>Data 2</td></tr>
      </table>
      <ul>
        <li>Item A</li>
        <li>Item B</li>
      </ul>
    `;
    const blob = await exportToDocx(html, 'ComplexDoc');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(100);
  });
});
