// Do You Like It? — prices in any currency.
// Shared by the content script and the popup: finds prices in text, parses them
// ("$1,299.99", "1.299,99 €", "₹1,23,456", "CHF 49.–") and formats totals.
(() => {
  // Symbol or code → ISO currency. "$" alone is ambiguous; the site's own currency wins.
  const SYMBOLS = {
    '₹': 'INR', 'Rs.': 'INR', 'Rs': 'INR',
    'US$': 'USD', 'A$': 'AUD', 'AU$': 'AUD', 'C$': 'CAD', 'CA$': 'CAD', 'NZ$': 'NZD',
    'S$': 'SGD', 'HK$': 'HKD', 'R$': 'BRL', 'MX$': 'MXN', '$': 'USD',
    '€': 'EUR', '£': 'GBP', '¥': 'JPY', '￥': 'JPY', '₩': 'KRW', '₺': 'TRY', '₽': 'RUB',
    '₱': 'PHP', '฿': 'THB', '₫': 'VND', '₦': 'NGN', '₪': 'ILS', '₴': 'UAH',
    'zł': 'PLN', 'Kč': 'CZK', 'kr': 'SEK', 'Ft': 'HUF', 'lei': 'RON', 'RM': 'MYR', 'Rp': 'IDR',
  };
  const CODES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN',
    'AED', 'SAR', 'QAR', 'SGD', 'HKD', 'NZD', 'MXN', 'BRL', 'ZAR', 'KRW', 'TRY', 'IDR', 'MYR', 'THB',
    'PHP', 'VND', 'EGP', 'NGN', 'CZK', 'HUF', 'RON', 'ILS'];

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Longest first, so "US$" wins over "$" and "Rs." over "Rs".
  const tokens = [...Object.keys(SYMBOLS), ...CODES].sort((a, b) => b.length - a.length);
  // Letter-based symbols must not be part of a word ("kr" in "krona" is fine, in "Ukraine" it isn't).
  const tokenSrc = tokens.map((t) => (/^[A-Za-z]/.test(t) ? `(?<![A-Za-z])${esc(t)}(?![A-Za-z])` : esc(t))).join('|');
  // 1,234.56 · 1.234,56 · 1 234,56 · 1,23,456 (India) · 1234 · 49.–
  const NUM = String.raw`\d{1,3}(?:[,.   ]\d{2,3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?`;
  const SP = String.raw`[\s  ]?`;
  const PRICE = `(?:${tokenSrc})${SP}(?:${NUM})(?:[.,]–)?|(?:${NUM})${SP}(?:${tokenSrc})`;
  const SYMBOL_ONLY = new RegExp(`^\\s*(?:${tokenSrc})\\s*$`);
  const NUMBER_ONLY = new RegExp(`^\\s*(?:${NUM})\\s*$`);
  // "20% off", "(20% OFF)", "-20%" — discount badges, not "5% back" cashback lines.
  const DISCOUNT = String.raw`\(?\b\d{1,2}\s?%\s*off\)?|-\d{1,2}\s?%`;

  // "1.234,56" → 1234.56, "1,234.56" → 1234.56, "1,23,456" → 123456, "49,90" → 49.9
  function toNumber(raw) {
    const s = raw.replace(/[\s  ]/g, '');
    const lastSep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
    if (lastSep === -1) return Number(s);
    const decimals = s.length - lastSep - 1;
    const isDecimal = decimals === 1 || decimals === 2;
    const intPart = (isDecimal ? s.slice(0, lastSep) : s).replace(/[.,]/g, '');
    return Number(isDecimal ? `${intPart}.${s.slice(lastSep + 1)}` : intPart);
  }

  // Parse the first price in `text`. `fallback` is the site's currency, used for bare "$" or no symbol.
  function parse(text, fallback) {
    const m = String(text ?? '').match(new RegExp(PRICE));
    if (!m) {
      const n = String(text ?? '').match(new RegExp(NUM));
      return n ? { amount: toNumber(n[0]), currency: fallback || null } : null;
    }
    const symbol = m[0].match(new RegExp(tokenSrc))[0];
    const num = m[0].replace(new RegExp(tokenSrc), '').replace(/[.,]–$/, '').trim();
    let currency = CODES.includes(symbol) ? symbol : SYMBOLS[symbol];
    if (symbol === '$' && fallback && /^(USD|AUD|CAD|NZD|SGD|HKD|MXN)$/.test(fallback)) currency = fallback;
    if ((symbol === '¥' || symbol === '￥') && fallback === 'CNY') currency = 'CNY';
    if (symbol === 'kr' && /^(NOK|DKK)$/.test(fallback)) currency = fallback;
    return { amount: toNumber(num), currency };
  }

  function format(amount, currency) {
    try {
      const fraction = Number.isInteger(amount) ? 0 : 2;
      return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: fraction, maximumFractionDigits: fraction }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  globalThis.DYLI_CURRENCY = { PRICE, DISCOUNT, SYMBOL_ONLY, NUMBER_ONLY, parse, format };
})();
