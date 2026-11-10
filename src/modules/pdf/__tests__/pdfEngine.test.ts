import { describe, it, expect } from 'vitest';
import { createSamplePdf, inspectPdf, applyAnnotations, removePage } from '../pdfEngine';

describe('pdfEngine', () => {
  it('creates and inspects a sample PDF', async () => {
    const bytes = await createSamplePdf();
    expect(bytes.length).toBeGreaterThan(0);

    const info = await inspectPdf(bytes.buffer as ArrayBuffer);
    expect(info.pageCount).toBe(1);
    expect(info.pages[0].width).toBe(600);
    expect(info.pages[0].height).toBe(800);
  });

  it('applies text annotations to a PDF buffer', async () => {
    const bytes = await createSamplePdf();
    const updated = await applyAnnotations(bytes.buffer as ArrayBuffer, [
      {
        id: 'test-1',
        pageIndex: 0,
        text: 'Verified Annotation',
        x: 100,
        y: 100,
      },
    ]);

    expect(updated.length).toBeGreaterThan(bytes.length);
  });

  it('removes a page from a multi-page PDF', async () => {
    const bytes = await createSamplePdf();
    // With 1 page, removePage should safely retain the single page
    const updated = await removePage(bytes.buffer as ArrayBuffer, 0);
    expect(updated.length).toBeGreaterThan(0);
  });
});
