# Homepage hero and banner management

Admin > Homepage banners (`/admin/banners`). Everything below is done from the browser, on a phone or a computer.

| You want to | Do this |
|---|---|
| Add a banner | "Add a banner": pick an image, see the preview, then **Save as draft** or **Publish now** |
| Preview before publishing | The preview beside the form uses the same component as the homepage. Drafts are never public |
| Replace an image | On the banner: **Edit / replace image**. The old image stays live until the new one has uploaded and saved, then it is deleted from Cloudinary |
| Edit heading, subtitle, button text, link | Same editor. A button needs a link (`/shop` or `https://...`) |
| Several banners, order | Published HERO banners rotate in the listed order. Use **Move up / Move down** |
| Hide a banner | **Unpublish** (keeps it as a draft) |
| Remove | **Remove** (asks first; deletes the row, then the Cloudinary image) |
| No hero banner published | The built-in hero is shown, so the homepage is never empty |

Types: **Homepage hero** (top of the page) and **Promotion strip** (the smaller tiles below it; all banners made before this feature are here).

Limits: JPG, PNG or WebP, 4 MB (phone photos are shrunk in the browser first). Real file contents are checked on the server, not just the name.

## Rollout order (important)

1. Add the new columns to the database. They are all optional or defaulted, so nothing existing changes:
   `npx prisma db push` (against a STAGING database first).
2. Deploy the code.

If the code is deployed first, the homepage still works (the banner query is guarded and the built-in hero is shown) but `/admin/banners` will show an error until step 1 is done.

## Files

- `src/lib/banners/rules.ts`, `service.ts`: all rules, unit-tested (`tests/banner-*.test.ts`)
- `src/lib/banners/prisma-adapter.ts`, `queries.ts`: database access
- `src/lib/actions/admin/banners.ts`: server actions (thin; admin check happens in the service)
- `src/lib/cloudinary.ts`: `uploadBannerImage`, `deleteImage` (signed server-side; secrets never reach the browser)
- `src/components/storefront/hero-banners.tsx`: hero slide and carousel
- `src/components/admin/banner-editor.tsx`, `banner-row.tsx`, `src/app/admin/(panel)/banners/page.tsx`: admin screens
