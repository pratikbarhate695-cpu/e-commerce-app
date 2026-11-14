/**
 * VISUAL-PREVIEW-ONLY sample products.
 *
 * These items are NOT in the database, have no stock, and can never be added to the
 * cart or checked out. They exist only so the homepage still looks complete while the
 * real catalogue is empty. Once real products exist the homepage stops showing them.
 */

export type DemoProduct = {
  slug: string;
  name: string;
  /** Sample price in rupees (display only). */
  price: number;
  /** File inside /public. */
  image: string;
  summary: string;
  highlights: string[];
  specs: { label: string; value: string }[];
};

/** Hero artwork. To use a real photo instead, put it in /public/hero and change this path. */
export const HERO_IMAGE = "/hero/hero-devices.svg";

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    slug: "wireless-headphones",
    name: "Wireless Headphones",
    price: 2499,
    image: "/demo-products/wireless-headphones.svg",
    summary: "Over-ear headphones, shown as a sample to preview the product page layout.",
    highlights: ["Over-ear design", "Wireless connection", "Sample item for layout preview"],
    specs: [{ label: "Type", value: "Over-ear" }, { label: "Connection", value: "Wireless" }, { label: "Colour", value: "Graphite" }],
  },
  {
    slug: "mechanical-keyboard",
    name: "Mechanical Keyboard",
    price: 3299,
    image: "/demo-products/mechanical-keyboard.svg",
    summary: "A compact keyboard, shown as a sample to preview the product page layout.",
    highlights: ["Compact layout", "Backlit keys", "Sample item for layout preview"],
    specs: [{ label: "Type", value: "Mechanical" }, { label: "Layout", value: "Compact" }, { label: "Colour", value: "Graphite and blue" }],
  },
  {
    slug: "wireless-mouse",
    name: "Wireless Mouse",
    price: 999,
    image: "/demo-products/wireless-mouse.svg",
    summary: "A simple wireless mouse, shown as a sample to preview the product page layout.",
    highlights: ["Wireless connection", "Scroll wheel", "Sample item for layout preview"],
    specs: [{ label: "Type", value: "Wireless mouse" }, { label: "Buttons", value: "Two buttons and scroll wheel" }, { label: "Colour", value: "Graphite" }],
  },
  {
    slug: "smart-watch",
    name: "Smart Watch",
    price: 4499,
    image: "/demo-products/smart-watch.svg",
    summary: "A smart watch, shown as a sample to preview the product page layout.",
    highlights: ["Square display", "Soft strap", "Sample item for layout preview"],
    specs: [{ label: "Type", value: "Smart watch" }, { label: "Display", value: "Square" }, { label: "Strap", value: "Blue" }],
  },
  {
    slug: "portable-speaker",
    name: "Portable Speaker",
    price: 1799,
    image: "/demo-products/portable-speaker.svg",
    summary: "A portable speaker, shown as a sample to preview the product page layout.",
    highlights: ["Carry handle", "Wireless connection", "Sample item for layout preview"],
    specs: [{ label: "Type", value: "Portable speaker" }, { label: "Connection", value: "Wireless" }, { label: "Colour", value: "Graphite" }],
  },
  {
    slug: "usb-c-hub",
    name: "USB-C Hub",
    price: 1299,
    image: "/demo-products/usb-c-hub.svg",
    summary: "A multi-port USB-C hub, shown as a sample to preview the product page layout.",
    highlights: ["Several ports in one", "Slim body", "Sample item for layout preview"],
    specs: [{ label: "Type", value: "USB-C hub" }, { label: "Ports", value: "USB-C, USB-A, HDMI" }, { label: "Colour", value: "Silver" }],
  },
];

export function getDemoProduct(slug: string): DemoProduct | undefined {
  return DEMO_PRODUCTS.find((p) => p.slug === slug);
}
