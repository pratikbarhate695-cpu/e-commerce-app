import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Store Admin";

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env before seeding."
    );
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      // Re-running the seed refreshes the hash if ADMIN_PASSWORD changed,
      // but never downgrades an existing admin's role.
      passwordHash,
      name,
    },
    create: {
      email,
      passwordHash,
      name,
      role: "ADMIN",
    },
  });

  // Single-row store settings, created once if missing.
  const existingSettings = await prisma.storeSettings.findFirst();
  if (!existingSettings) {
    await prisma.storeSettings.create({
      data: {
        storeName: "My Store",
        currency: "INR",
        shippingFee: 49,
        freeShippingThreshold: 999,
        taxPercent: 5,
      },
    });
  }

  // Sample catalog so the storefront isn't empty on first run.
  // Images are Cloudinary's public demo assets — swap for real product
  // photos uploaded through the admin dashboard in Phase 3.
  const category = await prisma.category.upsert({
    where: { slug: "bags" },
    update: {},
    create: { name: "Bags", slug: "bags" },
  });

  const sampleProducts = [
    {
      sku: "BAG-001",
      name: "Canvas Tote",
      slug: "canvas-tote",
      brand: "Housemark",
      description: "A sturdy everyday tote in heavyweight canvas.",
      mrp: 1499,
      sellingPrice: 1199,
      discountPct: 20,
      stockQty: 24,
      isFeatured: true,
      image: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    },
    {
      sku: "BAG-002",
      name: "Leather Weekender",
      slug: "leather-weekender",
      brand: "Housemark",
      description: "Full-grain leather weekender with brass hardware.",
      mrp: 8999,
      sellingPrice: 8999,
      discountPct: 0,
      stockQty: 6,
      isFeatured: true,
      image: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    },
    {
      sku: "BAG-003",
      name: "Rolltop Backpack",
      slug: "rolltop-backpack",
      brand: "Fieldwork",
      description: "Water-resistant rolltop backpack with a padded laptop sleeve.",
      mrp: 3499,
      sellingPrice: 2799,
      discountPct: 15,
      stockQty: 3,
      lowStockThreshold: 5,
      isFeatured: false,
      image: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    },
  ];

  for (const p of sampleProducts) {
    const { image, ...data } = p;
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        ...data,
        categoryId: category.id,
        images: { create: [{ url: image, sortOrder: 0 }] },
      },
    });
  }

  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      type: "PERCENT",
      value: 10,
      minOrderValue: 500,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  console.log(`Seeded admin user: ${admin.email} (id: ${admin.id})`);
  console.log("Seeded sample category, products, and a WELCOME10 coupon.");
  console.log(
    "Reminder: ADMIN_PASSWORD was only read here to create the hash above — rotate it in your secrets manager for production."
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
