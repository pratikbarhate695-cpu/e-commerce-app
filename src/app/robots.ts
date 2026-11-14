
import type { MetadataRoute } from "next";

const SITE_URL = "https://zerointegration.netlify.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/auth/",
        "/admin/",
        "/api/",
        "/account/",
        "/cart",
        "/checkout",
        "/login",
        "/register",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
