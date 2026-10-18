import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  {
    sku: "SONY-MDRZX110A-001",
    name: "Sony MDRZX110A/WZIN Wired Headphones (White)",
    slug: "sony-mdrzx110a-wzin-wired-headphones-white",
    brand: "Sony",
    category: "Headphones",
    description:
      "Sony wired headphones in white, designed for everyday music, videos and comfortable listening with a lightweight design and a 3 ft cable.",
    specifications: {
      color: "White",
      cableLength: "3 ft",
      connectivity: "Wired",
      features: ["Lightweight design", "Everyday listening", "3 ft cable"],
    },
    mrp: 1390,
    sellingPrice: 899,
    stockQty: 5,
    image: "/products/sony-mdrzx110a.jpg",
  },
  {
    sku: "SAM-S25FE-8-128-JB-001",
    name: "Samsung Galaxy S25 FE 5G Smartphone with Galaxy AI (JetBlack, 8GB RAM, 128GB Storage)",
    slug: "samsung-galaxy-s25-fe-5g-jetblack-8gb-128gb",
    brand: "Samsung",
    category: "Smartphones",
    description:
      "Samsung Galaxy S25 FE 5G in JetBlack with Galaxy AI, 8 GB RAM, 128 GB storage, a 12 MP front camera, ProVisual Engine and long battery life.",
    specifications: {
      color: "JetBlack",
      ram: "8 GB",
      storage: "128 GB",
      connectivity: "5G",
      frontCamera: "12 MP",
      features: ["Galaxy AI", "ProVisual Engine", "Long battery life"],
    },
    mrp: 61000,
    sellingPrice: 61000,
    stockQty: 1,
    image: "/products/samsung-galaxy-s25-fe-jetblack.jpg",
  },
  {
    sku: "SAM-S25FE-8-128-NV-001",
    name: "Samsung Galaxy S25 FE 5G Smartphone with Galaxy AI (Navy, 8GB RAM, 128GB Storage)",
    slug: "samsung-galaxy-s25-fe-5g-navy-8gb-128gb",
    brand: "Samsung",
    category: "Smartphones",
    description:
      "Samsung Galaxy S25 FE 5G in Navy with Galaxy AI, 8 GB RAM, 128 GB storage, a 12 MP front camera, ProVisual Engine and long battery life.",
    specifications: {
      color: "Navy",
      ram: "8 GB",
      storage: "128 GB",
      connectivity: "5G",
      frontCamera: "12 MP",
      popularity: "200+ bought in past month",
      features: ["Galaxy AI", "ProVisual Engine", "Long battery life"],
    },
    mrp: 60000,
    sellingPrice: 60000,
    stockQty: 1,
    image: "/products/samsung-galaxy-s25-fe-navy.jpg",
  },
  {
    sku: "LEN-TAB-101-4-64-PB-001",
    name: "Lenovo Tab (Smartchoice) 10.1-inch Wi-Fi Tablet",
    slug: "lenovo-tab-smartchoice-10-1-inch-polar-blue",
    brand: "Lenovo",
    category: "Tablets",
    description:
      "Lenovo Tab Smartchoice with a 10.1-inch display, 4 GB RAM, 64 GB ROM, expandable storage up to 1 TB, metal body, Dolby Atmos speakers and Android 14.",
    specifications: {
      color: "Polar Blue",
      display: "10.1 inch",
      ram: "4 GB",
      storage: "64 GB ROM",
      expandableStorage: "Up to 1 TB",
      connectivity: "Wi-Fi only",
      speakers: "Dual speakers with Dolby Atmos",
      body: "Metal",
      operatingSystem: "Android 14",
    },
    mrp: 22500,
    sellingPrice: 22500,
    stockQty: 1,
    image: "/products/lenovo-tab-polar-blue.jpg",
  },
  {
    sku: "SAM-TAB-A11P-6-128-GR-001",
    name: "Samsung Galaxy Tab A11+ [Smartchoice] 11-inch Wi-Fi Tablet",
    slug: "samsung-galaxy-tab-a11-plus-gray-6gb-128gb",
    brand: "Samsung",
    category: "Tablets",
    description:
      "Samsung Galaxy Tab A11+ with an 11-inch LCD display, 6 GB RAM, 128 GB ROM, Wi-Fi connectivity, quad speakers with Dolby Atmos and AI-enabled features.",
    specifications: {
      color: "Gray",
      display: "11-inch (27.82 CM) LCD",
      ram: "6 GB",
      storage: "128 GB ROM",
      connectivity: "Wi-Fi",
      speakers: "Quad speakers with Dolby Atmos",
      aiEnabled: true,
    },
    mrp: 27500,
    sellingPrice: 27500,
    stockQty: 1,
    image: "/products/samsung-galaxy-tab-a11-plus-gray.png",
  },
];

async function main() {
  // If the earlier draft was ever run, remove the SonicPulse product as requested.
  await prisma.product.deleteMany({
    where: { slug: "sonicpulse-airbeat-tws-wireless-earbuds" },
  });

  for (const p of products) {
    const category = await prisma.category.upsert({
      where: { slug: p.category.toLowerCase().replace(/\s+/g, "-") },
      update: { name: p.category },
      create: {
        name: p.category,
        slug: p.category.toLowerCase().replace(/\s+/g, "-"),
      },
    });

    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    const { image, ...data } = p;

    const product = existing
      ? await prisma.product.update({
          where: { id: existing.id },
          data: {
            ...data,
            categoryId: category.id,
            discountPct: p.mrp > 0 ? ((p.mrp - p.sellingPrice) / p.mrp) * 100 : 0,
            lowStockThreshold: 5,
            isActive: true,
          },
        })
      : await prisma.product.create({
          data: {
            ...data,
            categoryId: category.id,
            discountPct: p.mrp > 0 ? ((p.mrp - p.sellingPrice) / p.mrp) * 100 : 0,
            lowStockThreshold: 5,
            isActive: true,
            images: image
              ? { create: [{ url: image, altText: p.name, sortOrder: 0 }] }
              : undefined,
          },
        });

    if (existing && image) {
      await prisma.productImage.deleteMany({ where: { productId: product.id } });
      await prisma.productImage.create({
        data: { productId: product.id, url: image, altText: p.name, sortOrder: 0 },
      });
    }

    console.log(`Added/updated: ${product.name} | ₹${p.sellingPrice} | stock ${p.stockQty}`);
  }

  console.log("Done. SonicPulse AirBeat has been removed.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
