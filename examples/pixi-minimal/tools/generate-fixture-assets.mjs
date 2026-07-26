import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const assetDirectory = resolve(toolDirectory, "../src/assets");

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function makeAtlasPng() {
  const width = 64;
  const height = 32;
  const rowBytes = width * 4 + 1;
  const pixels = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y += 1) {
    pixels[y * rowBytes] = 0;
    for (let x = 0; x < width; x += 1) {
      const frameX = x % 32;
      const centerX = x < 32 ? 15 : 16;
      const centerY = x < 32 ? 16 : 15;
      const distance = Math.hypot(frameX - centerX, y - centerY);
      const pixelOffset = y * rowBytes + 1 + x * 4;
      const isBody = distance <= 11;
      const isCore = distance <= 5;
      pixels[pixelOffset] = isCore ? 15 : 37;
      pixels[pixelOffset + 1] = isCore ? 23 : 99;
      pixels[pixelOffset + 2] = isCore ? 42 : 235;
      pixels[pixelOffset + 3] = isBody ? 255 : 0;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(pixels, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function makeUnlockWav() {
  const sampleRate = 22_050;
  const sampleCount = Math.floor(sampleRate * 0.12);
  const data = Buffer.alloc(sampleCount * 2);
  for (let index = 0; index < sampleCount; index += 1) {
    const progress = index / sampleCount;
    const envelope = Math.sin(Math.PI * progress) ** 2;
    const sample = Math.sin(2 * Math.PI * 660 * index / sampleRate) * envelope * 0.3;
    data.writeInt16LE(Math.round(sample * 32_767), index * 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

await mkdir(assetDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(assetDirectory, "fixture-atlas.png"), makeAtlasPng()),
  writeFile(resolve(assetDirectory, "audio-unlock.wav"), makeUnlockWav())
]);
