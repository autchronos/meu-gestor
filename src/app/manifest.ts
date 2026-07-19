import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Autchronos — Meu Gestor Financeiro",
    short_name: "Autchronos",
    description: "Gestão financeira e fluxo de caixa para micro-empreendedores.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F8FA",
    theme_color: "#0A2540",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
