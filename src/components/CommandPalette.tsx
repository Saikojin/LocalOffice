import React, { useState, useEffect } from 'react';
import { Search, X, Command } from 'lucide-react';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Actions' | 'Create' | 'Settings';
  icon: React.ReactNode;
  shortcut?: string;
  run: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or state
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filtered = commands.filter((cmd) => {
    const q = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) ||
      cmd.category.toLowerCase().includes(q) ||
      cmd.id.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].run();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="command-palette-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start justify-center pt-24 px-4"
    >
      <div
        data-testid="command-palette-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Search Input Bar */}
        <div className="h-12 border-b border-stone-200 dark:border-stone-800 px-4 flex items-center space-x-2.5">
          <Search className="w-4 h-4 text-stone-400" />
          <input
            data-testid="command-palette-input"
            type="text"
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search actions..."
            className="flex-1 bg-transparent border-none text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden"
          />
          <kbd className="hidden sm:inline-flex items-center space-x-1 text-[10px] font-mono text-stone-400 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </kbd>
          <button
            data-testid="btn-command-palette-close"
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command List */}
        <div data-testid="command-palette-list" className="max-h-72 overflow-y-auto p-1.5 select-none">
          {filtered.length === 0 ? (
            <div data-testid="command-palette-empty" className="py-8 text-center text-xs text-stone-400">
              No matching commands found.
            </div>
          ) : (
            filtered.map((cmd, idx) => (
              <div
                key={cmd.id}
                data-testid={`command-item-${cmd.id}`}
                onClick={() => {
                  cmd.run();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`px-3 py-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors text-xs ${
                  selectedIndex === idx
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span className={selectedIndex === idx ? 'text-white' : 'text-stone-400'}>
                    {cmd.icon}
                  </span>
                  <div>
                    <div>{cmd.title}</div>
                    {cmd.subtitle && (
                      <div className={`text-[10px] ${selectedIndex === idx ? 'text-blue-100' : 'text-stone-400'}`}>
                        {cmd.subtitle}
                      </div>
                    )}
                  </div>
                </div>

                {cmd.shortcut && (
                  <kbd className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    selectedIndex === idx ? 'bg-blue-700 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-400 border border-stone-200 dark:border-stone-700'
                  }`}>
                    {cmd.shortcut}
                  </kbd>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="h-7 border-t border-stone-200 dark:border-stone-800/80 bg-stone-50 dark:bg-stone-900/60 px-3 flex items-center justify-between text-[10px] text-stone-400">
          <span>Navigate with ↑↓, Select with Enter</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
