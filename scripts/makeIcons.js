#!/usr/bin/env node
/**
 * scripts/makeIcons.js — run with `npm run icons`
 *
 * Expands build/icon.png (the master logo) into the standard icon sizes under
 * build/icons/, which electron-builder then packages per platform.
 *
 * WHY THIS EXISTS: given a single oddly-sized master, electron-builder does
 * not resize — it ships the file verbatim into a directory named after its
 * real dimensions. A 1254x1254 master landed in
 * usr/share/icons/hicolor/1254x1254/apps/, which is not one of the sizes the
 * freedesktop icon spec defines, so every desktop environment skipped it and
 * the installed app showed no icon at all. Point `linux.icon` at a DIRECTORY
 * of correctly-named standard sizes and that stops being a problem.
 *
 * WHY IT'S HAND-ROLLED: this needs to run on a machine with no ImageMagick,
 * no Pillow, no ffmpeg, and no sharp. Adding sharp for a build-time resize
 * would mean a native dependency (and a second native-module headache for the
 * cross-platform packaging this repo already fights with — see the npmRebuild
 * comment in electron-builder.yml). Node ships zlib, PNG is a simple format,
 * and the whole job is decode → box-filter → encode.
 *
 * Deliberately narrow: 8-bit RGB/RGBA, non-interlaced. That is what every
 * logo export produces, and anything else fails loudly rather than silently
 * writing a corrupt icon.
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MASTER = path.join(ROOT, "build", "icon.png");
const OUT_DIR = path.join(ROOT, "build", "icons");

// The favicon copy. build/ is packaging input and never reaches the browser,
// so the web-facing sizes are written into public/ as well — Vite copies that
// verbatim into dist/, which is what index.html links against and what
// server/index.js serves statically (in dev, in Docker, and inside Electron).
// Generated from the same master in the same pass rather than copied by hand,
// so the two can't drift.
const WEB_DIR = path.join(ROOT, "public", "icons");
const WEB_SIZES = new Set([16, 32, 256]);

// The freedesktop standard sizes, plus 512 for the .ico/.icns electron-builder
// derives. 1024 is deliberately absent: the master is 1254, and upscaling to
// 1024 would just be a blurrier version of a size nothing asks for.
const SIZES = [16, 24, 32, 48, 64, 128, 256, 512];

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// ---------------------------------------------------------------------------
// CRC32 (PNG chunk checksums)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// ---------------------------------------------------------------------------
// Decode
// ---------------------------------------------------------------------------

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** @returns {{width:number,height:number,rgba:Buffer}} */
function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("not a PNG file");

  let width = 0;
  let height = 0;
  let channels = 0;
  const idat = [];

  let offset = 8;
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      const colorType = data[9];
      const interlace = data[12];
      if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth} (need 8)`);
      if (interlace !== 0) throw new Error("interlaced PNGs are not supported");
      if (colorType === 2) channels = 3;
      else if (colorType === 6) channels = 4;
      else throw new Error(`unsupported color type ${colorType} (need 2=RGB or 6=RGBA)`);
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }

    offset += 12 + length; // length + type + data + crc
  }

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rgba = Buffer.alloc(width * height * 4);
  // Un-filtering is defined against the PREVIOUS un-filtered scanline, so the
  // decoded bytes have to be kept around a row at a time rather than converted
  // to RGBA on the fly.
  let prev = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));

    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0; // byte to the left
      const b = prev[i]; // byte above
      const c = i >= channels ? prev[i - channels] : 0; // byte above-left
      switch (filter) {
        case 0: break;
        case 1: line[i] = (line[i] + a) & 0xff; break;
        case 2: line[i] = (line[i] + b) & 0xff; break;
        case 3: line[i] = (line[i] + ((a + b) >> 1)) & 0xff; break;
        case 4: line[i] = (line[i] + paeth(a, b, c)) & 0xff; break;
        default: throw new Error(`unknown PNG filter type ${filter} on row ${y}`);
      }
    }

    for (let x = 0; x < width; x++) {
      const s = x * channels;
      const d = (y * width + x) * 4;
      rgba[d] = line[s];
      rgba[d + 1] = line[s + 1];
      rgba[d + 2] = line[s + 2];
      rgba[d + 3] = channels === 4 ? line[s + 3] : 255;
    }
    prev = line;
  }

  return { width, height, rgba };
}

// ---------------------------------------------------------------------------
// Resize + encode
// ---------------------------------------------------------------------------

/**
 * Box filter: every destination pixel averages the full block of source pixels
 * it covers. For the large downscales here (1254 → 16 is a 78x reduction) this
 * matters — bilinear sampling would read a handful of scattered pixels and
 * alias the logo's thin diagonal edges into noise.
 *
 * Averaging happens in premultiplied alpha, so transparent pixels can't drag
 * their colour into the result along the edges.
 */
function resize(src, sw, sh, size) {
  const out = Buffer.alloc(size * size * 4);
  const scaleX = sw / size;
  const scaleY = sh / size;

  for (let y = 0; y < size; y++) {
    const y0 = Math.floor(y * scaleY);
    const y1 = Math.max(y0 + 1, Math.min(sh, Math.ceil((y + 1) * scaleY)));
    for (let x = 0; x < size; x++) {
      const x0 = Math.floor(x * scaleX);
      const x1 = Math.max(x0 + 1, Math.min(sw, Math.ceil((x + 1) * scaleX)));

      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * sw + sx) * 4;
          const alpha = src[i + 3] / 255;
          r += src[i] * alpha;
          g += src[i + 1] * alpha;
          b += src[i + 2] * alpha;
          a += src[i + 3];
          n++;
        }
      }

      const d = (y * size + x) * 4;
      const meanAlpha = a / n;
      if (meanAlpha === 0) {
        out[d] = out[d + 1] = out[d + 2] = out[d + 3] = 0;
      } else {
        // Un-premultiply back to straight alpha for storage.
        const k = n * (meanAlpha / 255);
        out[d] = Math.round(r / k);
        out[d + 1] = Math.round(g / k);
        out[d + 2] = Math.round(b / k);
        out[d + 3] = Math.round(meanAlpha);
      }
    }
  }
  return out;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Filter type 0 (None) on every row. These are tiny images and the encoder
  // is not the interesting part of this script; deflate still does the work.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Windows .ico
// ---------------------------------------------------------------------------

/**
 * Build a multi-resolution .ico.
 *
 * Handed a single PNG, electron-builder emits an .ico containing exactly one
 * 256x256 image (verified: `embedded images: 1`). Windows then downscales that
 * on the fly for the 16px taskbar and 32px Explorer entries, which smears a
 * logo with thin diagonal strokes like this one. Writing the .ico here instead
 * embeds a purpose-rendered bitmap at every size — electron-builder uses a
 * supplied build/icon.ico verbatim rather than generating one.
 *
 * Sizes below 256 are stored as BMP/DIB and 256 as PNG. That split is what
 * mainstream icon tooling emits: PNG-compressed entries are only guaranteed to
 * be understood from Vista onward, and the 256 entry is the one that must be
 * PNG because a raw 256x256 DIB is a needless 256 kB.
 */
function encodeIco(images) {
  const HEADER = 6;
  const ENTRY = 16;

  const encoded = images.map(({ size, rgba }) => {
    if (size >= 256) return { size, data: encodePng(rgba, size) };

    // BITMAPINFOHEADER. biHeight is doubled: the DIB notionally holds the
    // colour (XOR) bitmap stacked on top of the 1-bit (AND) transparency mask.
    const header = Buffer.alloc(40);
    header.writeUInt32LE(40, 0); // biSize
    header.writeInt32LE(size, 4); // biWidth
    header.writeInt32LE(size * 2, 8); // biHeight — XOR + AND
    header.writeUInt16LE(1, 12); // biPlanes
    header.writeUInt16LE(32, 14); // biBitCount

    // BGRA, bottom-up. At 32bpp every row is already 4-byte aligned.
    const xor = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      const srcRow = (size - 1 - y) * size * 4;
      for (let x = 0; x < size; x++) {
        const s = srcRow + x * 4;
        const d = (y * size + x) * 4;
        xor[d] = rgba[s + 2]; // B
        xor[d + 1] = rgba[s + 1]; // G
        xor[d + 2] = rgba[s]; // R
        xor[d + 3] = rgba[s + 3]; // A
      }
    }

    // All-zero AND mask = "every pixel opaque". Windows reads transparency from
    // the alpha channel above; the mask only still exists for legacy readers,
    // but it must be present and correctly sized or the icon is rejected.
    const maskStride = (((size + 31) >> 5) * 4); // rows padded to 32 bits
    const and = Buffer.alloc(maskStride * size);

    return { size, data: Buffer.concat([header, xor, and]) };
  });

  const dir = Buffer.alloc(HEADER + ENTRY * encoded.length);
  dir.writeUInt16LE(0, 0); // reserved
  dir.writeUInt16LE(1, 2); // type: 1 = icon
  dir.writeUInt16LE(encoded.length, 4);

  let offset = dir.length;
  encoded.forEach((img, i) => {
    const at = HEADER + i * ENTRY;
    dir[at] = img.size >= 256 ? 0 : img.size; // 0 means 256
    dir[at + 1] = img.size >= 256 ? 0 : img.size;
    dir[at + 2] = 0; // palette size — 0 for true colour
    dir[at + 3] = 0; // reserved
    dir.writeUInt16LE(1, at + 4); // colour planes
    dir.writeUInt16LE(32, at + 6); // bits per pixel
    dir.writeUInt32LE(img.data.length, at + 8);
    dir.writeUInt32LE(offset, at + 12);
    offset += img.data.length;
  });

  return Buffer.concat([dir, ...encoded.map((i) => i.data)]);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (!fs.existsSync(MASTER)) {
  console.error(`No master icon at ${path.relative(ROOT, MASTER)} — put the logo there first.`);
  process.exit(1);
}

const { width, height, rgba } = decodePng(fs.readFileSync(MASTER));
if (width !== height) {
  console.warn(`⚠  master is ${width}x${height}, not square — the icons will be distorted.`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// Resize once per size and reuse for both the PNG set and the .ico — the box
// filter over a 1254x1254 source is the expensive part of this script.
const scaled = SIZES.map((size) => ({ size, rgba: resize(rgba, width, height, size) }));

fs.mkdirSync(WEB_DIR, { recursive: true });

for (const { size, rgba: pixels } of scaled) {
  const png = encodePng(pixels, size);
  fs.writeFileSync(path.join(OUT_DIR, `${size}x${size}.png`), png);
  const web = WEB_SIZES.has(size);
  if (web) fs.writeFileSync(path.join(WEB_DIR, `${size}x${size}.png`), png);
  console.log(
    `  ${size}x${size}.png  ${(png.length / 1024).toFixed(1)} kB${web ? "   → public/icons/ too" : ""}`
  );
}

// 24 is a freedesktop size but not a Windows one, and 512 is past what an .ico
// is asked for — both are left to the PNG set above.
const ICO_SIZES = new Set([16, 32, 48, 64, 128, 256]);
const ico = encodeIco(scaled.filter((i) => ICO_SIZES.has(i.size)));
fs.writeFileSync(path.join(ROOT, "build", "icon.ico"), ico);
console.log(`  icon.ico     ${(ico.length / 1024).toFixed(1)} kB  (${ICO_SIZES.size} sizes)`);

console.log(
  `\nGenerated ${SIZES.length} PNGs in build/icons/ + build/icon.ico from ${width}x${height} master.`
);
