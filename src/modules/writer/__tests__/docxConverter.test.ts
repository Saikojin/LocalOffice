import { describe, it, expect } from 'vitest';
import { exportToDocx, importFromDocx } from '../docxConverter';

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

describe('docxConverter', () => {
  it('exports simple HTML to a valid DOCX Blob', async () => {
    const html = '<h1>Hello World</h1><p>This is a <strong>test</strong> document.</p>';
    const blob = await exportToDocx(html, 'TestDoc');

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });

  it('exports and roundtrips horizontal rules (<hr>) cleanly', async () => {
    const html = '<p>Paragraph 1</p><hr><p>Paragraph 2</p>';
    const blob = await exportToDocx(html, 'HrTest');
    const arrayBuffer = await blobToArrayBuffer(blob);

    const roundtripHtml = await importFromDocx(arrayBuffer);
    expect(roundtripHtml).toContain('<hr');
    expect(roundtripHtml).toContain('Paragraph 1');
    expect(roundtripHtml).toContain('Paragraph 2');
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
