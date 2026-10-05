'use strict'

const fsp = require('node:fs/promises')
const ospath = require('node:path')

// Antora extension that validates the content without generating the website.
//
// Antora performs xref/include/image resolution and reports AsciiDoc errors
// while it converts the documents, which happens before any file is written.
// Stopping the generator right after that step surfaces the same messages that
// would fail `npm run build`, but leaves build/site untouched.
//
// The UI has to be loaded (the half-built site is composed from it), and
// loadUi() unpacks the bundle into the current directory as a side effect. That
// copy is not a build artifact, so it is removed once the UI is loaded. A
// generator function is delegated because an extension cannot replace an event
// listener registered by another extension (such as the lunr one).

const UI_RX = /^ui(?:\.[\w-]+)*$|^ui(?:\.[\w-]+)*\.[a-z]+$/

module.exports.register = function () {
  let uiExtracted
  this.on('contextStarted', () => {
    const loadUi = this.getFunctions().loadUi
    this.replaceFunctions({
      async loadUi (playbook) {
        try {
          return await loadUi.call(this, playbook)
        } finally {
          uiExtracted = await findExtractedUi(playbook)
        }
      },
    })
  })
  this.on('documentsConverted', () => this.stop())
  this.on('contextStopped', () => removeExtractedUi(uiExtracted))
}

async function findExtractedUi (playbook) {
  const bundle = playbook.ui && playbook.ui.bundle
  if (bundle && bundle.url && bundle.url.includes('://')) return undefined
  const startDir = playbook.dir || process.cwd()
  const entries = await fsp.readdir(startDir).catch(() => [])
  return entries.filter((entry) => UI_RX.test(entry)).map((entry) => ospath.join(startDir, entry))
}

async function removeExtractedUi (paths) {
  if (!paths) return
  await Promise.all(paths.map((p) => fsp.rm(p, { recursive: true, force: true })))
}
