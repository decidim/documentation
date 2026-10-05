const { CMS, initCMS: init } = window;
const { strip } = window.Admin.UploadBlock;
const { AdocControl } = window.Admin;
const { COLLECTIONS, makeDocPreview } = window.Admin.Preview;

// Sveltia CMS has no built-in AsciiDoc support, and Antora pages carry no
// front matter. This custom formatter treats the whole file as one raw text
// body so editing never injects or rewrites front matter.
CMS.registerCustomFormat('adoc', 'adoc', {
  fromFile: (text) => ({ body: text }),
  // The upload-reference block only exists so Sveltia uploads new images; drop it when saving.
  toFile: (value) => (typeof value?.body === 'string' ? strip(value.body) : ''),
});

CMS.registerWidget('adoc', AdocControl);

for (const collection of COLLECTIONS) {
  CMS.registerPreviewTemplate(collection, makeDocPreview(collection));
}
// A file collection's preview template is registered by the file name (`nav`),
// not the collection name (`navigation`).
CMS.registerPreviewTemplate('nav', makeDocPreview('root'));
CMS.registerPreviewStyle('/_/css/styles.css');
CMS.registerPreviewStyle('/_/css/icons.css');

// Point Sveltia at config.yml using the directory computed in index.html, so
// it works whether the admin is served as /admin, /admin/ or from a subpath.
const configLink = document.createElement('link');
configLink.rel = 'cms-config-url';
configLink.type = 'application/yaml';
configLink.href = `${window.ADMIN_DIR}config.yml`;
document.head.appendChild(configLink);

init();
