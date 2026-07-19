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

// Fundo sólido navy + logo centralizado. Usado no maskable (área de segurança
// maior) e no apple-touch-icon (iOS ignora transparência e recorta sozinho, por
// isso precisa de fundo opaco e da arte preenchendo mais).
async function iconeSobreMarca(tamanho, proporcao, arquivo, destino = DESTINO) {
  const interno = Math.round(tamanho * proporcao);
  const logo = await sharp(ORIGEM)
    .resize(interno, interno, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: { width: tamanho, height: tamanho, channels: 4, background: MARCA },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(`${destino}/${arquivo}`);
}

await iconePadrao(192, "icon-192.png");
await iconePadrao(512, "icon-512.png");
await iconeSobreMarca(512, 0.7, "icon-maskable-512.png");
// apple-touch-icon: Next detecta src/app/apple-icon.png e injeta o <link>.
await iconeSobreMarca(180, 0.82, "apple-icon.png", "src/app");
console.log("Ícones gerados em", DESTINO, "+ src/app/apple-icon.png");
