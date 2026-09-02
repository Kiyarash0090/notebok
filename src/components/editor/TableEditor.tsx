import React, { useEffect, useRef, useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { TableData } from '../../types';
import { reshapeTableData } from '../../lib/blocks';
import { TABLE_COLORS, TABLE_COLOR_MAP } from '../../constants';

interface TableEditorProps {
  data: TableData;
  active: boolean;
  onUpdate: (data: TableData) => void;
}

export const TableEditor: React.FC<TableEditorProps> = ({ data, active, onUpdate }) => {
  const [selStart, setSelStart] = useState<number | null>(null);
  const [selEnd, setSelEnd] = useState<number | null>(null);
  const dragRef = useRef<false | number>(false); // dragging start index while a range is being dragged
  const { rows, cols, cells, header } = data;

  const cellIndex = (r: number, c: number) => r * cols + c;

  const setCell = (idx: number, patch: { text?: string; color?: string }) => {
    onUpdate({ ...data, cells: cells.map((cell, i) => (i === idx ? { ...cell, ...patch } : cell)) });
  };

  const resize = (newRows: number, newCols: number) => {
    const next = reshapeTableData(data, newRows, newCols);
    onUpdate(next);
    setSelStart((s) => (s !== null && s < next.cells.length ? s : null));
    setSelEnd((s) => (s !== null && s < next.cells.length ? s : null));
  };

  // rectangle covering the current selection
  const isSelected = (idx: number) => {
    if (selStart === null || selEnd === null) return false;
    const r1 = Math.floor(Math.min(selStart, selEnd) / cols);
    const r2 = Math.floor(Math.max(selStart, selEnd) / cols);
    const c1 = Math.min(Math.min(selStart, selEnd) % cols, Math.max(selStart, selEnd) % cols);
    const c2 = Math.max(Math.min(selStart, selEnd) % cols, Math.max(selStart, selEnd) % cols);
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    return r >= r1 && r <= r2 && c >= c1 && c <= c2;
  };

  // color/paint every cell in the selected rectangle
  const paint = (color: string) => {
    if (selStart === null || selEnd === null) return;
    const r1 = Math.floor(Math.min(selStart, selEnd) / cols);
    const r2 = Math.floor(Math.max(selStart, selEnd) / cols);
    const c1 = Math.min(Math.min(selStart, selEnd) % cols, Math.max(selStart, selEnd) % cols);
    const c2 = Math.max(Math.min(selStart, selEnd) % cols, Math.max(selStart, selEnd) % cols);
    const affected = new Set<number>();
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) affected.add(cellIndex(r, c));
    onUpdate({
      ...data,
      cells: cells.map((cell, i) => (affected.has(i) ? { ...cell, color } : cell)),
    });
  };

  useEffect(() => {
    const up = () => {
      dragRef.current = false;
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const beginSelect = (idx: number, shift: boolean) => {
    if (shift && selStart !== null) {
      setSelEnd(idx);
    } else {
      setSelStart(idx);
      setSelEnd(idx);
      dragRef.current = idx;
    }
  };

  const extendSelect = (idx: number) => {
    if (dragRef.current !== false) setSelEnd(idx);
  };

  const controlBtn =
    'flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[10px] font-bold text-[#5E6258] dark:text-[#8F9285] hover:bg-[#E8ECE0] dark:hover:bg-[#23261F] transition-colors';
  const shortBtn = 'w-6 h-6 rounded-lg flex items-center justify-center text-[#8F9285] hover:bg-[#E8ECE0] dark:hover:bg-[#23261F] transition-colors';

  return (
    <div className="space-y-1.5">
      <div className="overflow-x-auto rounded-2xl border border-[#E1E4D5] dark:border-[#43493E] bg-white dark:bg-[#1C1C17]">
        <table className="border-collapse w-full text-xs">
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }, (_, c) => {
                  const idx = cellIndex(r, c);
                  const cell = cells[idx] || { text: '', color: '' };
                  const color = TABLE_COLOR_MAP[cell.color || ''];
                  const selected = isSelected(idx);
                  return (
                    <td
                      key={c}
                      className={`border border-[#E1E4D5] dark:border-[#43493E] align-top p-0 ${
                        color ? `${color.light} ${color.dark}` : ''
                      } ${selected ? 'ring-2 ring-inset ring-[#4A6D22] dark:ring-[#D0E8B2]' : ''} ${
                        header && r === 0 ? 'bg-black/[0.04] dark:bg-white/[0.06] font-bold' : ''
                      }`}
                    >
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onInput={(e) => setCell(idx, { text: e.currentTarget.innerText })}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          beginSelect(idx, e.shiftKey);
                        }}
                        onMouseEnter={() => extendSelect(idx)}
                        onFocus={() => {
                          setSelStart(idx);
                          setSelEnd(idx);
                        }}
                        ref={(el) => {
                          if (el && el.innerText !== cell.text) el.innerText = cell.text;
                        }}
                        className="min-w-8 min-h-6 px-2 py-1 outline-none whitespace-pre-wrap break-words text-[#1A1C16] dark:text-[#E2E3DC]"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {active && (
        <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold text-[#8F9285]">
          {/* rows */}
          <span className="flex items-center gap-0.5">
            <button type="button" className={shortBtn} onClick={() => resize(rows - 1, cols)} title="حذف ردیف">
              <Minus className="w-3 h-3" />
            </button>
            <span>{rows} ردیف</span>
            <button type="button" className={shortBtn} onClick={() => resize(rows + 1, cols)} title="افزودن ردیف">
              <Plus className="w-3 h-3" />
            </button>
          </span>
          {/* columns */}
          <span className="flex items-center gap-0.5">
            <button type="button" className={shortBtn} onClick={() => resize(rows, cols - 1)} title="حذف ستون">
              <Minus className="w-3 h-3" />
            </button>
            <span>{cols} ستون</span>
            <button type="button" className={shortBtn} onClick={() => resize(rows, cols + 1)} title="افزودن ستون">
              <Plus className="w-3 h-3" />
            </button>
          </span>
          <span className="w-px h-4 bg-[#E1E4D5] dark:bg-[#43493E]" />
          <button type="button" className={controlBtn} onClick={() => onUpdate({ ...data, header: !header })}>
            {header ? 'حذف سطر عنوان' : 'سطر عنوان'}
          </button>
          <button
            type="button"
            className={controlBtn}
            onClick={() => onUpdate({ ...data, cells: cells.map((cell) => (cell.color ? { ...cell, color: '' } : cell)) })}
          >
            پاککردن رنگها
          </button>

          {/* cell color palette (visible when a cell is selected) */}
          {selStart !== null && (
            <span className="flex items-center gap-1">
              <span className="w-px h-4 bg-[#E1E4D5] dark:bg-[#43493E]" />
              <span>رنگ:</span>
              {TABLE_COLORS.map((cc) => (
                <button
                  key={cc.id}
                  type="button"
                  onClick={() => paint(cc.id)}
                  title={cc.name}
                  className={`w-4 h-4 rounded-md border border-[#E1E4D5] dark:border-[#43493E] ${cc.light} ${cc.dark}`}
                />
              ))}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
