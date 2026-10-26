import sharp from "sharp";

export function tinyWebp(): Promise<Buffer> {
  return sharp({
    create: { width: 8, height: 6, channels: 3, background: "#2266aa" },
  })
    .webp()
    .toBuffer();
}
