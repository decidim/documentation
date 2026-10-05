window.Admin = window.Admin || {};

// Pure text operations for the AsciiDoc editor. Each function takes the current
// value and selection and returns `{ next, selStart, selEnd }`, or `null` when
// the edit would not change anything. The widget applies the result.
window.Admin.Transforms = (() => {
  const clamp = (position, value) => Math.min(position, value.length);

  const currentLine = (value, at) => {
    const position = clamp(at, value);
    const lineStart = value.lastIndexOf('\n', position - 1) + 1;
    const rawEnd = value.indexOf('\n', position);
    const lineEnd = rawEnd === -1 ? value.length : rawEnd;
    return { lineStart, lineEnd, line: value.slice(lineStart, lineEnd) };
  };

  // Wrap the selection (or place the cursor) in `prefix`/`suffix`.
  const wrap = (value, start, end, prefix, suffix) => {
    const hasSelection = end > start;
    const next =
      value.slice(0, start) + prefix + value.slice(start, end) + suffix + value.slice(end);
    const selStart = start + prefix.length;
    const selEnd = selStart + (hasSelection ? end - start : 0);
    return { next, selStart, selEnd };
  };

  const insertAtCursor = (value, at, text) => {
    const position = clamp(at, value);
    const next = value.slice(0, position) + text + value.slice(position);
    const cursor = position + text.length;
    return { next, selStart: cursor, selEnd: cursor };
  };

  const insertLine = (value, at, text) => {
    const position = clamp(at, value);
    const lineStart = value.lastIndexOf('\n', position - 1) + 1;
    const next = value.slice(0, lineStart) + text + value.slice(lineStart);
    const cursor = lineStart + text.length;
    return { next, selStart: cursor, selEnd: cursor };
  };

  // Set (or clear) the AsciiDoc heading marker on the current line.
  const setHeading = (value, at, level) => {
    const { lineStart, lineEnd, line } = currentLine(value, at);
    const headingMatch = line.match(/^=+\s+/);
    let nextLine;
    if (level === 'normal') {
      nextLine = headingMatch ? line.replace(/^=+\s+/, '') : line;
    } else {
      const prefix = `${'='.repeat(Number(level))} `;
      nextLine = headingMatch ? `${prefix}${line.replace(/^=+\s+/, '')}` : `${prefix}${line}`;
    }
    if (nextLine === line) return null;
    const next = value.slice(0, lineStart) + nextLine + value.slice(lineEnd);
    const cursor = lineStart + nextLine.length;
    return { next, selStart: cursor, selEnd: cursor };
  };

  // Strip common inline AsciiDoc markup from the selection. The selection may
  // be empty (cursor inside a marked span) or only cover the visible text,
  // so the span surrounding it is detected and unwrapped as a whole.
  const eraseStyles = (value, start, end) => {
    // Longest prefixes first so `[.underline]#...#`/`[.line-through]#...#`
    // win over the shorter `*`, `_` and backtick patterns.
    const patterns = [
      /\[\.underline\]#([\s\S]*?)#/g,
      /\[\.line-through\]#([\s\S]*?)#/g,
      /\*([\s\S]*?)\*/g,
      /_([\s\S]*?)_/g,
      /`([\s\S]*?)`/g,
    ];
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(value)) !== null) {
        const mStart = match.index;
        const mEnd = mStart + match[0].length;
        if (start < mStart || end > mEnd) {
          pattern.lastIndex = mEnd;
          continue;
        }
        const inner = match[1];
        const before = match[0].indexOf(inner);
        const after = match[0].length - before - inner.length;
        const next = value.slice(0, mStart) + inner + value.slice(mEnd);
        const selStart = Math.max(start - before, 0);
        const selEnd = Math.max(end - after, selStart);
        return { next, selStart, selEnd };
      }
    }
    return null;
  };

  // Delimited blocks require the markers to sit on their own lines. Start on a
  // fresh line, keep the selected text on its own line, and leave a trailing
  // newline so following content is not glued to the closing marker.
  const wrapBlock = (value, start, end, prefix, suffix, placeholder) => {
    const selected = value.slice(start, end) || placeholder;
    const leading = start > 0 && value[start - 1] !== '\n' ? '\n' : '';
    const block = `${leading}${prefix}${selected}${suffix}`;
    const next = value.slice(0, start) + block + value.slice(end);
    const selStart = start + leading.length + prefix.length;
    const selEnd = selStart + selected.length;
    return { next, selStart, selEnd };
  };

  // Indent or outdent the current line: change the nesting level of list
  // markers (`*`, `.`) or, on any other line, add/remove a leading 2-space
  // indentation so the buttons always give visible feedback.
  const indentLine = (value, at, dir) => {
    const { lineStart, lineEnd, line } = currentLine(value, at);
    const marker = line.match(/^(\*+|\.+)(\s|$)/);
    let nextLine;
    if (marker) {
      const run = marker[1];
      const nextRun = dir > 0 ? `${run[0]}${run}` : run.slice(1);
      if (nextRun === run) return null;
      nextLine = `${nextRun}${line.slice(run.length)}`;
    } else if (dir > 0) {
      nextLine = `  ${line}`;
    } else {
      if (!/^[ \t]/.test(line)) return null;
      nextLine = line.replace(/^( {1,2}|\t)/, '');
    }
    const next = value.slice(0, lineStart) + nextLine + value.slice(lineEnd);
    const cursor = lineStart + nextLine.length;
    return { next, selStart: cursor, selEnd: cursor };
  };

  return { currentLine, wrap, insertAtCursor, insertLine, setHeading, eraseStyles, wrapBlock, indentLine };
})();
