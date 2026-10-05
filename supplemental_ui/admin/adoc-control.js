window.Admin = window.Admin || {};

// Raw AsciiDoc editor (the markdown field type would mangle AsciiDoc via its
// parser) with a formatting toolbar backed by the media library. Inserted
// images follow the repo convention: `image::<filename>[alt]`, resolved by
// Antora against the current module's assets/images.
window.Admin.AdocControl = (() => {
  const { h, createClass } = window;
  const { parse, serialize, basename } = window.Admin.UploadBlock;
  const { ICONS, TOOLBAR_GROUPS, TOOLBAR_CONTROLS, HEADING_OPTIONS } = window.Admin.EditorConfig;
  const Transforms = window.Admin.Transforms;

  const UNDO_LIMIT = 200;
  const EDITOR_MIN_HEIGHT = 200;
  const EDITOR_BOTTOM_GAP = 16;

  const TOOLBAR_ACTIONS = {
    undo: (control) => control.undo(),
    redo: (control) => control.redo(),
    bold: (control) => control.wrap('*', '*'),
    italic: (control) => control.wrap('_', '_'),
    underline: (control) => control.wrap('[.underline]#', '#'),
    hardBreak: (control) => control.insertAtCursor(' +\n'),
    orderedList: (control) => control.insertLine('. '),
    bulletList: (control) => control.insertLine('* '),
    link: (control) => control.insertLink(),
    eraseStyles: (control) => control.eraseStyles(),
    codeBlock: (control) => control.codeBlock(),
    blockquote: (control) => control.blockquote(),
    indent: (control) => control.indentLine(1),
    outdent: (control) => control.indentLine(-1),
    videoEmbed: (control) => control.insertVideo(),
    image: (control) => control.insertImage(),
  };

  const AdocControl = createClass({
    getInitialState() {
      const { body, refs } = parse(this.props.value || '');
      return {
        value: body,
        uploadRefs: refs,
        selection: { start: 0, end: 0 },
        lastCursor: 0,
        undoStack: [],
        redoStack: [],
      };
    },

    // The textarea value is owned by local state while editing. Sveltia updates the
    // parent value asynchronously from a Svelte effect, so a controlled textarea
    // would otherwise be restored to the stale parent value right after each
    // keystroke, moving the caret to the end (and scrolling the editor to the
    // bottom on Enter). External changes, such as revert or copy, are adopted here;
    // the widget's own value, which ends with the hidden upload block, is ignored.
    componentWillReceiveProps(nextProps) {
      if ((nextProps.value || '') !== this.modelValue()) {
        const { body, refs } = parse(nextProps.value || '');
        this.setState({ value: body, uploadRefs: refs });
      }
    },

    value() {
      return this.state.value || '';
    },

    uploadRefs() {
      return this.state.uploadRefs || [];
    },

    // The value handed to Sveltia: the visible body plus the hidden upload block
    // that makes Sveltia upload newly picked images.
    modelValue() {
      return this.value() + serialize(this.uploadRefs());
    },

    // Find the editor pane's scroll container. Sveltia renders fields in a
    // scrollable content area rather than the page, so size against it instead
    // of the window.
    scrollParent() {
      let node = this.textarea && this.textarea.parentElement;
      while (node) {
        const { overflowY } = window.getComputedStyle(node);
        if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
          return node;
        }
        node = node.parentElement;
      }
      return document.documentElement;
    },

    // Fill the remaining height of the editor pane below the toolbar so the
    // textarea scrolls internally instead of growing the pane (which would make
    // the whole pane scroll on every keystroke).
    updateHeight() {
      const el = this.textarea;
      if (!el) return;
      const parent = this.scrollParent();
      const offset = el.getBoundingClientRect().top - parent.getBoundingClientRect().top;
      const available = parent.clientHeight - Math.max(0, offset) - EDITOR_BOTTOM_GAP;
      el.style.height = `${Math.max(EDITOR_MIN_HEIGHT, available)}px`;
    },

    componentDidMount() {
      this.updateHeight();
      window.addEventListener('resize', this.updateHeight);
      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => this.updateHeight());
        this.resizeObserver.observe(this.scrollParent());
      }
    },

    componentWillUnmount() {
      window.removeEventListener('resize', this.updateHeight);
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
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

    wrap(prefix, suffix) {
      const el = this.textarea;
      this.commit(Transforms.wrap(this.value(), el.selectionStart, el.selectionEnd, prefix, suffix));
    },

    insertAtCursor(text, extraRefs = []) {
      const el = this.textarea;
      const result = Transforms.insertAtCursor(this.value(), el.selectionStart, text);
      this.commit(result, [...this.uploadRefs(), ...extraRefs]);
    },

    insertLine(text) {
      this.commit(Transforms.insertLine(this.value(), this.textarea.selectionStart, text));
    },

    // Open Sveltia's built-in file picker (existing file, upload, URL or stock
    // photo). Every image is inserted with the canonical Antora
    // `image::ROOT:<filename>[Alt text]` target, so the editor and the saved
    // source stay consistent for existing and newly uploaded files alike.
    //
    // A fresh upload additionally registers a hidden upload reference. Sveltia
    // only uploads files whose blob: URL appears in the saved value, so the
    // reference is appended past a sentinel that the editor never displays and
    // the `adoc` formatter strips before saving.
    async insertImage() {
      this.saveSelection();
      const picked = await this.props.pickFile({ kind: 'image', multiple: false });
      if (!picked) return;
      const { fileName, refs } = this.resolvePickedImage(picked);
      this.insertAtCursor(`image::ROOT:${fileName}[Alt text]`, refs);
    },

    // A freshly uploaded file is returned with a blob: URL; an existing asset or
    // external URL comes back as a public path. Only blob URLs need uploading.
    resolvePickedImage(picked) {
      const isUpload = typeof picked.value === 'string' && picked.value.startsWith('blob:');
      const fileName = isUpload && picked.file ? picked.file.name : basename(picked.value);
      const refs = isUpload ? [{ fileName, blobUrl: picked.value }] : [];
      return { fileName, refs };
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

    setHeading(level) {
      this.commit(Transforms.setHeading(this.value(), this.textarea.selectionStart, level));
    },

    eraseStyles() {
      const el = this.textarea;
      this.commit(Transforms.eraseStyles(this.value(), el.selectionStart, el.selectionEnd));
    },

    // Wrap the selection in an AsciiDoc listing block.
    codeBlock() {
      this.wrapBlock('[source]\n----\n', '\n----\n', 'code');
    },

    // Wrap the selection in an AsciiDoc quote block.
    blockquote() {
      this.wrapBlock('[quote]\n____\n', '\n____\n', 'quote');
    },

    wrapBlock(prefix, suffix, placeholder) {
      const el = this.textarea;
      this.commit(
        Transforms.wrapBlock(
          this.value(),
          el.selectionStart,
          el.selectionEnd,
          prefix,
          suffix,
          placeholder,
        ),
      );
    },

    indentLine(dir) {
      this.commit(Transforms.indentLine(this.value(), this.textarea.selectionStart, dir));
    },

    runControl(name) {
      TOOLBAR_ACTIONS[name]?.(this);
    },

    // Record the current value on the undo stack (deduplicating consecutive
    // identical states, capped at UNDO_LIMIT entries) and clear the redo stack.
    pushUndo(current) {
      const { undoStack } = this.state;
      const nextUndo =
        undoStack[undoStack.length - 1] === current ? undoStack : [...undoStack, current];
      return nextUndo.slice(-UNDO_LIMIT);
    },

    // Apply an edit result and restore the given selection. Sveltia receives the
    // visible body plus the hidden upload-reference block.
    commit(result, nextRefs) {
      if (!result) return;
      const current = this.value();
      const refs = nextRefs ?? this.uploadRefs();
      this.props.onChange(result.next + serialize(refs));
      this.setState({
        value: result.next,
        uploadRefs: refs,
        undoStack: this.pushUndo(current),
        redoStack: [],
        selection: { start: result.selStart, end: result.selEnd },
        lastCursor: result.selEnd,
      });
      this.restoreFocus(result.selStart, result.selEnd);
    },

    undo() {
      const { undoStack, redoStack, lastCursor } = this.state;
      if (!undoStack.length) return;
      const current = this.value();
      const previous = undoStack[undoStack.length - 1];
      const cursor = Math.min(previous.length, lastCursor);
      const refs = this.uploadRefs();
      this.props.onChange(previous + serialize(refs));
      this.setState({
        value: previous,
        undoStack: undoStack.slice(0, -1),
        redoStack: [...redoStack, current],
        selection: { start: 0, end: 0 },
        lastCursor: cursor,
      });
      this.restoreFocus(cursor, cursor);
    },

    redo() {
      const { undoStack, redoStack, lastCursor } = this.state;
      if (!redoStack.length) return;
      const current = this.value();
      const next = redoStack[redoStack.length - 1];
      const cursor = Math.min(next.length, lastCursor);
      const refs = this.uploadRefs();
      this.props.onChange(next + serialize(refs));
      this.setState({
        value: next,
        undoStack: [...undoStack, current],
        redoStack: redoStack.slice(0, -1),
        selection: { start: 0, end: 0 },
        lastCursor: cursor,
      });
      this.restoreFocus(cursor, cursor);
    },

    handleChange(e) {
      const current = this.value();
      const next = e.target.value;
      this.props.onChange(next + serialize(this.uploadRefs()));
      this.setState({
        value: next,
        undoStack: this.pushUndo(current),
        redoStack: [],
        lastCursor: e.target.selectionStart,
      });
    },

    renderToolbar() {
      return h(
        'div',
        { className: 'adoc-toolbar' },
        TOOLBAR_GROUPS.map((group, groupIndex) =>
          h(
            'div',
            { key: groupIndex, className: 'adoc-toolbar-group' },
            group.map((name) => this.renderToolbarControl(name)),
          ),
        ),
      );
    },

    renderToolbarControl(name) {
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
          HEADING_OPTIONS.map(([value, label]) => h('option', { key: value, value }, label)),
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
          disabled:
            (name === 'undo' && !this.state.undoStack.length) ||
            (name === 'redo' && !this.state.redoStack.length),
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
    },

    render() {
      return h(
        'div',
        { className: 'adoc-widget' },
        this.renderToolbar(),
        h('textarea', {
          id: this.props.forID,
          className: 'adoc-textarea',
          value: this.state.value || '',
          onChange: this.handleChange,
          onSelect: this.saveSelection,
          onClick: this.saveSelection,
          onKeyUp: this.saveSelection,
          onKeyDown: (e) => {
            const mod = e.ctrlKey || e.metaKey;
            if (!mod) return;
            const key = e.key.toLowerCase();
            if (key === 'z') {
              e.preventDefault();
              if (e.shiftKey) this.redo();
              else this.undo();
            } else if (key === 'y') {
              e.preventDefault();
              this.redo();
            }
          },
          ref: (el) => {
            this.textarea = el;
          },
        }),
      );
    },
  });

  return AdocControl;
})();
