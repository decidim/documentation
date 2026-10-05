window.Admin = window.Admin || {};

// Sveltia uploads a file only while its blob: URL is present in the value being
// saved. To keep the editor and the committed AsciiDoc clean, the widget
// appends the blob references in a hidden block past this sentinel. The block
// is never displayed, and the formatter and preview strip it.
window.Admin.UploadBlock = (() => {
  const UPLOAD_REF = '// sveltia-uploads:';
  const uploadBlockPattern = new RegExp(`\\n${UPLOAD_REF}\\n[\\s\\S]*$`);
  const uploadLinePattern = /^\/\/ image:(.+?) blob:(.+)$/;

  const strip = (text) => text.replace(uploadBlockPattern, '');

  const serialize = (refs) =>
    refs.length
      ? `\n${UPLOAD_REF}\n${refs
          .map(({ fileName, blobUrl }) => `// image:${fileName} blob:${blobUrl}`)
          .join('\n')}`
      : '';

  const parse = (text) => {
    const refs = [];
    const block = text.match(uploadBlockPattern)?.[0] ?? '';

    block.split('\n').forEach((line) => {
      const match = line.match(uploadLinePattern);
      if (match) refs.push({ fileName: match[1], blobUrl: match[2] });
    });

    return { body: strip(text), refs };
  };

  const basename = (path) => String(path).split('/').pop().split('\\').pop();

  return { UPLOAD_REF, strip, serialize, parse, basename };
})();
