'use client';
import { useEffect, useRef, useState } from 'react';
import { bodyText } from '@/lib/inspire-body';
import { readEditorBody, writeEditorBody } from '@/lib/inspire-editor-dom';

const commands = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  bulleted_list: 'insertUnorderedList',
  numbered_list: 'insertOrderedList',
};
export default function RichEditor({ value, onChange, maxLength, disabled }) {
  const input = useRef(null),
    savedRange = useRef(null),
    emitted = useRef(null);
  const [active, setActive] = useState({});
  const [error, setError] = useState('');
  const updateSelection = () => {
    const selection = window.getSelection();
    if (
      !selection?.rangeCount ||
      !input.current?.contains(selection.anchorNode) ||
      !input.current.contains(selection.focusNode)
    )
      return;
    savedRange.current = selection.getRangeAt(0).cloneRange();
    setActive(
      Object.fromEntries(
        Object.entries(commands).map(([key, command]) => [
          key,
          Boolean(document.queryCommandState(command)),
        ])
      )
    );
  };
  useEffect(() => {
    if (!input.current || emitted.current === JSON.stringify(value)) return;
    writeEditorBody(input.current, value);
    emitted.current = JSON.stringify(value);
  }, [value]);
  useEffect(() => {
    document.addEventListener('selectionchange', updateSelection);
    return () => document.removeEventListener('selectionchange', updateSelection);
  }, []);
  const changed = () => {
    const next = readEditorBody(input.current);
    if (bodyText(next).length > maxLength) {
      writeEditorBody(input.current, value);
      savedRange.current = null;
      setError(`Keep your post under ${maxLength.toLocaleString()} characters.`);
      return;
    }
    setError('');
    emitted.current = JSON.stringify(next);
    onChange(next);
    updateSelection();
  };
  const execute = (command, text = null) => {
    if (disabled) return;
    input.current.focus();
    const selection = window.getSelection();
    if (
      savedRange.current &&
      input.current.contains(savedRange.current.commonAncestorContainer)
    ) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
    document.execCommand(command, false, text);
    changed();
  };
  return (
    <div className="inspire-editor">
      <div className="inspire-toolbar" role="toolbar" aria-label="Post formatting">
        {[
          ['bold', 'Bold', 'B'],
          ['italic', 'Italic', 'I'],
          ['underline', 'Underline', 'U'],
        ].map(([mark, label, text]) => (
          <button
            key={mark}
            type="button"
            className={`inspire-format-${mark}`}
            title={label}
            aria-label={label}
            aria-pressed={Boolean(active[mark])}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => execute(commands[mark])}
          >
            {text}
          </button>
        ))}
        {[
          ['bulleted_list', 'Bulleted list'],
          ['numbered_list', 'Numbered list'],
        ].map(([type, label]) => (
          <button
            key={type}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={Boolean(active[type])}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => execute(commands[type])}
          >
            <span
              className={`inspire-list-icon inspire-list-${type}`}
              aria-hidden="true"
            />
          </button>
        ))}
        {['\u{1F600}', '\u2764\uFE0F', '\u{1F4AA}'].map((item) => (
          <button
            type="button"
            key={item}
            disabled={disabled}
            aria-label={`Insert ${item}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => execute('insertText', item)}
          >
            {item}
          </button>
        ))}
      </div>
      <label id="inspire-body-label" htmlFor="inspire-body">
        Post preview
      </label>
      <div
        id="inspire-body"
        ref={input}
        className="inspire-live-preview inspire-rich-body"
        role="textbox"
        aria-multiline="true"
        aria-labelledby="inspire-body-label"
        aria-describedby="inspire-format-help"
        aria-disabled={disabled}
        contentEditable={!disabled}
        suppressContentEditableWarning
        tabIndex={disabled ? -1 : 0}
        onInput={changed}
        onMouseUp={updateSelection}
        onKeyUp={updateSelection}
        onPaste={(event) => {
          event.preventDefault();
          execute('insertText', event.clipboardData.getData('text/plain'));
        }}
        onDrop={(event) => event.preventDefault()}
      />
      <small id="inspire-format-help">
        Type here to preview your post as you write. Selected formatting stays
        highlighted.
      </small>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
