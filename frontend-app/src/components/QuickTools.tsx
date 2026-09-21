import React, { useEffect, useRef, useState } from 'react';
import { Calculator, NotebookPen, X } from 'lucide-react';

const NOTES_KEY = 'smartfin.quick-tools.notes';
const NOTES_OPEN_KEY = 'smartfin.quick-tools.notes.open';
const CALC_HISTORY_KEY = 'smartfin.quick-tools.calc-history';
const CALC_OPEN_KEY = 'smartfin.quick-tools.calc.open';
const CALC_POSITION_KEY = 'smartfin.quick-tools.calc.position';
const CALC_COLLAPSED_KEY = 'smartfin.quick-tools.calc.collapsed';

type NoteColor = 'yellow' | 'blue' | 'pink';
type Position = { x: number; y: number };

type NoteEntry = {
  id: string;
  content: string;
  color: NoteColor;
  position: Position;
  collapsed: boolean;
};

type NotePalette = {
  background: string;
  border: string;
  toolbar: string;
  text: string;
  button: string;
  buttonHover: string;
  shadow: string;
};

const createNoteId = () => `note-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const createDefaultNote = (): NoteEntry => ({
  id: createNoteId(),
  content: '',
  color: 'yellow',
  position: { x: Math.max(24, window.innerWidth - 380), y: 92 },
  collapsed: false,
});

const notePalettes: Record<NoteColor, NotePalette> = {
  yellow: {
    background: '#f7f0b6',
    border: '#d7d1ad',
    toolbar: '#f4eec0',
    text: '#111827',
    button: '#f0db82',
    buttonHover: '#e7cf69',
    shadow: 'rgba(31, 42, 54, 0.16)',
  },
  blue: {
    background: '#dfeefb',
    border: '#b8d3ea',
    toolbar: '#d9ebf9',
    text: '#10233a',
    button: '#b9d9f2',
    buttonHover: '#9ec7e9',
    shadow: 'rgba(34, 77, 123, 0.16)',
  },
  pink: {
    background: '#f9dfe7',
    border: '#e4bfca',
    toolbar: '#f6e3eb',
    text: '#311822',
    button: '#efbfd0',
    buttonHover: '#e6a8bc',
    shadow: 'rgba(103, 44, 63, 0.16)',
  },
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const safeEvaluate = (expression: string) => {
  const sanitized = expression
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/%/g, '/100');

  if (!sanitized || !/^[0-9+\-*/().\s]+$/.test(sanitized)) {
    throw new Error('Invalid expression');
  }

  const fn = new Function(`"use strict"; return (${sanitized});`);
  const result = fn();

  if (!Number.isFinite(result)) {
    throw new Error('Invalid calculation');
  }

  return Number(result.toFixed(10));
};

const getStoredNotes = (): NoteEntry[] => {
  try {
    const stored = localStorage.getItem(NOTES_KEY);
    if (!stored) {
      return [createDefaultNote()];
    }

    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item) => ({
        id: typeof item?.id === 'string' ? item.id : createNoteId(),
        content: typeof item?.content === 'string' ? item.content : '',
        color: item?.color && item.color in notePalettes ? item.color : 'yellow',
        position: {
          x: typeof item?.position?.x === 'number' ? item.position.x : Math.max(24, window.innerWidth - 380),
          y: typeof item?.position?.y === 'number' ? item.position.y : 92,
        },
        collapsed: Boolean(item?.collapsed),
      }));
    }
  } catch {
    // ignore
  }

  return [createDefaultNote()];
};

const QuickTools: React.FC = () => {
  const [calculatorOpen, setCalculatorOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(CALC_OPEN_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [notesOpen, setNotesOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(NOTES_OPEN_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [calcInput, setCalcInput] = useState('');
  const [calcCollapsed, setCalcCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(CALC_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [history, setHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(CALC_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [notes, setNotes] = useState<NoteEntry[]>(() => getStoredNotes());
  const [activeNoteId, setActiveNoteId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(NOTES_KEY);
      if (!stored) return getStoredNotes()[0]?.id ?? '';
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.id) {
        return parsed[0].id;
      }
    } catch {
      // ignore
    }

    return getStoredNotes()[0]?.id ?? '';
  });

  const [calcPosition, setCalcPosition] = useState<Position>(() => {
    try {
      const stored = localStorage.getItem(CALC_POSITION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Position;
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // ignore
    }

    return { x: Math.max(24, window.innerWidth - 420), y: 92 };
  });

  const noteRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const calcRef = useRef<HTMLDivElement>(null);
  const noteTextRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const dragState = useRef<{
    active: boolean;
    panel: 'note' | 'calc';
    noteId: string | null;
    offsetX: number;
    offsetY: number;
    pointerId: number | null;
  }>({
    active: false,
    panel: 'note',
    noteId: null,
    offsetX: 0,
    offsetY: 0,
    pointerId: null,
  });

  const activeNote = notes.find((item) => item.id === activeNoteId) ?? notes[0];
  const activeNoteColor = activeNote?.color ?? 'yellow';

  const setNoteContent = (noteId: string, value: string | ((current: string) => string)) => {
    setNotes((current) =>
      current.map((item) => {
        if (item.id !== noteId) return item;
        const nextValue = typeof value === 'function' ? value(item.content) : value;
        return { ...item, content: nextValue };
      })
    );
  };

  const setNoteColorForId = (noteId: string, color: NoteColor) => {
    setNotes((current) => current.map((item) => (item.id === noteId ? { ...item, color } : item)));
  };

  const setNoteCollapsedState = (noteId: string, collapsed: boolean) => {
    setNotes((current) => current.map((item) => (item.id === noteId ? { ...item, collapsed } : item)));
  };

  const addNewNote = (preferredColor: NoteColor = activeNoteColor) => {
    const anchor = activeNote ?? notes[notes.length - 1] ?? createDefaultNote();
    const newNote: NoteEntry = {
      id: createNoteId(),
      content: '',
      color: preferredColor,
      position: {
        x: clamp(anchor.position.x + 28, 12, Math.max(12, window.innerWidth - 340)),
        y: clamp(anchor.position.y + 32, 12, Math.max(12, window.innerHeight - 420)),
      },
      collapsed: false,
    };

    setNotes((current) => [...current, newNote]);
    setActiveNoteId(newNote.id);
    setNotesOpen(true);
  };

  const applyDragPosition = (panel: 'note' | 'calc', noteId: string | null, x: number, y: number) => {
    if (panel === 'note' && noteId) {
      const target = noteRefs.current[noteId];
      if (target) {
        target.style.left = `${x}px`;
        target.style.top = `${y}px`;
      }
      return;
    }

    const target = calcRef.current;
    if (target) {
      target.style.left = `${x}px`;
      target.style.top = `${y}px`;
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(CALC_HISTORY_KEY, JSON.stringify(history.slice(0, 6)));
    } catch {
      // ignore
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [notes]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTES_OPEN_KEY, String(notesOpen));
    } catch {
      // ignore
    }
  }, [notesOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(CALC_OPEN_KEY, String(calculatorOpen));
    } catch {
      // ignore
    }
  }, [calculatorOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(CALC_POSITION_KEY, JSON.stringify(calcPosition));
    } catch {
      // ignore
    }
  }, [calcPosition]);

  useEffect(() => {
    try {
      localStorage.setItem(CALC_COLLAPSED_KEY, String(calcCollapsed));
    } catch {
      // ignore
    }
  }, [calcCollapsed]);

  useEffect(() => {
    if (!activeNoteId && notes[0]) {
      setActiveNoteId(notes[0].id);
    }
  }, [activeNoteId, notes]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragState.current.active || (dragState.current.pointerId !== null && event.pointerId !== dragState.current.pointerId)) {
        return;
      }

      const { panel, noteId } = dragState.current;
      const width = panel === 'note' ? 330 : 340;
      const maxX = Math.max(12, window.innerWidth - width);
      const maxY = Math.max(12, window.innerHeight - 420);
      const nextX = clamp(event.clientX - dragState.current.offsetX, 12, maxX);
      const nextY = clamp(event.clientY - dragState.current.offsetY, 12, maxY);

      if (panel === 'note' && noteId) {
        setNotes((current) => current.map((item) => (item.id === noteId ? { ...item, position: { x: nextX, y: nextY } } : item)));
      }

      applyDragPosition(panel, noteId, nextX, nextY);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (dragState.current.pointerId !== null && event.pointerId !== dragState.current.pointerId) {
        return;
      }

      const { panel, noteId } = dragState.current;

      if (panel === 'note' && noteId) {
        const target = noteRefs.current[noteId];
        if (target) {
          const x = Number.parseFloat(target.style.left || '0');
          const y = Number.parseFloat(target.style.top || '0');
          setNotes((current) => current.map((item) => (item.id === noteId ? { ...item, position: { x, y } } : item)));
        }
      } else {
        const target = calcRef.current;
        if (target) {
          const x = Number.parseFloat(target.style.left || '0');
          const y = Number.parseFloat(target.style.top || '0');
          setCalcPosition({ x, y });
        }
      }

      dragState.current = {
        active: false,
        panel: 'note',
        noteId: null,
        offsetX: 0,
        offsetY: 0,
        pointerId: null,
      };
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  useEffect(() => {
    if (!calculatorOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCalculatorOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [calculatorOpen]);

  const addToHistory = (expression: string, result: string) => {
    const entry = `${expression} = ${result}`;
    setHistory((current) => [entry, ...current.filter((item) => item !== entry)].slice(0, 6));
  };

  const appendToCalculator = (value: string) => {
    if (value === 'C') {
      setCalcInput('');
      return;
    }

    if (value === 'DEL') {
      setCalcInput((current) => current.slice(0, -1));
      return;
    }

    if (value === '=') {
      if (!calcInput.trim()) return;

      try {
        const result = safeEvaluate(calcInput);
        const formatted = String(result);
        setCalcInput(formatted);
        addToHistory(calcInput, formatted);
      } catch {
        setCalcInput('Error');
        window.setTimeout(() => setCalcInput(''), 900);
      }
      return;
    }

    if (value === '%') {
      setCalcInput((current) => (current ? `${current}%` : ''));
      return;
    }

    setCalcInput((current) => {
      const next = current === 'Error' ? '' : current;
      if (!next && /[+\-*/.]/.test(value)) return next;
      return `${next}${value}`;
    });
  };

  const calculatorButtons = ['C', 'DEL', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '='];

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setCalculatorOpen((open) => !open)}
        className="inline-flex items-center gap-2 rounded-xl border border-[#dfe9e5] bg-white px-3 py-2 text-xs font-bold text-[#17212b] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#b4d6ce] hover:bg-[#f4fbf9]"
      >
        <Calculator size={16} className="text-[#087f74]" />
        <span className="hidden sm:inline">Calculator</span>
      </button>

      <button
        type="button"
        onClick={() => setNotesOpen((open) => !open)}
        className="inline-flex items-center gap-2 rounded-xl border border-[#dfe9e5] bg-white px-3 py-2 text-xs font-bold text-[#17212b] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#b4d6ce] hover:bg-[#f4fbf9]"
      >
        <NotebookPen size={16} className="text-[#087f74]" />
        <span className="hidden sm:inline">Notes</span>
      </button>

      {calculatorOpen && (
        <div
          ref={calcRef}
          className={`fixed z-40 overflow-hidden rounded-[30px] border border-[#dfe9e5] bg-gradient-to-b from-[#f9fcfb] via-[#ffffff] to-[#edf6f4] shadow-[0_24px_60px_rgba(17,24,39,0.16)] ${calcCollapsed ? 'quick-tools-compact-hover' : ''}`}
          style={{
            left: `${calcPosition.x}px`,
            top: `${calcPosition.y}px`,
            width: calcCollapsed ? '220px' : '340px',
            transform: 'translate3d(0,0,0)',
            animation: 'quick-tools-float-in 0.26s ease-out',
          }}
        >
          <div
            className="flex cursor-grab items-center justify-between border-b border-[#edf2f0] bg-gradient-to-r from-[#f7fbfa] to-[#eef7f4] px-3 py-2 active:cursor-grabbing"
            onPointerDown={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest('button')) {
                return;
              }

              event.preventDefault();
              event.currentTarget.setPointerCapture?.(event.pointerId);
              const rect = calcRef.current?.getBoundingClientRect();
              dragState.current = {
                active: true,
                panel: 'calc',
                noteId: null,
                offsetX: event.clientX - (rect?.left ?? 0),
                offsetY: event.clientY - (rect?.top ?? 0),
                pointerId: event.pointerId,
              };
            }}
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#facc15]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" />
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#61707d]">
                <Calculator size={12} className="text-[#087f74]" />
                Finance
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setCalcCollapsed((value) => !value)}
                aria-label={calcCollapsed ? 'Expand calculator' : 'Collapse calculator'}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[12px] font-bold text-[#17212b] transition hover:bg-[#edf3f1]"
              >
                {calcCollapsed ? '▢' : '—'}
              </button>
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setCalculatorOpen(false)}
                aria-label="Close calculator"
                className="rounded-lg p-1 text-[#73808d] transition hover:bg-[#edf3f1] hover:text-[#17212b]"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {!calcCollapsed && (
            <div className="p-3">
              <div className="mb-3 flex min-h-[62px] items-center justify-end rounded-[20px] bg-[#0f172a] px-3 py-2 text-right text-[30px] font-extrabold tracking-[-0.06em] text-white shadow-inner shadow-black/25">
                {calcInput || '0'}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {calculatorButtons.map((button) => {
                  const isOperator = ['÷', '×', '−', '+', '%'].includes(button);
                  const isAccent = button === '=';
                  const isAction = button === 'C' || button === 'DEL';

                  return (
                    <button
                      key={button}
                      type="button"
                      onClick={() => appendToCalculator(button)}
                      className={`flex h-11 items-center justify-center rounded-2xl text-sm font-bold transition duration-150 ${
                        isAccent
                          ? 'bg-[#087f74] text-white shadow-lg shadow-[#0b8b81]/30 hover:bg-[#075c57]'
                          : isOperator
                            ? 'bg-[#e6f7f6] text-[#0a6d6d] hover:bg-[#d7f1ee]'
                            : isAction
                              ? 'bg-[#eef3f2] text-[#17212b] hover:bg-[#e3ecea]'
                              : 'bg-[#f8fafb] text-[#17212b] hover:bg-[#edf1f3]'
                      }`}
                    >
                      {button}
                    </button>
                  );
                })}
              </div>

              {history.length > 0 && (
                <div className="mt-3 rounded-2xl border border-[#edf2f0] bg-[#fbfdfc] p-2">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9aa7af]">Recent</div>
                  <div className="space-y-1.5">
                    {history.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCalcInput(item.split(' = ')[0])}
                        className="block w-full rounded-xl bg-[#f4f7f6] px-2 py-1.5 text-left text-xs font-medium text-[#3b4a52] transition hover:bg-[#ebf2f1]"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {notesOpen && notes.map((item) => {
        const palette = notePalettes[item.color];
        const isCollapsed = item.collapsed;
        const isActive = item.id === activeNoteId;

        return (
          <div
            key={item.id}
            ref={(element) => {
              noteRefs.current[item.id] = element;
            }}
            className={`fixed z-40 overflow-hidden rounded-[18px] border transition-all duration-200 ease-out ${isCollapsed ? 'quick-tools-compact-hover' : ''} ${isActive ? 'ring-2 ring-[#0f172a]/10' : ''}`}
            style={{
              left: `${item.position.x}px`,
              top: `${item.position.y}px`,
              width: isCollapsed ? '290px' : '330px',
              minHeight: isCollapsed ? '54px' : 'auto',
              background: palette.background,
              borderColor: palette.border,
              boxShadow: `0 20px 48px ${palette.shadow}`,
              transform: 'translate3d(0,0,0)',
              animation: 'quick-tools-float-in 0.25s ease-out',
              zIndex: isActive ? 60 : 45,
            }}
          >
            <div className="pointer-events-none absolute left-1/2 top-[-11px] z-10 flex -translate-x-1/2 items-center justify-center">
              <div className="relative flex h-6 w-6 items-center justify-center rounded-full border border-[#7a5f2b]/20 bg-gradient-to-b from-[#f8d471] to-[#d7a93a] shadow-[0_4px_10px_rgba(122,95,43,0.35)]">
                <span className="absolute h-2.5 w-2.5 rounded-full bg-[#e9b53c]" />
                <span className="absolute h-2.5 w-1 rounded-full bg-[#a36f15]" />
              </div>
            </div>

            <div
              className="flex cursor-grab items-center justify-between border-b px-3 py-2 active:cursor-grabbing"
              style={{ borderColor: palette.border, minHeight: isCollapsed ? '54px' : undefined }}
              onPointerDown={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest('button, textarea')) {
                  return;
                }

                setActiveNoteId(item.id);
                event.preventDefault();
                event.currentTarget.setPointerCapture?.(event.pointerId);
                const rect = noteRefs.current[item.id]?.getBoundingClientRect();
                dragState.current = {
                  active: true,
                  panel: 'note',
                  noteId: item.id,
                  offsetX: event.clientX - (rect?.left ?? 0),
                  offsetY: event.clientY - (rect?.top ?? 0),
                  pointerId: event.pointerId,
                };
              }}
            >
              <div className="flex items-center gap-2">
                {!isCollapsed && (
                  <>
                    <button
                      type="button"
                      aria-label="Add quick note"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => addNewNote(item.color)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-lg font-bold transition hover:opacity-80"
                      style={{ background: palette.button }}
                    >
                      +
                    </button>

                    <div className="flex items-center gap-1.5">
                      {(['yellow', 'blue', 'pink'] as NoteColor[]).map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label={`Use ${color} note color`}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={() => {
                            setActiveNoteId(item.id);
                            setNoteColorForId(item.id, color);
                          }}
                          className={`h-3.5 w-3.5 rounded-full border border-[#1f2937]/20 transition ${item.color === color ? 'ring-2 ring-[#1f2937]/30' : ''}`}
                          style={{ background: notePalettes[color].background }}
                        />
                      ))}
                    </div>
                  </>
                )}

                {isCollapsed && <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#334155]">NOTE</span>}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label={isCollapsed ? 'Expand note' : 'Collapse note'}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => {
                    setActiveNoteId(item.id);
                    setNoteCollapsedState(item.id, !isCollapsed);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-[12px] font-bold transition hover:opacity-80"
                  style={{ background: palette.button }}
                >
                  {isCollapsed ? '▢' : '—'}
                </button>

                <button
                  type="button"
                  aria-label="Close note"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => {
                    const nextNotes = notes.filter((noteItem) => noteItem.id !== item.id);
                    setNotes(nextNotes);
                    setActiveNoteId((current) => (current === item.id ? nextNotes[0]?.id ?? '' : current));
                    if (nextNotes.length === 0) {
                      setNotesOpen(false);
                    }
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md transition hover:opacity-80"
                  style={{ background: palette.button }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {!isCollapsed && (
              <>
                <textarea
                  ref={(element) => {
                    noteTextRefs.current[item.id] = element;
                  }}
                  value={item.content}
                  onChange={(event) => setNoteContent(item.id, event.target.value)}
                  onFocus={() => setActiveNoteId(item.id)}
                  placeholder="Take a note..."
                  className="h-[320px] w-full resize-none border-0 bg-transparent px-4 py-3 text-[18px] placeholder:text-[#4b5563] focus:outline-none"
                  style={{
                    fontFamily: 'inherit',
                    lineHeight: '1.45',
                    color: palette.text,
                  }}
                />

                <div
                  className="flex items-center justify-between border-t px-3 py-2"
                  style={{ borderColor: palette.border, background: palette.toolbar }}
                >
                  <div className="flex items-center gap-2 text-[#111827]">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveNoteId(item.id);
                        const textarea = noteTextRefs.current[item.id];
                        if (!textarea) return;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const selected = item.content.slice(start, end) || 'text';
                        const nextText = `${item.content.slice(0, start)}**${selected}**${item.content.slice(end)}`;
                        setNoteContent(item.id, nextText);
                        window.setTimeout(() => {
                          textarea.focus();
                          const cursorStart = start + 2;
                          const cursorEnd = cursorStart + selected.length;
                          textarea.setSelectionRange(cursorStart, cursorEnd);
                        }, 0);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-md font-bold transition hover:opacity-80"
                      style={{ background: palette.button }}
                    >
                      B
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveNoteId(item.id);
                        const textarea = noteTextRefs.current[item.id];
                        if (!textarea) return;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const selected = item.content.slice(start, end) || 'text';
                        const nextText = `${item.content.slice(0, start)}*${selected}*${item.content.slice(end)}`;
                        setNoteContent(item.id, nextText);
                        window.setTimeout(() => {
                          textarea.focus();
                          const cursorStart = start + 1;
                          const cursorEnd = cursorStart + selected.length;
                          textarea.setSelectionRange(cursorStart, cursorEnd);
                        }, 0);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-md italic transition hover:opacity-80"
                      style={{ background: palette.button }}
                    >
                      I
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveNoteId(item.id);
                        const textarea = noteTextRefs.current[item.id];
                        if (!textarea) return;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const selected = item.content.slice(start, end) || 'text';
                        const nextText = `${item.content.slice(0, start)}_${selected}_${item.content.slice(end)}`;
                        setNoteContent(item.id, nextText);
                        window.setTimeout(() => {
                          textarea.focus();
                          const cursorStart = start + 1;
                          const cursorEnd = cursorStart + selected.length;
                          textarea.setSelectionRange(cursorStart, cursorEnd);
                        }, 0);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-md underline transition hover:opacity-80"
                      style={{ background: palette.button }}
                    >
                      U
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNoteContent(item.id, '')}
                    className="rounded-md px-2 py-1 text-[11px] font-bold text-[#111827] transition hover:opacity-80"
                    style={{ background: palette.button }}
                  >
                    Clear
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes quick-tools-float-in {
          0% {
            opacity: 0;
            transform: translate3d(0, 10px, 0) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        .quick-tools-compact-hover {
          transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
        }

        .quick-tools-compact-hover:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default QuickTools;
