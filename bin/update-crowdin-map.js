#!/usr/bin/env node
// Crowdin file-ID map generator for the Decidim documentation
//
// Queries the Crowdin API for the documentation project's target languages and
// source files, matches every file to its English AsciiDoc page and writes the
// result to data/crowdin.json. The map is committed to the repository so the
// site build does not need Crowdin credentials.

const fs = require('fs');
const https = require('https');
const path = require('path');

const API_BASE = 'https://api.crowdin.com/api/v2';
const DOCS_EN = path.join(__dirname, '..', 'docs', 'en');
const OUTPUT = path.join(__dirname, '..', 'data', 'crowdin.json');
const PAGE_SIZE = 500;

// Loads the repository .env file when the token is not already in the
// environment, so `npm run update:crowdin` works without an env manager.
function loadDotEnv() {
  if (process.env.CROWDIN_TOKEN) return;
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;

  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]] !== undefined) return;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  });
}

loadDotEnv();

const PROJECT_ID = process.env.CROWDIN_PROJECT_ID || '600363';
const BRANCH = process.env.CROWDIN_BRANCH || 'develop';
const TOKEN = process.env.CROWDIN_TOKEN;

// Performs an authenticated GET request against the Crowdin API
//
// @param {string} endpoint - The API path, e.g. "/projects/1/files"
// @returns {Promise<object>} The parsed JSON response
function apiGet(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + endpoint);
    const options = {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'User-Agent': 'decidim-documentation',
      },
    };

    https.get(url, options, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => (body += chunk));
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const hint =
            response.statusCode === 403
              ? ' (the token needs the "Source files & strings" read scope)'
              : '';
          reject(new Error(`Crowdin API responded with ${response.statusCode}${hint}: ${body}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`Could not parse the Crowdin response: ${error.message}`));
        }
      });
    }).on('error', reject);
  });
}

// Lists every source file of the project, following pagination
//
// @returns {Promise<Array<object>>} The file resources
async function listFiles() {
  const files = [];
  let offset = 0;

  for (;;) {
    const response = await apiGet(
      `/projects/${PROJECT_ID}/files?limit=${PAGE_SIZE}&offset=${offset}`
    );
    const items = response.data || [];
    items.forEach((item) => files.push(item.data));

    if (items.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return files;
}

// Builds the locale map from the project's target languages
//
// The site identifies locales by their two-letter code (the Antora component
// names), while the Crowdin editor expects the full language identifier, such
// as "es-ES" or "pt-BR".
//
// @param {Array<object>} targetLanguages - The project's target languages
// @returns {object} A map of two-letter code to Crowdin language id
function buildLocales(targetLanguages) {
  return (targetLanguages || []).reduce((locales, language) => {
    const code = language.twoLettersCode || language.id;
    if (!(code in locales)) locales[code] = language.id;
    return locales;
  }, {});
}

// Lists the locales that contain documentation modules
//
// @returns {Array<string>} Locale directory names, e.g. ["ca", "de", "en", ...]
function listLocales() {
  const docsDir = path.join(__dirname, '..', 'docs');
  return fs
    .readdirSync(docsDir, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && fs.existsSync(path.join(docsDir, entry.name, 'modules'))
    )
    .map((entry) => entry.name);
}

// Lists the page paths of a locale, relative to its docs directory
//
// The same page keeps the same relative path in every locale, so a Crowdin
// file can be mapped to a page regardless of which translation it comes from.
//
// @param {string} locale - The locale directory name, e.g. "en"
// @returns {Array<string>} Paths such as "modules/understand/pages/background.adoc"
function listPagePaths(locale) {
  const pages = [];
  const localeDir = path.join(__dirname, '..', 'docs', locale);
  const modulesDir = path.join(localeDir, 'modules');

  if (!fs.existsSync(modulesDir)) return pages;

  fs.readdirSync(modulesDir).forEach((module) => {
    const pagesDir = path.join(modulesDir, module, 'pages');
    if (!fs.existsSync(pagesDir)) return;

    const walk = (dir) => {
      fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(entryPath);
        } else if (entry.name.endsWith('.adoc')) {
          pages.push(path.relative(localeDir, entryPath).split(path.sep).join('/'));
        }
      });
    };

    walk(pagesDir);
  });

  return pages;
}

// Extracts the Crowdin branch a file belongs to
//
// Crowdin prefixes the file path with the branch name, e.g.
// "/develop/docs/en/modules/..." or "/release.0.30-stable/docs/en/modules/...".
//
// @param {string} crowdinPath - The "path" reported by the Crowdin API
// @returns {string} The branch name, or an empty string when there is none
function fileBranch(crowdinPath) {
  const segments = (crowdinPath || '').replace(/^\/+/, '').split('/');
  const index = segments.indexOf('docs');
  return index > 0 ? segments.slice(0, index).join('/') : '';
}

// Normalizes a Crowdin file path to a docs-relative path
//
// @param {string} crowdinPath - The "path" reported by the Crowdin API
// @returns {string|null} The docs-relative path, or null for other files
function normalizePath(crowdinPath) {
  const segments = (crowdinPath || '').replace(/^\/+/, '').split('/');
  const index = segments.indexOf('docs');
  if (index === -1 || segments[index + 1] !== 'en') return null;
  return segments.slice(index + 2).join('/');
}

// Matches the Crowdin files to the English pages
//
// @param {Array<object>} files - The Crowdin file resources
// @param {Array<string>} pages - The docs/en-relative page paths
// @returns {object} The matches plus the diagnostics
function matchFiles(files, pages) {
  const pageSet = new Set(pages);
  const byBasename = new Map();
  pages.forEach((page) => {
    const basename = page.split('/').pop();
    if (!byBasename.has(basename)) byBasename.set(basename, []);
    byBasename.get(basename).push(page);
  });

  const matches = {};
  const ambiguous = [];
  const unmatched = [];

  files.forEach((file) => {
    const normalized = normalizePath(file.path);
    if (!normalized) return;
    if (pageSet.has(normalized)) {
      matches[normalized] = file.id;
      return;
    }

    const candidates = byBasename.get(normalized.split('/').pop()) || [];
    if (candidates.length === 1) {
      matches[candidates[0]] = file.id;
    } else if (candidates.length > 1) {
      ambiguous.push({ file, candidates });
    } else {
      unmatched.push(file);
    }
  });

  return { matches, ambiguous, unmatched };
}

// Writes the resulting map to data/crowdin.json
//
// @param {object} map - The map to persist
function writeMap(map) {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(map, null, 2) + '\n');
}

(async function () {
  if (!TOKEN) {
    console.error('CROWDIN_TOKEN is required (set it in .env or the environment).');
    process.exit(1);
  }

  const projectResponse = await apiGet(`/projects/${PROJECT_ID}`);
  const project = projectResponse.data || {};
  const locales = buildLocales(project.targetLanguages);

  const allFiles = await listFiles();
  const branchFiles = allFiles.filter((file) => fileBranch(file.path) === BRANCH);
  const files = branchFiles.length
    ? branchFiles
    : allFiles.filter((file) => !fileBranch(file.path));

  const localesOnDisk = listLocales();
  const englishPages = listPagePaths('en');
  const pages = [...new Set(localesOnDisk.flatMap((locale) => listPagePaths(locale)))];
  const { matches, ambiguous, unmatched } = matchFiles(files, pages);

  const matchedPages = new Set(Object.keys(matches));
  const missing = englishPages.filter((page) => !matchedPages.has(page));
  const unmatchedPages = unmatched.filter((file) => (file.path || '').includes('/pages/'));

  writeMap({
    project: project.identifier || String(PROJECT_ID),
    source: project.sourceLanguageId || null,
    locales,
    files: Object.fromEntries(
      Object.entries(matches).sort(([a], [b]) => a.localeCompare(b))
    ),
  });

  console.log(`Fetched ${allFiles.length} Crowdin files (using branch "${BRANCH}": ${files.length}).`);
  console.log(`Found ${englishPages.length} English pages (${pages.length} across all locales).`);
  console.log(`Matched ${Object.keys(matches).length} pages.`);

  if (ambiguous.length) {
    console.warn(`\nAmbiguous (${ambiguous.length}), skipped:`);
    ambiguous.forEach(({ file, candidates }) =>
      console.warn(`  ${file.path} -> ${candidates.join(', ')}`)
    );
  }

  if (missing.length) {
    console.warn(`\nEnglish pages without a Crowdin file (${missing.length}):`);
    missing.forEach((page) => console.warn(`  ${page}`));
  }

  if (unmatchedPages.length) {
    console.warn(`\nCrowdin pages without a matching page (${unmatchedPages.length}):`);
    unmatchedPages.forEach((file) => console.warn(`  ${file.path}`));
  }

  console.log(`\nWrote ${OUTPUT}`);
}()).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
