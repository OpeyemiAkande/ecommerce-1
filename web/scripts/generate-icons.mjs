// Derives the raster icons from src/app/icon.svg (the logo: Ionicons "bag
// handle" on a green circle, same as the header). Run after changing the logo:
//   node scripts/generate-icons.mjs
// Uses sharp, which Next.js already depends on.
import {readFileSync, writeFileSync} from "node:fs";
import sharp from "sharp";

const circle = readFileSync("src/app/icon.svg");

// iOS rounds the corners itself and fills transparent areas with black, so the
// touch icon is a full-bleed square rather than a circle.
const square = Buffer.from(
  circle
    .toString()
    .replace(/<circle[^>]*\/>/, '<rect width="512" height="512" fill="#1DB954"/>')
);

const png = (svg, size) => sharp(svg, {density: 384}).resize(size, size).png().toBuffer();

writeFileSync("src/app/apple-icon.png", await png(square, 180));

// An .ico can hold PNG images; browsers that ignore icon.svg use this one.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((size) => png(circle, size)));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(images.length, 4);

let offset = 6 + 16 * images.length;
const entries = images.map((image, i) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(sizes[i], 0); // width
  entry.writeUInt8(sizes[i], 1); // height
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(image.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += image.length;
  return entry;
});

writeFileSync("src/app/favicon.ico", Buffer.concat([header, ...entries, ...images]));
console.log("wrote src/app/apple-icon.png and src/app/favicon.ico");
