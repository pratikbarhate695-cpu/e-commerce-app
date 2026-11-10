# Staging verification checklist (redesign branch `redesign/phase3-staging`)

Nothing here has been deployed. Every item marked **[ ]** is NOT yet verified: it needs a
running app with a **staging** database and **staging** credentials. Never use production
secrets, and never point `DATABASE_URL` at the production database.

## 0. Local commands (PowerShell, from the project folder)

```powershell
npm.cmd install
npm.cmd test                    # unit + static checks, no database needed
npx.cmd tsc --noEmit
npm.cmd run build
```

Staging database only (guarded; refuses if the host matches a production fragment):

```powershell
$env:STAGING_FIXTURES_CONFIRM = "I_AM_USING_A_STAGING_DATABASE"
$env:PRODUCTION_DB_HOST_FRAGMENTS = "<text that appears in your PRODUCTION database host>"
npm.cmd run staging:fixtures                 # creates ZZ Test categories + 42 products
npm.cmd run staging:fixtures -- --cleanup    # removes (or hides) them afterwards
```

Test data: `ZZ Test Electronics` has NO products of its own (Phones 30, Android 2, Tablets 3 below it);
`ZZ Test Audio` has 2 own + Earbuds 3; `ZZ Test Chargers` is flat (2); `ZZ Test Empty Parent > Empty Child` has none.

## 1. Categories and pagination (staging data from section 0)

- [ ] Header nav, footer and homepage tiles show **ZZ Test Electronics** (parent with products only in children)
- [ ] Tile/nav count for Electronics = 35 (30 + 2 + 3); Audio = 5; Chargers = 2
- [ ] **ZZ Test Empty Parent** appears nowhere (nav, tiles, footer, Shop chips)
- [ ] `/category/zz-test-electronics` lists 24 products on page 1 and shows Phones, Tablets chips; `?page=2` shows the rest
- [ ] `/category/zz-test-phones` shows breadcrumb "ZZ Test Electronics / ZZ Test Phones" and an Android chip
- [ ] `/shop` shows "N products" (the real total, not 24) and Previous/Next; every product is reachable
- [ ] `/shop?page=abc`, `?page=0`, `?page=-3`, `?page=2.5` show page 1; `?page=9999` shows the last page
- [ ] `/search?q=ZZ+Test` keeps `q` on every pagination link; match count is the real total
- [ ] No product appears on two pages, none is skipped

## 2. Layout, logo, theme (real browser, light AND dark)

- [ ] 320px and 390px: logo pill + "Zero Integration" text on one row with Sign in / theme / Cart, no sideways scroll
- [ ] Pill is light and readable in dark mode; footer logo too
- [ ] Product cards and product gallery use the same white image stage in dark mode
- [ ] Order timeline: upcoming steps have a visible dashed ring in both themes
- [ ] Admin pages: secondary text is clearly readable in both themes

## 3. Policies and delivery

- [ ] Product page shows "Estimated delivery <date> – <date>" with the not-a-guarantee text, and the dates skip Sundays
- [ ] Refund policy, Terms, Shipping policy, product badges and homepage trust bar all say 5-day returns and 7-day warranty
- [ ] Refund, Terms, Shipping show "Last updated: 25 October 2026" (set to the real release date before going live); Privacy and Contact still show 12 October 2026

## 4. Commerce and security (staging credentials only)

- [ ] Customer login and admin login
- [ ] Customer is blocked from `/admin`
- [ ] Cart add/update/remove; coupon apply/remove; checkout totals unchanged vs. before the redesign
- [ ] Razorpay TEST-mode payment succeeds and fails correctly
- [ ] Webhook processed once (replay is idempotent); order status updates
- [ ] Order history and order timeline render

Record results in the pull request; do not paste secrets, tokens or full connection strings.
