const { CMS, initCMS: init, h, createClass } = window;

// Decap has no built-in AsciiDoc support, and Antora pages carry no front
// matter. This custom formatter treats the whole file as one raw text body so
// editing never injects or rewrites front matter.
CMS.registerCustomFormat('adoc', 'adoc', {
  fromFile: (text) => ({ body: text }),
  toFile: (value) => value.body,
});

const basename = (path) => String(path).split('/').pop().split('\\').pop();

// Remix icons (same set used by the Decidim editor toolbar).
const ICONS = {
  bold: 'M8 11H12.5C13.8807 11 15 9.88071 15 8.5C15 7.11929 13.8807 6 12.5 6H8V11ZM18 15.5C18 17.9853 15.9853 20 13.5 20H6V4H12.5C14.9853 4 17 6.01472 17 8.5C17 9.70431 16.5269 10.7981 15.7564 11.6058C17.0979 12.3847 18 13.837 18 15.5ZM8 13V18H13.5C14.8807 18 16 16.8807 16 15.5C16 14.1193 14.8807 13 13.5 13H8Z',
  italic:
    'M15 20H7V18H9.92661L12.0425 6H9V4H17V6H14.0734L11.9575 18H15V20Z',
  underline:
    'M8 3V12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12V3H18V12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12V3H8ZM4 20H20V22H4V20Z',
  'text-wrap':
    'M15 18H16.5C17.8807 18 19 16.8807 19 15.5C19 14.1193 17.8807 13 16.5 13H3V11H16.5C18.9853 11 21 13.0147 21 15.5C21 17.9853 18.9853 20 16.5 20H15V22L11 19L15 16V18ZM3 4H21V6H3V4ZM9 18V20H3V18H9Z',
  'list-ordered':
    'M8 4H21V6H8V4ZM5 3V6H6V7H3V6H4V4H3V3H5ZM3 14V11.5H5V11H3V10H6V12.5H4V13H6V14H3ZM5 19.5H3V18.5H5V18H3V17H6V21H3V20H5V19.5ZM8 11H21V13H8V11ZM8 18H21V20H8V18Z',
  'list-unordered':
    'M8 4H21V6H8V4ZM4.5 6.5C3.67157 6.5 3 5.82843 3 5C3 4.17157 3.67157 3.5 4.5 3.5C5.32843 3.5 6 4.17157 6 5C6 5.82843 5.32843 6.5 4.5 6.5ZM4.5 13.5C3.67157 13.5 3 12.8284 3 12C3 11.1716 3.67157 10.5 4.5 10.5C5.32843 10.5 6 11.1716 6 12C6 12.8284 5.32843 13.5 4.5 13.5ZM4.5 20.4C3.67157 20.4 3 19.7284 3 18.9C3 18.0716 3.67157 17.4 4.5 17.4C5.32843 17.4 6 18.0716 6 18.9C6 19.7284 5.32843 20.4 4.5 20.4ZM8 11H21V13H8V11ZM8 18H21V20H8V18Z',
  link: 'M18.3638 15.5355L16.9496 14.1213L18.3638 12.7071C20.3164 10.7545 20.3164 7.58866 18.3638 5.63604C16.4112 3.68341 13.2453 3.68341 11.2927 5.63604L9.87849 7.05025L8.46428 5.63604L9.87849 4.22182C12.6122 1.48815 17.0443 1.48815 19.778 4.22182C22.5117 6.95549 22.5117 11.3876 19.778 14.1213L18.3638 15.5355ZM15.5353 18.364L14.1211 19.7782C11.3875 22.5118 6.95531 22.5118 4.22164 19.7782C1.48797 17.0445 1.48797 12.6123 4.22164 9.87868L5.63585 8.46446L7.05007 9.87868L5.63585 11.2929C3.68323 13.2455 3.68323 16.4113 5.63585 18.364C7.58847 20.3166 10.7543 20.3166 12.7069 18.364L14.1211 16.9497L15.5353 18.364ZM14.8282 7.75736L16.2425 9.17157L9.17139 16.2426L7.75717 14.8284L14.8282 7.75736Z',
  'eraser-line':
    'M8.58564 8.85449L3.63589 13.8042L8.83021 18.9985L9.99985 18.9978V18.9966H11.1714L14.9496 15.2184L8.58564 8.85449ZM9.99985 7.44027L16.3638 13.8042L19.1922 10.9758L12.8283 4.61185L9.99985 7.44027ZM13.9999 18.9966H20.9999V20.9966H11.9999L8.00229 20.9991L1.51457 14.5113C1.12405 14.1208 1.12405 13.4877 1.51457 13.0971L12.1212 2.49053C12.5117 2.1 13.1449 2.1 13.5354 2.49053L21.3136 10.2687C21.7041 10.6592 21.7041 11.2924 21.3136 11.6829L13.9999 18.9966Z',
  'code-line':
    'M23 12L15.9289 19.0711L14.5147 17.6569L20.1716 12L14.5147 6.34317L15.9289 4.92896L23 12ZM3.82843 12L9.48528 17.6569L8.07107 19.0711L1 12L8.07107 4.92896L9.48528 6.34317L3.82843 12Z',
  'double-quotes-l':
    'M4.58341 17.3211C3.55316 16.2274 3 15 3 13.0103C3 9.51086 5.45651 6.37366 9.03059 4.82318L9.92328 6.20079C6.58804 8.00539 5.93618 10.346 5.67564 11.822C6.21263 11.5443 6.91558 11.4466 7.60471 11.5105C9.40908 11.6778 10.8312 13.159 10.8312 15C10.8312 16.933 9.26416 18.5 7.33116 18.5C6.2581 18.5 5.23196 18.0095 4.58341 17.3211ZM14.5834 17.3211C13.5532 16.2274 13 15 13 13.0103C13 9.51086 15.4565 6.37366 19.0306 4.82318L19.9233 6.20079C16.588 8.00539 15.9362 10.346 15.6756 11.822C16.2126 11.5443 16.9156 11.4466 17.6047 11.5105C19.4091 11.6778 20.8312 13.159 20.8312 15C20.8312 16.933 19.2642 18.5 17.3312 18.5C16.2581 18.5 15.232 18.0095 14.5834 17.3211Z',
  'indent-increase':
    'M3 4H21V6H3V4ZM3 19H21V21H3V19ZM11 14H21V16H11V14ZM11 9H21V11H11V9ZM7 12.5L3 16V9L7 12.5Z',
  'indent-decrease':
    'M3 4H21V6H3V4ZM3 19H21V21H3V19ZM11 14H21V16H11V14ZM11 9H21V11H11V9ZM3 12.5L7 9V16L3 12.5Z',
  'video-line':
    'M3 3.9934C3 3.44476 3.44495 3 3.9934 3H20.0066C20.5552 3 21 3.44495 21 3.9934V20.0066C21 20.5552 20.5551 21 20.0066 21H3.9934C3.44476 21 3 20.5551 3 20.0066V3.9934ZM5 5V19H19V5H5ZM10.6219 8.41459L15.5008 11.6672C15.6846 11.7897 15.7343 12.0381 15.6117 12.2219C15.5824 12.2658 15.5447 12.3035 15.5008 12.3328L10.6219 15.5854C10.4381 15.708 10.1897 15.6583 10.0672 15.4745C10.0234 15.4088 10 15.3316 10 15.2526V8.74741C10 8.52649 10.1791 8.34741 10.4 8.34741C10.479 8.34741 10.5562 8.37078 10.6219 8.41459Z',
  'image-line':
    'M2.9918 21C2.44405 21 2 20.5551 2 20.0066V3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918ZM20 15V5H4V19L14 9L20 15ZM20 17.8284L14 11.8284L6.82843 19H20V17.8284ZM8 11C6.89543 11 6 10.1046 6 9C6 7.89543 6.89543 7 8 7C9.10457 7 10 7.89543 10 9C10 10.1046 9.10457 11 8 11Z',
};

// Toolbar layout mirrors the Decidim rich text editor toolbar order:
// heading | bold, italic, underline, hard break | ordered & bullet list |
// link, erase styles | code block, blockquote | indent, outdent | video, image.
const TOOLBAR_GROUPS = [
  ['heading'],
  ['bold', 'italic', 'underline', 'hardBreak'],
  ['orderedList', 'bulletList'],
  ['link', 'eraseStyles'],
  ['codeBlock', 'blockquote'],
  ['indent', 'outdent'],
  ['videoEmbed', 'image'],
];

const TOOLBAR_CONTROLS = {
  heading: { type: 'select', label: 'Heading' },
  bold: { icon: 'bold', label: 'Bold' },
  italic: { icon: 'italic', label: 'Italic' },
  underline: { icon: 'underline', label: 'Underline' },
  hardBreak: { icon: 'text-wrap', label: 'Hard break' },
  orderedList: { icon: 'list-ordered', label: 'Ordered list' },
  bulletList: { icon: 'list-unordered', label: 'Bullet list' },
  link: { icon: 'link', label: 'Link' },
  eraseStyles: { icon: 'eraser-line', label: 'Erase styles' },
  codeBlock: { icon: 'code-line', label: 'Code block' },
  blockquote: { icon: 'double-quotes-l', label: 'Blockquote' },
  indent: { icon: 'indent-increase', label: 'Indent' },
  outdent: { icon: 'indent-decrease', label: 'Outdent' },
  videoEmbed: { icon: 'video-line', label: 'Video embed' },
  image: { icon: 'image-line', label: 'Image' },
};

const HEADING_OPTIONS = [
  ['normal', 'Normal'],
  ['2', 'Heading 2'],
  ['3', 'Heading 3'],
  ['4', 'Heading 4'],
  ['5', 'Heading 5'],
  ['6', 'Heading 6'],
];

// Raw AsciiDoc editor (the markdown widget would mangle AsciiDoc via its
// markdown parser) with a formatting toolbar backed by the media library.
// Inserted images follow the repo convention: `image::<filename>[alt]`,
// resolved by Antora against the current module's assets/images.
const AdocControl = createClass({
  getInitialState() {
    return { selection: { start: 0, end: 0 }, lastCursor: 0 };
  },

  value() {
    return this.props.value || '';
  },

  // Fill the remaining viewport height below the textarea so the editor
  // adapts to the available screen size.
  updateHeight() {
    const el = this.textarea;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    const available = window.innerHeight - top - 16;
    el.style.height = `${Math.max(240, available)}px`;
  },

  componentDidMount() {
    this.updateHeight();
    window.addEventListener('resize', this.updateHeight);
  },

  saveSelection() {
    const el = this.textarea;
    if (!el) return;
    this.setState({
      selection: { start: el.selectionStart, end: el.selectionEnd },
      lastCursor: el.selectionStart,
    });
  },

  restoreFocus(start, end) {
    const el = this.textarea;
    if (!el) return;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, end);
    });
  },

  // Wrap the current selection (or place the cursor) in `prefix`/`suffix`.
  wrap(prefix, suffix) {
    const value = this.value();
    const { start, end } = this.state.selection;
    const hasSelection = end > start;
    const next =
      value.slice(0, start) + prefix + value.slice(start, end) + suffix + value.slice(end);
    this.props.onChange(next);
    const selStart = start + prefix.length;
    const selEnd = selStart + (hasSelection ? end - start : 0);
    this.setState({ lastCursor: selEnd });
    this.restoreFocus(selStart, selEnd);
  },

  insertAtCursor(text) {
    const value = this.value();
    const at = Math.min(this.state.lastCursor, value.length);
    const next = value.slice(0, at) + text + value.slice(at);
    this.props.onChange(next);
    const cursor = at + text.length;
    this.setState({ lastCursor: cursor });
    this.restoreFocus(cursor, cursor);
  },

  insertLine(text) {
    const value = this.value();
    const at = Math.min(this.state.lastCursor, value.length);
    const lineStart = value.lastIndexOf('\n', at - 1) + 1;
    const next = value.slice(0, lineStart) + text + value.slice(lineStart);
    this.props.onChange(next);
    const cursor = lineStart + text.length;
    this.setState({ lastCursor: cursor });
    this.restoreFocus(cursor, cursor);
  },

  componentDidUpdate() {
    const mediaPath = this.props.mediaPaths && this.props.mediaPaths.get(this.props.forID);
    if (mediaPath) {
      this.insertAtCursor(`image::${basename(mediaPath)}[Alt text]`);
      this.props.onRemoveInsertedMedia(this.props.forID);
    }
  },

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateHeight);
    if (this.props.onRemoveMediaControl) {
      this.props.onRemoveMediaControl(this.props.forID);
    }
  },

  openMediaLibrary() {
    this.saveSelection();
    this.props.onOpenMediaLibrary({
      controlID: this.props.forID,
      forImage: true,
      allowMultiple: false,
      field: this.props.field,
    });
  },

  insertLink() {
    const url = window.prompt('Link URL (e.g. https://example.com or docs/guide.adoc)');
    if (!url) return;
    const label = window.prompt('Link label', 'Link text') || url;
    const target = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `link:${url}`;
    this.insertAtCursor(`${target}[${label}]`);
  },

  insertVideo() {
    const url = window.prompt('Video URL');
    if (url) {
      this.insertAtCursor(`video::${url}[]`);
    }
  },

  // Set (or clear) the AsciiDoc heading marker on the current line.
  setHeading(level) {
    const value = this.value();
    const at = Math.min(this.state.lastCursor, value.length);
    const lineStart = value.lastIndexOf('\n', at - 1) + 1;
    const rawEnd = value.indexOf('\n', at);
    const lineEnd = rawEnd === -1 ? value.length : rawEnd;
    const line = value.slice(lineStart, lineEnd);
    const headingMatch = line.match(/^=+\s+/);
    let nextLine;
    if (level === 'normal') {
      nextLine = headingMatch ? line.replace(/^=+\s+/, '') : line;
    } else {
      const prefix = `${'='.repeat(Number(level))} `;
      nextLine = headingMatch ? `${prefix}${line.replace(/^=+\s+/, '')}` : `${prefix}${line}`;
    }
    if (nextLine === line) return;
    this.props.onChange(value.slice(0, lineStart) + nextLine + value.slice(lineEnd));
    const cursor = lineStart + nextLine.length;
    this.setState({ lastCursor: cursor });
    this.restoreFocus(cursor, cursor);
  },

  // Strip common inline AsciiDoc markup from the selection.
  eraseStyles() {
    const value = this.value();
    const { start, end } = this.state.selection;
    const selected = value.slice(start, end);
    const cleaned = selected
      .replace(/^\[\.underline\]#([\s\S]*?)#$/, '$1')
      .replace(/^\[\.line-through\]#([\s\S]*?)#$/, '$1')
      .replace(/^\*([\s\S]*?)\*$/, '$1')
      .replace(/^_([\s\S]*?)_$/, '$1')
      .replace(/^`([\s\S]*?)`$/, '$1');
    if (cleaned === selected) return;
    this.props.onChange(value.slice(0, start) + cleaned + value.slice(end));
    this.restoreFocus(start, start + cleaned.length);
  },

  // Wrap the selection in an AsciiDoc listing block.
  codeBlock() {
    this.wrapBlock('[source]\n----\n', '\n----', 'code');
  },

  // Wrap the selection in an AsciiDoc quote block.
  blockquote() {
    this.wrapBlock('[quote]\n____\n', '\n____', 'quote');
  },

  wrapBlock(prefix, suffix, placeholder) {
    const value = this.value();
    const { start, end } = this.state.selection;
    const selected = value.slice(start, end) || placeholder;
    const block = `${prefix}${selected}${suffix}`;
    const next = value.slice(0, start) + block + value.slice(end);
    this.props.onChange(next);
    const selStart = start + prefix.length;
    const selEnd = selStart + selected.length;
    this.setState({ lastCursor: selEnd });
    this.restoreFocus(selStart, selEnd);
  },

  // Add or remove one list marker level on the current line.
  indentList(dir) {
    const value = this.value();
    const at = Math.min(this.state.lastCursor, value.length);
    const lineStart = value.lastIndexOf('\n', at - 1) + 1;
    const rawEnd = value.indexOf('\n', at);
    const lineEnd = rawEnd === -1 ? value.length : rawEnd;
    const line = value.slice(lineStart, lineEnd);
    const marker = line.match(/^(\*+|\.+)(\s|$)/);
    if (!marker) return;
    const run = marker[1];
    const nextRun = dir > 0 ? `${run[0]}${run}` : run.slice(1);
    if (nextRun === run) return;
    const nextLine = `${nextRun}${line.slice(run.length)}`;
    this.props.onChange(value.slice(0, lineStart) + nextLine + value.slice(lineEnd));
    const cursor = lineStart + nextLine.length;
    this.setState({ lastCursor: cursor });
    this.restoreFocus(cursor, cursor);
  },

  runControl(name) {
    switch (name) {
      case 'bold':
        this.wrap('*', '*');
        break;
      case 'italic':
        this.wrap('_', '_');
        break;
      case 'underline':
        this.wrap('[.underline]#', '#');
        break;
      case 'hardBreak':
        this.insertAtCursor(' +\n');
        break;
      case 'orderedList':
        this.insertLine('. ');
        break;
      case 'bulletList':
        this.insertLine('* ');
        break;
      case 'link':
        this.insertLink();
        break;
      case 'eraseStyles':
        this.eraseStyles();
        break;
      case 'codeBlock':
        this.codeBlock();
        break;
      case 'blockquote':
        this.blockquote();
        break;
      case 'indent':
        this.indentList(1);
        break;
      case 'outdent':
        this.indentList(-1);
        break;
      case 'videoEmbed':
        this.insertVideo();
        break;
      case 'image':
        this.openMediaLibrary();
        break;
    }
  },

  handleChange(e) {
    this.setState({ lastCursor: e.target.selectionStart });
    this.props.onChange(e.target.value);
  },

  render() {
    return h(
      'div',
      { className: 'adoc-widget' },
      h(
        'div',
        { className: 'adoc-toolbar' },
        TOOLBAR_GROUPS.map((group, groupIndex) =>
          h(
            'div',
            { key: groupIndex, className: 'adoc-toolbar-group' },
            group.map((name) => {
              const control = TOOLBAR_CONTROLS[name];
              if (control.type === 'select') {
                return h(
                  'select',
                  {
                    key: name,
                    className: 'adoc-select',
                    'aria-label': control.label,
                    title: control.label,
                    defaultValue: 'normal',
                    onChange: (e) => this.setHeading(e.target.value),
                  },
                  HEADING_OPTIONS.map(([value, label]) =>
                    h('option', { key: value, value }, label),
                  ),
                );
              }
              return h(
                'button',
                {
                  type: 'button',
                  key: name,
                  className: 'adoc-btn',
                  'aria-label': control.label,
                  title: control.label,
                  onMouseDown: (e) => e.preventDefault(),
                  onClick: () => this.runControl(name),
                },
                h('svg', {
                  className: 'adoc-icon',
                  viewBox: '0 0 24 24',
                  fill: 'currentColor',
                  'aria-hidden': true,
                  dangerouslySetInnerHTML: { __html: `<path d="${ICONS[control.icon]}"/>` },
                }),
              );
            }),
          ),
        ),
      ),
      h('textarea', {
        id: this.props.forID,
        className: 'adoc-textarea',
        value: this.props.value || '',
        onChange: this.handleChange,
        onSelect: this.saveSelection,
        onClick: this.saveSelection,
        onKeyUp: this.saveSelection,
        ref: (el) => {
          this.textarea = el;
        },
      }),
    );
  },
});
CMS.registerWidget('adoc', AdocControl);

const processor = window.Asciidoctor ? window.Asciidoctor() : null;

// Antora-only constructs the in-browser renderer cannot resolve, and the
// contribute module's images are built to en/develop/contribute/_images.
const IMAGES_DIR = '/en/develop/contribute/_images';
const renderAsciiDoc = (source) => {
  if (!processor) return '';
  const previewable = source
    .replace(/^include::[^\n]*$/gm, '')
    .replace(/xref:([^\[\]]+)\[([^\]]*)\]/g, (_, target, label) => label || target);
  return processor.convert(previewable, {
    safe: 'safe',
    attributes: { imagesdir: IMAGES_DIR, showtitle: true },
  });
};

// Approximate, instant preview. For an exact Antora build use the "View
// Preview" deploy preview link provided by the backend.
const DocPreview = createClass({
  render() {
    const source = this.props.entry.getIn(['data', 'body']) || '';
    const html = renderAsciiDoc(source);
    return h('div', {
      className: 'doc-preview',
      dangerouslySetInnerHTML: { __html: html || `<pre>${source}</pre>` },
    });
  },
});

CMS.registerPreviewTemplate('contribute', DocPreview);
CMS.registerPreviewStyle('/_/css/styles.css');
CMS.registerPreviewStyle('/_/css/icons.css');

// Point Decap at config.yml using the directory computed in index.html, so it
// works whether the admin is served as /admin, /admin/ or from a subpath.
const configLink = document.createElement('link');
configLink.rel = 'cms-config-url';
configLink.type = 'text/yaml';
configLink.href = `${window.ADMIN_DIR}config.yml`;
document.head.appendChild(configLink);

init();