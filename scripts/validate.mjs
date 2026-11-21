// Checks every site rules file before it can be merged. No dependencies: `node scripts/validate.mjs`.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITES = fileURLToPath(new URL('../extension/sites/', import.meta.url));
const REQUIRED = ['id', 'name', 'domains', 'currency', 'maintainers', 'lastVerified', 'hide'];
// Selectors that would hide far more than prices.
const TOO_BROAD = /^(\*|html|body|main|div|span|a|p|img|section|li|ul|\[class\*?=)/i;

const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);

const files = readdirSync(SITES).filter((f) => f.endsWith('.json') && f !== 'index.json');
const index = JSON.parse(readFileSync(join(SITES, 'index.json'), 'utf8'));
// Every site domain must be in the manifest, always-on or optional, or the extension never runs there.
const manifest = JSON.parse(readFileSync(join(SITES, '../manifest.json'), 'utf8'));
const manifestHosts = new Set([
  ...manifest.content_scripts.flatMap((c) => c.matches),
  ...(manifest.optional_host_permissions ?? []),
]);
const seenDomains = new Map();
const seenIds = new Set();

for (const f of files) if (!index.includes(f)) fail('index.json', `missing ${f}`);
for (const f of index) if (!files.includes(f)) fail('index.json', `lists ${f}, which does not exist`);

for (const file of files) {
  let site;
  try {
    site = JSON.parse(readFileSync(join(SITES, file), 'utf8'));
  } catch (e) {
    fail(file, `invalid JSON: ${e.message}`);
    continue;
  }

  for (const key of REQUIRED) if (!(key in site)) fail(file, `missing "${key}"`);

  if (seenIds.has(site.id)) fail(file, `duplicate id "${site.id}"`);
  seenIds.add(site.id);

  for (const d of site.domains ?? []) {
    if (seenDomains.has(d)) fail(file, `domain ${d} is already in ${seenDomains.get(d)}`);
    seenDomains.set(d, file);
  }
  if (file !== `${site.id}.json` && !site.domains?.some((d) => file === `${d}.json`)) {
    fail(file, 'file name should be <id>.json or <domain>.json');
  }
  for (const d of site.domains ?? []) {
    if (!manifestHosts.has(`*://*.${d}/*`)) fail(file, `${d} is not in manifest.json (content_scripts or optional_host_permissions)`);
  }
  for (const d of Object.keys(site.regions ?? {})) {
    if (!site.domains?.includes(d)) fail(file, `regions.${d} is not in domains`);
  }

  const age = (Date.now() - Date.parse(site.lastVerified)) / 86_400_000;
  // -1 day of slack: a date written today can still be "tomorrow" in UTC.
  if (!(age >= -1)) fail(file, 'lastVerified must be a past date (YYYY-MM-DD)');
  else if (age > 180) console.warn(`${file}: last verified ${Math.round(age)} days ago, may be outdated`);

  // Selectors that hide or remove things page-wide must be specific.
  const pageWide = [
    ...Object.values(site.hide ?? {}).flat(),
    ...Object.values(site.remove ?? {}).flat(),
    ...(site.ignore ?? []),
  ];
  // Selectors that only read text inside a product card or page can be plain tags.
  const reading = [
    ...Object.entries(site.product ?? {}).filter(([k]) => k !== 'idAttr').map(([, v]) => v),
    ...Object.entries(site.productPage ?? {}).filter(([k]) => k !== 'urlPattern').map(([, v]) => v),
  ];
  for (const sel of [...pageWide, ...reading]) {
    if (typeof sel !== 'string' || !sel.trim()) fail(file, `empty selector`);
    else if (sel.includes(',')) fail(file, `"${sel}": one selector per entry, no commas`);
  }
  for (const sel of pageWide) {
    if (typeof sel === 'string' && TOO_BROAD.test(sel.trim()) && !/[.#\[:]/.test(sel)) fail(file, `"${sel}" is too broad`);
  }

  if (site.productPage?.urlPattern) {
    try {
      new RegExp(site.productPage.urlPattern);
    } catch {
      fail(file, 'productPage.urlPattern is not a valid regex');
    }
  }
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${files.length} site file(s) valid`);
