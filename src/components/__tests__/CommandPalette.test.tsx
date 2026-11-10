import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette, CommandItem } from '../CommandPalette';

describe('CommandPalette', () => {
  const dummyCommands: CommandItem[] = [
    {
      id: 'cmd-1',
      title: 'Create Word Document',
      category: 'Create',
      icon: <span>Icon</span>,
      run: vi.fn(),
    },
    {
      id: 'cmd-2',
      title: 'Open Settings',
      category: 'Settings',
      icon: <span>Icon</span>,
      run: vi.fn(),
    },
  ];

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CommandPalette isOpen={false} onClose={vi.fn()} commands={dummyCommands} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders command list and filters by input', () => {
    render(<CommandPalette isOpen={true} onClose={vi.fn()} commands={dummyCommands} />);

    expect(screen.getByText('Create Word Document')).toBeInTheDocument();
    expect(screen.getByText('Open Settings')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Type a command or search actions...');
    fireEvent.change(input, { target: { value: 'Word' } });

    expect(screen.getByText('Create Word Document')).toBeInTheDocument();
    expect(screen.queryByText('Open Settings')).not.toBeInTheDocument();
  });

  it('executes command on click', () => {
    const runSpy = vi.fn();
    const closeSpy = vi.fn();
    const commands: CommandItem[] = [
      { id: '1', title: 'Action 1', category: 'Actions', icon: null, run: runSpy },
    ];

    render(<CommandPalette isOpen={true} onClose={closeSpy} commands={commands} />);
    fireEvent.click(screen.getByText('Action 1'));

    expect(runSpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });
});
