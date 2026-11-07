'use client';
import { useRef } from 'react';
import { bodyText, editBody, markBody, listBody } from '@/lib/inspire-body';
import RichBody from './RichBody';

export default function RichEditor({ value, onChange, maxLength, disabled }) {
  const input = useRef(null);
  const format = (type, isList = false) => {
    const area = input.current;
    const { selectionStart: start, selectionEnd: end } = area;
    onChange(isList ? listBody(value, start, end, type) : markBody(value, start, end, type));
    requestAnimationFrame(() => { area.focus(); area.setSelectionRange(start, end); });
  };
  const emoji = valueToInsert => {
    const area = input.current;
    const text = bodyText(value), start = area.selectionStart;
    if (text.length - (area.selectionEnd - start) + valueToInsert.length > maxLength) return;
    onChange(editBody(value, text.slice(0, start) + valueToInsert + text.slice(area.selectionEnd)));
    requestAnimationFrame(() => { area.focus(); area.setSelectionRange(start + valueToInsert.length, start + valueToInsert.length); });
  };
  return <div className="inspire-editor">
    <div className="inspire-toolbar" role="toolbar" aria-label="Post formatting">
      {[['bold', 'Bold', 'B'], ['italic', 'Italic', 'I'], ['underline', 'Underline', 'U']].map(([mark, label, text]) => <button key={mark} type="button" title={`${label} selected text`} aria-label={label} disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => format(mark)}>{text}</button>)}
      <button type="button" disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => format('bulleted_list', true)}>• List</button>
      <button type="button" disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => format('numbered_list', true)}>1. List</button>
      {['😀', '❤️', '💪'].map(item => <button type="button" key={item} disabled={disabled} aria-label={`Insert ${item}`} onMouseDown={event => event.preventDefault()} onClick={() => emoji(item)}>{item}</button>)}
    </div>
    <label htmlFor="inspire-body">Post text</label>
    <textarea id="inspire-body" ref={input} required rows={6} disabled={disabled} maxLength={maxLength} value={bodyText(value)} onChange={event => onChange(editBody(value, event.target.value))} aria-describedby="inspire-format-help" />
    <small id="inspire-format-help">Select text to format it. Use Enter for a new paragraph. Preview:</small>
    <div className="inspire-editor-preview"><RichBody body={value} /></div>
  </div>;
}
