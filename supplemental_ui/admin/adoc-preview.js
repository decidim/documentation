window.Admin = window.Admin || {};

// Antora-only constructs the in-browser renderer cannot resolve. Images are
// resolved per page: the module's images are built to en/develop/<module>/
// (and nested pages keep their subdirectory). ROOT-module images (the shared
// media folder) are referenced with `image::ROOT:` and resolve to
// en/develop/_images.
window.Admin.Preview = (() => {
  const { h, createClass } = window;
  const { strip, parse } = window.Admin.UploadBlock;

  const sharedImagePath = 'docs/en/modules/ROOT/assets/images';
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

  // Resolve a stored ROOT image path to a URL Sveltia can serve in the admin. This matters because
  // the site is edited through the editorial workflow: a freshly uploaded image lives on the draft
  // branch, but the hard-coded built path (`/en/develop/_images/...`) only exists after publishing.
  // The media API returns the draft asset, just like the built-in Image field preview does.
  const resolveRootImageUrl = (getAsset, fileName) => {
    if (typeof getAsset !== 'function') return '';
    const asset = getAsset(`/${sharedImagePath}/${fileName}`);
    const url = asset?.url ?? (typeof asset?.get === 'function' ? asset.get('url') : '');
    return typeof url === 'string' ? url : '';
  };

  const renderAsciiDoc = (source, imagesDir, module = 'root', refs = [], getAsset) => {
    if (!processor) return '';
    // Resolve a pending upload to its temporary blob URL and a committed one to the media URL
    // Sveltia serves (so it previews even while the image is still on the draft branch).
    const pending = new Map(
      refs
        .filter(({ blobUrl }) => blobUrl.startsWith('blob:'))
        .map(({ fileName, blobUrl }) => [fileName, blobUrl]),
    );
    const body = strip(source).replace(
      /image::ROOT:([^\[\]\n]+)\[/g,
      (_, fileName) =>
        `image::${pending.get(fileName) || resolveRootImageUrl(getAsset, fileName) || `ROOT:${fileName}`}[`,
    );

    const previewable = body
      .replace(/^include::[^\n]*$/gm, '')
      .replace(
        /xref:([^\[\]]+)\[([^\]]*)\]/g,
        (_, target, label) => `link:${resolveXref(target, module)}[${label || target}]`,
      )
      .replace(/image::ROOT:([^\[\]]+)/g, 'image::/en/develop/_images/$1');
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

  // Build the images dir for a page. Antora publishes a module's images under
  // its module-level `_images` directory regardless of the page's subdirectory,
  // so image macros such as `image::spaces/processes/foo.png` resolve from there.
  const imagesDirForEntry = (module) => {
    // The ROOT module maps to the component root, so its images live at
    // en/develop/_images rather than en/develop/root/_images.
    const base = module === 'root' ? '/en/develop' : `/en/develop/${module}`;
    return `${base}/_images`;
  };

  // Approximate, instant preview. For an exact Antora build use the "View
  // Preview" deploy preview link provided by the backend.
  const makeDocPreview = (module) =>
    createClass({
      render() {
        const source = this.props.entry.getIn(['data', 'body']) || '';
        const { refs } = parse(source);
        const html = sanitizeHtml(
          renderAsciiDoc(
            source,
            imagesDirForEntry(module),
            module,
            refs,
            this.props.getAsset,
          ),
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
