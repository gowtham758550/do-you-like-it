# Chrome Web Store listing

Copy each section into the matching field of the Chrome Web Store Developer Dashboard.

## Store listing tab

**Name** (taken from the manifest)
Do You Like It?

**Summary** (from the manifest `description`, max 132 characters)
Hide prices while you shop together. Let them pick what they love. The price is your problem.

**Category**
Shopping

**Language**
English

**Description**

```
Show someone a product online and the first question is usually "How much is it?" — before they've even looked at the colour, the design, or whether they like it.

Do You Like It? hides the prices, so the people you shop with can pick what they truly love. The price is your problem.

WHAT IT DOES
• Hides prices, crossed-out M.R.P.s, "% off" badges, coupons and deal tags
• Every price gets the same striped placeholder, so ₹999 and ₹49,999 look exactly alike
• Removes price filters and "Sort by price" options
• Removes bank offers and EMI boxes from product pages
• Adds a ♡ Like button to every product. Their picks are saved in a list
• The picks list keeps prices hidden until you click "Show prices", with a total

TURN IT ON AND OFF
• The pill in the bottom-right corner of the page
• The toolbar button
• Keyboard shortcut: Alt+Shift+P

WORKS ON
• Amazon.in
• Flipkart
• Myntra
More sites are added by the community. A built-in ₹ detector also catches prices the site rules miss.

PRIVATE BY DESIGN
• No account, no sign-in
• Nothing is sent anywhere. Your picks are stored only in your browser
• No tracking, no analytics, no ads
• Open source: anyone can read the code

PERFECT FOR
• Shopping together with family, friends or your partner
• Choosing a gift for someone without the price getting in the way
• Festivals, birthdays and weddings
• Browsing on your own without "70% off" deciding for you

Not affiliated with Amazon, Flipkart or Myntra.
```

**Graphic assets** (all in `store/`)
- Store icon: `extension/icons/icon-128.png`
- Screenshots (1280×800): `store/screenshot-1-search.png`, `store/screenshot-2-product.png`, `store/screenshot-3-picks.png`
- Small promo tile (440×280): `store/promo-small.png`

**Official URL**
Leave empty (it only accepts a domain verified in Google Search Console).

**Homepage URL**
https://github.com/gowtham758550/do-you-like-it

**Support URL**
https://github.com/gowtham758550/do-you-like-it/issues

## Privacy practices tab

**Single purpose description**
```
Hides product prices on shopping websites so family members can choose products by preference instead of price, and lets the user save liked products to a private list.
```

**Permission justification: storage**
```
Stores the on/off setting and the user's list of liked products locally in the browser. Nothing is synced or sent anywhere.
```

**Permission justification: host permissions (amazon.in, flipkart.com, myntra.com)**
```
The extension runs only on these shopping sites. It needs to read and change their pages to cover prices with placeholders, remove price filters and add the Like button to products.
```

**Are you using remote code?**
No. All JavaScript is included in the package. Site rules are JSON files bundled with the extension.

**Data usage**
Tick none of the data types. The extension does not collect or transmit user data.

Then certify all three:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL**
https://gowtham758550.github.io/do-you-like-it/store/privacy.html

## Distribution tab

- **Visibility:** Unlisted for the first week, then Public
- **Regions:** All regions (or India only to start)
- **Pricing:** Free
