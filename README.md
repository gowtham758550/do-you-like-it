# Do You Like It? ❤️

**Hide the prices. Let them pick what they actually love.**

A Chrome extension for shopping together with anyone you're buying for. It hides prices, discounts and price filters, and puts a ♡ Like button on every product. Their picks are saved in a list where only you see the prices.

> Inspired by a LinkedIn post asking shopping apps to let people hide prices.

## Install

**[Get it on the Chrome Web Store](https://chromewebstore.google.com/detail/do-you-like-it/klifbeipeadkbbfidmanobgoompaiinn)**

## Run from source

1. Open `chrome://extensions` and switch on **Developer mode** (top right).
2. Click **Load unpacked** and pick the `extension/` folder.
3. Open [Amazon.in](https://www.amazon.in), [Flipkart](https://www.flipkart.com) or [Myntra](https://www.myntra.com) and search for anything. For Amazon in other countries, eBay, Etsy or IKEA, open the store, click the toolbar button and choose **Turn on**.

- The pill in the bottom-right corner, the toolbar popup, or **Alt+Shift+P** turns hiding on and off.
- Tap **♡ Like** on a product card or product page to save it.
- Open the toolbar popup to see the picks. Prices stay hidden until you click **Show prices**.

## How it works

Everything runs in your browser. Nothing is sent anywhere.

1. **Site rules** (`extension/sites/*.json`): CSS selectors per site for what to hide (`hide`), what to remove (`remove`), and where products are (`product`, `productPage`). Selectors in the `price` group get a fixed-width placeholder, so $9 and $900 look the same. Stores with one site per country (Amazon, eBay) list every domain in one file, with a name and currency per domain under `regions`.
2. **Generic price detector** (`extension/currency.js`): catches prices in any currency (`$1,299.99`, `1.299,99 €`, `£49`, `₹1,23,456`, `CHF 49.–`, `20% off`) that the rules miss, including prices split across elements, and keeps watching as the page loads more products.

If a site file has no `price` selector for products, the extension saves the first price after the product's title. That's how Flipkart works, since its class names change often.

**Always-on and optional stores.** Amazon.in, Flipkart and Myntra are on from install. Every other store is an optional permission: the popup offers "Turn on" when you visit it, and the extension then runs only on stores you've approved.

**Six shopping sites, global currencies.** Amazon (India, US, UK, Germany, Canada, Australia and UAE), eBay (US, UK, Germany, Australia and Canada), Etsy, IKEA, Flipkart and Myntra. That is 12 regional Amazon and eBay storefronts, plus Etsy and IKEA's international `.com` storefronts. Picks and totals work in the currency shown by each store.

**Picks list.** Grouped by store (fold each group open or closed), with subtotals and a total per currency. A single pick has an "Open" button; groups with multiple picks have "Open all". Checkout always happens on the store's own site.

## Add a site

Site files are data only: CSS selectors and settings, never code. To add one:

1. Copy `extension/sites/etsy.json` (one domain) or `extension/sites/ebay.json` (one domain per country) to `extension/sites/<id>.json` and change the selectors.
2. Add the file name to `extension/sites/index.json`.
3. Add `*://*.<domain>/*` for each domain to `optional_host_permissions` in `extension/manifest.json`. New stores are optional; users turn them on from the popup.
4. Run `node scripts/validate.mjs`.
5. Load the extension, check prices are hidden on search and product pages, and open a pull request with a screenshot.

`schema/site.schema.json` documents every field.

## Releases

Every push to `main` builds the extension and publishes `do-you-like-it-<version>.zip` on the [Releases page](https://github.com/gowtham758550/do-you-like-it/releases), tagged `v<version>` from `extension/manifest.json`. That zip is the file to upload to the Chrome Web Store. Bump `version` in the manifest to publish a new release; pushing again with the same version replaces that release's zip.

`main` only accepts changes through pull requests.

Other publishing files:
- `store/privacy.html`: privacy policy, served by GitHub Pages
- `store/screenshot-*.png` and `store/promo-small.png`: store images
- Build the zip locally: `cd extension && zip -r ../dist/do-you-like-it-<version>.zip . -x '.*'`

## Status

Version 0.2.2. Supports 6 shopping sites: Amazon (IN, US, UK, DE, CA, AU, AE), eBay (US, UK, DE, AU, CA), Etsy, IKEA, Flipkart and Myntra. Not yet included: a PIN to stop hiding being turned off, a shareable lookbook, and Shopify/Walmart/Zara rules. Known gap: Etsy shows prices inside size dropdowns, which page styles can't reach.

## License

Code: MIT. Site files: CC0.
