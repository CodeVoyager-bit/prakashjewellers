# Prakash Jeweller

Mobile-first catalogue and WhatsApp enquiry site for a jewellery shop, styled after the design lookbook. Every price is worked out live from the day's 22K gold rate, which the owner updates once a day. Customers heart pieces into **Saved** and send them to the shop's WhatsApp in one message, or enquire about a single piece from its page; there is no customer login and no online payment. Staff manage everything at `/admin`.

Pages: Home (`/`), Collections (`/collections`, with category tabs and search by name or design code), a page per piece (`/item/…`, gallery, price breakdown, details table), Saved (`/saved`) and Contact (`/visit`). On phones these sit behind a bottom tab bar.

**Stack:** Next.js 16 on Vercel · MongoDB Atlas · better-auth (staff phone number + password, no OTP, sign-up disabled) · Cloudinary for photos.

## Pricing

```
price = weight (g) × today's rate × (1 + making %) × 1.03 GST
```

- Making charge is 10% unless an item sets its own.
- An item with a fixed price ignores the formula; the fixed price is treated as final, GST included.
- The WhatsApp enquiry carries the rate and date used, so a quote can be honoured or re-quoted.

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

Staff sign in at `/admin` with that mobile number and password. The same command resets the password if the number already has a login. To remove someone, delete their document from the `user` collection in Atlas; its email field reads `91<number>@staff.invalid`, an internal key that is never mailed.

## Deploy (Vercel)

Import the GitHub repo in Vercel, add the six variables from `.env.example` (with `BETTER_AUTH_URL` set to the `https://….vercel.app` address), and deploy. Every push to `main` redeploys.

`vercel.json` runs the server in Mumbai (`bom1`), next to the Atlas cluster in AWS `ap-south-1`, and adds basic security headers. If the cluster ever moves region, change `regions` to match.

## Daily use (owner)

- `/admin` → **Today's 22K Gold Rate** → Update Rate. Every price on the site follows this number; the box warns when it wasn't updated today.
- **Add Item** with photos, weight and quantity. Each piece gets the next design code (PJ-001, PJ-002 …) unless you type one, e.g. the code from an Instagram post; customers can search either. Optional details (metal, stones, finish, occasion, set includes) fill the piece's details table.
- After a sale, tap − on the item. At 0 the piece shows as "Made to order".
- Items are listed most-enquired first, with view and enquiry counts. Recent enquiries are listed below.
- **Counter QR** prints a card that opens the site, for walk-in customers.
- **Shop Details** sets the WhatsApp number, phone, address, Instagram handle and theme. The four themes come from the lookbook: Profile (ivory, green and gold; the default), Rose & Pearl, Emerald Art Deco and Maroon velvet. Preview one first by adding `?theme=rose` (or `emerald`, `maroon`, `profile`) to any page address.

## Demo data

`npm run demo:add` loads 7 sample pieces with free Unsplash photos, and sets a sample rate if none is set. **Run `npm run demo:remove` before go-live.** It deletes every sample item (even ones edited in admin), its photos and any enquiries for it, and leaves the shop's own items alone. If no other items remain, design codes start again at PJ-001.

## Development

```bash
npm run dev
```

```bash
npm test
```

`npm test` checks the pricing formula, the Cloudinary upload signature and phone-number logins.
