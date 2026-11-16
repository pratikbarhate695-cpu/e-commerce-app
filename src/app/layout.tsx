import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const SITE_URL = "https://maquatom.netlify.app";

const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600"],
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const SITE_DESCRIPTION =
  "Shop authentic electronics, computers, laptops, accessories, lifestyle products and everyday essentials at Maquatom. Discover quality products across multiple categories with a convenient online shopping experience.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Maquatom | Electronics, Lifestyle & Everyday Products",
    template: "%s | Maquatom",
  },

  description: SITE_DESCRIPTION,

  applicationName: "Maquatom",

  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Maquatom",
    title: "Maquatom | Electronics, Lifestyle & Everyday Products",
    description: SITE_DESCRIPTION,
  },

  twitter: {
    card: "summary_large_image",
    title: "Maquatom | Electronics, Lifestyle & Everyday Products",
    description: SITE_DESCRIPTION,
  },

  verification: {
    google: "kjNmfEmB6l7ZeoDOkhN19EX9YB0BlT80fdbWt5McBG8",
  },

  robots: {
    index: true,
    follow: true,
  },
};

const themeScript = `(function(){try{var s=localStorage.getItem("zero-integration-theme");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-paper text-ink font-sans antialiased">
        {children}
      </body>
    </html>
  );
}