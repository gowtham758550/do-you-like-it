# Do You Like It? ❤️

**Hide the prices. Let them pick what they actually love.**

A Chrome extension for shopping together with anyone you're buying for. It hides prices, discounts and price filters, and puts a ♡ Like button on every product. Their picks are saved in a list where only you see the prices.

> Inspired by a LinkedIn post asking shopping apps to let people hide prices.

## Install

**[Get it on the Chrome Web Store](https://chromewebstore.google.com/detail/do-you-like-it/klifbeipeadkbbfidmanobgoompaiinn)**

## Run from source

1. Open `chrome://extensions` and switch on **Developer mode** (top right).
2. Click **Load unpacked** and pick the `extension/` folder.
3. Open [Amazon.in](https://www.amazon.in), [Flipkart](https://www.flipkart.com) or [Myntra](https://www.myntra.com) and search for anything.

- The pill in the bottom-right corner, the toolbar popup, or **Alt+Shift+P** turns hiding on and off.
- Tap **♡ Like** on a product card or product page to save it.
- Open the toolbar popup to see the picks. Prices stay hidden until you click **Show prices**.

## How it works

Everything runs in your browser. Nothing is sent anywhere.

1. **Site rules** (`extension/sites/*.json`): CSS selectors per site for what to hide (`hide`), what to remove (`remove`), and where products are (`product`, `productPage`). Selectors in the `price` group get a fixed-width placeholder, so ₹999 and ₹49,999 look the same.
2. **Generic ₹ detector**: catches any `₹1,234`, `Rs. 500`, `INR 99` or `20% off` the rules miss, including prices split across elements, and keeps watching as the page loads more products.

If a site file has no `price` selector for products, the extension saves the first ₹ amount after the product's title. That's how Flipkart works, since its class names change often.

## Add a site

Site files are data only: CSS selectors and settings, never code. To add one:

1. Copy `extension/sites/amazon.in.json` to `extension/sites/<domain>.json` and change the selectors.
2. Add the file name to `extension/sites/index.json`.
3. Add the domain to `content_scripts.matches` in `extension/manifest.json`.
4. Run `node scripts/validate.mjs`.
5. Load the extension, check prices are hidden on search and product pages, and open a pull request with a screenshot.

`schema/site.schema.json` documents every field.

## Publishing

- `store/LISTING.md`: text for every Chrome Web Store field
- `store/privacy.html`: privacy policy, to publish at a public URL
- `store/screenshot-*.png` and `store/promo-small.png`: store images
- Build the upload file: `cd extension && zip -r ../dist/do-you-like-it-<version>.zip . -x '.*'`

## Status

Version 0.1.0, tested on Amazon.in, Flipkart and Myntra search and product pages (21 November 2026). Not yet included: a PIN to stop hiding being turned off, and a shareable lookbook.

## License

Code: MIT. Site files: CC0.
