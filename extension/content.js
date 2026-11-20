// Do You Like It? — content script.
// Hides prices using the site's rules file, runs a generic ₹ detector for
// anything the rules miss, and adds ❤️ buttons that save picks.
(() => {
  const ON = 'dyli-on';
  const PRICE = String.raw`(?:₹|\bRs\.?|\bINR)\s?\d[\d,]*(?:\.\d+)?`;
  const MONEY = String.raw`${PRICE}|\(?\b\d{1,2}%\s*off\)?`;
  const hasMoney = (s) => new RegExp(MONEY, 'i').test(s);
  // Some sites split a price into "₹" and "1,234" in separate elements.
  const SYMBOL_ONLY = /^\s*(?:₹|Rs\.?|INR)\s*$/i;
  const NUMBER_ONLY = /^\s*\d[\d,]*(?:\.\d+)?\s*$/;
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'OPTION', 'SELECT']);

  let rules = null;
  let enabled = false;
  let picks = [];
  let skipSelector = '.dyli-ui';

  // --- rules -------------------------------------------------------------

  // Drop selectors the browser can't parse so one bad line can't break the rest.
  function validSelectors(list = []) {
    return list.filter((sel) => {
      try {
        document.createDocumentFragment().querySelector(sel);
        return true;
      } catch {
        console.warn('[Do You Like It?] ignoring invalid selector:', sel);
        return false;
      }
    });
  }

  function groupSelectors(groups = {}) {
    return validSelectors(Object.values(groups).flat());
  }

  function buildCss() {
    const scoped = (sels) => sels.map((s) => `html.${ON} ${s}`).join(',\n');
    const hide = [...groupSelectors(rules.hide), '.dyli-generic'];
    const remove = groupSelectors(rules.remove);
    // Every price gets the same width, so ₹49,999 and ₹999 look alike.
    const prices = [...validSelectors(rules.hide?.price), '.dyli-generic'];

    let css = `
${scoped(prices)} {
  display: inline-block !important;
  width: 4.5em !important;
  max-width: 4.5em !important;
  overflow: hidden !important;
  white-space: nowrap !important;
  vertical-align: middle !important;
}
${scoped(hide)} {
  color: transparent !important;
  text-shadow: none !important;
  text-decoration-color: transparent !important;
  background: repeating-linear-gradient(135deg, #f4d9de 0 6px, #fbeef0 6px 12px) !important;
  border-radius: 4px !important;
  user-select: none !important;
}
${scoped(hide.map((s) => `${s} *`))} {
  color: transparent !important;
  text-decoration-color: transparent !important;
  background: transparent !important;
}
`;
    if (remove.length) css += `${scoped(remove)} { display: none !important; }\n`;
    return css + UI_CSS;
  }

  const UI_CSS = `
.dyli-anchor { position: relative !important; }
.dyli-like {
  display: none;
  align-items: center; gap: 4px;
  font: 600 13px/1 system-ui, -apple-system, sans-serif;
  color: #e0533d; background: #fff;
  border: 1.5px solid #f3c4bb; border-radius: 999px;
  padding: 6px 10px; cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,.12);
}
html.${ON} .dyli-like { display: inline-flex; }
.dyli-like.dyli-card { position: absolute; top: 8px; right: 8px; z-index: 5; }
.dyli-like.dyli-page { margin: 8px 0; }
.dyli-like[aria-pressed="true"] { background: #e0533d; color: #fff; border-color: #e0533d; }
.dyli-like:hover { transform: scale(1.05); }
.dyli-pill {
  position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
  display: flex; align-items: center; gap: 10px;
  font: 600 13px/1 system-ui, -apple-system, sans-serif;
  background: #fff; color: #444; border: 1.5px solid #ddd; border-radius: 999px;
  padding: 8px 8px 8px 14px; box-shadow: 0 4px 16px rgba(0,0,0,.15); cursor: pointer;
}
html.${ON} .dyli-pill { color: #e0533d; border-color: #f3c4bb; background: #fff6f4; }
.dyli-switch { width: 34px; height: 20px; border-radius: 999px; background: #ccc; position: relative; transition: background .15s; }
.dyli-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: left .15s; }
html.${ON} .dyli-switch { background: #e0533d; }
html.${ON} .dyli-switch::after { left: 16px; }
`;

  function injectStyle() {
    const style = document.createElement('style');
    style.id = 'dyli-style';
    style.textContent = buildCss();
    (document.head || document.documentElement).append(style);

    skipSelector = [
      '.dyli-ui',
      '.dyli-generic',
      ...groupSelectors(rules.hide),
      ...groupSelectors(rules.remove),
      ...validSelectors(rules.ignore),
    ].join(',');
  }

  // --- generic ₹ detector ------------------------------------------------

  function scanGeneric(root) {
    if (!rules.genericDetection || !root) return;
    const usable = (node) => {
      const parent = node.parentElement;
      return parent && !SKIP_TAGS.has(parent.tagName) && !parent.closest(skipSelector);
    };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const hits = [];
    const split = [];
    let symbol = null;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.data.trim()) continue;
      if (symbol && NUMBER_ONLY.test(node.data) && usable(node)) split.push(symbol, node);
      symbol = SYMBOL_ONLY.test(node.data) && usable(node) ? node : null;
      if (hasMoney(node.data) && usable(node)) hits.push(node);
    }

    for (const node of split) node.parentElement.classList.add('dyli-generic');
    for (const node of hits) {
      const parent = node.parentElement;
      // Short labels like "₹4,999" or "(20% off)": cover the whole element.
      // Longer sentences: wrap just the amount so the rest stays readable.
      if (parent.textContent.trim().length <= 40) parent.classList.add('dyli-generic');
      else wrapMatches(node);
    }
  }

  function wrapMatches(node) {
    const re = new RegExp(MONEY, 'gi');
    const text = node.data;
    const frag = document.createDocumentFragment();
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      frag.append(text.slice(last, m.index));
      const span = document.createElement('span');
      span.className = 'dyli-generic';
      span.textContent = m[0];
      frag.append(span);
      last = m.index + m[0].length;
    }
    frag.append(text.slice(last));
    node.replaceWith(frag);
  }

  // --- ❤️ likes ----------------------------------------------------------

  const textOf = (root, sel) => (sel && root.querySelector(sel)?.textContent.trim()) || '';
  const isLiked = (id) => picks.some((p) => p.id === id && p.site === rules.id);

  function productUrl(id, fallback) {
    return rules.productUrl ? rules.productUrl.replace('{id}', encodeURIComponent(id)) : fallback;
  }

  // Some sites show product images as CSS backgrounds instead of <img>.
  function imageOf(root, sel) {
    const el = sel && root.querySelector(sel);
    if (!el) return '';
    return el.currentSrc || el.src || getComputedStyle(el).backgroundImage.match(/url\("?(.*?)"?\)/)?.[1] || '';
  }

  // When a site has no stable price selector, take the first ₹ amount after `after`
  // (or anywhere in `root`). Prices sit just below the title on every site we've seen.
  function firstPrice(root, after) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const re = new RegExp(PRICE, 'i');
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (after && !(after.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      const m = node.data.match(re);
      if (m) return m[0].trim();
    }
    return '';
  }

  function readCard(card, id) {
    const p = rules.product;
    return {
      id,
      title: textOf(card, p.title),
      image: imageOf(card, p.image),
      price: textOf(card, p.price) || firstPrice(card),
      url: productUrl(id, card.querySelector('a[href]')?.href || location.href),
    };
  }

  function readProductPage(id) {
    const p = rules.productPage;
    const title = p.title && document.querySelector(p.title);
    return {
      id,
      title: title?.textContent.trim() || document.title,
      image: imageOf(document, p.image),
      price: textOf(document, p.price) || firstPrice(document.body, title),
      url: productUrl(id, location.href),
    };
  }

  function makeLikeButton(id, read, variant) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `dyli-ui dyli-like dyli-${variant}`;
    btn.dataset.dyliId = id;
    paintLike(btn);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleLike(id, read);
    });
    return btn;
  }

  function paintLike(btn) {
    const liked = isLiked(btn.dataset.dyliId);
    btn.setAttribute('aria-pressed', String(liked));
    btn.textContent = liked ? '❤️ Liked' : '♡ Like';
  }

  function toggleLike(id, read) {
    const item = isLiked(id) ? null : { ...read(), site: rules.id, siteName: rules.name, likedAt: Date.now() };
    // Re-read before writing: other open tabs may have added picks since this one loaded.
    chrome.storage.local.get({ picks: [] }, (s) => {
      const others = s.picks.filter((p) => !(p.id === id && p.site === rules.id));
      picks = item ? [...others, item] : others;
      chrome.storage.local.set({ picks });
      document.querySelectorAll('.dyli-like').forEach(paintLike);
    });
  }

  function addLikeButtons() {
    const p = rules.product;
    if (p?.card) {
      for (const card of document.querySelectorAll(p.card)) {
        if (card.querySelector('.dyli-like')) continue;
        const id = card.getAttribute(p.idAttr);
        if (!id) continue;
        const anchor = (p.likeAnchor && card.querySelector(p.likeAnchor)) || card;
        anchor.classList.add('dyli-anchor');
        anchor.append(makeLikeButton(id, () => readCard(card, id), 'card'));
      }
    }

    const pp = rules.productPage;
    if (pp?.urlPattern && !document.querySelector('.dyli-like.dyli-page')) {
      const id = (location.pathname + location.search).match(new RegExp(pp.urlPattern))?.[1];
      const anchor = id && document.querySelector(pp.likeAnchor);
      if (anchor) anchor.after(makeLikeButton(id, () => readProductPage(id), 'page'));
    }
  }

  // --- on-page toggle ----------------------------------------------------

  function addPill() {
    if (document.querySelector('.dyli-pill')) return;
    const pill = document.createElement('div');
    pill.className = 'dyli-ui dyli-pill';
    pill.setAttribute('role', 'switch');
    pill.title = 'Hide or show prices (Alt+Shift+P)';
    pill.innerHTML = '<span class="dyli-label"></span><span class="dyli-switch"></span>';
    pill.addEventListener('click', () => chrome.storage.local.set({ enabled: !enabled }));
    document.body.append(pill);
    paintPill();
  }

  function paintPill() {
    const pill = document.querySelector('.dyli-pill');
    if (!pill) return;
    pill.setAttribute('aria-checked', String(enabled));
    pill.querySelector('.dyli-label').textContent = enabled
      ? '❤️ Do you like it? · prices hidden'
      : 'Do you like it? · off';
  }

  // --- wiring ------------------------------------------------------------

  let pending = 0;
  function refresh() {
    clearTimeout(pending);
    pending = setTimeout(() => {
      if (enabled) scanGeneric(document.body);
      addLikeButtons();
      addPill();
    }, 150);
  }

  function applyEnabled(value) {
    enabled = value;
    document.documentElement.classList.toggle(ON, enabled);
    paintPill();
    if (enabled && document.body) scanGeneric(document.body);
  }

  function start() {
    refresh();
    new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true });
  }

  chrome.runtime.sendMessage({ type: 'getRules', host: location.hostname }, (r) => {
    if (!r) return;
    rules = r;
    injectStyle();

    chrome.storage.local.get({ enabled: true, picks: [] }, (s) => {
      picks = s.picks;
      applyEnabled(s.enabled);
      if (document.body) start();
      else document.addEventListener('DOMContentLoaded', start, { once: true });
    });

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.picks) {
        picks = changes.picks.newValue || [];
        document.querySelectorAll('.dyli-like').forEach(paintLike);
      }
      if (changes.enabled) applyEnabled(changes.enabled.newValue);
    });
  });
})();
