'use strict'

const fs = require('node:fs')
const path = require('node:path')

// Antora extension that points the "Edit this Page" link of the Decidim
// documentation modules at the Sveltia CMS (English) or Crowdin (the other
// locales). Pages from other sources that share the same component (such as the
// decidim/decidim modules) keep their default GitHub link.
//
// The Crowdin file IDs live in data/crowdin.json, which is produced by
// bin/update-crowdin-map.js and committed to the repository.

const DOCS_MODULES = new Map([
  ['ROOT', 'root'],
  ['admin', 'admin'],
  ['contribute', 'contribute'],
  ['features', 'features'],
  ['publications', 'publications'],
  ['releases', 'releases'],
  ['understand', 'understand'],
  ['whitepaper', 'whitepaper'],
])

const DEFAULT_SITE_URL = 'https://docs.decidim.org'
const SVELTIA_PATH = '/admin/#/collections'
const CROWDIN_EDITOR = 'https://crowdin.com/editor/decidim-documentation'

// Reads the committed Crowdin map, falling back to an empty map
//
// @returns {object} An object with `files` and `locales`
function loadMap () {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'crowdin.json'), 'utf8'))
  } catch {
    return { files: {}, locales: {} }
  }
}

module.exports.register = function () {
  this.on('contentClassified', ({ contentCatalog, playbook }) => {
    const map = loadMap()
    const siteUrl = ((playbook.site && playbook.site.url) || DEFAULT_SITE_URL).replace(/\/+$/, '')

    contentCatalog.getPages((page) => {
      const src = page.src
      if (!DOCS_MODULES.has(src.module)) return

      if (src.component === 'en') {
        const entry = src.relative.replace(/\.adoc$/, '')
        src.editUrl = `${siteUrl}${SVELTIA_PATH}/${DOCS_MODULES.get(src.module)}/entries/${entry}`
      } else {
        const locale = map.locales[src.component]
        const fileId = locale ? map.files[src.path] : undefined
        src.editUrl = fileId
          ? `${CROWDIN_EDITOR}/${fileId}/${locale}?view=comfortable&filter=basic&value=0`
          : undefined
      }

      src.fileUri = undefined
    })
  })
}
