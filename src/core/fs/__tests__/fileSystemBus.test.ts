import { describe, it, expect, vi } from 'vitest';
import { OFFICE_FILE_FILTERS, isFSApiSupported, downloadBlob } from '../fileSystemBus';

describe('fileSystemBus', () => {
  it('defines correct MIME types for office formats', () => {
    expect(OFFICE_FILE_FILTERS.docx.accept['application/vnd.openxmlformats-officedocument.wordprocessingml.document']).toContain('.docx');
    expect(OFFICE_FILE_FILTERS.xlsx.accept['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']).toContain('.xlsx');
    expect(OFFICE_FILE_FILTERS.pdf.accept['application/pdf']).toContain('.pdf');
  });

  it('correctly detects FSApi support in standard jsdom', () => {
    expect(typeof isFSApiSupported()).toBe('boolean');
  });

  it('triggers downloadBlob via DOM without throwing', () => {
    const fakeAnchor = document.createElement('a');
    const clickSpy = vi.spyOn(fakeAnchor, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValue(fakeAnchor);
    const blob = new Blob(['test content'], { type: 'text/plain' });
    
    // Mock URL.createObjectURL and revokeObjectURL
    const originalCreate = window.URL.createObjectURL;
    const originalRevoke = window.URL.revokeObjectURL;
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
    window.URL.revokeObjectURL = vi.fn();

    downloadBlob(blob, 'test.txt');

    expect(clickSpy).toHaveBeenCalled();

    window.URL.createObjectURL = originalCreate;
    window.URL.revokeObjectURL = originalRevoke;
    vi.restoreAllMocks();
  });
});
