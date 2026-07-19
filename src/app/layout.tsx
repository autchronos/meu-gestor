import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--fonte-sans" });
const lora = Lora({ subsets: ["latin"], variable: "--fonte-serif" });

export const metadata: Metadata = {
  title: "Autchronos — Meu Gestor Financeiro",
  description: "Gestão financeira e fluxo de caixa para micro-empreendedores.",
};

const scriptTema = `try{if(localStorage.getItem('tema')==='escuro'){document.documentElement.classList.add('dark')}}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${lora.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
