'use client';

function Spans({ children }) {
  return children.map((span, index) => {
    let text = span.text;
    if (span.marks?.includes('bold')) text = <strong>{text}</strong>;
    if (span.marks?.includes('italic')) text = <em>{text}</em>;
    if (span.marks?.includes('underline')) text = <u>{text}</u>;
    return <span key={index}>{text}</span>;
  });
}

export default function RichBody({ body, fallback = '' }) {
  if (!body?.blocks) return <p style={{ whiteSpace: 'pre-wrap' }}>{fallback}</p>;
  const groups = [];
  body.blocks.forEach((block) => {
    if (
      !['paragraph', 'bulleted_list', 'numbered_list'].includes(block.type) ||
      !Array.isArray(block.children)
    )
      return;
    const last = groups[groups.length - 1];
    if (block.type !== 'paragraph' && last?.type === block.type)
      last.blocks.push(block);
    else groups.push({ type: block.type, blocks: [block] });
  });
  return (
    <div
      className="inspire-rich-body"
      style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
    >
      {groups.map((group, index) => {
        if (group.type === 'paragraph')
          return (
            <p key={index}>
              <Spans>{group.blocks[0].children}</Spans>
              {group.blocks[0].children.every((span) => !span.text) && <br />}
            </p>
          );
        const List = group.type === 'numbered_list' ? 'ol' : 'ul';
        return (
          <List key={index}>
            {group.blocks.map((block, item) => (
              <li key={item}>
                <Spans>{block.children}</Spans>
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
