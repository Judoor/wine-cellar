import type { MetadataRoute } from "next";

/** Web app manifest: lets phones install the app on the home screen (standalone, no browser bar). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wine Cellar",
    short_name: "Wine Cellar",
    description: "Self-hosted wine cellar management",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ece2d0",
    theme_color: "#3a2416",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press shortcuts on the home-screen icon.
    shortcuts: [
      { name: "Add a wine", url: "/wines/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "To drink", url: "/drink", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Wishlist", url: "/wishlist", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
