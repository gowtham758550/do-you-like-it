// Do You Like It? — background service worker.
// Owns the site rule files and the on/off state; content scripts ask it for rules.
// Sites outside the manifest's always-on list are optional: the user turns each one on
// from the popup, and this worker registers the content script for the granted sites.
importScripts('currency.js');

let sitesPromise;

function loadSites() {
  sitesPromise ??= fetch(chrome.runtime.getURL('sites/index.json'))
    .then((r) => r.json())
    .then((files) =>
      Promise.all(files.map((f) => fetch(chrome.runtime.getURL(`sites/${f}`)).then((r) => r.json())))
    );
  return sitesPromise;
}

const matchesDomain = (host, d) => host === d || host.endsWith(`.${d}`);
const originsFor = (site) => site.domains.map((d) => `*://*.${d}/*`);

// The site's rules, with this domain's name and currency (e.g. Amazon US vs Amazon UK).
async function rulesFor(host) {
  const sites = await loadSites();
  const site = sites.find((s) => s.domains.some((d) => matchesDomain(host, d)));
  // Sites without a rules file still get the generic price detector.
  if (!site) return { id: 'generic', name: host, domain: host, genericDetection: true };
  const domain = site.domains.find((d) => matchesDomain(host, d));
  const region = site.regions?.[domain] ?? {};
  return { ...site, domain, name: region.name ?? site.name, currency: region.currency ?? site.currency };
}

// What the popup needs: each site's domains, cart link, and whether it's turned on.
async function siteList() {
  const sites = await loadSites();
  const { origins = [] } = await chrome.permissions.getAll();
  return sites.map((s) => ({
    id: s.id,
    name: s.name,
    domains: s.domains,
    origins: originsFor(s),
    cart: s.cart ?? null,
    enabled: originsFor(s).every((o) => origins.includes(o)),
  }));
}

// Register the content script for optional sites the user has turned on.
async function syncOptionalScripts() {
  const always = chrome.runtime.getManifest().content_scripts.flatMap((c) => c.matches);
  const { origins = [] } = await chrome.permissions.getAll();
  const optional = origins.filter((o) => !always.includes(o));
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: ['dyli-optional'] });
  if (!optional.length) {
    if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: ['dyli-optional'] });
    return;
  }
  const script = { id: 'dyli-optional', matches: optional, js: ['currency.js', 'content.js'], runAt: 'document_start' };
  if (existing.length) await chrome.scripting.updateContentScripts([script]);
  else await chrome.scripting.registerContentScripts([script]);
}

chrome.permissions.onAdded.addListener(async ({ origins = [] }) => {
  await syncOptionalScripts();
  // Reload the tab the user turned it on from, so prices hide right away.
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.url && origins.length) {
    const host = new URL(tab.url).hostname;
    const sites = await loadSites();
    if (sites.some((s) => s.domains.some((d) => matchesDomain(host, d)))) chrome.tabs.reload(tab.id);
  }
});
chrome.permissions.onRemoved.addListener(syncOptionalScripts);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'getRules') {
    rulesFor(msg.host).then(sendResponse);
    return true; // keep the channel open for the async response
  }
  if (msg?.type === 'getSites') {
    siteList().then(sendResponse);
    return true;
  }
});

async function setEnabled(enabled) {
  await chrome.storage.local.set({ enabled });
}

function showBadge(enabled) {
  chrome.action.setBadgeText({ text: enabled ? 'ON' : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#e0533d' });
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-hiding') return;
  const { enabled = false } = await chrome.storage.local.get('enabled');
  await setEnabled(!enabled);
});

chrome.storage.onChanged.addListener((changes) => {
  if ('enabled' in changes) showBadge(changes.enabled.newValue);
});

// Picks saved by 0.1.x: Amazon's site id was "amazon-in", and picks had no domain or currency.
function migratePick(p) {
  const site = p.site === 'amazon-in' ? 'amazon' : p.site;
  let domain = p.domain;
  try {
    domain ??= new URL(p.url).hostname.replace(/^www\./, '');
  } catch {}
  const currency = p.currency ?? globalThis.DYLI_CURRENCY.parse(p.price, 'INR')?.currency ?? 'INR';
  return { ...p, site, domain, currency };
}

chrome.runtime.onInstalled.addListener(async () => {
  const { enabled, picks } = await chrome.storage.local.get(['enabled', 'picks']);
  await chrome.storage.local.set({ enabled: enabled ?? true, picks: (picks ?? []).map(migratePick) });
  showBadge(enabled ?? true);
  await syncOptionalScripts();
});

chrome.runtime.onStartup.addListener(async () => {
  const { enabled = false } = await chrome.storage.local.get('enabled');
  showBadge(enabled);
  await syncOptionalScripts();
});
