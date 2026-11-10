/**
 * LocalOffice Unified File System Bus
 * 
 * Provides local-first, zero-cloud file I/O using the modern File System Access API
 * (showOpenFilePicker / showSaveFilePicker) with automatic fallback to standard input/download.
 */

export interface FileFilterType {
  description: string;
  accept: Record<string, string[]>;
}

export interface OpenedFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  data: ArrayBuffer;
  handle?: FileSystemFileHandle;
}

export const OFFICE_FILE_FILTERS: Record<string, FileFilterType> = {
  allOffice: {
    description: 'All Supported Office Files (*.docx, *.xlsx, *.pptx, *.pdf, *.md)',
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/pdf': ['.pdf'],
      'text/markdown': ['.md'],
      'text/plain': ['.txt'],
    },
  },
  docx: {
    description: 'Word Document (*.docx)',
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  },
  xlsx: {
    description: 'Excel Spreadsheet (*.xlsx)',
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
  },
  pdf: {
    description: 'PDF Document (*.pdf)',
    accept: {
      'application/pdf': ['.pdf'],
    },
  },
  markdown: {
    description: 'Markdown Document (*.md)',
    accept: {
      'text/markdown': ['.md', '.markdown'],
    },
  },
};

/**
 * Checks if File System Access API is supported in the current runtime
 */
export function isFSApiSupported(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

/**
 * Opens a local file using the File System Access API or input fallback
 */
export async function openLocalFile(
  filters: FileFilterType[] = [OFFICE_FILE_FILTERS.allOffice]
): Promise<OpenedFile | null> {
  if (isFSApiSupported()) {
    try {
      const handles = await (window as unknown as {
        showOpenFilePicker: (options: { types: FileFilterType[]; multiple: boolean }) => Promise<FileSystemFileHandle[]>;
      }).showOpenFilePicker({
        types: filters,
        multiple: false,
      });

      if (!handles || handles.length === 0) return null;
      const handle = handles[0];
      const file = await handle.getFile();
      const buffer = await file.arrayBuffer();

      return {
        name: file.name,
        size: file.size,
        type: file.type || getMimeFromExtension(file.name),
        lastModified: file.lastModified,
        data: buffer,
        handle,
      };
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return null; // User cancelled picker
      }
      console.warn('FSApi failed, falling back to input element:', err);
    }
  }

  // Fallback for non-supporting browsers
  return openViaFileInput(filters);
}

/**
 * Saves data back to the existing file handle or triggers Save As
 */
export async function saveLocalFile(
  data: Blob | ArrayBuffer | Uint8Array | string,
  options: {
    suggestedName?: string;
    filters?: FileFilterType[];
    existingHandle?: FileSystemFileHandle;
  } = {}
): Promise<{ success: boolean; handle?: FileSystemFileHandle; name: string }> {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart]);
  const suggestedName = options.suggestedName || 'document.docx';

  if (options.existingHandle && isFSApiSupported()) {
    try {
      const writable = await (options.existingHandle as unknown as {
        createWritable: () => Promise<FileSystemWritableFileStream>;
      }).createWritable();
      await writable.write(blob);
      await writable.close();
      return { success: true, handle: options.existingHandle, name: options.existingHandle.name };
    } catch (err) {
      console.warn('Writing to existing handle failed, prompting Save As:', err);
    }
  }

  // Prompt Save As
  if (isFSApiSupported()) {
    try {
      const handle = await (window as unknown as {
        showSaveFilePicker: (opts: { suggestedName?: string; types?: FileFilterType[] }) => Promise<FileSystemFileHandle>;
      }).showSaveFilePicker({
        suggestedName,
        types: options.filters || [OFFICE_FILE_FILTERS.allOffice],
      });

      const writable = await (handle as unknown as {
        createWritable: () => Promise<FileSystemWritableFileStream>;
      }).createWritable();
      await writable.write(blob);
      await writable.close();
      return { success: true, handle, name: handle.name };
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { success: false, name: suggestedName };
      }
      console.warn('Save file picker failed, falling back to download:', err);
    }
  }

  // Fallback: standard anchor download
  downloadBlob(blob, suggestedName);
  return { success: true, name: suggestedName };
}

/**
 * Downloads a blob as a file via DOM anchor
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Fallback file open via dynamic input element
 */
function openViaFileInput(filters: FileFilterType[]): Promise<OpenedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';

    const extensions = filters
      .flatMap((f) => Object.values(f.accept))
      .flat()
      .join(',');
    input.accept = extensions || '*/*';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const buffer = await file.arrayBuffer();
      resolve({
        name: file.name,
        size: file.size,
        type: file.type || getMimeFromExtension(file.name),
        lastModified: file.lastModified,
        data: buffer,
      });
    };

    input.click();
  });
}

function getMimeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'pdf':
      return 'application/pdf';
    case 'md':
      return 'text/markdown';
    default:
      return 'application/octet-stream';
  }
}
