PATCH: reviews, Q&A, bullets, delivery date, trust badges, Buy now, multi-image picker

1. Unzip and copy the folders (src, prisma, public-less) over your project, choose Replace/Merge.
   Do NOT delete anything. Your site name, logo and layout.tsx are not touched.
2. In src/lib/site.ts change  returnDays: 5  to  returnDays: 7
   (this one number controls the "7 days return" badge and the refund policy page)
3. In CMD, in the project folder, one at a time:
   npx prisma db push
   npx prisma generate
   npm run dev
   (db push only ADDS new tables and one new column. It does not delete data.)
4. Delivery days: src/lib/store-info.ts  (DELIVERY_DAYS = 6)
