/**
 * Gera os ícones PNG do PWA sem dependências (encoder PNG mínimo).
 * Desenho: fundo amarelo, disco creme com contorno escuro e um "+" coral.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';

const OUT_DIR = new URL('../public/icons/', import.meta.url);
const SUN = [255, 207, 63];
const INK = [38, 30, 66];
const PAPER = [251, 243, 223];
const CORAL = [240, 98, 82];

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

function encodePng(size, pixelAt) {
  const rowBytes = size * 3 + 1;
  const raw = Buffer.alloc(rowBytes * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = pixelAt(x, y);
      raw.set([r, g, b], y * rowBytes + 1 + x * 3);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8 bits, RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** `scale` < 1 encolhe o desenho para caber na zona segura dos ícones maskable. */
function drawIcon(size, scale) {
  const center = size / 2;
  const discRadius = size * 0.36 * scale;
  const outline = size * 0.035 * scale;
  const armLength = size * 0.2 * scale;
  const armWidth = size * 0.06 * scale;
  return (x, y) => {
    const dx = Math.abs(x + 0.5 - center);
    const dy = Math.abs(y + 0.5 - center);
    const distance = Math.hypot(dx, dy);
    if ((dx <= armLength && dy <= armWidth) || (dy <= armLength && dx <= armWidth)) return CORAL;
    if (distance <= discRadius) return PAPER;
    if (distance <= discRadius + outline) return INK;
    return SUN;
  };
}

mkdirSync(OUT_DIR, { recursive: true });
const icons = [
  { file: 'icon-192.png', size: 192, scale: 1 },
  { file: 'icon-512.png', size: 512, scale: 1 },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.78 },
  { file: 'apple-touch-icon.png', size: 180, scale: 1 },
];
icons.forEach(({ file, size, scale }) => {
  writeFileSync(new URL(file, OUT_DIR), encodePng(size, drawIcon(size, scale)));
  console.log(`${file}: ${size}x${size}`);
});
