// Do You Like It? — background service worker.
// Owns the site rule files and the on/off state; content scripts ask it for rules.

let sitesPromise;

function loadSites() {
  sitesPromise ??= fetch(chrome.runtime.getURL('sites/index.json'))
    .then((r) => r.json())
    .then((files) =>
      Promise.all(files.map((f) => fetch(chrome.runtime.getURL(`sites/${f}`)).then((r) => r.json())))
    );
  return sitesPromise;
}

async function rulesFor(host) {
  const sites = await loadSites();
  const site = sites.find((s) => s.domains.some((d) => host === d || host.endsWith(`.${d}`)));
  // Sites without a rules file still get the generic ₹ detector.
  return site ?? { id: 'generic', name: host, genericDetection: true };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'getRules') {
    rulesFor(msg.host).then(sendResponse);
    return true; // keep the channel open for the async response
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

chrome.runtime.onInstalled.addListener(async () => {
  const { enabled, picks } = await chrome.storage.local.get(['enabled', 'picks']);
  await chrome.storage.local.set({ enabled: enabled ?? true, picks: picks ?? [] });
  showBadge(enabled ?? true);
});

chrome.runtime.onStartup.addListener(async () => {
  const { enabled = false } = await chrome.storage.local.get('enabled');
  showBadge(enabled);
});
