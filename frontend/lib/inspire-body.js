export const emptyBody = () => ({
  version: 1,
  blocks: [{ type: 'paragraph', children: [{ text: '', marks: [] }] }],
});
export const bodyText = (body) =>
  body.blocks
    .map((block) => block.children.map((span) => span.text).join(''))
    .join('\n');
const marksAllowed = ['bold', 'italic', 'underline'];

function unpack(body) {
  const chars = [];
  const types = [];
  body.blocks.forEach((block, index) => {
    if (index) chars.push({ text: '\n', marks: [] });
    types.push(block.type);
    block.children.forEach((span) => {
      for (let i = 0; i < span.text.length; i++)
        chars.push({
          text: span.text[i],
          marks: span.marks.filter((mark) => marksAllowed.includes(mark)),
        });
    });
  });
  return { chars, types };
}

function pack(chars, types) {
  const blocks = [{ type: types[0] || 'paragraph', children: [] }];
  chars.forEach((char) => {
    if (char.text === '\n') {
      blocks.push({ type: types[blocks.length] || 'paragraph', children: [] });
      return;
    }
    const children = blocks[blocks.length - 1].children;
    const last = children[children.length - 1];
    const marks = marksAllowed.filter((mark) => char.marks.includes(mark));
    if (last && JSON.stringify(last.marks) === JSON.stringify(marks))
      last.text += char.text;
    else children.push({ text: char.text, marks });
  });
  blocks.forEach((block) => {
    if (!block.children.length) block.children.push({ text: '', marks: [] });
  });
  return { version: 1, blocks };
}

export function editBody(body, text) {
  const old = bodyText(body);
  let start = 0,
    end = old.length,
    nextEnd = text.length;
  while (start < end && start < nextEnd && old[start] === text[start]) start++;
  while (end > start && nextEnd > start && old[end - 1] === text[nextEnd - 1]) {
    end--;
    nextEnd--;
  }
  const { chars, types } = unpack(body);
  const inherited = chars[Math.max(0, start - 1)]?.marks || [];
  const inserted = text
    .slice(start, nextEnd)
    .split('')
    .map((text) => ({ text, marks: inherited }));
  const firstLine = old.slice(0, start).split('\n').length - 1;
  const removedLines = old.slice(start, end).split('\n').length - 1;
  const newLines = text.slice(start, nextEnd).split('\n').length - 1;
  types.splice(
    firstLine + 1,
    removedLines,
    ...Array(newLines).fill(types[firstLine] || 'paragraph')
  );
  return pack([...chars.slice(0, start), ...inserted, ...chars.slice(end)], types);
}

export function markBody(body, start, end, mark) {
  if (!marksAllowed.includes(mark) || start === end) return body;
  const { chars, types } = unpack(body);
  const selected = chars.slice(start, end).filter((char) => char.text !== '\n');
  const remove = selected.length && selected.every((char) => char.marks.includes(mark));
  return pack(
    chars.map((char, index) =>
      index < start || index >= end
        ? char
        : {
            text: char.text,
            marks: remove
              ? char.marks.filter((value) => value !== mark)
              : [...new Set([...char.marks, mark])],
          }
    ),
    types
  );
}

export function formatState(body, start, end) {
  const { chars } = unpack(body);
  const text = bodyText(body);
  const selected =
    start === end
      ? [
          chars[start > 0 && chars[start - 1]?.text !== '\n' ? start - 1 : start],
        ].filter(Boolean)
      : chars.slice(start, end).filter((char) => char.text !== '\n');
  const first = text.slice(0, start).split('\n').length - 1;
  const last = text.slice(0, Math.max(start, end - 1)).split('\n').length - 1;
  const blocks = body.blocks.slice(first, last + 1);
  return {
    ...Object.fromEntries(
      marksAllowed.map((mark) => [
        mark,
        selected.length > 0 && selected.every((char) => char.marks.includes(mark)),
      ])
    ),
    bulleted_list:
      blocks.length > 0 && blocks.every((block) => block.type === 'bulleted_list'),
    numbered_list:
      blocks.length > 0 && blocks.every((block) => block.type === 'numbered_list'),
  };
}

export function listBody(body, start, end, type) {
  const text = bodyText(body);
  const first = text.slice(0, start).split('\n').length - 1;
  const last = text.slice(0, Math.max(start, end - 1)).split('\n').length - 1;
  const remove = body.blocks
    .slice(first, last + 1)
    .every((block) => block.type === type);
  return {
    ...body,
    blocks: body.blocks.map((block, index) =>
      index < first || index > last
        ? block
        : { ...block, type: remove ? 'paragraph' : type }
    ),
  };
}
