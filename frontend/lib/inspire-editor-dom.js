// Convert browser editing markup to the existing allowlisted document format.
const marksAllowed = ['bold', 'italic', 'underline'];
export function readEditorBody(root) {
  const blocks = [];
  function spans(node, marks = []) {
    if (node.nodeType === 3) return [{ text: node.textContent, marks }];
    const tag = node.tagName;
    if (['SCRIPT', 'STYLE', 'UL', 'OL'].includes(tag)) return [];
    if (tag === 'BR') return [{ text: '\n', marks }];
    const next = new Set(marks);
    if (
      ['B', 'STRONG'].includes(tag) ||
      Number(node.style?.fontWeight) >= 600 ||
      node.style?.fontWeight === 'bold'
    )
      next.add('bold');
    if (['I', 'EM'].includes(tag) || node.style?.fontStyle === 'italic')
      next.add('italic');
    if (tag === 'U' || node.style?.textDecoration?.includes('underline'))
      next.add('underline');
    return [...(node.childNodes || [])].flatMap((child) =>
      spans(
        child,
        marksAllowed.filter((mark) => next.has(mark))
      )
    );
  }
  function append(children, type = 'paragraph') {
    const lines = [[]];
    for (const span of children) {
      span.text.split('\n').forEach((text, index) => {
        if (index) lines.push([]);
        if (text) lines.at(-1).push({ text, marks: span.marks });
      });
    }
    if (lines.every((line) => !line.length)) lines.splice(1);
    for (const line of lines)
      blocks.push({ type, children: line.length ? line : [{ text: '', marks: [] }] });
  }
  function visitList(list) {
    for (const item of list.childNodes) {
      if (item.tagName !== 'LI') continue;
      append(spans(item), list.tagName === 'OL' ? 'numbered_list' : 'bulleted_list');
      for (const child of item.childNodes)
        if (['UL', 'OL'].includes(child.tagName)) visitList(child);
    }
  }
  let inline = [];
  for (const node of root.childNodes) {
    if (['UL', 'OL', 'P', 'DIV'].includes(node.tagName)) {
      if (inline.length) {
        append(inline);
        inline = [];
      }
      if (['UL', 'OL'].includes(node.tagName)) visitList(node);
      else append(spans(node));
    } else inline.push(...spans(node));
  }
  if (inline.length) append(inline);
  return {
    version: 1,
    blocks: blocks.length
      ? blocks
      : [{ type: 'paragraph', children: [{ text: '', marks: [] }] }],
  };
}

export function writeEditorBody(root, body) {
  const doc = root.ownerDocument;
  const nodes = [];
  for (const block of body.blocks) {
    const listTag =
      block.type === 'bulleted_list'
        ? 'UL'
        : block.type === 'numbered_list'
          ? 'OL'
          : null;
    const paragraph = doc.createElement(listTag ? 'li' : 'p');
    for (const span of block.children) {
      let node = doc.createTextNode(span.text);
      for (const [mark, tag] of [
        ['bold', 'strong'],
        ['italic', 'em'],
        ['underline', 'u'],
      ]) {
        if (span.marks.includes(mark)) {
          const wrapper = doc.createElement(tag);
          wrapper.append(node);
          node = wrapper;
        }
      }
      paragraph.append(node);
    }
    if (block.children.every((span) => !span.text))
      paragraph.append(doc.createElement('br'));
    if (listTag) {
      if (nodes.at(-1)?.tagName !== listTag) nodes.push(doc.createElement(listTag));
      nodes.at(-1).append(paragraph);
    } else nodes.push(paragraph);
  }
  root.replaceChildren(...nodes);
}
