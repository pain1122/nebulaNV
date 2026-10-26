import { deflateSync } from "node:zlib";
import { Buffer } from "node:buffer";

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, bytes) {
  const name = Buffer.from(type);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(bytes.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, bytes])));
  return Buffer.concat([size, name, bytes, checksum]);
}
// Generated test patterns: reproducible render fixtures, not product photography.
export function demoPng(index, { width = 64, height = 64 } = {}) {
  if (
    ![width, height].every(
      (value) => Number.isInteger(value) && value > 0 && value <= 4096,
    ) ||
    width * height > 8_000_000
  )
    throw new Error("demo_png_dimensions_invalid");
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const pixels = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const offset = y * (1 + width * 3) + 1 + x * 3;
      pixels[offset] = (x * 3 + index * 17) % 256;
      pixels[offset + 1] = (y * 3 + index * 29) % 256;
      pixels[offset + 2] = ((x ^ y) * 3 + index * 43) % 256;
    }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
