// Do You Like It? — popup: on/off toggle and the picks list.
// Prices in the list stay hidden until you click "Show prices", in case someone is looking.

const $ = (id) => document.getElementById(id);
let revealed = false;

// "₹1,299", "Rs. 637" and "INR 99.50" all become numbers. Take the number itself,
// so the dot in "Rs." isn't read as a decimal point.
function amount(price) {
  const n = parseFloat(String(price).match(/\d[\d,]*(?:\.\d+)?/)?.[0].replace(/,/g, '') ?? '');
  return Number.isFinite(n) ? n : 0;
}

function formatInr(n) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function renderToggle(enabled) {
  $('toggle').classList.toggle('on', enabled);
  $('toggle').setAttribute('aria-checked', String(enabled));
  $('toggle-label').textContent = enabled ? 'Prices hidden' : 'Prices visible';
}

function renderPicks(picks) {
  const list = $('picks');
  list.replaceChildren();
  $('picks-title').textContent = `Their picks (${picks.length})`;
  $('reveal').textContent = revealed ? 'Hide prices' : 'Show prices';
  $('reveal').hidden = picks.length === 0;

  if (!picks.length) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'Tap ♡ Like on any product and it shows up here.';
    list.append(empty);
  }

  for (const pick of [...picks].reverse()) {
    const li = document.createElement('li');

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
    remove.addEventListener('click', () => {
      chrome.storage.local.set({ picks: picks.filter((p) => p !== pick) });
    });

    li.append(img, info, remove);
    list.append(li);
  }

  const total = picks.reduce((sum, p) => sum + amount(p.price), 0);
  $('total').hidden = !revealed || !picks.length;
  $('total-value').textContent = formatInr(total);
}

async function render() {
  const { enabled = true, picks = [] } = await chrome.storage.local.get(['enabled', 'picks']);
  renderToggle(enabled);
  renderPicks(picks);
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
render();
