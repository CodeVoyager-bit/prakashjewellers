# Prakash Jeweller

Mobile-first catalogue and WhatsApp enquiry site for a jewellery store, built for a two-month pilot that the store can keep running afterwards. Every weight-based price is an estimate worked out from the store's published daily rate. Customers add pieces to an **Enquiry cart** and **Send enquiry** on WhatsApp, or enquire about a single piece from its page. There is no customer login, online payment or order confirmation. Staff manage everything at `/admin`.

Customer pages: Home (`/`), Collections (`/collections`: search by name or design code, category, availability and sort), a page per physical piece (`/item/…`: gallery, price breakdown, verified details), Enquiry Cart (`/cart`), Price Calculator (`/calculator`) and Visit & Contact (`/visit`). On phones these sit behind a bottom tab bar.

**Stack:** Next.js 16 on Vercel · MongoDB Atlas · better-auth (staff phone number + password, no OTP, sign-up disabled) · Cloudinary for photos.

## Pricing

```
metal value   = billable gold weight × rate per gram for the piece's purity
making charge = metal value × making %
subtotal      = metal value + making charge + additional charges
tax           = subtotal × tax %
estimate      = subtotal + tax          (each line rounded to the rupee)
```

- Rates are kept per purity category (22K gold, 18K gold, Silver 925 …). The site never converts one purity into another.
- Making % and tax % are settings (admin → Settings). A piece can override making and add charges such as stone setting.
- Billable weight is the gold weight when it differs from the gross weight; otherwise the gross weight.
- A fixed-price piece ignores the formula; its price is treated as final.
- **The owner must confirm the calculation order, what is taxed and the rounding before launch.** The figures from the meeting are examples, not verified rules.
- A rate not updated today is shown to customers as stale; a missing rate shows “price on request”. Estimates are never presented as locked.

## Setup

1. **MongoDB Atlas.** Copy the connection string (Connect → Drivers) into `MONGODB_URI`. Under Network Access, allow `0.0.0.0/0`; Vercel has no fixed IP.
2. **Cloudinary.** Copy the cloud name, API key and secret. The key's role must include upload ("create") permission; a read-only key fails with `missing permissions (actions=["create"])`.
3. **Auth.** Set `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) and `BETTER_AUTH_URL` (the site's address).
4. Copy `.env.example` to `.env.local`, fill it in, then:

```bash
npm install
```

```bash
npm run add-staff -- 9876543210 'a-strong-password' "Owner Name"
```

This creates the first login, an **owner**. Staff sign in at `/admin` with that mobile number and password. From then on, owners add, reset and remove logins on the **Staff** page in the admin; a login marked Staff (not Owner) can use the admin but can't manage logins. The command still works to reset any password if an owner is locked out. Logins are stored with an internal key, `91<number>@staff.invalid`, that is never mailed.

## Deploy (Vercel)

Import the GitHub repo in Vercel, add the six variables from `.env.example` (with `BETTER_AUTH_URL` set to the `https://….vercel.app` address), and deploy. Every push to `main` redeploys.

`vercel.json` runs the server in Mumbai (`bom1`), next to the Atlas cluster in AWS `ap-south-1`, and adds basic security headers. If the cluster ever moves region, change `regions` to match.

**Custom domain later:** add it in Vercel → Domains, set `BETTER_AUTH_URL` to the new address, redeploy, and reprint the counter QR. Nothing else refers to the domain. Don't assume a domain is available until it is bought, in the store's name.

## Staff use

The built-in **Staff Guide** (`/admin/guide`) covers the daily routine. In short:

- **Rates** (`/admin/rates`): choose per gram or per 10 grams, type only the rates that changed, check the preview, save. Each save records who and when. A change of more than 50% is refused unless “Allow a big change” is ticked, which catches per-gram vs per-10-gram mistakes.
- **Products & Stock**: one entry per physical piece, with its own weight and piece number. **New Piece** copies a design without its weight. **Mark Sold** lowers stock and logs the sale. Draft, Archive and “Preview as Customer” keep unfinished pieces hidden.
- **Enquiries**: every WhatsApp hand-off, matched by its Ref, with a follow-up status. Enquiries never reserve stock.
- **Dashboard**: rate warnings, the pilot report (visits, product views, cart adds, WhatsApp opens, confirmed enquiries, pieces sold) and exports.
- **Settings**: store details (unconfirmed ones show as “to be confirmed”), making and tax %, and the theme: Burgundy (default, from the UI brief) or the lookbook's Profile, Rose & Pearl and Emerald Art Deco. Preview any of them by adding `?theme=rose` (or `emerald`, `profile`, `burgundy`) to a page address.

## Handover and backup

Signed-in staff can download `/admin/export/items.csv`, `enquiries.csv`, `sales.csv`, `stats.csv` and a full `backup.json` (all store data, no login data). The data lives in the store's own Atlas and Cloudinary accounts, so handing over means transferring those accounts, the Vercel project and the GitHub repo.

## The app

The site installs as an app, so customers get the shop's icon on their home screen and a full-screen catalogue: on Android, Chrome offers **Install** (also a button on the Contact page); on iPhone, **Share → Add to Home Screen**. It is the same site, so prices stay live and there is nothing separate to update. For a Play Store listing, wrap the live address with [PWABuilder](https://www.pwabuilder.com) once the final domain is set.

## Demo data

`npm run demo:add` loads 8 sample pieces (7 designs; one design has two pieces of different weights) with free Unsplash photos, and sets a sample 22K rate if none is set. Sample pieces are labelled “Sample” on the site. **Run `npm run demo:remove` before go-live.** It deletes every sample piece (even ones edited in admin), its photos, enquiries and sales. If nothing else is left, design codes and piece numbers restart and the pilot stats start clean.

## Development

```bash
npm run dev
```

```bash
npm test
```

`npm test` checks the pricing formula (billable weight, making override, additional charges, tax setting, stale and missing rates, per-10-gram conversion), the Cloudinary upload signature, phone-number logins and design-code search.
