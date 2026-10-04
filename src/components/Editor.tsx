import { useRef, useImperativeHandle, forwardRef } from 'react';
import type { EditorSettings } from '../types';

interface EditorProps {
  value: string;
  onChange: (val: string, isTyping?: boolean) => void;
  settings: EditorSettings;
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
  onCursorChange?: (line: number, col: number) => void;
}

export interface EditorRef {
  insertText: (before: string, after?: string, defaultText?: string) => void;
  focus: () => void;
  selectRange: (start: number, end: number) => void;
  getSelectedText: () => string;
}

export const Editor = forwardRef<EditorRef, EditorProps>(({
  value,
  onChange,
  settings,
  onScroll,
  onCursorChange,
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    insertText: (before: string, after: string = '', defaultText: string = '') => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end) || defaultText;

      const newValue =
        value.substring(0, start) + before + selectedText + after + value.substring(end);

      onChange(newValue, false);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + before.length,
          start + before.length + selectedText.length
        );
      }, 0);
    },
    focus: () => {
      textareaRef.current?.focus();
    },
    selectRange: (start: number, end: number) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(start, end);

      // Scroll to selection
      const linesBefore = value.substring(0, start).split('\n').length;
      const lineHeightPx = settings.fontSize * settings.lineHeight;
      const targetScroll = Math.max(0, (linesBefore - 5) * lineHeightPx);
      textarea.scrollTop = targetScroll;
    },
    getSelectedText: () => {
      const textarea = textareaRef.current;
      if (!textarea) return '';
      return value.substring(textarea.selectionStart, textarea.selectionEnd);
    },
  }));

  const lineCount = Math.max(1, value.split('\n').length);
  const linesArray = Array.from({ length: lineCount }, (_, i) => i + 1);

  const handleScroll = () => {
    if (!textareaRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = textareaRef.current;

    // Sync line numbers scroll
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }

    if (onScroll) {
      onScroll(scrollTop, scrollHeight, clientHeight);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab key auto indenting
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue, false);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const updateCursorPos = () => {
    if (!textareaRef.current || !onCursorChange) return;
    const pos = textareaRef.current.selectionStart;
    const lines = value.substring(0, pos).split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    onCursorChange(line, col);
  };

  return (
    <div className={`editor-container font-family-${settings.fontFamily}`}>
      {settings.showLineNumbers && (
        <div className="line-numbers" ref={lineNumbersRef}>
          {linesArray.map((num) => (
            <div key={num} className="line-num">
              {num}
            </div>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        className="editor-textarea"
        value={value}
        onChange={(e) => {
          onChange(e.target.value, true);
          updateCursorPos();
        }}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        onClick={updateCursorPos}
        onKeyUp={updateCursorPos}
        placeholder="Escribe tu Markdown, directivas MDJ o diagrama Mermaid aquí..."
        style={{
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
        }}
        spellCheck={false}
      />
    </div>
  );
});
