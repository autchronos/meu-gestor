import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const ORIGEM = "public/logo-icone.png";
const DESTINO = "public/icons";
const MARCA = "#0A2540";
const FUNDO_CLARO = "#F7F8FA";

await mkdir(DESTINO, { recursive: true });

async function iconePadrao(tamanho, arquivo) {
  await sharp(ORIGEM)
    .resize(tamanho, tamanho, { fit: "contain", background: FUNDO_CLARO })
    .png()
    .toFile(`${DESTINO}/${arquivo}`);
}

async function iconeMaskable(tamanho, arquivo) {
  const interno = Math.round(tamanho * 0.7); // área de segurança
  const logo = await sharp(ORIGEM)
    .resize(interno, interno, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: { width: tamanho, height: tamanho, channels: 4, background: MARCA },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(`${DESTINO}/${arquivo}`);
}

await iconePadrao(192, "icon-192.png");
await iconePadrao(512, "icon-512.png");
await iconeMaskable(512, "icon-maskable-512.png");
console.log("Ícones gerados em", DESTINO);
