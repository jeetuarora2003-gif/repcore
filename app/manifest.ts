import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RepCore",
    short_name: "RepCore",
    description: "Premium gym management SaaS for independent Indian gyms.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#16181d",
    theme_color: "#16181d",
    orientation: "portrait",
    lang: "en-IN",
    // v2 — icon redesign April 2026
    icons: [
      {
        src: "/icon.svg?v=2",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg?v=2",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/apple-icon.svg?v=2",
        sizes: "180x180",
        type: "image/svg+xml",
      },
    ],
  };
}
