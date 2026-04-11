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
    icons: [
      {
        src: "/icon.png?v=3",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png?v=3",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
