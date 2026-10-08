window.Admin = window.Admin || {};

// Antora-only constructs the in-browser renderer cannot resolve. Images are
// resolved per page: image targets are module-relative and Antora builds them to
// en/develop/<module>/_images (the ROOT module maps to en/develop/_images).
// Legacy `image::ROOT:` targets from older drafts are still resolved.
window.Admin.Preview = (() => {
  const { h, createClass } = window;
  const { strip, parse } = window.Admin.UploadBlock;

  const processor = window.Asciidoctor ? window.Asciidoctor() : null;

  const COLLECTIONS = [
    'root',
    'admin',
    'contribute',
    'features',
    'publications',
    'releases',
    'understand',
    'whitepaper',
  ];

  // Resolve an Antora xref target to the built HTML page so links are clickable
  // in the preview. Targets are `[module:]page.adoc[#fragment]`, where an omitted
  // module means the current page's module. The ROOT module maps to the component
  // root, while other modules get their own directory under en/develop.
  const resolveXref = (target, module) => {
    let [dest, fragment] = target.split('#');
    let mod = module;
    const colon = dest.indexOf(':');
    if (colon !== -1) {
      mod = dest.slice(0, colon);
      dest = dest.slice(colon + 1);
    }
    dest = dest.replace(/\.adoc$/, '');
    const base = mod === 'root' || mod === 'ROOT' ? '/en/develop' : `/en/develop/${mod}`;
    return `${base}/${dest}.html${fragment ? `#${fragment}` : ''}`;
  };

  // Repository folder holding a module's images, from which Antora builds the
  // previewable `_images` path. The ROOT module directory is uppercase.
  const moduleImageFolder = (module) => {
    const dir = module === 'root' || module === 'ROOT' ? 'ROOT' : module;
    return `docs/en/modules/${dir}/assets/images`;
  };

  // Built images directory Antora publishes a module's images under, regardless
  // of the page's subdirectory. The ROOT module maps to the component root, so
  // its images live at en/develop/_images rather than en/develop/root/_images.
  const moduleImagesDir = (module) => {
    const base = module === 'root' || module === 'ROOT' ? '/en/develop' : `/en/develop/${module}`;
    return `${base}/_images`;
  };

  // Resolve a stored image path to a URL Sveltia can serve in the admin. This matters because the
  // site is edited through the editorial workflow: a freshly uploaded image lives on the draft
  // branch, but the hard-coded built path (`/en/develop/.../_images/...`) only exists after
  // publishing. The media API returns the draft asset, just like the built-in Image field preview.
  const resolveImageUrl = (getAsset, mediaFolder, target) => {
    if (typeof getAsset !== 'function') return '';
    const asset = getAsset(`/${mediaFolder}/${target}`);
    const url = asset?.url ?? (typeof asset?.get === 'function' ? asset.get('url') : '');
    return typeof url === 'string' ? url : '';
  };

  // An image macro target, optionally prefixed with a module (`ROOT:` or
  // `<module>:`). The lookahead keeps external URLs such as `https://` out, and
  // a URI scheme that survives it (e.g. `data:`) is left as is below.
  const IMAGE_TARGET_PATTERN = /image::(?:([A-Za-z][\w-]*):(?!\/\/))?([^:\n\[\]]+)\[/g;
  const URI_SCHEME = /^(?:https?|data|blob|file|mailto|tel|sms|cid|xmpp|ftp)$/i;

  const renderAsciiDoc = (source, imagesDir, module = 'root', refs = [], getAsset) => {
    if (!processor) return '';
    // Resolve a pending upload to its temporary blob URL and a committed one to the media URL
    // Sveltia serves (so it previews even while the image is still on the draft branch). A
    // module-prefixed target (`ROOT:` or `<module>:`) is resolved against that module; a bare
    // target against the current module. Anything unresolved falls back to the built `_images`
    // path Antora publishes the module's images under.
    const pending = new Map(
      refs
        .filter(({ blobUrl }) => blobUrl.startsWith('blob:'))
        .map(({ target, blobUrl }) => [target, blobUrl]),
    );
    const body = strip(source).replace(IMAGE_TARGET_PATTERN, (match, prefix, target) => {
      if (prefix && URI_SCHEME.test(prefix)) return match;
      // Key the pending lookup by the target as written, so a bare upload never
      // stands in for another module's prefixed reference of the same name. Older
      // drafts used `ROOT:` in the macro while storing the pending reference under
      // the bare name, so fall back to that form for the ROOT module.
      const key = prefix ? `${prefix}:${target}` : target;
      const legacy = prefix && prefix.toUpperCase() === 'ROOT' ? pending.get(target) : undefined;
      const mod = prefix || module;
      const url =
        pending.get(key) || legacy || resolveImageUrl(getAsset, moduleImageFolder(mod), target);
      return `image::${url || `${moduleImagesDir(mod)}/${target}`}[`;
    });

    const previewable = body
      .replace(/^include::[^\n]*$/gm, '')
      .replace(
        /xref:([^\[\]]+)\[([^\]]*)\]/g,
        (_, target, label) => `link:${resolveXref(target, module)}[${label || target}]`,
      );
    return processor.convert(previewable, {
      safe: 'safe',
      attributes: { imagesdir: imagesDir, showtitle: true },
    });
  };

  // Asciidoctor's `safe: 'safe'` mode still passes through raw HTML, so the
  // converted markup is sanitized before it reaches dangerouslySetInnerHTML.
  const sanitizeHtml = (html) => {
    if (!html) return '';
    if (window.DOMPurify) {
      // Allow same-origin blob: URLs so a just-picked image can preview before it is committed.
      return window.DOMPurify.sanitize(html, {
        ALLOWED_URI_REGEXP:
          /^(?:(?:blob|https?|data|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      });
    }
    return '';
  };

  // Approximate, instant preview. For an exact Antora build use the "View
  // Preview" deploy preview link provided by the backend.
  const makeDocPreview = (module) =>
    createClass({
      render() {
        const source = this.props.entry.getIn(['data', 'body']) || '';
        const { refs } = parse(source);
        const html = sanitizeHtml(
          renderAsciiDoc(source, moduleImagesDir(module), module, refs, this.props.getAsset),
        );
        if (html) {
          return h('div', {
            className: 'doc-preview',
            dangerouslySetInnerHTML: { __html: html },
          });
        }
        return h('div', { className: 'doc-preview' }, h('pre', null, strip(source)));
      },
    });

  return { COLLECTIONS, makeDocPreview };
})();
