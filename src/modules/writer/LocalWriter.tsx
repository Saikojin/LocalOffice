import React, { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Placeholder } from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Table as TableIcon, Undo, Redo,
  Download, Printer, Quote, Minus
} from 'lucide-react';
import { exportToDocx, importFromDocx } from './docxConverter';
import { downloadBlob, saveLocalFile, OpenedFile } from '../../core/fs/fileSystemBus';

interface LocalWriterProps {
  initialFile?: OpenedFile | null;
  onSaveStatus?: (message: string) => void;
}

export const LocalWriter: React.FC<LocalWriterProps> = ({ initialFile, onSaveStatus }) => {
  const [docTitle, setDocTitle] = useState('Untitled Document');
  const [isExporting, setIsExporting] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: 'Write something, or type "/" for commands...',
      }),
    ],
    content: `
      <h1>Welcome to LocalWriter</h1>
      <p>This is a modern, distraction-free document editor running <strong>100% locally in your browser</strong>.</p>
      <h2>Native Format Support</h2>
      <ul>
        <li>Import and export native <strong>Microsoft Word (.docx)</strong> files.</li>
        <li>Export to <strong>Markdown (.md)</strong> and <strong>PDF</strong>.</li>
        <li>Format tables, code blocks, task lists, and quotes seamlessly.</li>
      </ul>
      <p>Press <em>Ctrl+S</em> anytime to save directly to your local file system.</p>
    `,
    editorProps: {
      attributes: {
        class: 'prose prose-stone dark:prose-invert max-w-none focus:outline-none min-h-[500px]',
      },
    },
  });

  // Handle incoming file import
  useEffect(() => {
    if (!initialFile || !editor) return;

    const loadFile = async () => {
      try {
        setDocTitle(initialFile.name.replace(/\.[^/.]+$/, ''));
        const ext = initialFile.name.split('.').pop()?.toLowerCase();

        if (ext === 'docx') {
          const html = await importFromDocx(initialFile.data);
          editor.commands.setContent(html);
          onSaveStatus?.(`Loaded ${initialFile.name}`);
        } else if (ext === 'md' || ext === 'txt' || ext === 'html') {
          const text = new TextDecoder().decode(initialFile.data);
          if (ext === 'html') {
            editor.commands.setContent(text);
          } else {
            // Simple markdown paragraph parsing
            editor.commands.setContent(`<p>${text.replace(/\n\n/g, '</p><p>')}</p>`);
          }
          onSaveStatus?.(`Loaded ${initialFile.name}`);
        }
      } catch (err) {
        console.error('Error importing document:', err);
        onSaveStatus?.('Failed to import file');
      }
    };

    loadFile();
  }, [initialFile, editor, onSaveStatus]);

  const handleSaveDocx = useCallback(async () => {
    if (!editor) return;
    setIsExporting(true);
    try {
      const html = editor.getHTML();
      const blob = await exportToDocx(html, docTitle);
      await saveLocalFile(blob, {
        suggestedName: `${docTitle}.docx`,
        existingHandle: initialFile?.handle,
      });
      onSaveStatus?.(`Saved ${docTitle}.docx`);
    } catch (err) {
      console.error('Error saving DOCX:', err);
      onSaveStatus?.('Save failed');
    } finally {
      setIsExporting(false);
    }
  }, [editor, docTitle, initialFile, onSaveStatus]);

  // Handle Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveDocx();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveDocx]);

  const handleExportMarkdown = () => {
    if (!editor) return;
    const text = editor.getText();
    const blob = new Blob([text], { type: 'text/markdown' });
    downloadBlob(blob, `${docTitle}.md`);
  };

  const handlePrint = () => {
    window.print();
  };

  const wordCount = editor?.storage.characterCount?.words?.() ?? (editor?.getText().trim() ? editor.getText().trim().split(/\s+/).length : 0);
  const charCount = editor?.getText().length ?? 0;

  if (!editor) {
    return <div className="p-8 text-center text-stone-500">Loading editor engine...</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-100/60 dark:bg-stone-950/60 overflow-hidden">
      {/* Ribbon / Action Bar */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        {/* Document Title input */}
        <div className="flex items-center space-x-2">
          <input
            data-testid="writer-title-input"
            type="text"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="font-medium text-sm bg-transparent border-b border-transparent hover:border-stone-300 dark:hover:border-stone-700 focus:border-blue-500 focus:outline-hidden px-1 py-0.5 max-w-[200px]"
            title="Document Title"
          />
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center space-x-0.5 bg-stone-100 dark:bg-stone-800/80 p-0.5 rounded-lg text-xs">
          <button
            data-testid="btn-bold"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('bold') ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'}`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            data-testid="btn-italic"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('italic') ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'}`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            data-testid="btn-strike"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('strike') ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'}`}
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <button
            data-testid="btn-code"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('code') ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'}`}
            title="Inline Code"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 mx-1" />

          <button
            data-testid="btn-h1"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'}`}
            title="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>

          <button
            data-testid="btn-h2"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'}`}
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>

          <button
            data-testid="btn-h3"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'}`}
            title="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 mx-1" />

          <button
            data-testid="btn-bullet-list"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('bulletList') ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'}`}
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            data-testid="btn-ordered-list"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('orderedList') ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'}`}
            title="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <button
            data-testid="btn-task-list"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('taskList') ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'}`}
            title="Task Checklist"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>

          <button
            data-testid="btn-blockquote"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('blockquote') ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'}`}
            title="Blockquote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          <button
            data-testid="btn-insert-table"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className="p-1.5 rounded text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
            title="Insert 3x3 Table"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>

          <button
            data-testid="btn-horizontal-rule"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-1.5 rounded text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
            title="Horizontal Divider"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 mx-1" />

          <button
            data-testid="btn-undo"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded text-stone-600 dark:text-stone-400 disabled:opacity-40 hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>

          <button
            data-testid="btn-redo"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded text-stone-600 dark:text-stone-400 disabled:opacity-40 hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Export / Print Actions */}
        <div className="flex items-center space-x-1.5 text-xs">
          <button
            data-testid="btn-save-docx"
            onClick={handleSaveDocx}
            disabled={isExporting}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
            title="Save as Word Document (.docx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Saving...' : 'Save .docx'}</span>
          </button>

          <button
            data-testid="btn-export-md"
            onClick={handleExportMarkdown}
            className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
            title="Export as Markdown (.md)"
          >
            .md
          </button>

          <button
            data-testid="btn-print"
            onClick={handlePrint}
            className="p-1.5 rounded bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
            title="Print / Save to PDF"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Canvas (Scrollable Document Page) */}
      <div className="flex-1 overflow-y-auto px-4 py-8 flex justify-center">
        <div data-testid="writer-editor-container" className="w-full max-w-[850px] bg-white dark:bg-stone-900 min-h-[900px] shadow-sm rounded-xl border border-stone-200/80 dark:border-stone-800/80 px-12 py-16">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Footer Word/Char Counter */}
      <footer className="h-6 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 px-4 flex items-center justify-between text-[11px] text-stone-400 select-none">
        <div className="flex items-center space-x-3">
          <span data-testid="writer-word-count">{wordCount} words</span>
          <span data-testid="writer-char-count">{charCount} characters</span>
          <span>~{Math.ceil(wordCount / 200)} min read</span>
        </div>
        <div>
          <span>LocalWriter • Word Compatible</span>
        </div>
      </footer>
    </div>
  );
};
