import mammoth from 'mammoth';
import JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';

/**
 * Imports DOCX binary buffer and converts to clean HTML for Tiptap, preserving horizontal rules
 */
export async function importFromDocx(buffer: ArrayBuffer): Promise<string> {
  let processedBuffer: ArrayBuffer = buffer;

  try {
    // Pre-process docx zip to retain thematic breaks (horizontal lines)
    const zip = await JSZip.loadAsync(buffer);
    const documentXmlFile = zip.file('word/document.xml');
    if (documentXmlFile) {
      const xml = await documentXmlFile.async('string');
      // Detect paragraphs with bottom border (w:pBdr with w:bottom) or thematic breaks
      if (xml.includes('w:pBdr') || xml.includes('w:bottom')) {
        const modifiedXml = xml.replace(/(<w:p\b[^>]*>[\s\S]*?<w:pBdr>[\s\S]*?<\/w:pPr>)([\s\S]*?<\/w:p>)/g, (_match, p1, p2) => {
          return p1 + '<w:r><w:t>__LOCALOFFICE_THEMATIC_BREAK__</w:t></w:r>' + p2;
        });
        zip.file('word/document.xml', modifiedXml);
        processedBuffer = await zip.generateAsync({ type: 'arraybuffer' });
      }
    }
  } catch (err) {
    console.warn('Zip pre-processing for horizontal rules skipped:', err);
  }

  // Support both browser and Node/Vitest environments
  const isNode = typeof Buffer !== 'undefined';
  const mammothInput = isNode
    ? { buffer: Buffer.from(processedBuffer) }
    : { arrayBuffer: processedBuffer };

  const result = await mammoth.convertToHtml(mammothInput as unknown as { arrayBuffer: ArrayBuffer });
  return (result.value || '<p></p>').replace(/<p>\s*__LOCALOFFICE_THEMATIC_BREAK__\s*<\/p>/g, '<hr />');
}

/**
 * Exports HTML string to a native .docx binary Blob
 */
export async function exportToDocx(htmlContent: string, title: string = 'Document'): Promise<Blob> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const children: (Paragraph | Table)[] = [];

  // Parse DOM nodes to docx elements
  const bodyNodes = Array.from(doc.body.childNodes);

  for (const node of bodyNodes) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();

      switch (tagName) {
        case 'h1':
          children.push(
            new Paragraph({
              text: el.textContent || '',
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 },
            })
          );
          break;
        case 'h2':
          children.push(
            new Paragraph({
              text: el.textContent || '',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
            })
          );
          break;
        case 'h3':
          children.push(
            new Paragraph({
              text: el.textContent || '',
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 160, after: 80 },
            })
          );
          break;
        case 'hr':
          children.push(
            new Paragraph({
              thematicBreak: true,
              spacing: { before: 180, after: 180 },
            })
          );
          break;
        case 'blockquote':
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: el.textContent || '',
                  italics: true,
                }),
              ],
              spacing: { before: 120, after: 120 },
              indent: { left: 720 },
            })
          );
          break;
        case 'table':
          children.push(parseHtmlTableToDocx(el));
          break;
        case 'ul':
        case 'ol':
          const items = Array.from(el.querySelectorAll('li'));
          for (const li of items) {
            children.push(
              new Paragraph({
                text: li.textContent || '',
                bullet: tagName === 'ul' ? { level: 0 } : undefined,
                spacing: { after: 60 },
              })
            );
          }
          break;
        case 'p':
        default:
          children.push(parseParagraphElement(el));
          break;
      }
    }
  }

  // Fallback if empty
  if (children.length === 0) {
    children.push(new Paragraph({ text: '' }));
  }

  const wordDoc = new Document({
    title,
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const arrayBuffer = await Packer.toArrayBuffer(wordDoc);
  return new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

function parseParagraphElement(el: HTMLElement): Paragraph {
  const runs: TextRun[] = [];

  el.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      runs.push(new TextRun(child.textContent || ''));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childEl = child as HTMLElement;
      const tag = childEl.tagName.toLowerCase();
      const isBold = tag === 'strong' || tag === 'b';
      const isItalic = tag === 'em' || tag === 'i';
      const isCode = tag === 'code';

      runs.push(
        new TextRun({
          text: childEl.textContent || '',
          bold: isBold,
          italics: isItalic,
          font: isCode ? 'Consolas' : undefined,
        })
      );
    }
  });

  return new Paragraph({
    children: runs.length > 0 ? runs : [new TextRun(el.textContent || '')],
    spacing: { after: 120 },
  });
}

function parseHtmlTableToDocx(tableEl: HTMLElement): Table {
  const rows: TableRow[] = [];
  const trElements = Array.from(tableEl.querySelectorAll('tr'));

  for (const tr of trElements) {
    const cells: TableCell[] = [];
    const cellElements = Array.from(tr.querySelectorAll('th, td'));

    for (const cell of cellElements) {
      const isHeader = cell.tagName.toLowerCase() === 'th';
      cells.push(
        new TableCell({
          children: [
            new Paragraph({
              text: cell.textContent || '',
              alignment: isHeader ? undefined : undefined,
            }),
          ],
          shading: isHeader ? { fill: 'F3F4F6' } : undefined,
        })
      );
    }

    if (cells.length > 0) {
      rows.push(new TableRow({ children: cells }));
    }
  }

  return new Table({
    rows: rows.length > 0 ? rows : [new TableRow({ children: [new TableCell({ children: [new Paragraph('')] })] })],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
    },
  });
}
