// Do You Like It? — popup: on/off toggle, per-site switch, and the picks list grouped by site.
// Prices stay hidden until you click "Show prices", in case someone is looking.

const $ = (id) => document.getElementById(id);
const { parse, format } = globalThis.DYLI_CURRENCY;
let revealed = false;
let sites = [];

const priceOf = (pick) => parse(pick.price, pick.currency);
const groupKey = (pick) => pick.siteName || pick.domain || pick.site;

// { INR: 32788, USD: 45 } → "₹32,788 + $45"
function formatTotals(totals) {
  const parts = Object.entries(totals).filter(([, n]) => n > 0).map(([cur, n]) => format(n, cur));
  return parts.length ? parts.join(' + ') : '—';
}

function totalsOf(picks) {
  const totals = {};
  for (const p of picks) {
    const price = priceOf(p);
    if (price?.currency) totals[price.currency] = (totals[price.currency] || 0) + price.amount;
  }
  return totals;
}

function renderToggle(enabled) {
  $('toggle').classList.toggle('on', enabled);
  $('toggle').setAttribute('aria-checked', String(enabled));
  $('toggle-label').textContent = enabled ? 'Prices hidden' : 'Prices visible';
}

// "Turn on for amazon.com" when the current tab is a supported site that isn't switched on yet.
async function renderSiteBanner() {
  const banner = $('site-banner');
  banner.hidden = true;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith('http')) return;
  const host = new URL(tab.url).hostname;
  const site = sites.find((s) => s.domains.some((d) => host === d || host.endsWith(`.${d}`)));
  if (!site) return;
  const domain = site.domains.find((d) => host === d || host.endsWith(`.${d}`));
  const origin = `*://*.${domain}/*`;
  if (await chrome.permissions.contains({ origins: [origin] })) return;
  $('site-banner-text').textContent = `Hide prices on ${domain}?`;
  banner.hidden = false;
  $('site-banner-btn').onclick = () => chrome.permissions.request({ origins: [origin] }).then((ok) => ok && window.close());
}

function cartLink(group, picks) {
  const site = sites.find((s) => s.id === picks[0].site);
  if (!site?.cart || !picks[0].domain) return null;
  const items = picks.map((p, i) => site.cart.item.replaceAll('{n}', i + 1).replace('{id}', encodeURIComponent(p.id)));
  return `${site.cart.url.replace('{domain}', picks[0].domain)}?${items.join('&')}`;
}

function renderPick(pick) {
  const li = document.createElement('li');
  li.className = 'pick';

  const img = document.createElement('img');
  img.src = pick.image;
  img.alt = '';

  const info = document.createElement('div');
  const link = document.createElement('a');
  link.href = pick.url;
  link.target = '_blank';
  link.textContent = pick.title || pick.id;
  const price = document.createElement('div');
  price.className = revealed ? 'price' : 'price hidden';
  price.textContent = pick.price || '—';
  info.append(link, price);

  const remove = document.createElement('button');
  remove.className = 'remove';
  remove.title = 'Remove';
  remove.textContent = '×';
  remove.addEventListener('click', async () => {
    const { picks = [] } = await chrome.storage.local.get('picks');
    chrome.storage.local.set({ picks: picks.filter((p) => !(p.id === pick.id && p.site === pick.site)) });
  });

  li.append(img, info, remove);
  return li;
}

function renderGroup(name, picks, collapsed) {
  const section = document.createElement('section');
  section.className = 'group';
  section.classList.toggle('collapsed', collapsed);

  const head = document.createElement('div');
  head.className = 'group-head';
  const toggle = document.createElement('button');
  toggle.className = 'group-toggle';
  toggle.setAttribute('aria-expanded', String(!collapsed));
  toggle.innerHTML = '<span class="chevron">▾</span><span class="group-name"></span><span class="count"></span>';
  toggle.querySelector('.group-name').textContent = name;
  toggle.querySelector('.count').textContent = picks.length;
  toggle.addEventListener('click', async () => {
    const { collapsedGroups = [] } = await chrome.storage.local.get('collapsedGroups');
    const next = collapsedGroups.includes(name) ? collapsedGroups.filter((g) => g !== name) : [...collapsedGroups, name];
    chrome.storage.local.set({ collapsedGroups: next });
  });
  const subtotal = document.createElement('span');
  subtotal.className = revealed ? 'subtotal' : 'subtotal hidden';
  subtotal.textContent = formatTotals(totalsOf(picks));
  head.append(toggle, subtotal);

  const list = document.createElement('ul');
  for (const pick of [...picks].reverse()) list.append(renderPick(pick));

  const actions = document.createElement('div');
  actions.className = 'group-actions';
  const openAll = document.createElement('button');
  openAll.className = 'link';
  openAll.textContent = `Open all (${picks.length})`;
  openAll.addEventListener('click', () => picks.forEach((p) => chrome.tabs.create({ url: p.url, active: false })));
  actions.append(openAll);
  const cart = cartLink(name, picks);
  if (cart) {
    const addAll = document.createElement('button');
    addAll.className = 'link';
    addAll.textContent = 'Add all to cart';
    addAll.title = 'Opens your cart on the site with every pick added. You review and pay there.';
    addAll.addEventListener('click', () => chrome.tabs.create({ url: cart }));
    actions.append(addAll);
  }

  section.append(head, list, actions);
  return section;
}

function renderPicks(picks, collapsedGroups) {
  const container = $('picks');
  container.replaceChildren();
  $('picks-title').textContent = `Their picks (${picks.length})`;
  $('reveal').textContent = revealed ? 'Hide prices' : 'Show prices';
  $('reveal').hidden = picks.length === 0;

  if (!picks.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Tap ♡ Like on any product and it shows up here.';
    container.append(empty);
  }

  // One group per store; a store with picks in several currencies (IKEA US + IKEA UK) splits by currency.
  const currenciesBySite = new Map();
  for (const p of picks) currenciesBySite.set(groupKey(p), new Set([...(currenciesBySite.get(groupKey(p)) || []), p.currency]));
  const keyOf = (p) => (currenciesBySite.get(groupKey(p)).size > 1 && p.currency ? `${groupKey(p)} · ${p.currency}` : groupKey(p));
  const groups = new Map();
  for (const p of picks) groups.set(keyOf(p), [...(groups.get(keyOf(p)) || []), p]);
  for (const [name, items] of groups) container.append(renderGroup(name, items, collapsedGroups.includes(name)));

  $('total').hidden = !revealed || !picks.length;
  $('total-value').textContent = formatTotals(totalsOf(picks));
}

async function render() {
  const { enabled = true, picks = [], collapsedGroups = [] } = await chrome.storage.local.get(['enabled', 'picks', 'collapsedGroups']);
  renderToggle(enabled);
  renderPicks(picks, collapsedGroups);
}

async function toggle() {
  const { enabled = true } = await chrome.storage.local.get('enabled');
  chrome.storage.local.set({ enabled: !enabled });
}

$('toggle').addEventListener('click', toggle);
$('toggle').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggle();
  }
});
$('reveal').addEventListener('click', () => {
  revealed = !revealed;
  render();
});
chrome.storage.onChanged.addListener(render);

chrome.runtime.sendMessage({ type: 'getSites' }, (list) => {
  sites = list || [];
  render();
  renderSiteBanner();
});
